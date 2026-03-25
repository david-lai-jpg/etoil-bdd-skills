# Handoff Prompt for /skill-creator

## Context

I want to create a Claude Code plugin called `specformula-ts` that teaches AI assistants the SpecFormula BDD testing methodology adapted for TypeScript full-stack development. This is NOT a port of the Java framework — it's a methodology-first skill set that uses native TypeScript/Vitest patterns.

The full architecture document is at `/Users/davidl/Downloads/specformula-ts-architecture.md` — read it first. Below is the build plan.

## What to Build

A single Claude Code **plugin** with 2 skills, 1 command, and 1 agent. Build them in the order listed.

---

## SKILL 1: `spec-driven-test` (PRIMARY — build this first)

### Identity

- **name:** `spec-driven-test`
- **description:** Guides writing backend API tests, E2E tests, and component tests following the SpecFormula six-instruction methodology. Use whenever writing or modifying test files, implementing TDD, or when asked to test a feature. Also trigger when the user creates a new API endpoint, data model, or feature and hasn't written tests yet. Covers NestJS + Prisma, NestJS + MikroORM, and Hono + Drizzle backends, plus Playwright E2E and Vue/React component tests with Vitest.

### SKILL.md Body (~180 lines)

The SKILL.md should be a **decision tree**, not a wall of documentation. It should:

**STEP 0: Assess the situation (BEFORE anything else)**

This is the most important step. The skill must read the room before applying methodology:

- **Is this a spike/prototype?** → Gear 1: Stay quiet. Don't suggest tests. When the developer later says "this is going to production" or "productionize this", switch to Gear 2.
- **Is this a bug fix?** → Skip all spec ceremony. Guide reproducing the bug as a failing test FIRST. Only then fix the code.
- **Is this a small change to an existing feature?** → Add test coverage for the change only. Don't demand full three-spec compliance for a one-line fix.
- **Is this productionizing a spike?** → Gear 2: Read the existing code, scaffold comprehensive tests from it. Ask minimal questions.
- **Is this a new feature?** → Gear 3: Extract specs conversationally, then write tests first.
- **Ambiguous?** → Ask: "Is this a spike or going to production?" One question, then proceed.

**The skill NEVER demands PRDs, acceptance criteria documents, or formal specs.** Instead, it extracts what it needs conversationally by asking:
- "What endpoints does this feature need?" → becomes the API contract
- "What data gets stored?" → becomes the entity schema
- "What can go wrong?" → becomes the error/edge case scenarios

These questions ARE the spec extraction. The developer's answers become the test scenarios directly.

**STEP 1: Detect context** from the current task:
   - Is this a backend API test? → Read the ORM adapter reference for the project's ORM (check `package.json` for `@prisma/client`, `drizzle-orm`, or `@mikro-orm/core`) + the HTTP client reference (`supertest` or Hono's built-in test helper)
   - Is this a Playwright E2E test? → Read `references/frontend/e2e-playwright.md`
   - Is this a component test? → Read `references/frontend/component-vue.md` or `component-react.md` based on framework

**STEP 2: Check three-spec readiness** (flexible, not blocking):
   - If the feature touches the database → entity schema should exist (Prisma schema, Drizzle schema, or MikroORM entity)
   - If the feature is a REST API → API contract should exist (OpenAPI spec file or `@nestjs/swagger` decorators)
   - If neither applies → skip spec check
   - NEVER block the user from writing tests because a spec is missing. Suggest creating it, but help with the test regardless.

**STEP 3: Apply the six-instruction pattern** (the core methodology):
   - **TimeControl:** Does this feature involve timestamps, expiry, or scheduling? → Mock time with `vi.useFakeTimers()` + `vi.setSystemTime()`. Never rely on system clock in tests.
   - **EntitySetup:** Test data MUST be inserted directly via ORM (e.g., `prisma.user.create()`, `db.insert(users).values()`, `em.create()`). NEVER set up test data by calling the API under test — this creates test coupling. If the Create User API has a bug, only Create User tests should fail, not every test that needs a user.
   - **ApiCall:** Make the HTTP request. For backend: use `supertest` or Hono's `app.request()`. For E2E: this is a user interaction (`page.click()`, `page.fill()`). Match the endpoint by its route path, not a summary name (TypeScript doesn't use SpecFormula's summary-based matching).
   - **ResponseValidate:** Assert the HTTP status code + response body. Use `expect(res.status).toBe(201)` and `expect(res.body).toMatchObject({...})`. For dynamic values, use constraint helpers: `expect(res.body.id).toSatisfy(isNum)`.
   - **EntityValidate:** ALWAYS verify the database after a mutating API call. API returning 200 does not guarantee data persisted. Query the DB directly: `prisma.todo.findUnique({ where: { id } })` and assert the record exists with expected values. This is the most commonly skipped step in testing — the skill must enforce it.
   - **EntityNonExistenceValidate:** For delete operations and error cases, verify nothing was accidentally created/persisted. `expect(record).toBeNull()` or `expect(rows).toHaveLength(0)`.

