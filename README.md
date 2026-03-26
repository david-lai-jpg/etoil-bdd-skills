# Etoil BDD — Full-Stack Test Methodology for TypeScript

> Your tests pass. Your database is empty. Nobody noticed until production.

A [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins) that teaches Claude to write tests that **actually verify your data was saved** — not just that the API said "ok".

Works with **Prisma / Drizzle / MikroORM**, **NestJS / Hono**, **Vue / React**, **Vitest**, and **Playwright** out of the box.

## The Bug Nobody Writes Tests For

```typescript
// This test passes. The database is empty. You ship it.
it('creates a todo', async () => {
  const res = await request(app).post('/todos').send({ title: 'Buy milk' })
  expect(res.status).toBe(201) // <-- transaction silently rolled back. nothing saved.
})
```

Transaction rollback bugs. Silent DB errors. Caching layers returning stale success. ORMs swallowing constraint violations. **All invisible to response-only tests.**

This plugin adds one rule Claude will never skip: **after every mutating API call, query the database and prove the data is there.**

## Quick Start

In Claude Code, run:

```
/plugin marketplace add david-lai-jpg/etoil-bdd-skills
/plugin install etoil-bdd-skills@etoil-bdd-skills
```

That's it. The skills activate automatically when Claude works with test files.

## What Changes

```typescript
// BEFORE — what Claude writes without this plugin
it('creates a todo', async () => {
  const res = await request(app).post('/todos').send({ title: 'Buy milk' })
  expect(res.status).toBe(201)
  expect(res.body.title).toBe('Buy milk')
  // "Ship it!" — no one checked the database
})
```

```typescript
// AFTER — what Claude writes WITH this plugin
it('creates and persists a todo', async () => {
  // Setup: seed data directly via ORM, never through the API under test
  const alice = await prisma.user.create({
    data: { name: 'Alice', email: 'alice@test.com' },
  })

  // Act: make the HTTP request
  const res = await request(app.getHttpServer())
    .post('/todos')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Buy milk' })

  // Assert the response
  expect(res.status).toBe(201)
  expect(res.body.title).toBe('Buy milk')

  // Assert the DATABASE — the part everyone skips
  const todo = await prisma.todo.findUnique({ where: { id: res.body.id } })
  expect(todo).not.toBeNull()
  expect(todo!.title).toBe('Buy milk')
  expect(todo!.userId).toBe(alice.id)
})
```

## The Six-Instruction Pattern

Every test follows this structure. Steps 5 and 6 are the ones that catch real production bugs.

| # | Instruction | Why It Matters |
|---|---|---|
| 1 | **TimeControl** | Mock `Date.now()` — no more flaky timestamps |
| 2 | **EntitySetup** | Seed data via ORM, not the API under test — no test coupling |
| 3 | **ApiCall** | Make the HTTP request |
| 4 | **ResponseValidate** | Assert status + body |
| 5 | **EntityValidate** | **Query the DB. Prove the data exists.** |
| 6 | **EntityNonExistenceValidate** | On errors, prove nothing leaked into the DB |

### What is BDD?

**Behavior-Driven Development** tests _what the system does_, not how it's implemented. Instead of testing internal functions, BDD tests exercise real behaviors: HTTP requests, user interactions, and the state changes they produce.

This plugin extends BDD with **both-layer verification** — every test checks both the output (API response) and the side effect (database state). Because an API returning 200 and a row actually existing in Postgres are two very different things.

## Context-Aware — Not a Process Cop

The plugin reads the room before applying methodology:

| Situation | What Claude Does |
|---|---|
| Prototyping / spike | Stays quiet. No test ceremony. |
| Bug fix | Reproduce the bug as a failing test. No spec overhead. |
| Productionizing a spike | Read existing code, scaffold tests from it. |
| New feature | Full methodology — extract specs by asking, then test-first. |

Never demands PRDs. Never blocks you. Extracts what it needs by asking three questions: _What endpoints? What data? What can fail?_

## Supported Stacks

Auto-detects from `package.json` and loads the right adapter:

| | Supported |
|---|---|
| **ORM** | Prisma, Drizzle, MikroORM |
| **Backend** | NestJS, Hono |
| **Frontend** | Vue 3 (Composition API), React |
| **Test Runner** | Vitest |
| **E2E** | Playwright |
| **State** | Pinia, Zustand |

## Works for Frontend Too

Same principle, different vocabulary: **verify the action AND the resulting state.**

| Backend | E2E (Playwright) | Component (Vitest) |
|---|---|---|
| DB insert via ORM | Seed via test API | Mock API via MSW |
| HTTP request | `page.click()` | `userEvent.click()` |
| Assert response body | `expect(locator).toBeVisible()` | `expect(screen.getByText(...))` |
| **Query the DB** | **Intercept API / query DB** | **`expect(store.items).toHaveLength(1)`** |

## What's In the Box

**Two skills** that activate automatically:

**`spec-driven-test`** — Guides writing tests. Detects your stack, loads the right ORM adapter, applies the six-instruction pattern. Includes reference docs for every supported ORM, HTTP client, and frontend framework.

**`spec-test-review`** — Reviews existing tests. Flags missing DB validation, test coupling, hardcoded timestamps, missing auth scenarios. Cites `file:line` with severity levels.

**Plus:** constraint helpers for dynamic values, backend test templates, and 5 eval scenarios for quality assurance.

<details>
<summary>Plugin structure</summary>

```
etoil-bdd-skills/
├── .claude-plugin/
│   └── marketplace.json           <- Marketplace manifest
├── plugin.json
├── spec-driven-test/              <- Writing tests
│   ├── SKILL.md                   <- Decision tree entry point
│   ├── references/
│   │   ├── six-instructions.md    <- The methodology, with examples
│   │   ├── three-specs.md         <- API + entity + test spec discipline
│   │   ├── constraints.md         <- Assertion helpers for dynamic values
│   │   ├── time-control.md        <- vi.useFakeTimers patterns
│   │   ├── test-isolation.md      <- Cleanup strategies per ORM
│   │   ├── adapters/              <- Prisma, Drizzle, MikroORM
│   │   ├── frontend/              <- Playwright, Vue, React
│   │   └── http-clients/          <- supertest, Hono
│   └── templates/
│       └── backend-test.ts
├── spec-test-review/              <- Reviewing tests
│   └── SKILL.md
└── evals/
    └── evals.json                 <- 5 eval scenarios
```

</details>

## License

MIT
