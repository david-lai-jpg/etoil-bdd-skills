# SpecFormula-TS: Skill Architecture Document

## Red Team Report

### Critical Flaws Found

#### FLAW 1: Trigger Collision — 5 Skills Fighting for the Same Prompt

**The problem:** If a developer says "write a test for the create-todo endpoint", which skill triggers?
- `methodology` — "you need to write specs first!"
- `test-patterns` — "here's the test structure"
- `api-contract` — "let me check the OpenAPI spec"
- `entity-contract` — "let me check the entity schema"
- `lint` — "let me verify cross-spec consistency"

Five skills, one prompt. Claude can only load one skill per trigger (or wastes context loading multiple). The developer gets inconsistent behavior depending on which skill wins the race.

**Verdict:** The 5-skill split is over-engineered. Merge into fewer skills with clearer trigger boundaries.

#### FLAW 2: Skills Can't Provide Runtime Code

**The problem:** The architecture assumes skills deliver `setupEntity()`, `callApi()`, `queryEntity()` helpers and CAS constraint matchers. But skills are markdown files that instruct the AI — they can't ship npm packages or maintain runtime code across sessions.

The "init" step that scaffolds helper files is a **command**, not a skill. And once scaffolded, those files live in the user's project and diverge from the skill's expectations as the project evolves.

**Verdict:** Separate concerns cleanly. Skills teach patterns. A command scaffolds boilerplate. The helpers are generated once and owned by the project, not the skill.

#### FLAW 3: Adapter Detection Is Fragile

**The problem:** `package.json` detection assumes:
- One ORM per project (what about Drizzle + Redis? Prisma + Elasticsearch?)
- Framework couples to ORM (the "hono-drizzle" adapter name assumes they go together — but Hono + Prisma is valid)
- Monorepos have clear separation (what if backend and frontend share a root `package.json`?)

**Verdict:** Decouple adapter from framework entirely. Adapters are ORM-only: `prisma.md`, `drizzle.md`, `mikroorm.md`. The HTTP client adapter is separate: `supertest.md`, `hono-app-request.md`. The skill composes the right combination.

#### FLAW 4: "Three Specs" Is Too Rigid

**The problem:** The methodology demands Feature + API Spec + Entity Spec for every feature. But:
- A data transformation endpoint (no DB writes) has no entity spec
- A cron job has no API spec
- A WebSocket handler doesn't fit OpenAPI cleanly
- A frontend-only feature has no entity spec
- An existing project with 50 endpoints won't retroactively write all three specs

Blocking on missing specs that don't apply creates friction that kills adoption.

**Verdict:** The three-spec discipline is aspirational, not mandatory. The skill should assess what's relevant per feature and only enforce what applies: "This feature touches the database — do you have the entity schema? This feature is an API — do you have the contract?"

#### FLAW 5: Lint Skill Is Misleading

**The problem:** A "lint" skill implies automated checking on pre-commit or CI. But Claude Code skills run during conversation, not in CI pipelines. The skill can't actually prevent a commit that misses DB validation.

**Verdict:** Rename to `test-review`. Frame it as a code review checklist the AI applies when reviewing tests or PRs, not an automated linter.

#### FLAW 6: Frontend Testing Doesn't Map to the Six Instructions

**The problem:** The six instructions (TimeControl, EntitySetup, ApiCall, ResponseValidate, EntityValidate, EntityNonExistenceValidate) are backend-centric. For frontend:
- "EntitySetup" in a component test means... mocking a Pinia/Zustand store? Seeding MSW handlers? These aren't the same thing.
- "EntityValidate" means... checking the DOM? Checking the store? There's no database.
- "ApiCall" is a user interaction (click, type), not an HTTP request.

Forcing backend terminology onto frontend tests creates confusion.

**Verdict:** The frontend needs adapted terminology. Keep the *principles* (setup preconditions → perform action → verify output + verify state) but use frontend-native language: "Setup State" (not EntitySetup), "User Action" (not ApiCall), "Assert Render + Assert Store" (not ResponseValidate + EntityValidate).

