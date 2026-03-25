# Constraint Helpers (CAS for TypeScript)

When exact values aren't known (auto-generated IDs, timestamps, computed fields), use constraint helpers with Vitest's `toSatisfy` matcher instead of hardcoding values.

## Helper Functions

Generate these into your project's `src/test/helpers/constraints.ts` (or wherever your test helpers live):

```typescript
// Type checks
export const isNum = (v: unknown): boolean => typeof v === 'number'
export const isStr = (v: unknown): boolean => typeof v === 'string'
export const isBool = (v: unknown): boolean => typeof v === 'boolean'
export const isNotNull = (v: unknown): boolean => v !== null && v !== undefined

// Numeric comparisons
export const gt = (n: number) => (v: unknown): boolean =>
  typeof v === 'number' && v > n
export const lt = (n: number) => (v: unknown): boolean =>
  typeof v === 'number' && v < n
export const between = (lo: number, hi: number) => (v: unknown): boolean =>
  typeof v === 'number' && v >= lo && v <= hi
export const eq = (n: number) => (v: unknown): boolean =>
  typeof v === 'number' && v === n

// String checks
export const contains = (sub: string) => (v: unknown): boolean =>
  typeof v === 'string' && v.includes(sub)
export const startsWith = (pre: string) => (v: unknown): boolean =>
  typeof v === 'string' && v.startsWith(pre)
export const matches = (re: RegExp) => (v: unknown): boolean =>
  typeof v === 'string' && re.test(v)

// Enum check
export const oneOf = (...opts: unknown[]) => (v: unknown): boolean =>
  opts.includes(v)

// Time comparison (within 1 second precision)
export const sameTime = (expected: string | Date) => (v: unknown): boolean => {
  const a = new Date(expected).getTime()
  const b = v instanceof Date ? v.getTime() : new Date(String(v)).getTime()
  return Math.abs(a - b) < 1000
}

// Array checks
export const hasItem = (item: unknown) => (v: unknown): boolean =>
  Array.isArray(v) && v.includes(item)
export const hasLength = (n: number) => (v: unknown): boolean =>
  Array.isArray(v) && v.length === n
export const isNotEmpty = (v: unknown): boolean =>
  Array.isArray(v) && v.length > 0
```

## Usage Examples

```typescript
import { isNum, between, oneOf, sameTime, contains } from '../helpers/constraints'

// Auto-generated ID — can't know the exact value
expect(res.body.id).toSatisfy(isNum)

// Age must be in range
expect(res.body.age).toSatisfy(between(18, 65))

// Status enum
expect(res.body.status).toSatisfy(oneOf('PENDING', 'APPROVED', 'REJECTED'))

// Timestamp matches mock time
expect(res.body.createdAt).toSatisfy(sameTime('2026-01-27T10:00:00Z'))

// Email format
expect(res.body.email).toSatisfy(contains('@'))

// Combine with standard matchers
expect(res.body.title).toBe('Buy milk')        // exact match when you know the value
expect(res.body.id).toSatisfy(isNum)            // constraint when you don't
```

## When to Use Constraints vs. Exact Values

| Value type | Use | Example |
|---|---|---|
| Known exact value | `.toBe()` / `.toEqual()` | `expect(res.body.title).toBe('Buy milk')` |
| Auto-generated ID | `isNum` | `expect(res.body.id).toSatisfy(isNum)` |
| Timestamps | `sameTime` | `expect(res.body.createdAt).toSatisfy(sameTime(...))` |
| Computed values | `between`, `gt`, `lt` | `expect(res.body.totalHours).toSatisfy(gt(0))` |
| Enum fields | `oneOf` | `expect(res.body.role).toSatisfy(oneOf('admin', 'user'))` |
| String patterns | `contains`, `matches` | `expect(res.body.url).toSatisfy(startsWith('https://'))` |
