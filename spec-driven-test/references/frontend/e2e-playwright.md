# Playwright E2E Test Patterns

The six-instruction methodology adapted for end-to-end browser tests. The principles stay the same — **verify the action AND the resulting state** — but the vocabulary changes.

## Instruction Mapping

| Backend Instruction | E2E Equivalent | How |
|---|---|---|
| TimeControl | `page.clock.setFixedTime()` | Set before navigation |
| EntitySetup | Seed via API or direct DB | Test data exists before user interacts |
| ApiCall | User interaction | `page.fill()`, `page.click()`, navigation |
| ResponseValidate | Assert visible UI | `expect(page.getByText(...)).toBeVisible()` |
| EntityValidate | Assert final state | Intercept API response or query DB from test |
| EntityNonExistence | Assert element hidden | `expect(locator).not.toBeVisible()` |

## Example: Login Flow

```typescript
import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    // TimeControl (if testing session expiry)
    await page.clock.setFixedTime(new Date('2026-01-27T10:00:00Z'))

    // EntitySetup — seed a user (via test API or direct DB)
    await fetch('http://localhost:3000/api/test/seed-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@test.com',
        password: 'password123',
      }),
    })

    // "ApiCall" — user interaction
    await page.goto('/login')
    await page.getByLabel('Email').fill('alice@test.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // ResponseValidate — assert UI state
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Welcome, Alice')).toBeVisible()

    // EntityValidate — verify session was created (optional but thorough)
    // Option A: Intercept the login API response
    // Option B: Check cookies
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(c => c.name === 'session')
    expect(sessionCookie).toBeDefined()
  })

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('wrong@test.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // ResponseValidate — error state
    await expect(page.getByText('Invalid credentials')).toBeVisible()
    await expect(page).toHaveURL('/login') // didn't redirect
  })
})
```

## EntitySetup for E2E Tests

E2E tests need data in the real database. Three approaches:

**1. Test seed API endpoint (recommended for most projects)**
```typescript
// A test-only endpoint that creates data
await fetch('http://localhost:3000/api/test/seed', {
  method: 'POST',
  body: JSON.stringify({ users: [{ name: 'Alice', email: 'alice@test.com' }] }),
})
```

**2. Direct DB connection from Playwright test**
```typescript
// Import your ORM/DB client in the test file
import { prisma } from './test-db-client'

test.beforeEach(async () => {
  await prisma.user.create({ data: { name: 'Alice', email: 'alice@test.com' } })
})
```

**3. Playwright fixtures**
```typescript
import { test as base } from '@playwright/test'

const test = base.extend({
  seededUser: async ({}, use) => {
    const user = await seedUser({ name: 'Alice' })
    await use(user)
    await cleanupUser(user.id)
  },
})
```

## Intercepting API Responses (EntityValidate for E2E)

```typescript
// Wait for a specific API call and inspect the response
const responsePromise = page.waitForResponse('**/api/todos')
await page.getByRole('button', { name: 'Create' }).click()
const response = await responsePromise
const body = await response.json()
expect(body.id).toBeDefined()
expect(response.status()).toBe(201)
```

## Best Practices

- Use `data-testid` attributes for stable selectors
- Use `page.getByRole()` and `page.getByLabel()` for accessibility-friendly selectors
- Wait for conditions with `expect(locator).toBeVisible()`, never `page.waitForTimeout()`
- Run with `--trace on-first-retry` to debug failures
