# MikroORM Adapter Patterns

ORM-specific patterns for the six-instruction methodology when using MikroORM.

## EntitySetup (direct DB insert)

```typescript
// Single entity — create + flush
const alice = em.create(User, {
  name: 'Alice',
  email: 'alice@test.com',
  passwordHash: 'hashed123',
})
await em.flush()

// With relations
const todo = em.create(Todo, {
  title: 'Buy milk',
  user: alice,      // MikroORM handles the FK
  completed: false,
})
await em.flush()

// Bulk creation
const users = [
  em.create(User, { name: 'Alice', email: 'alice@test.com' }),
  em.create(User, { name: 'Bob', email: 'bob@test.com' }),
]
await em.flush()
```

## EntityValidate (query + assert exists)

```typescript
// IMPORTANT: Clear the identity map first to force a fresh DB read.
// Without this, findOne returns the cached in-memory entity, which
// defeats the purpose of EntityValidate (verifying actual persistence).
em.clear()

// Find by ID
const todo = await em.findOne(Todo, { id: todoId })
expect(todo).not.toBeNull()
expect(todo!.title).toBe('Buy milk')
expect(todo!.user.id).toBe(alice.id)

// Find with populated relations
const todoWithUser = await em.findOne(Todo, { id: todoId }, {
  populate: ['user'],
})
expect(todoWithUser!.user.name).toBe('Alice')

// Find by criteria
const record = await em.findOne(OvertimeRequest, {
  employee: alice,
  date: new Date('2026-03-25'),
})
expect(record).not.toBeNull()
expect(record!.status).toBe('PENDING')
```

## EntityNonExistenceValidate

```typescript
em.clear()

// After delete
const deleted = await em.findOne(Todo, { id: todoId })
expect(deleted).toBeNull()

// After failed create
const todos = await em.find(Todo, { user: alice })
expect(todos).toHaveLength(0)
```

## Test Isolation

```typescript
afterEach(async () => {
  // Clear identity map + truncate
  em.clear()
  await em.getConnection().execute('TRUNCATE TABLE "todos", "users" CASCADE')
})
```

Or use MikroORM's built-in test isolation:
```typescript
// Fork a new EntityManager per test
let testEm: EntityManager
beforeEach(() => { testEm = orm.em.fork() })
afterEach(() => { testEm.clear() })
```

## Gotchas

- **Identity Map caching:** MikroORM caches entities in memory. `em.findOne()` may return the cached version instead of querying the DB. **Always call `em.clear()` before EntityValidate** to force a fresh read.
- **Unit of Work:** Changes are batched and only written on `em.flush()`. Forgetting `flush()` means EntitySetup data never reaches the DB.
- **Lazy loading:** Relations are lazy by default. Use `populate: ['relation']` in `findOne` options, or access will trigger additional queries (which may fail in test contexts).
- **Wrapped references:** Some relation types return `Reference<T>` wrappers. Use `.unwrap()` or `.getEntity()` to access the underlying entity.
