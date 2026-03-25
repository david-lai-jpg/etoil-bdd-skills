# Time Control Patterns

Mock time to make time-dependent tests deterministic.

## Vitest (Backend + Component Tests)

```typescript
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-27T10:00:00Z'))
})

afterAll(() => {
  vi.useRealTimers()  // ALWAYS restore — forgetting this breaks subsequent tests
})
```

**Advancing time within a test** (for testing expiry, scheduling, intervals):
```typescript
it('expires the token after 1 hour', async () => {
  const token = await generateToken(user.id)

  // Advance time by 61 minutes
  vi.advanceTimersByTime(61 * 60 * 1000)

  const res = await callApi('GET', '/me', { auth: token })
  expect(res.status).toBe(401) // token expired
})
```

## Playwright (E2E Tests)

```typescript
test('shows correct timestamp', async ({ page }) => {
  // Set fixed time BEFORE navigating
  await page.clock.setFixedTime(new Date('2026-01-27T10:00:00Z'))

  await page.goto('/dashboard')
  await expect(page.getByText('Jan 27, 2026')).toBeVisible()
})
```

**Advancing time in Playwright:**
```typescript
await page.clock.setFixedTime(new Date('2026-01-27T10:00:00Z'))
await page.goto('/timer')

// Fast-forward 5 minutes
await page.clock.fastForward(5 * 60 * 1000)
await expect(page.getByText('05:00')).toBeVisible()
```

## When to Use TimeControl

**Always mock time when the test asserts on:**
- `createdAt` / `updatedAt` timestamps
- Token expiry or session timeout
- Scheduling or cron-like logic
- Business rules involving time (overtime after 8 hours, leave request dates)
- Relative time calculations ("posted 5 minutes ago")

**Skip TimeControl when:**
- Test doesn't involve time at all
- Time values are purely passed through (stored but never computed on)

## Common Pitfall

Forgetting `vi.useRealTimers()` in `afterAll`. When fake timers leak into the next test file, you get bizarre failures — setTimeout never fires, async operations hang, tests timeout for no apparent reason.

```typescript
// ALWAYS pair these:
beforeAll(() => vi.useFakeTimers())
afterAll(() => vi.useRealTimers())
```
