# Hono Testing Patterns

HTTP client patterns for the ApiCall instruction when using Hono.

## Setup

Hono has built-in test support — no supertest needed.

```typescript
import { app } from '@/app'  // your Hono app instance

// No server startup needed — Hono handles requests in-process
```

## ApiCall Patterns

```typescript
// POST with JSON body + auth
const res = await app.request('/todos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ title: 'Buy milk' }),
})

// GET with query parameters
const res = await app.request('/todos?status=active&page=1', {
  headers: { 'Authorization': `Bearer ${token}` },
})

// DELETE
const res = await app.request(`/todos/${todoId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` },
})

// Unauthenticated
const res = await app.request('/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Buy milk' }),
})
```

## ResponseValidate with Hono

Hono returns a standard `Response` object. Parse the body:

```typescript
expect(res.status).toBe(201)

const body = await res.json()
expect(body).toMatchObject({ title: 'Buy milk' })
expect(body.id).toSatisfy(isNum)
```

**Note:** Unlike supertest (which auto-parses JSON into `.body`), Hono returns a raw `Response`. You must call `.json()` to parse the body. This is an async operation.

## Helper Pattern

```typescript
async function callApi(
  method: string,
  path: string,
  opts?: { body?: unknown; auth?: string }
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts?.auth) headers['Authorization'] = `Bearer ${opts.auth}`

  const res = await app.request(path, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })

  return {
    status: res.status,
    body: res.headers.get('content-type')?.includes('json')
      ? await res.json()
      : await res.text(),
  }
}
```

This normalizes the response to match supertest's shape (`{ status, body }`), making tests portable across frameworks.
