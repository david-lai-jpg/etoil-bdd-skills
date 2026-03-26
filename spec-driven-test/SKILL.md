---
name: spec-driven-test
description: "Guides writing backend API tests, E2E tests, and component tests following the six-instruction BDD methodology. Use whenever writing or modifying test files (.test.ts, .spec.ts), implementing TDD, creating new API endpoints or data models, asked to 'write tests', 'add test coverage', 'test this feature', or when the user creates a new controller/route/entity without corresponding tests. Covers NestJS, Hono, Prisma, Drizzle, MikroORM backends with Vitest, plus Playwright E2E and Vue 3/React component tests. Also use when the user says 'productionize this', 'this spike is ready', 'add tests before we ship', or mentions BDD, test-driven development, or spec-driven development."
---

# Six-Instruction BDD Test Methodology for TypeScript

A methodology-first testing skill. Tests are plain Vitest/Playwright — no Gherkin DSL, no code generation. The skill teaches a **six-instruction pattern** that ensures every test verifies both the API response AND the database state.

## Step 0: Assess the Situation

Before applying any methodology, read the room. The developer's context determines how much ceremony is appropriate.

**Spike / prototype?** Stay quiet. Don't suggest tests unprompted. When the developer later says "productionize this" or "this is going to production", switch to Gear 2.

**Bug fix?** Skip all spec ceremony. Guide the developer to **reproduce the bug as a failing test first**, then fix the code, then verify the test passes. That's it.

**Small change to existing feature?** Add test coverage for the specific change. Don't demand full three-spec compliance for a one-line fix.

**Productionizing a spike?** Read the existing route/controller code. Scaffold comprehensive tests from it. Ask minimal clarifying questions — the code already answers most of them.

**New production feature?** Full methodology. Extract specs conversationally (see below), then write tests before implementation.

**Ambiguous?** Ask one question: "Is this a spike, or going to production?" Then proceed.

### Conversational Spec Extraction

Never demand PRDs, acceptance criteria documents, or formal specs. Instead, extract what you need by asking:

- "What endpoints does this need?" → becomes the API contract
- "What data gets stored or changed?" → becomes the entity schema understanding
- "What should fail? What are the edge cases?" → becomes error scenarios

These questions are the spec. The answers become test scenarios directly. Works with a 2-sentence Linear ticket, a verbal description, or a detailed PRD.

## Step 1: Detect the Stack

Check `package.json` to determine which reference files to load. Only load what's needed — never load all adapters at once.

**Backend ORM** (read ONE adapter):
- `@prisma/client` in deps → Read `references/adapters/prisma.md`
- `drizzle-orm` in deps → Read `references/adapters/drizzle.md`
- `@mikro-orm/core` in deps → Read `references/adapters/mikroorm.md`

**HTTP client** (read ONE):
- `@nestjs/core` in deps → Read `references/http-clients/supertest.md`
- `hono` in deps → Read `references/http-clients/hono-testing.md`

**Frontend** (read if writing component/E2E tests):
- `@playwright/test` → Read `references/frontend/e2e-playwright.md`
- `vue` in deps → Read `references/frontend/component-vue.md`
- `react` in deps → Read `references/frontend/component-react.md`

**Always available**: Read `references/six-instructions.md` for the full methodology with examples.

## Step 2: Check Spec Readiness (Flexible)

Only check what's relevant. Never block the developer.

- Feature touches the database? → Entity schema (Prisma model / Drizzle table / MikroORM entity) should exist. If it doesn't, **suggest** creating it but proceed with writing tests anyway.
- Feature is a REST API? → OpenAPI spec or `@ApiOperation()` swagger decorators should exist. If they don't, note it as a gap but don't block.
- Feature is frontend-only? → Skip spec checks entirely.

## Step 3: Apply the Six-Instruction Pattern

This is the core methodology. Every backend test follows this structure:

### 1. TimeControl
Does this feature involve timestamps (`createdAt`, `updatedAt`), expiry, scheduling, or time-based logic? Mock time:
```typescript
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-27T10:00:00Z'))
})
afterAll(() => vi.useRealTimers())
```
→ For deep patterns, read `references/time-control.md`

### 2. EntitySetup
Insert test data **directly via ORM**. Never set up test data by calling the API under test — this creates test coupling where a bug in the Create API breaks every test that needs that entity.
```typescript
const alice = await prisma.user.create({
  data: { name: 'Alice', email: 'alice@test.com' },
})
```

### 3. ApiCall
Make the HTTP request using the project's HTTP client:
```typescript
const res = await request(app.getHttpServer())
  .post('/todos')
  .set('Authorization', `Bearer ${token}`)
  .send({ title: 'Buy milk' })
```

### 4. ResponseValidate
Assert status code + response body:
```typescript
expect(res.status).toBe(201)
expect(res.body).toMatchObject({
  title: 'Buy milk',
  userId: alice.id,
  completed: false,
})
```
For dynamic values, use constraint helpers → read `references/constraints.md`

### 5. EntityValidate — THE MOST IMPORTANT STEP
**Always verify the database after a mutating API call.** API returning 200 does not guarantee data persisted. This is the most commonly skipped step in testing, and it catches an entire class of bugs.
```typescript
const todo = await prisma.todo.findUnique({ where: { id: res.body.id } })
expect(todo).not.toBeNull()
expect(todo!.title).toBe('Buy milk')
expect(todo!.userId).toBe(alice.id)
```

### 6. EntityNonExistenceValidate
For delete operations and error cases, verify nothing was accidentally created:
```typescript
const todos = await prisma.todo.findMany({ where: { userId: alice.id } })
expect(todos).toHaveLength(0)
```

## Test File Structure

```typescript
describe('Feature Name', () => {
  // TimeControl (if time-dependent)
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-27T10:00:00Z')) })
  afterAll(() => vi.useRealTimers())

  describe('success cases', () => {
    it('happy path', async () => {
      // EntitySetup → ApiCall → ResponseValidate → EntityValidate
    })
  })

  describe('failure cases', () => {
    it('rejects invalid input', async () => {
      // EntitySetup → ApiCall (bad input) → ResponseValidate (4xx) → EntityNonExistenceValidate
    })

    it('rejects unauthenticated request', async () => {
      // ApiCall (no auth header) → ResponseValidate (401)
    })

    it('rejects wrong role / insufficient permissions', async () => {
      // EntitySetup (user with wrong role) → ApiCall → ResponseValidate (403)
    })
  })
})
```

**Auth testing is non-negotiable for any protected endpoint.** Always include at minimum:
- Authenticated success (happy path)
- Unauthenticated rejection (no token → 401)
- Wrong role/permissions (valid token, wrong access level → 403)
```

## Test Isolation

Each test must clean up after itself. Read `references/test-isolation.md` for ORM-specific cleanup strategies.

## Frontend Testing

For component and E2E tests, the six instructions adapt to frontend vocabulary. The principle stays the same — **verify the action AND the resulting state**:
- Backend: state = database
- Frontend: state = store (Pinia/Zustand) + rendered DOM

Read the relevant frontend reference file for adapted patterns.