#### FLAW 7: No Progressive Disclosure

**The problem:** A new team member's first encounter with the skill shouldn't be a wall of six instructions, three symbol systems, and three spec types. But a senior developer doesn't want the skill explaining what Given/When/Then means every time.

**Verdict:** SKILL.md should be a concise decision tree (~100 lines). Detailed instruction patterns, adapter syntax, and examples should be in referenced files loaded only when needed.

### Minor Issues

- **Constraint helpers need a home**: The CAS-equivalent matchers (`isNum`, `between`, `oneOf`, `sameTime`) are small enough to live in a single generated file, but the skill needs to detect if they exist and guide creation if not
- **Test isolation strategy varies**: Transaction rollback (fast, clean) vs. truncate (slower, simpler). The skill should recommend based on ORM, not assume one approach
- **E2E tests verifying DB state is non-trivial**: Playwright tests running in the browser can't directly query PostgreSQL. The test needs a separate DB connection or a test-only API endpoint. The skill should address this explicitly

---

## Final Architecture (Post Red-Team)

### Design Principles

1. **Two skills, not five.** One for writing tests, one for reviewing them. Clear trigger boundary.
2. **Skills teach, commands scaffold.** Skills are methodology. The init command generates files.
3. **Adapters are reference docs, not skills.** Loaded contextually by the main skill.
4. **Backend and frontend are separate reference tracks.** Same principles, different vocabulary.
5. **Progressive disclosure.** SKILL.md is the entry point. Details are in referenced files.
6. **Flexible, not rigid.** The three-spec discipline is a goal, not a gate.
7. **Context-aware gearing.** The skill assesses the situation before applying methodology. Three gears:
   - **Gear 1 (Spike):** Prototyping. The skill stays quiet. No ceremony. Offers tests later when the spike is promoted.
   - **Gear 2 (Ship):** Feature is going to production. The skill scaffolds tests from existing code. Reviews and runs in 15-30 minutes.
   - **Gear 3 (Disciplined):** Core feature others depend on. Full spec-first, tests-first, verify both layers.
8. **No documents required.** The skill extracts specs conversationally by asking "what would I need to test this?" — not by demanding PRDs or acceptance criteria. Works with a 2-sentence Linear ticket, a verbal description, or a detailed PRD equally well.

### Plugin Structure

```
specformula-ts/
├── plugin.json
│
├── skills/
│   ├── spec-driven-test/                ← PRIMARY: Writing tests
│   │   ├── SKILL.md                     ← Decision tree entry point (~150 lines)
│   │   ├── references/
│   │   │   ├── six-instructions.md      ← The 6 instruction patterns with examples
│   │   │   ├── three-specs.md           ← Three-spec discipline (when/how/skip rules)
│   │   │   ├── constraints.md           ← CAS-equivalent assertion patterns
│   │   │   ├── time-control.md          ← Time mocking patterns across frameworks
│   │   │   ├── test-isolation.md        ← Cleanup strategies per ORM
│   │   │   ├── adapters/
│   │   │   │   ├── prisma.md            ← Prisma-specific setupEntity/queryEntity
│   │   │   │   ├── drizzle.md           ← Drizzle-specific patterns
│   │   │   │   └── mikroorm.md          ← MikroORM-specific patterns
│   │   │   ├── frontend/
│   │   │   │   ├── e2e-playwright.md    ← Playwright E2E adapted methodology
│   │   │   │   ├── component-vue.md     ← Vue 3 + Vitest component patterns
│   │   │   │   └── component-react.md   ← React + Vitest component patterns
│   │   │   └── http-clients/
│   │   │       ├── supertest.md         ← supertest patterns for NestJS
│   │   │       └── hono-testing.md      ← Hono app.request() patterns
│   │   └── templates/
│   │       ├── backend-test.ts          ← Skeleton test file (backend)
│   │       ├── e2e-test.ts              ← Skeleton test file (E2E)
│   │       └── component-test.ts        ← Skeleton test file (component)
│   │
│   └── spec-test-review/               ← SECONDARY: Reviewing tests/PRs
│       └── SKILL.md                    ← Cross-spec checklist (~80 lines)
│
├── commands/
│   └── init/
│       └── COMMAND.md                   ← /specformula-ts:init scaffolding
│
└── agents/
    └── test-scaffolder/
        └── AGENT.md                     ← Agent that generates test files from specs
```