4. **Guide constraint assertions** when exact values aren't known:
   - Reference `references/constraints.md` for the CAS-equivalent patterns
   - `expect(value).toSatisfy(isNum)` — type check
   - `expect(value).toSatisfy(between(18, 65))` — range check
   - `expect(value).toSatisfy(oneOf('active', 'pending'))` — enum check
   - `expect(value).toSatisfy(sameTime('2026-01-27T10:00:00Z'))` — time check (within 1 second)

5. **Test file structure** — every backend test file should follow this pattern:
   ```
   describe('Feature Name', () => {
     // TimeControl (if time-dependent)
     beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(...) })
     afterAll(() => vi.useRealTimers())

     describe('success cases', () => {
       it('does the happy path', async () => {
         // EntitySetup — direct DB insert
         // ApiCall — HTTP request
         // ResponseValidate — status + body
         // EntityValidate — query DB, assert exists
       })
     })

     describe('failure cases', () => {
       it('rejects invalid input', async () => {
         // EntitySetup
         // ApiCall — with bad input
         // ResponseValidate — error status
         // EntityNonExistenceValidate — nothing persisted
       })
     })
   })
   ```

### Reference Files to Create

Create these files in `references/` — each should be 60-100 lines:

**`references/six-instructions.md`** — Deep dive on each instruction with 2-3 examples each. Include "bad vs good" comparisons showing common mistakes (e.g., using API calls for test data setup).

**`references/three-specs.md`** — The three-spec discipline: API Spec (OpenAPI 3.0), Entity Spec (ORM schema), Feature Spec (test file). When to require each, when to skip. How they cross-reference. The lint checklist for consistency.

**`references/constraints.md`** — Full CAS-equivalent pattern library. The constraint helper functions (isNum, gt, lt, between, oneOf, contains, startsWith, matches, sameTime, hasItem, hasLength, isNotNull). Include the full TypeScript source code for all helpers (~40 lines) so the init command or the AI can generate it.

**`references/time-control.md`** — Time mocking patterns: `vi.useFakeTimers()` + `vi.setSystemTime()` for Vitest, `page.clock.setFixedTime()` for Playwright. When to mock time (any test with timestamps, expiry, scheduling, "created at" assertions). Common pitfall: forgetting to restore real timers.

**`references/test-isolation.md`** — Cleanup strategies:
- Prisma: `prisma.$transaction()` rollback or `TRUNCATE TABLE ... CASCADE`
- Drizzle: `db.delete(table)` in afterEach
- MikroORM: `em.clear()` + manual cleanup
- Which to use when (transaction rollback is faster, truncate is simpler)

**`references/adapters/prisma.md`** — Prisma-specific patterns for EntitySetup (`prisma.model.create()`), EntityValidate (`prisma.model.findUnique()`), EntityNonExistence, bulk setup (`createMany`), test isolation, gotchas (DateTime returns Date objects, relations need `include`).

**`references/adapters/drizzle.md`** — Drizzle-specific patterns for EntitySetup (`db.insert(table).values().returning()`), EntityValidate (`db.select().from(table).where(eq(...))`), test isolation, gotchas (snake_case columns vs camelCase TypeScript).

**`references/adapters/mikroorm.md`** — MikroORM-specific patterns for EntitySetup (`em.create()` + `em.flush()`), EntityValidate (`em.findOne()`), test isolation (`em.clear()`), gotchas (identity map, unit of work, lazy loading).

**`references/http-clients/supertest.md`** — supertest patterns for NestJS: getting the HTTP server from `app.getHttpServer()`, setting auth headers, sending JSON, asserting status codes. Integration with `@nestjs/testing` module.

