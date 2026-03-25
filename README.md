# specformula-ts

A [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins) that teaches AI assistants the **SpecFormula BDD testing methodology** for TypeScript full-stack development.

This is not a test runner, code generator, or Gherkin DSL. It's a methodology — a set of thinking patterns that ensure every test verifies both the API response **and** the database state. Tests are plain Vitest/Playwright. The plugin teaches Claude how to write them well.

## The Problem This Solves

Most test suites only check the API response:

```typescript
const res = await request(app).post('/todos').send({ title: 'Buy milk' })
expect(res.status).toBe(201) // ← passes even if nothing was saved to the DB
```

An API can return 200 without persisting data. Transaction rollback bugs, silent DB errors, caching layers — all pass response-only tests. SpecFormula fixes this by enforcing **both-layer verification**: check the response, then query the database.

## The Six Instructions

Every backend test follows this structure:

| # | Instruction | What It Does |
|---|---|---|
| 1 | **TimeControl** | Mock `Date.now()` with `vi.useFakeTimers()` for deterministic timestamps |
| 2 | **EntitySetup** | Insert test data directly via ORM — never through the API under test |
| 3 | **ApiCall** | Make the HTTP request (`supertest` or Hono's `app.request()`) |
| 4 | **ResponseValidate** | Assert status code + response body |
| 5 | **EntityValidate** | Query the DB and assert the record exists with correct values |
| 6 | **EntityNonExistenceValidate** | For error cases, verify nothing was accidentally persisted |

Steps 5 and 6 are the ones everybody skips. This plugin won't let Claude skip them.

## Installation

```bash
claude plugin add /path/to/etoil-bdd-skills
# or from a git URL
claude plugin add https://github.com/user/etoil-bdd-skills
```

## What's Included

### Skills

**`spec-driven-test`** — The primary skill. Guides writing backend API tests, E2E tests, and component tests. Activates when Claude sees test files, TDD workflows, or prompts like "write tests for this endpoint."

Before applying methodology, it reads the room:

- **Spike?** Stays quiet. No test ceremony during prototyping.
- **Bug fix?** Skips specs. Reproduce the bug as a failing test first.
- **Productionizing a spike?** Reads existing code, scaffolds tests from it.
- **New feature?** Full methodology — conversational spec extraction, then test-first.

Never demands PRDs or formal specs. Extracts what it needs by asking: "What endpoints does this need? What data gets stored? What can go wrong?"

**`spec-test-review`** — Review checklist for test quality. Flags missing DB validation, test coupling via API calls, hardcoded values, missing auth scenarios. Reports findings with `file:line` references and severity levels (CRITICAL / HIGH / MEDIUM / LOW).

### Reference Files

Detailed patterns loaded on-demand — Claude only reads what's relevant to the current stack:

| Category | Files |
|---|---|
| Core methodology | `six-instructions.md`, `three-specs.md`, `constraints.md`, `time-control.md`, `test-isolation.md` |
| ORM adapters | `adapters/prisma.md`, `adapters/drizzle.md`, `adapters/mikroorm.md` |
| HTTP clients | `http-clients/supertest.md`, `http-clients/hono-testing.md` |
| Frontend | `frontend/e2e-playwright.md`, `frontend/component-vue.md`, `frontend/component-react.md` |

### Templates

Skeleton test files with the six-instruction structure pre-marked as comments:

- `templates/backend-test.ts` — Backend API test scaffold

### Evals

5 evaluation scenarios in `evals/evals.json` covering:

1. NestJS + Prisma endpoint (full six-instruction verification)
2. Hono + Drizzle stack detection (correct adapter selection)
3. Test review catching missing DB validation
4. Bug fix mode (no spec ceremony)
5. Vue component test with store verification

## Supported Stacks

The plugin detects the project's stack from `package.json` and loads the right adapter:

| Layer | Supported |
|---|---|
| ORM | Prisma, Drizzle, MikroORM |
| Backend Framework | NestJS, Hono |
| Frontend Framework | Vue 3 (Composition API), React |
| Test Runner | Vitest |
| E2E | Playwright |
| State Management | Pinia (Vue), Zustand (React) |

## How It Works with Frontend Tests

The six instructions adapt to frontend vocabulary — same principles, different API:

| Backend | E2E (Playwright) | Component (Vitest) |
|---|---|---|
| TimeControl | `page.clock.setFixedTime()` | `vi.useFakeTimers()` |
| EntitySetup | Seed via test API or direct DB | Mock API via MSW, seed store |
| ApiCall | `page.fill()` + `page.click()` | `userEvent.click(button)` |
| ResponseValidate | `expect(page.getByText(...)).toBeVisible()` | `expect(screen.getByText(...))` |
| EntityValidate | Intercept API response or query DB | `expect(store.todos).toHaveLength(1)` |
| EntityNonExistence | Assert element not visible | `expect(store.item).toBeUndefined()` |

The principle is the same: **verify the action AND the resulting state**. On the backend, state = database. On the frontend, state = store + rendered DOM.

## Constraint Helpers

For dynamic values (auto-generated IDs, timestamps, computed fields), the plugin teaches constraint-based assertions instead of hardcoded values:

```typescript
expect(res.body.id).toSatisfy(isNum)
expect(res.body.age).toSatisfy(between(18, 65))
expect(res.body.status).toSatisfy(oneOf('PENDING', 'APPROVED'))
expect(res.body.createdAt).toSatisfy(sameTime('2026-01-27T10:00:00Z'))
```

Full helper source is in `references/constraints.md`, ready to copy into your project.

## Plugin Structure

```
specformula-ts/
├── plugin.json
├── spec-driven-test/             ← Primary skill: writing tests
│   ├── SKILL.md                  ← Decision tree entry point (170 lines)
│   ├── references/
│   │   ├── six-instructions.md   ← Deep dive with good/bad examples
│   │   ├── three-specs.md        ← API spec + entity spec + test spec discipline
│   │   ├── constraints.md        ← Constraint assertion helpers (CAS equivalent)
│   │   ├── time-control.md       ← vi.useFakeTimers patterns
│   │   ├── test-isolation.md     ← Cleanup strategies per ORM
│   │   ├── adapters/
│   │   │   ├── prisma.md
│   │   │   ├── drizzle.md
│   │   │   └── mikroorm.md
│   │   ├── frontend/
│   │   │   ├── e2e-playwright.md
│   │   │   ├── component-vue.md
│   │   │   └── component-react.md
│   │   └── http-clients/
│   │       ├── supertest.md
│   │       └── hono-testing.md
│   └── templates/
│       └── backend-test.ts
├── spec-test-review/             ← Review skill: test quality checklist
│   └── SKILL.md
└── evals/
    └── evals.json
```

## Origin

Adapted from [SpecFormula ISA](https://github.com/nicholasgasior/specformula-dev-framework) (Instruction Specification Architecture) — a Java BDD framework where Gherkin specifications are directly executable tests via Cucumber + Spring Boot.

This TypeScript adaptation keeps the methodology (three specs, six instructions, verify both layers) but drops the Gherkin DSL in favor of native TypeScript tooling. Tests are plain `describe`/`it` blocks. The framework is Vitest. The patterns are what matter, not the syntax.

## License

MIT
