---
name: spec-test-review
description: "Review checklist for test quality following the six-instruction BDD methodology. Use when reviewing test files, PRs with test changes, asked to 'review tests', 'check test coverage', 'review this PR', 'code review', or 'pre-commit check'. Also trigger proactively after writing tests with spec-driven-test to self-check quality before claiming done. Verifies both-layer assertions, test data isolation, time control usage, and spec consistency. Use this skill whenever the user mentions reviewing, auditing, or validating test quality."
---

# BDD Test Review Checklist

Apply this checklist when reviewing test files or PRs. Cite specific `file:line` references for each finding and suggest fixes using the project's actual ORM/framework syntax.

## Layer 1: Core Methodology (Critical)

These are the rules that catch real bugs. Every violation is a potential production incident.

- [ ] **Both-layer assertion:** Every test that calls a mutating API (POST, PUT, PATCH, DELETE) verifies BOTH the HTTP response AND the database state. A test that only checks `expect(res.status).toBe(201)` without querying the DB is incomplete. The fix: add an EntityValidate step — query the DB and assert the record exists with expected values.

- [ ] **Test data isolation:** Test data is created via direct ORM calls (`prisma.user.create()`, `db.insert()`, `em.create()`), NOT by calling other API endpoints. If you see `await request(app).post('/users')` used to set up data for a different test, flag it — this creates test coupling.

- [ ] **Time control:** Tests that assert on timestamps (`createdAt`, `updatedAt`, expiry) use `vi.useFakeTimers()` with a fixed time. Tests that use `Date.now()` or `new Date()` without mocking are flaky.

- [ ] **Error case persistence check:** Tests for error paths (400, 403, 404, 409) verify that nothing was accidentally persisted. After a rejected request, the DB should be unchanged.

- [ ] **Test isolation:** Each test starts with clean state. Look for shared mutable state between tests (module-level variables, unreset singletons). Verify `afterEach` or `afterAll` cleans up DB state.

## Layer 2: Spec Consistency (Important)

These catch drift between API contracts, entity schemas, and test assertions.

- [ ] **API contract exists:** The endpoint under test has a corresponding OpenAPI spec entry or `@ApiOperation()` swagger decorator. Flag missing specs as a gap (don't block).

- [ ] **Schema-test alignment:** Field names in test assertions match the actual ORM schema. If the test asserts `todo.title` but the Prisma model renamed it to `name`, that's a mismatch.

- [ ] **Response shape matches contract:** Fields asserted in ResponseValidate match what the API contract says the endpoint returns. No phantom fields.

- [ ] **No hardcoded values:** No hardcoded IDs (`expect(res.body.id).toBe(42)`), timestamps, or environment-specific values. Use constraint helpers (`toSatisfy(isNum)`) for dynamic values.

## Layer 3: Coverage Completeness (Good to Have)

Missing scenarios that should probably exist.

- [ ] **Happy path covered:** At least one test for the success case with valid input.
- [ ] **Validation errors covered:** Missing required fields, invalid types, out-of-range values.
- [ ] **Auth scenarios covered:** Authenticated success, unauthenticated (401), wrong role/permissions (403).
- [ ] **Edge cases:** Empty collections, max-length strings, boundary values, concurrent operations.

## Layer 4: Frontend-Specific

Apply when reviewing component tests or E2E tests.

- [ ] **Both-layer for components:** Component tests check BOTH rendered output AND store state (Pinia/Zustand). A test that only checks `expect(wrapper.text()).toContain(...)` without verifying the store is incomplete.

- [ ] **E2E verifies final state:** E2E tests don't just check navigation — they verify the final data state via API response interception or DB query.

- [ ] **API mocking is complete:** MSW handlers exist for all API calls the component makes. Missing handlers cause silent failures.

- [ ] **All states tested:** Loading state, error state, and empty state are tested — not just the happy path with data.

## Output Format

For each finding, report:
```
[SEVERITY] file:line — What's wrong
  → Suggested fix (using the project's actual ORM/framework syntax)
```

Severities:
- **CRITICAL** — Missing EntityValidate on mutating API test, test coupling via API
- **HIGH** — No time control on time-dependent test, no error persistence check
- **MEDIUM** — Missing auth scenarios, no API contract
- **LOW** — Missing edge case coverage, hardcoded values