**`references/http-clients/hono-testing.md`** — Hono's built-in `app.request()` helper and `app.fetch()`. How to set headers, send JSON body, parse response.

**`references/frontend/e2e-playwright.md`** — The six instructions adapted for E2E:
- TimeControl → `page.clock.setFixedTime()`
- EntitySetup → seed via test API endpoint or direct DB connection from test process
- ApiCall → user interactions: `page.fill()`, `page.click()`, `page.getByRole().click()`
- ResponseValidate → `expect(page.getByText(...)).toBeVisible()`
- EntityValidate → `page.waitForResponse()` to intercept API calls, or query DB from test
- EntityNonExistence → `expect(page.getByText(...)).not.toBeVisible()`
- Note: E2E DB verification requires a separate DB connection from the Playwright test process. If the project doesn't have this set up, the skill should note it as a gap but not block.

**`references/frontend/component-vue.md`** — Vue 3 Composition API + Vitest + @vue/test-utils patterns:
- Mount with `mount(Component, { global: { plugins: [createTestingPinia({ createSpy: vi.fn })] } })`
- EntitySetup → seed the Pinia store or configure MSW handlers
- ApiCall → `await wrapper.find('button').trigger('click')`
- ResponseValidate → `expect(wrapper.text()).toContain('Buy milk')`
- EntityValidate → `expect(useStore().todos).toHaveLength(1)` — check store state, not just DOM
- Use `data-testid` for selectors, not CSS classes

**`references/frontend/component-react.md`** — React + Vitest + @testing-library/react patterns:
- Render with `render(<Component />)` wrapped in providers (Zustand, TanStack Query)
- EntitySetup → seed Zustand store via `useStore.setState()` or configure MSW handlers
- ApiCall → `await userEvent.click(screen.getByRole('button'))`
- ResponseValidate → `expect(screen.getByText('Buy milk')).toBeInTheDocument()`
- EntityValidate → `expect(useStore.getState().todos).toHaveLength(1)`
- Use `userEvent` over `fireEvent` for realistic interactions

### Templates

**`templates/backend-test.ts`** — A skeleton backend test file with all six instruction slots marked as comments. The AI fills in the specific ORM/HTTP calls based on the detected adapter.

**`templates/e2e-test.ts`** — A skeleton Playwright E2E test file.

**`templates/component-test.ts`** — A skeleton component test file (framework-agnostic structure, adapter-specific mounting).

---

## SKILL 2: `spec-test-review` (build second)

### Identity

- **name:** `spec-test-review`
- **description:** Review checklist for test quality following SpecFormula methodology. Use when reviewing test files, PRs with test changes, or when asked to review test coverage. Also trigger proactively after writing tests to self-check quality. Verifies both-layer assertions, test data isolation, time control usage, and spec consistency.

### SKILL.md Body (~80 lines)

A checklist the AI applies when reviewing tests:

**Layer 1: Core Methodology**
- [ ] Every mutating API test verifies BOTH the HTTP response AND the database state
- [ ] Test data is created via direct DB insert (ORM calls), not via API calls
- [ ] Time-dependent tests use `vi.useFakeTimers()` — no system clock dependency
- [ ] Error case tests verify nothing was accidentally persisted (EntityNonExistence pattern)
- [ ] Each test is isolated — no cross-test state leakage

**Layer 2: Spec Consistency**
- [ ] API endpoint under test has a corresponding OpenAPI spec or swagger decorator
- [ ] Entity schema matches what the test queries and asserts
- [ ] Response body assertions match the API contract's response schema
- [ ] No hardcoded IDs, timestamps, or environment-specific values

**Layer 3: Coverage Completeness**
- [ ] Happy path tested (success case with valid input)
- [ ] Validation errors tested (missing required fields, invalid types)
- [ ] Auth tested: authenticated success, unauthenticated rejection, wrong-role rejection
- [ ] Edge cases: empty collections, max-length strings, boundary values

**Layer 4: Frontend-Specific (when reviewing E2E or component tests)**
- [ ] Component tests check BOTH rendered output AND store state
- [ ] E2E tests verify the final state, not just navigation success
- [ ] MSW handlers are set up for all API calls the component makes
- [ ] Loading, error, and empty states are tested — not just the happy path

