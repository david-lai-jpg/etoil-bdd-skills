# The Six Instructions — Deep Dive

Each instruction solves a specific testing problem. Applied together, they produce tests that verify behavior end-to-end: from HTTP request through business logic to database persistence.

## 1. TimeControl

**Problem:** Tests that depend on `new Date()` or `Date.now()` are flaky — they produce different results depending on when you run them.

**Solution:** Mock time at the start of any test involving timestamps.

```typescript
// BAD — depends on system clock, flaky
it('records creation time', async () => {
  const res = await callApi('POST', '/todos', { body: { title: 'Buy milk' } })
  // What time is "now"? Depends when CI runs this.
  expect(new Date(res.body.createdAt).getTime()).toBeCloseTo(Date.now(), -3)
})

// GOOD — deterministic
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-27T10:00:00Z'))
})
afterAll(() => vi.useRealTimers())

it('records creation time', async () => {
  const res = await callApi('POST', '/todos', { body: { title: 'Buy milk' } })
  expect(res.body.createdAt).toContain('2026-01-27')
})
```

**When to use:** Any test that asserts on `createdAt`, `updatedAt`, `expiresAt`, token expiry, scheduling, time-based business rules (overtime after 8 hours, leave request dates), or relative time calculations.

**When to skip:** Tests that don't involve time at all (pure CRUD with no timestamps in assertions).

## 2. EntitySetup

**Problem:** Setting up test data by calling the API under test creates coupling. If the "create user" endpoint has a bug, every test that needs a user fails — not just the create user tests.

**Solution:** Insert test data directly via ORM, bypassing the API entirely.

```typescript
// BAD — coupled to Create User API
it('creates a todo', async () => {
  const userRes = await callApi('POST', '/users', { body: { name: 'Alice' } })
  // If POST /users is broken, THIS test fails too — even though
  // the bug is in user creation, not todo creation.
  const todoRes = await callApi('POST', '/todos', {
    body: { title: 'Buy milk' },
    auth: { token: userRes.body.token },
  })
})

// GOOD — decoupled, test only fails if todo creation is broken
it('creates a todo', async () => {
  // Direct DB insert — doesn't depend on any API
  const alice = await prisma.user.create({
    data: { name: 'Alice', email: 'alice@test.com', passwordHash: 'hashed' },
  })
  const token = generateTestToken(alice.id)

  const res = await callApi('POST', '/todos', {
    body: { title: 'Buy milk' },
    auth: { token },
  })
  expect(res.status).toBe(201)
})
```

**Rule:** The only API call in a test should be the one being tested. Everything else is EntitySetup.

## 3. ApiCall

Make the HTTP request to the endpoint under test.

```typescript
// Authenticated request
const res = await request(app.getHttpServer())
  .post('/todos')
  .set('Authorization', `Bearer ${token}`)
  .send({ title: 'Buy milk', description: 'Two bottles' })

// Unauthenticated request (testing auth rejection)
const res = await request(app.getHttpServer())
  .post('/todos')
  .send({ title: 'Buy milk' })
```

For Hono, use `app.request()` instead of supertest — see the http-clients reference.

## 4. ResponseValidate

Assert status code and response body.

```typescript
// Status code
expect(res.status).toBe(201)

// Response body — use toMatchObject for partial matching
expect(res.body).toMatchObject({
  title: 'Buy milk',
  userId: alice.id,
  completed: false,
})

// Dynamic values — use constraint helpers
expect(res.body.id).toSatisfy(isNum)
expect(res.body.createdAt).toSatisfy(sameTime('2026-01-27T10:00:00Z'))
```

## 5. EntityValidate — THE CRITICAL STEP

**Problem:** An API can return 200 without actually persisting data. Transaction rollback bugs, silent DB errors, caching layers returning stale success — all pass ResponseValidate but fail EntityValidate.

**Solution:** After every mutating API call, query the database directly and assert the record exists with correct values.

```typescript
// After a successful POST
const todo = await prisma.todo.findUnique({ where: { id: res.body.id } })
expect(todo).not.toBeNull()
expect(todo!.title).toBe('Buy milk')
expect(todo!.userId).toBe(alice.id)
expect(todo!.completed).toBe(false)

// After a successful PUT/PATCH
const updated = await prisma.todo.findUnique({ where: { id: todoId } })
expect(updated!.title).toBe('Updated title')

// After a successful DELETE
const deleted = await prisma.todo.findUnique({ where: { id: todoId } })
expect(deleted).toBeNull()
```

**This is the most commonly skipped step.** Most test suites only check the API response. The SpecFormula methodology treats response-only tests as incomplete.

## 6. EntityNonExistenceValidate

**Problem:** Error endpoints might accidentally persist partial data. A validation error returns 400 but a half-written record is left in the DB.

**Solution:** After every error case, verify nothing was accidentally created.

```typescript
it('rejects todo without title', async () => {
  const alice = await prisma.user.create({ data: { name: 'Alice', email: 'a@t.com' } })

  const res = await request(app.getHttpServer())
    .post('/todos')
    .set('Authorization', `Bearer ${generateToken(alice.id)}`)
    .send({ description: 'No title provided' }) // missing required title

  expect(res.status).toBe(400)

  // Verify nothing was created in DB
  const todos = await prisma.todo.findMany({ where: { userId: alice.id } })
  expect(todos).toHaveLength(0)
})
```

## Putting It All Together

A complete test using all six instructions:

```typescript
describe('Create Todo', () => {
  beforeAll(() => {
    vi.useFakeTimers()                                    // 1. TimeControl
    vi.setSystemTime(new Date('2026-01-27T10:00:00Z'))
  })
  afterAll(() => vi.useRealTimers())

  it('creates and persists a todo', async () => {
    const alice = await prisma.user.create({              // 2. EntitySetup
      data: { name: 'Alice', email: 'alice@test.com', passwordHash: 'hashed' },
    })
    const token = generateTestToken(alice.id)

    const res = await request(app.getHttpServer())        // 3. ApiCall
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Buy milk' })

    expect(res.status).toBe(201)                          // 4. ResponseValidate
    expect(res.body).toMatchObject({
      title: 'Buy milk',
      userId: alice.id,
      completed: false,
    })

    const todo = await prisma.todo.findUnique({           // 5. EntityValidate
      where: { id: res.body.id },
    })
    expect(todo).not.toBeNull()
    expect(todo!.title).toBe('Buy milk')
    expect(todo!.createdAt.toISOString()).toContain('2026-01-27')
  })

  it('rejects missing title', async () => {
    const alice = await prisma.user.create({              // 2. EntitySetup
      data: { name: 'Bob', email: 'bob@test.com', passwordHash: 'hashed' },
    })

    const res = await request(app.getHttpServer())        // 3. ApiCall
      .post('/todos')
      .set('Authorization', `Bearer ${generateTestToken(alice.id)}`)
      .send({})

    expect(res.status).toBe(400)                          // 4. ResponseValidate

    const todos = await prisma.todo.findMany({            // 6. EntityNonExistence
      where: { userId: alice.id },
    })
    expect(todos).toHaveLength(0)
  })
})
```
