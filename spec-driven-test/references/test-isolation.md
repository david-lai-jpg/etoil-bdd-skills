# Test Isolation Patterns

Each test must start with a clean database state. No cross-test state leakage.

## Strategy Comparison

| Strategy | Speed | Complexity | Best for |
|---|---|---|---|
| `deleteMany` per table | Medium | Low | Small test suites, getting started |
| Raw `TRUNCATE CASCADE` | Fast | Low | Most projects (recommended) |
| Transaction rollback | Fastest | Medium | Large suites where speed matters |

## Prisma

**Recommended: deleteMany in afterEach**
```typescript
afterEach(async () => {
  // Delete children before parents (FK constraints)
  await prisma.todo.deleteMany()
  await prisma.user.deleteMany()
})
```

**Faster: Raw TRUNCATE**
```typescript
afterEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "todos", "users" RESTART IDENTITY CASCADE`
  )
})
```

## Drizzle

```typescript
afterEach(async () => {
  await db.delete(todos)
  await db.delete(users)
})

// Or with raw SQL
afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE todos, users RESTART IDENTITY CASCADE`)
})
```

## MikroORM

```typescript
afterEach(async () => {
  em.clear()  // Clear identity map
  await em.getConnection().execute(
    'TRUNCATE TABLE "todos", "users" RESTART IDENTITY CASCADE'
  )
})

// Or fork the EntityManager per test
let testEm: EntityManager
beforeEach(() => { testEm = orm.em.fork() })
afterEach(() => { testEm.clear() })
```

## Table Order Matters

When using `deleteMany` (not `TRUNCATE CASCADE`), delete in reverse dependency order:
1. Delete child tables first (todos, overtime_requests)
2. Delete parent tables last (users, employees)

`TRUNCATE ... CASCADE` handles this automatically — prefer it when available.

## Parallel Test Safety

Vitest runs test files in parallel by default. If two test files write to the same tables, they can collide. Options:
- Use `--pool=forks --poolOptions.forks.singleFork` for sequential execution
- Use unique identifiers per test (UUID emails, random names) to avoid collisions
- Use separate database schemas per worker (advanced, good for CI)