The skill should cite specific file:line references when flagging issues, and suggest the fix using the project's actual ORM/framework syntax.

---

## COMMAND: `/specformula-ts:init` (build third)

### Identity

- **name:** `init`
- **description:** One-time project setup for SpecFormula testing methodology. Detects the project's backend stack (Prisma/Drizzle/MikroORM + NestJS/Hono) and frontend stack (Vue/React + Playwright/Vitest), then scaffolds test helpers, constraint matchers, and test setup configuration.

### What the Command Does

1. **Detect stack** from `package.json`:
   - ORM: `@prisma/client` → Prisma | `drizzle-orm` → Drizzle | `@mikro-orm/core` → MikroORM
   - Framework: `@nestjs/core` → NestJS | `hono` → Hono
   - Frontend: `vue` → Vue | `react` → React
   - Test runner: `vitest` (required)
   - E2E: `@playwright/test` → Playwright

2. **Generate test helper files** into the project (NOT into the plugin — these are project-owned files):

   ```
   src/test/helpers/
   ├── setup-entity.ts      ← ORM-specific: prisma.model.create / db.insert / em.create
   ├── call-api.ts           ← Framework-specific: supertest / app.request
   ├── query-entity.ts       ← ORM-specific: prisma.model.findUnique / db.select
   ├── constraints.ts        ← CAS-equivalent matchers (stack-agnostic)
   └── setup.ts              ← Vitest globalSetup: DB connection, cleanup, fake timers
   ```

