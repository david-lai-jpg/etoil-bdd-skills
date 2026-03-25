# Supertest Patterns for NestJS

HTTP client patterns for the ApiCall instruction when using NestJS + supertest.

## Setup

```typescript
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '@/app.module'

let app: INestApplication

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = module.createNestApplication()
  await app.init()
})

afterAll(async () => {
  await app.close()
})
```

## ApiCall Patterns

```typescript
// POST with JSON body + auth
const res = await request(app.getHttpServer())
  .post('/todos')
  .set('Authorization', `Bearer ${token}`)
  .send({ title: 'Buy milk', description: 'Two bottles' })

// GET with query parameters
const res = await request(app.getHttpServer())
  .get('/todos')
  .set('Authorization', `Bearer ${token}`)
  .query({ status: 'active', page: 1 })

// PUT (full update)
const res = await request(app.getHttpServer())
  .put(`/todos/${todoId}`)
  .set('Authorization', `Bearer ${token}`)
  .send({ title: 'Updated', completed: true })

// PATCH (partial update)
const res = await request(app.getHttpServer())
  .patch(`/todos/${todoId}`)
  .set('Authorization', `Bearer ${token}`)
  .send({ completed: true })

// DELETE
const res = await request(app.getHttpServer())
  .delete(`/todos/${todoId}`)
  .set('Authorization', `Bearer ${token}`)

// Unauthenticated (testing 401)
const res = await request(app.getHttpServer())
  .post('/todos')
  .send({ title: 'Buy milk' })
```

## ResponseValidate with supertest

Supertest returns the response object. Access `.status` and `.body`:

```typescript
expect(res.status).toBe(201)
expect(res.body).toMatchObject({ title: 'Buy milk' })
expect(res.body.id).toSatisfy(isNum)
```

## Helper Pattern

Wrap repetitive patterns in a helper:

```typescript
function callApi(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  opts?: { body?: unknown; auth?: string; query?: Record<string, unknown> }
) {
  let req = request(app.getHttpServer())[method](path)
  if (opts?.auth) req = req.set('Authorization', `Bearer ${opts.auth}`)
  if (opts?.query) req = req.query(opts.query)
  if (opts?.body) req = req.send(opts.body)
  return req
}
```
