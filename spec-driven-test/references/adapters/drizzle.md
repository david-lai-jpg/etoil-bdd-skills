# Drizzle Adapter Patterns

ORM-specific patterns for the six-instruction methodology when using Drizzle ORM.

## EntitySetup (direct DB insert)

```typescript
import { users, todos } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Single entity — .returning() gives you the inserted row
const [alice] = await db.insert(users).values({
  name: 'Alice',
  email: 'alice@test.com',
  passwordHash: 'hashed123',
}).returning()

// With relations
const [todo] = await db.insert(todos).values({
  title: 'Buy milk',
  userId: alice.id,
  completed: false,
}).returning()

// Bulk insert
const inserted = await db.insert(users).values([
  { name: 'Alice', email: 'alice@test.com', passwordHash: 'h1' },
  { name: 'Bob', email: 'bob@test.com', passwordHash: 'h2' },
]).returning()
```

## EntityValidate (query + assert exists)

```typescript
// Find by ID
const [todo] = await db.select().from(todos).where(eq(todos.id, todoId))
expect(todo).toBeDefined()
expect(todo.title).toBe('Buy milk')
expect(todo.userId).toBe(alice.id)

// Find by composite criteria
const [record] = await db.select().from(overtimeRequests).where(
  and(
    eq(overtimeRequests.employeeId, alice.id),
    eq(overtimeRequests.date, '2026-03-25'),
  )
)
expect(record).toBeDefined()
expect(record.status).toBe('PENDING')

// With joins (Drizzle relational queries)
const result = await db.query.todos.findFirst({
  where: eq(todos.id, todoId),
  with: { user: true },
})
expect(result!.user.name).toBe('Alice')
```

## EntityNonExistenceValidate

```typescript
// After delete
const result = await db.select().from(todos).where(eq(todos.id, todoId))
expect(result).toHaveLength(0)

// After failed create (error case)
const created = await db.select().from(todos).where(eq(todos.userId, alice.id))
expect(created).toHaveLength(0)
```

## Test Isolation

```typescript
afterEach(async () => {
  // Order matters — children before parents
  await db.delete(todos)
  await db.delete(users)
})
```

Or with raw SQL for speed:
```typescript
afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE todos, users CASCADE`)
})
```

## Gotchas

- **Drizzle schema uses snake_case columns** (`user_id`) but TypeScript objects use camelCase (`userId`). The mapping is automatic in queries but be careful when writing raw SQL.
- **`db.select()` returns an array**, not a single record. Always destructure: `const [record] = await db.select()...`
- **`.returning()` is PostgreSQL-specific.** MySQL/SQLite don't support it — use `.execute()` and query back.
- **Drizzle's `eq()`, `and()`, `or()`** are imported from `drizzle-orm`, not from the schema file.
- **Date handling:** Drizzle `timestamp` columns return Date objects when using `mode: 'date'` (default). String mode returns ISO strings.