3. **Generate spec directory stubs** (only if they don't exist):
   ```
   spec/
   ├── api/
   │   └── .gitkeep           ← (or extract from existing swagger if available)
   └── data/
       └── entity-map.yml     ← (or extract from existing ORM schema)
   ```

4. **Update vitest.config.ts** to include the setup file (suggest the change, don't force it).

5. **Print a summary**: what was detected, what was generated, what to do next.

The generated helper files should be clean, minimal TypeScript. Each function should:
- Have JSDoc comments explaining the SpecFormula methodology it implements
- Use the detected ORM's actual API (not an abstraction over it)
- Be easily readable by a developer who's never heard of SpecFormula

### Helper File Content

The constraint helpers should match the exact code in `references/constraints.md`.

The `setup-entity.ts` should export a function like:
```typescript
// For Prisma:
export async function setupEntity<T extends keyof PrismaClient>(
  model: T,
  data: Parameters<PrismaClient[T]['create']>[0]['data']
) {
  return prisma[model].create({ data })
}

// For Drizzle:
export async function setupEntity<T extends PgTable>(
  table: T,
  data: InferInsertModel<T>
) {
  const [row] = await db.insert(table).values(data).returning()
  return row
}
```

The `call-api.ts` should export:
```typescript
// For NestJS + supertest:
export function callApi(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options?: { body?: unknown; auth?: { token: string } }
) {
  let req = request(app.getHttpServer())[method.toLowerCase()](path)
  if (options?.auth) req = req.set('Authorization', `Bearer ${options.auth.token}`)
  if (options?.body) req = req.send(options.body)
  return req
}

// For Hono:
export function callApi(
  method: string,
  path: string,
  options?: { body?: unknown; auth?: { token: string } }
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options?.auth) headers['Authorization'] = `Bearer ${options.auth.token}`
  return app.request(path, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })
}
```

---

## AGENT: `test-scaffolder` (build last)

### Identity

- **name:** `test-scaffolder`
- **description:** Generates test files following SpecFormula methodology. Reads the project's API routes, entity schemas, and existing test patterns to produce complete test files with the six-instruction structure. Use when the user asks to generate tests for a new feature or wants test scaffolding for existing untested endpoints.

### What the Agent Does

1. Read the endpoint being tested (NestJS controller or Hono route)
2. Read the entity schema (Prisma/Drizzle/MikroORM) for related models
3. Read existing test files in the project to match style/patterns
4. Generate a complete test file with:
   - TimeControl setup (if the feature involves timestamps)
   - EntitySetup for required test data
   - Success case tests (happy path with full ResponseValidate + EntityValidate)
   - Failure case tests (validation errors, auth failures, with EntityNonExistence)
   - Constraint assertions for dynamic values

### Agent Tools

The agent needs: Read, Write, Glob, Grep, Bash (for running the generated tests to verify they compile).

---

## Test Cases for Skill Evaluation

### Test prompts for `spec-driven-test`:

1. **Backend happy path:** "Write tests for a POST /todos endpoint that creates a todo item. The project uses NestJS + Prisma + Vitest."
   - Expected: Test file with EntitySetup (user), ApiCall (POST /todos), ResponseValidate (201 + body), EntityValidate (query DB), time control if createdAt matters.

2. **Backend error cases:** "Add tests for when the user submits a todo without a title."
   - Expected: ApiCall with missing title, ResponseValidate (400), EntityNonExistenceValidate (nothing created).

3. **E2E test:** "Write a Playwright E2E test for the login flow."
   - Expected: EntitySetup (seed user), navigate to login, fill form, submit, assert redirect + assert authenticated state.

4. **Component test (Vue):** "Write a Vitest component test for the TodoList.vue component."
   - Expected: Mount with testing Pinia, seed store, assert render, interact, assert store state changed.

5. **Stack detection:** "Write tests for this Hono endpoint" (in a project with Drizzle)
   - Expected: Loads Drizzle adapter patterns, uses `db.insert()` for EntitySetup, uses `app.request()` for ApiCall.

### Test prompts for `spec-test-review`:

1. "Review this test file" (provide a test that only checks the API response, doesn't verify DB)
   - Expected: Flags missing EntityValidate, suggests adding DB query assertion.

2. "Review this test" (provide a test that uses API calls for test data setup)
   - Expected: Flags test coupling, suggests switching to direct DB insert.

---

## Important Notes for skill-creator

1. **This is methodology, not tooling.** The skills teach thinking patterns. They don't auto-generate code from Gherkin or require a DSL. Tests are written in plain Vitest/Playwright — the skill just ensures they follow the six-instruction structure.

2. **The three target stacks are:**
   - Stack A: NestJS + MikroORM + PostgreSQL + Vitest + Vue 3 + Pinia + Mobiscroll + Playwright
   - Stack B: Hono + Drizzle + PostgreSQL + Vitest + supertest + React + Astro + Playwright
   - Stack C: NestJS + Prisma + PostgreSQL + Vitest + React + Zustand + TanStack Query + Playwright

3. **Progressive disclosure is critical.** SKILL.md should be a ~180-line decision tree. All the detailed patterns live in reference files loaded on demand. A developer writing a Prisma backend test should never see MikroORM adapter content.

4. **The "always verify the database" rule is the single most important principle.** If the skill teaches nothing else, it teaches: after every mutating API call in a test, query the database and assert the record exists. This alone catches an entire class of bugs that response-only testing misses.

5. **Don't block on missing specs.** The three-spec discipline is a goal. In existing projects, specs may not exist for every endpoint. The skill should suggest creating them but never refuse to help write tests because a spec is missing.

6. **Context-aware gearing is critical.** The skill MUST assess the situation FIRST (Step 0) before applying any methodology. A spike doesn't need tests. A bug fix doesn't need specs. A small change doesn't need the full ceremony. Only new production features get the full three-spec + six-instruction treatment. The skill should feel like a helpful pair programmer, not a process cop. If it gets in the way of fast-moving startup development, it has failed.

7. **No documents required.** The skill must work when the developer provides:
   - A 2-sentence Linear ticket
   - A verbal description ("we need overtime approval")
   - A detailed PRD with acceptance criteria
   - Nothing at all (just existing code to test)
   - A bug report
   - A spike being promoted to production
   The skill extracts specs conversationally, never demands upfront documentation.

8. **Existing codebase adoption is gradual.** On init, the skill scans and reports gaps but never demands retroactive compliance. New features follow the methodology. Old tests get upgraded incrementally when touched.

9. **Origin:** This methodology is adapted from SpecFormula ISA (Instruction Specification Architecture) — a Java BDD framework where Gherkin specifications are directly executable tests. The original uses Cucumber + Spring Boot. This TypeScript adaptation keeps the methodology (three specs, six instructions, verify both layers) but uses native TypeScript tooling (Vitest, Playwright, supertest) instead of Gherkin DSL. The architecture document at `/Users/davidl/Downloads/specformula-ts-architecture.md` has the full red team analysis and design rationale. The original SpecFormula docs are at `/Users/davidl/Projects/specformula-docs` and the framework at `/Users/davidl/Projects/specformula-dev-framework` for reference.