### Skill 1: `spec-driven-test` — The Core Skill

**Triggers when:** Writing or modifying test files, implementing a new feature, asked to test something, TDD workflow.

**SKILL.md structure (decision tree):**

```
0. Assess the situation (BEFORE anything else)
   ├── Spike/prototype?             → Gear 1: Stay quiet. Offer tests when spike is promoted.
   ├── Bug fix?                     → Skip specs. Reproduce bug as failing test FIRST.
   ├── Small change to existing?    → Add test coverage for the change only. No new specs.
   ├── Productionizing a spike?     → Gear 2: Read existing code, scaffold comprehensive tests.
   └── New feature?                 → Gear 3: Extract specs conversationally, then test-first.

   If the task is ambiguous, ask: "Is this a spike or going to production?"
   Never demand PRDs or acceptance criteria. Instead, extract what's needed by asking:
   - "What endpoints does this feature need?" (→ API spec)
   - "What data gets stored?" (→ Entity spec)
   - "What can go wrong?" (→ Error scenarios / business rules)
   These questions ARE the spec extraction. The answers become the test scenarios.

1. Detect context
   ├── Backend test? → Read adapter for detected ORM + HTTP client
   ├── E2E test?     → Read frontend/e2e-playwright.md
   └── Component test? → Read frontend/component-{vue|react}.md

2. Check three-spec readiness (flexible, not blocking)
   ├── Feature touches DB?  → Entity schema should exist
   ├── Feature is an API?   → API contract should exist
   └── Feature is neither?  → Skip spec check
   NEVER block the developer. If a spec is missing, suggest creating it but help
   with the test regardless.

3. Apply six-instruction pattern
   ├── TimeControl  → Does this feature involve timestamps? Mock time.
   ├── EntitySetup  → Test data via direct DB insert, never via API
   ├── ApiCall      → HTTP request (backend) or user action (frontend)
   ├── ResponseValidate → Assert HTTP response or rendered UI
   ├── EntityValidate   → Assert DB state (backend) or store state (frontend)
   └── EntityNonExistence → Assert deletion/cleanup
```

**What the skill loads contextually (never all at once):**
- Writing a NestJS + Prisma test → loads `prisma.md` + `supertest.md` + `six-instructions.md`
- Writing a Hono + Drizzle test → loads `drizzle.md` + `hono-testing.md` + `six-instructions.md`
- Writing a Playwright E2E test → loads `e2e-playwright.md`
- Writing a Vue component test → loads `component-vue.md`
- Using constraint assertions → loads `constraints.md`
- Time-related test logic → loads `time-control.md`

### Skill 2: `spec-test-review` — The Review Checklist

**Triggers when:** Code review, PR review, asked to review tests, pre-commit check.

**Checklist (not automated — AI applies during conversation):**

```
□ Every API test verifies BOTH response AND database state
□ Test data created via direct DB insert, not via API calls
□ Time-dependent tests use vi.useFakeTimers()
□ Error cases verify nothing was accidentally persisted (EntityNonExistence)
□ API contract (OpenAPI spec or swagger decorators) matches what tests assert
□ Entity schema matches what tests query
□ No hardcoded IDs or timestamps — use variables and constraints
□ Auth tests cover: authenticated success, unauthenticated rejection, wrong-role rejection
□ Test isolation: each test cleans up after itself (no cross-test state leakage)
```

### Command: `/specformula-ts:init`

**Run once per project.** Detects stack, scaffolds:

1. **Test helpers** — `setupEntity()`, `callApi()`, `queryEntity()`, `queryEntities()` with the right adapter
2. **Constraint matchers** — `isNum`, `gt()`, `between()`, `oneOf()`, `sameTime()`, `contains()` registered as Vitest custom matchers
3. **Test setup** — `globalSetup.ts` with DB connection, cleanup strategy, and fake timer configuration
4. **Spec directory** — `spec/api/` and `spec/data/` stubs (only if they don't exist)

The generated files are owned by the project. The skill references them but doesn't modify them after init.

### Agent: `test-scaffolder`

**Spawned by the main skill when creating a new feature's tests.** Reads:
- The API spec (or NestJS controller / Hono route)
- The entity schema (Prisma/Drizzle/MikroORM)
- Existing test patterns in the project

Generates a complete test file with the six-instruction structure pre-filled, using the project's actual entities and endpoints.

---

## Adapter Reference Design

Each adapter is a ~60-80 line reference doc. Example structure for `prisma.md`:

```markdown
# Prisma Adapter Patterns

## EntitySetup (direct DB insert)
prisma.[model].create({ data: { ... } })

## EntityValidate (query + assert exists)
prisma.[model].findUnique({ where: { id } })

## EntityNonExistenceValidate (query + assert null)
prisma.[model].findUnique({ where: { id } }) → expect null

## Bulk setup
prisma.[model].createMany({ data: [...] })

## Test isolation
- Use prisma.$transaction() for rollback-based isolation
- Or truncate tables between tests via:
  prisma.$executeRaw`TRUNCATE TABLE ... CASCADE`

## Gotchas
- Prisma returns plain objects, not class instances
- DateTime fields return Date objects — compare with .toISOString()
- Relations require explicit include: { } to be loaded
```

Drizzle and MikroORM adapters follow the same structure with their respective APIs.

---

## Frontend Adapted Methodology

The six instructions translated for frontend context:

| Backend Instruction | Frontend E2E (Playwright) | Frontend Component (Vitest) |
|---|---|---|
| TimeControl | `page.clock.setFixedTime()` | `vi.useFakeTimers()` + `vi.setSystemTime()` |
| EntitySetup | Seed via test API endpoint or direct DB | Mock API responses via MSW, seed store |
| ApiCall | `page.fill()` + `page.click()` (user action) | `await userEvent.click(button)` |
| ResponseValidate | `expect(page.getByText(...)).toBeVisible()` | `expect(screen.getByText(...))` |
| EntityValidate | `page.waitForResponse()` or check via API | `expect(store.todos).toHaveLength(1)` |
| EntityNonExistence | Assert element not visible, verify via API | `expect(store.deletedTodo).toBeUndefined()` |

The principle is the same: **verify the action AND the resulting state**. On the backend, state = database. On the frontend, state = store + rendered DOM.

---

## Constraint Helpers (CAS for TypeScript)

Generated into `src/test/helpers/constraints.ts` by the init command:

```typescript
// Type checks
export const isNum = (v: unknown) => typeof v === 'number'
export const isStr = (v: unknown) => typeof v === 'string'
export const isBool = (v: unknown) => typeof v === 'boolean'
export const isNotNull = (v: unknown) => v !== null && v !== undefined

// Numeric
export const gt = (n: number) => (v: unknown) => typeof v === 'number' && v > n
export const lt = (n: number) => (v: unknown) => typeof v === 'number' && v < n
export const between = (lo: number, hi: number) => (v: unknown) =>
  typeof v === 'number' && v >= lo && v <= hi

// String
export const contains = (sub: string) => (v: unknown) =>
  typeof v === 'string' && v.includes(sub)
export const startsWith = (pre: string) => (v: unknown) =>
  typeof v === 'string' && v.startsWith(pre)
export const matches = (re: RegExp) => (v: unknown) =>
  typeof v === 'string' && re.test(v)

// Enum
export const oneOf = (...opts: unknown[]) => (v: unknown) => opts.includes(v)

// Time (compare ISO strings or Date objects, with second-level precision)
export const sameTime = (expected: string | Date) => (v: unknown) => {
  const a = new Date(expected).getTime()
  const b = v instanceof Date ? v.getTime() : new Date(String(v)).getTime()
  return Math.abs(a - b) < 1000 // within 1 second
}

// Array
export const hasItem = (item: unknown) => (v: unknown) =>
  Array.isArray(v) && v.includes(item)
export const hasLength = (n: number) => (v: unknown) =>
  Array.isArray(v) && v.length === n
```

Usage: `expect(res.body.age).toSatisfy(between(18, 65))`

---

## Practical SDLC Workflows

### How the Skill Handles Different Input Quality

| What the developer provides | What the skill does |
|---|---|
| Detailed PRD with acceptance criteria | Extracts ACs directly → generates test scenarios. Minimal questions. |
| Linear ticket with 2 sentences | Asks minimum questions needed to write testable scenarios: "What endpoints? What data? What can fail?" — feels like pair programming. |
| Verbal "we need X" description | Works backward from "what would I need to test this?" — the questions ARE the spec. |
| Nothing — just existing endpoint code | Reads the route/controller, infers behavior, generates test coverage. Asks about edge cases it can't infer. |
| A bug report | Guides reproducing the bug as a failing test first. No spec ceremony. |
| A spike being promoted to production | Reads existing code, scaffolds comprehensive tests from it. |

### Daily Developer Flow (Gear 2 — Ship Mode)

```
Pick up ticket: "Add bulk delete for todos"
│
├─ Skill asks: "What's the endpoint shape? What if IDs don't belong to the user?"
├─ Developer answers (30 seconds)
│
├─ Skill/agent generates test file with 4 scenarios:
│  - Bulk delete success
│  - Partial ownership rejection
│  - Empty array rejection
│  - Unauthenticated rejection
│  All with EntitySetup + ApiCall + ResponseValidate + EntityValidate
│
├─ Developer reviews, tweaks (5 min)
├─ Run tests — all RED (10 seconds)
├─ Implement the endpoint (15-30 min)
├─ Run tests — all GREEN
├─ spec-test-review runs checklist automatically
│  ✓ All tests verify DB state
│  ✓ Test data via direct insert
│  ⚠ No OpenAPI spec entry — add it?
├─ Add spec entry. Push.
│
Done. Feature shipped with full test coverage.
```

### Existing Codebase Adoption

The skill never requires rewriting existing tests. It:
1. Scaffolds helpers alongside existing test setup on init
2. Scans existing state: "Found 80 endpoints, 20 test files, 60 untested, 14 missing DB validation"
3. New features use SpecFormula methodology from day one
4. When touching an existing test (bug fix, refactor), suggests adding missing DB assertions
5. Tracks coverage gap incrementally — no big-bang migration

### Spike → Production Promotion

When a developer says "this spike is working, let's productionize it":
1. Agent reads existing route/controller code
2. Infers endpoint behavior and entity relationships
3. Generates complete test files matching the project's existing patterns
4. Developer reviews and runs — 15-30 minutes instead of hours of manual test writing

---

## Build Order

| Phase | What | Effort | Depends On |
|---|---|---|---|
| 1 | `spec-driven-test` SKILL.md (decision tree) | Small | Nothing |
| 2 | `six-instructions.md` reference | Medium | Phase 1 |
| 3 | One ORM adapter (pick your active project) | Small | Phase 2 |
| 4 | `init` command (scaffolds helpers + constraints) | Medium | Phase 3 |
| 5 | Validate: write 3-4 real tests using the skill | — | Phase 4 |
| 6 | `three-specs.md` + `constraints.md` references | Medium | Phase 5 feedback |
| 7 | Second + third ORM adapters | Small each | Phase 5 |
| 8 | Frontend references (E2E + component) | Medium | Phase 5 |
| 9 | `spec-test-review` skill | Small | Phase 5 |
| 10 | `test-scaffolder` agent | Medium | Phase 2, 3 |
| 11 | Expand test coverage, iterate on skill wording | Ongoing | All above |
