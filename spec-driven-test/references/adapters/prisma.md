# Prisma Adapter Patterns

ORM-specific patterns for the six-instruction methodology when using Prisma.

## EntitySetup (direct DB insert)

```typescript
// Single entity
const user = await prisma.user.create({
  data: { name: 'Alice', email: 'alice@test.com', passwordHash: 'hashed123' },
})

// With relations
const todo = await prisma.todo.create({
  data: {
    title: 'Buy milk',
    userId: user.id,    // reference the parent's ID
    completed: false,
  },
})

// Bulk insert
await prisma.user.createMany({
  data: [
    { name: 'Alice', email: 'alice@test.com', passwordHash: 'h1' },
    { name: 'Bob', email: 'bob@test.com', passwordHash: 'h2' },
  ],
})
```

## EntityValidate (query + assert exists)

```typescript
// Find by ID (most common)
const todo = await prisma.todo.findUnique({ where: { id: todoId } })
expect(todo).not.toBeNull()
expect(todo!.title).toBe('Buy milk')
expect(todo!.userId).toBe(alice.id)

// Find with relations loaded
const todoWithUser = await prisma.todo.findUnique({
  where: { id: todoId },
  include: { user: true },   // Prisma requires explicit include for relations
})
expect(todoWithUser!.user.name).toBe('Alice')

// Find by composite criteria
const record = await prisma.overtimeRequest.findFirst({
  where: { employeeId: alice.id, date: new Date('2026-03-25') },
})
expect(record).not.toBeNull()
expect(record!.status).toBe('PENDING')
```

## EntityNonExistenceValidate

```typescript
// After delete
const deleted = await prisma.todo.findUnique({ where: { id: todoId } })
expect(deleted).toBeNull()

// After failed create (error case)
const todos = await prisma.todo.findMany({ where: { userId: alice.id } })
expect(todos).toHaveLength(0)
```

## Test Isolation (cleanup between tests)

**Option A: Truncate tables (simpler, recommended for most projects)**
```typescript
afterEach(async () => {
  // Order matters — delete children before parents (foreign keys)
  await prisma.todo.deleteMany()
  await prisma.user.deleteMany()
})
```

**Option B: Transaction rollback (faster, more complex setup)**
```typescript
// Requires wrapping each test in a transaction that gets rolled back
// See Prisma docs on interactive transactions for setup details
```

**Option C: Raw SQL truncate (fastest, use for large test suites)**
```typescript
afterEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "todos", "users" CASCADE`)
})
```

## Gotchas

- **DateTime fields return Date objects**, not strings. Compare with `.toISOString()` or use the `sameTime()` constraint helper.
- **Relations are NOT loaded by default.** You must use `include: { relation: true }` to load them. Forgetting this is a common source of "property is undefined" errors in EntityValidate.
- **`createMany` doesn't return created records** (Prisma limitation). Use `create` in a loop or raw SQL if you need the IDs back.
- **Prisma returns plain objects**, not class instances. No methods, no getters — just data.
- **Unique constraint violations** throw `PrismaClientKnownRequestError` with code `P2002`. Use unique emails per test to avoid collisions.
