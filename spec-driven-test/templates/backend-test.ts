/**
 * Backend Test Template
 *
 * Six-instruction structure:
 * 1. TimeControl — mock time if the feature involves timestamps
 * 2. EntitySetup — insert test data directly via ORM (never via API)
 * 3. ApiCall — make the HTTP request to the endpoint under test
 * 4. ResponseValidate — assert status code + response body
 * 5. EntityValidate — query DB, assert record exists with expected values
 * 6. EntityNonExistenceValidate — for error cases, assert nothing was persisted
 *
 * Adapt the ORM calls and HTTP client to your stack:
 * - Prisma: prisma.model.create() / prisma.model.findUnique()
 * - Drizzle: db.insert(table).values() / db.select().from(table)
 * - MikroORM: em.create() + em.flush() / em.findOne()
 * - NestJS: request(app.getHttpServer()).post()
 * - Hono: app.request()
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
// Import your ORM client, HTTP test client, and constraint helpers

describe('Feature Name', () => {
  // ── 1. TimeControl ──────────────────────────────────
  // Uncomment if the feature involves timestamps
  // beforeAll(() => {
  //   vi.useFakeTimers()
  //   vi.setSystemTime(new Date('2026-01-27T10:00:00Z'))
  // })
  // afterAll(() => vi.useRealTimers())

  // ── Cleanup ─────────────────────────────────────────
  afterEach(async () => {
    // Delete test data — children before parents
    // await prisma.todo.deleteMany()
    // await prisma.user.deleteMany()
  })

  describe('success cases', () => {
    it('happy path — creates and persists', async () => {
      // 2. EntitySetup — direct DB insert
      // const alice = await prisma.user.create({ data: { ... } })

      // 3. ApiCall
      // const res = await request(app.getHttpServer())
      //   .post('/endpoint')
      //   .set('Authorization', `Bearer ${token}`)
      //   .send({ ... })

      // 4. ResponseValidate
      // expect(res.status).toBe(201)
      // expect(res.body).toMatchObject({ ... })

      // 5. EntityValidate — ALWAYS check the database
      // const record = await prisma.model.findUnique({ where: { id: res.body.id } })
      // expect(record).not.toBeNull()
      // expect(record!.field).toBe(expectedValue)
    })
  })

  describe('failure cases', () => {
    it('rejects invalid input', async () => {
      // 2. EntitySetup
      // const alice = await prisma.user.create({ data: { ... } })

      // 3. ApiCall — with bad input
      // const res = await request(app.getHttpServer())
      //   .post('/endpoint')
      //   .set('Authorization', `Bearer ${token}`)
      //   .send({ /* missing required fields */ })

      // 4. ResponseValidate — error status
      // expect(res.status).toBe(400)

      // 6. EntityNonExistenceValidate — nothing persisted
      // const records = await prisma.model.findMany({ where: { userId: alice.id } })
      // expect(records).toHaveLength(0)
    })

    it('rejects unauthenticated request', async () => {
      // 3. ApiCall — no auth header
      // const res = await request(app.getHttpServer())
      //   .post('/endpoint')
      //   .send({ ... })

      // 4. ResponseValidate
      // expect(res.status).toBe(401)
    })
  })
})
