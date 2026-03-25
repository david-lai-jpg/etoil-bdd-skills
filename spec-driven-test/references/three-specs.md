# The Three-Spec Discipline

Three specifications should evolve together for production features. When they drift apart, bugs hide in the gaps.

## The Three Specs

| Spec | What It Defines | Where It Lives |
|---|---|---|
| **API Contract** | HTTP endpoints, request/response schemas | OpenAPI YAML or `@nestjs/swagger` decorators |
| **Entity Schema** | Database tables, columns, types, relations | Prisma schema, Drizzle table defs, MikroORM entities |
| **Test Spec** | Expected behavior across success and failure cases | `.test.ts` files following six-instruction pattern |

## When to Require Each Spec

**Not every feature needs all three.** The skill checks what's relevant:

| Feature Type | API Contract? | Entity Schema? | Test Spec? |
|---|---|---|---|
| REST API endpoint with DB writes | Yes | Yes | Yes |
| REST API that only reads | Yes | Yes (for queries) | Yes |
| Data transformation endpoint (no DB) | Yes | No | Yes |
| Cron job / background worker | No | Maybe | Yes |
| Frontend-only feature | No | No | Yes (component tests) |
| WebSocket handler | Partial (not OpenAPI) | Maybe | Yes |

## How They Cross-Reference

```
API Contract                    Entity Schema
  summary: "Create Todo"          model Todo {
  POST /todos                       id    Int
  requestBody: { title }            title String
  response: { id, title }           userId Int
       │                            }
       │                             │
       └──────── Test Spec ──────────┘
                 Asserts:
                 - POST /todos returns 201
                 - Response has { id, title }
                 - Todo record exists in DB with correct userId
```

When you rename `title` to `name` in the entity schema but forget to update the API contract, the test catches it — the response still says `title` but the DB query looks for `name`.

## Checking Spec Consistency (Review Checklist)

When reviewing tests or before shipping:

1. **API → Test:** Every endpoint in the API contract has at least one test. Response fields in tests match the contract's response schema.
2. **Entity → Test:** Every entity referenced in EntityValidate assertions matches the actual ORM schema. Column names, types, and nullable status are consistent.
3. **API → Entity:** Request body fields map to entity columns (through business logic). Response fields are derivable from entity data.

## The Flexible Approach

The three-spec discipline is a **goal**, not a gate. The skill should:

- **Suggest** creating missing specs when writing tests for a new feature
- **Never block** the developer from writing tests because a spec is missing
- **Note gaps** during review ("this endpoint has no OpenAPI spec — consider adding one")
- **Not demand retroactive compliance** for existing code

In practice, teams adopt incrementally:
1. Start with tests (always required)
2. Add entity schemas (already exist if using an ORM)
3. Add API contracts (introduce as team matures)
