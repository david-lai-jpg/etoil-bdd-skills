# etoil-bdd-skills

**Stop writing tests that lie.** A [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins) that teaches AI assistants to write tests that verify both the API response **and** the database state.

Your API returns 200. Your test passes. But nothing was saved to the database. This plugin makes sure that never happens again.

## What is BDD?

**Behavior-Driven Development** (BDD) is a testing philosophy where tests describe _what the system does_, not how it's implemented. Instead of testing internal functions in isolation, BDD tests exercise real behaviors: HTTP requests, user interactions, and the state changes they produce.

This plugin takes BDD further with a **six-instruction pattern** — a structured approach that ensures every test verifies the full round trip: request in, response out, data persisted. No more tests that pass while the database silently drops your writes.

## The Problem

Most test suites only check the API response:

```typescript
const res = await request(app).post('/todos').send({ title: 'Buy milk' })
expect(res.status).toBe(201) // passes even if nothing was saved to the DB
```

Transaction rollback bugs, silent DB errors, caching layers returning stale success — all invisible to response-only tests.

## The Fix: Six Instructions

Every test follows this structure:

| # | Instruction | What It Does |
|---|---|---|
| 1 | **TimeControl** | Mock `Date.now()` for deterministic timestamps |
| 2 | **EntitySetup** | Insert test data directly via ORM — never through the API under test |
| 3 | **ApiCall** | Make the HTTP request |
| 4 | **ResponseValidate** | Assert status code + response body |
| 5 | **EntityValidate** | Query the DB and assert the record exists with correct values |
| 6 | **EntityNonExistenceValidate** | For error cases, verify nothing was accidentally persisted |

Steps 5 and 6 are the ones everybody skips. This plugin won't let Claude skip them.

### Before vs. After

```typescript
// BEFORE — response-only, silently broken
it('creates a todo', async () => {
  const res = await request(app).post('/todos').send({ title: 'Buy milk' })
  expect(res.status).toBe(201) // "passes" even if DB write failed
})

// AFTER — both-layer verification
it('creates and persists a todo', async () => {
  const alice = await prisma.user.create({                // EntitySetup
    data: { name: 'Alice', email: 'alice@test.com' },
  })

  const res = await request(app.getHttpServer())          // ApiCall
    .post('/todos')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Buy milk' })

  expect(res.status).toBe(201)                            // ResponseValidate
  expect(res.body.title).toBe('Buy milk')

  const todo = await prisma.todo.findUnique({             // EntityValidate
    where: { id: res.body.id },
  })
  expect(todo).not.toBeNull()
  expect(todo!.title).toBe('Buy milk')
})
```

## Installation

```bash
claude plugin add https://github.com/user/etoil-bdd-skills
```

## How It Works

The plugin ships two skills that activate automatically when Claude works with test files:

### `spec-driven-test` — Writing Tests

Guides writing backend API tests, E2E tests, and component tests. Reads the room before applying methodology:

- **Spike?** Stays quiet. No test ceremony during prototyping.
- **Bug fix?** Reproduce the bug as a failing test first. No spec overhead.
- **Productionizing a spike?** Reads existing code, scaffolds tests from it.
- **New feature?** Full methodology — conversational spec extraction, then test-first.

Never demands PRDs or formal specs. Extracts what it needs by asking: _"What endpoints does this need? What data gets stored? What can go wrong?"_

### `spec-test-review` — Reviewing Tests

Review checklist that flags real issues with `file:line` citations:

- Missing DB validation after mutating API calls
- Test data created via API instead of direct DB insert (test coupling)
- Hardcoded timestamps without time mocking
- Missing auth scenarios (unauthenticated, wrong role)

## Supported Stacks

Auto-detects your stack from `package.json` and loads the right patterns:

| Layer | Supported |
|---|---|
| **ORM** | Prisma, Drizzle, MikroORM |
| **Backend** | NestJS, Hono |
| **Frontend** | Vue 3, React |
| **Test Runner** | Vitest |
| **E2E** | Playwright |
| **State** | Pinia (Vue), Zustand (React) |

## Frontend Tests Too

The six instructions adapt to frontend vocabulary — same principles, different API:

| Backend | E2E (Playwright) | Component (Vitest) |
|---|---|---|
| TimeControl | `page.clock.setFixedTime()` | `vi.useFakeTimers()` |
| EntitySetup | Seed via test API or direct DB | Mock API via MSW, seed store |
| ApiCall | `page.fill()` + `page.click()` | `userEvent.click(button)` |
| ResponseValidate | `expect(page.getByText(...)).toBeVisible()` | `expect(screen.getByText(...))` |
| EntityValidate | Intercept API response or query DB | `expect(store.todos).toHaveLength(1)` |

The principle is the same: **verify the action AND the resulting state**.

## Constraint Helpers

For dynamic values (auto-generated IDs, timestamps), the plugin teaches constraint-based assertions:

```typescript
expect(res.body.id).toSatisfy(isNum)
expect(res.body.age).toSatisfy(between(18, 65))
expect(res.body.status).toSatisfy(oneOf('PENDING', 'APPROVED'))
expect(res.body.createdAt).toSatisfy(sameTime('2026-01-27T10:00:00Z'))
```

Full helper source in `references/constraints.md`, ready to copy into your project.

## Plugin Structure

```
etoil-bdd-skills/
├── plugin.json
├── spec-driven-test/             <- Writing tests
│   ├── SKILL.md                  <- Decision tree entry point
│   ├── references/
│   │   ├── six-instructions.md   <- Deep dive with good/bad examples
│   │   ├── three-specs.md        <- API + entity + test spec discipline
│   │   ├── constraints.md        <- Constraint assertion helpers
│   │   ├── time-control.md       <- vi.useFakeTimers patterns
│   │   ├── test-isolation.md     <- Cleanup strategies per ORM
│   │   ├── adapters/             <- Prisma, Drizzle, MikroORM
│   │   ├── frontend/             <- Playwright E2E, Vue, React
│   │   └── http-clients/         <- supertest, Hono
│   └── templates/
│       └── backend-test.ts
├── spec-test-review/             <- Reviewing tests
│   └── SKILL.md
└── evals/
    └── evals.json                <- 5 eval scenarios
```

## License

MIT
