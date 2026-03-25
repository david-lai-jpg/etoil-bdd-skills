# etoil-bdd-skills

SpecFormula BDD testing methodology adapted for TypeScript full-stack development.
Two Claude Code skills that teach the six-instruction test pattern across your entire stack.

適用於 TypeScript 全端開發的 SpecFormula BDD 測試方法論。
兩個 Claude Code 技能，在你的所有技術棧中教導六指令測試模式。

---

## What This Is / 這是什麼

These skills don't generate code from Gherkin or require a DSL. They teach Claude a **testing discipline** — six instructions that ensure every test verifies both the API response AND the database state. The methodology comes from SpecFormula ISA, a Java BDD framework where specifications are directly executable tests. This adaptation keeps the methodology but uses native TypeScript tooling.

這些技能不會從 Gherkin 生成程式碼，也不需要 DSL。它們教導 Claude 一套**測試紀律** — 六個指令，確保每個測試都驗證 API 回應和資料庫狀態。方法論來自 SpecFormula ISA，一個 Java BDD 框架，其規格可直接作為可執行測試。這個改編版保留了方法論，但使用原生 TypeScript 工具。

### The Six Instructions / 六個指令

| # | Instruction | What It Does | 做什麼 |
|---|---|---|---|
| 1 | **TimeControl** | Mock time for deterministic tests | 模擬時間，確保測試結果一致 |
| 2 | **EntitySetup** | Insert test data directly via ORM (never via API) | 透過 ORM 直接插入測試資料（絕不透過 API） |
| 3 | **ApiCall** | Make the HTTP request to the endpoint under test | 對被測端點發送 HTTP 請求 |
| 4 | **ResponseValidate** | Assert status code + response body | 驗證狀態碼和回應內容 |
| 5 | **EntityValidate** | Query DB and assert the record exists | 查詢資料庫，驗證記錄存在 |
| 6 | **EntityNonExistence** | For error cases, assert nothing was persisted | 錯誤情況下，驗證沒有資料被寫入 |

**The most important rule:** After every mutating API call, query the database and verify the record. API returning 200 does not guarantee data persisted.

**最重要的規則：** 每次呼叫會修改資料的 API 後，都要查詢資料庫驗證記錄。API 回傳 200 不代表資料真的寫入了。

---

## Supported Stacks / 支援的技術棧

| Stack | Backend | ORM | Frontend | Test Runner |
|---|---|---|---|---|
| **A** | NestJS | MikroORM | Vue 3 + Pinia | Vitest + Playwright |
| **B** | Hono | Drizzle | React + Astro | Vitest + Playwright |
| **C** | NestJS | Prisma | React + Zustand + TanStack Query | Vitest + Playwright |

The skills auto-detect your stack from `package.json` and load the right adapter patterns. You never see code for an ORM you don't use.

技能會從 `package.json` 自動偵測你的技術棧，載入對應的適配器模式。你不會看到你沒有使用的 ORM 的程式碼。

---

## Installation / 安裝

### Option 1: Symlink (recommended for development)

```bash
git clone <repo-url> ~/Projects/etoil-bdd-skills
ln -sf ~/Projects/etoil-bdd-skills/spec-driven-test ~/.claude/skills/spec-driven-test
ln -sf ~/Projects/etoil-bdd-skills/spec-test-review ~/.claude/skills/spec-test-review
```

### Option 2: Direct copy

```bash
cp -R spec-driven-test ~/.claude/skills/
cp -R spec-test-review ~/.claude/skills/
```

After installation, restart Claude Code. The skills will appear in your available skills list.

安裝後重新啟動 Claude Code。技能會出現在你的可用技能列表中。

---

## The Two Skills / 兩個技能

### `spec-driven-test` — Writing Tests / 撰寫測試

Triggers when you're writing or modifying test files, implementing features, or asked to test something.

當你撰寫或修改測試檔案、實作功能，或被要求測試某些東西時觸發。

**What it does:**
1. **Assesses the situation** — spike? bug fix? new feature? Adjusts ceremony accordingly
2. **Detects your stack** — reads `package.json`, loads the right ORM + HTTP client adapter
3. **Extracts specs conversationally** — asks "what endpoints? what data? what can fail?" instead of demanding PRDs
4. **Applies the six-instruction pattern** — ensures every test has EntitySetup, ApiCall, ResponseValidate, AND EntityValidate

**它做什麼：**
1. **評估情境** — 原型？修 bug？新功能？依情況調整流程
2. **偵測技術棧** — 讀取 `package.json`，載入對應的 ORM + HTTP 客戶端適配器
3. **對話式規格提取** — 問「需要什麼端點？儲存什麼資料？什麼會失敗？」而非要求 PRD
4. **套用六指令模式** — 確保每個測試都有 EntitySetup、ApiCall、ResponseValidate 和 EntityValidate

### `spec-test-review` — Reviewing Tests / 審查測試

Triggers when reviewing test files, PRs, or checking test coverage.

當審查測試檔案、PR 或檢查測試覆蓋率時觸發。

**What it checks:**
- Does every mutating test verify BOTH response AND database?
- Is test data created via ORM, not API calls?
- Do time-dependent tests mock the clock?
- Do error case tests verify nothing was persisted?
- Is auth coverage complete (success + 401 + 403)?

**它檢查什麼：**
- 每個修改資料的測試是否同時驗證回應和資料庫？
- 測試資料是否透過 ORM 建立，而非 API 呼叫？
- 時間相關的測試是否模擬了時鐘？
- 錯誤情況的測試是否驗證沒有資料被寫入？
- 認證覆蓋是否完整（成功 + 401 + 403）？

---

## Three Gears / 三個檔位

The skill adjusts its behavior based on context. It never forces full ceremony on a quick fix.

技能會根據情境調整行為。它不會在快速修復時強制要求完整流程。

| Gear | When / 何時 | What Happens / 會發生什麼 |
|---|---|---|
| **Gear 1: Spike** | Prototyping, exploring | Skill stays quiet. Offers tests when you say "productionize this" |
| **Gear 2: Ship** | Feature going to production | Scaffolds tests from existing code. 15-30 min to full coverage |
| **Gear 3: Disciplined** | Core feature others depend on | Full spec-first, test-first, verify both layers |

| 檔位 | 何時 | 會發生什麼 |
|---|---|---|
| **檔位 1：原型** | 原型開發、探索 | 技能保持安靜。當你說「準備上線」時才提供測試 |
| **檔位 2：出貨** | 功能要上線 | 從現有程式碼生成測試。15-30 分鐘達到完整覆蓋 |
| **檔位 3：嚴謹** | 其他功能依賴的核心功能 | 完整的規格優先、測試優先、雙層驗證 |

---

## Tutorials / 教學

### Scenario 1: New Feature from a Linear Ticket / 情境一：從 Linear 工單開發新功能

You paste: "Add overtime approval. Managers can approve/reject subordinate overtime requests."

你貼上：「新增加班審核。主管可以批准或駁回下屬的加班申請。」

**What happens:**

The skill asks three questions (not twenty):
1. "What endpoints?" → POST /overtime-requests, POST /:id/approve, POST /:id/reject
2. "What gets stored?" → OvertimeRequest with employeeId, hours, reason, status, reviewerId
3. "What can fail?" → Non-manager tries to approve, employee approves own request

Then it generates tests with all six instructions before you write any implementation code.

**會發生什麼：**

技能問三個問題（不是二十個）：
1. 「需要什麼端點？」→ POST /overtime-requests, POST /:id/approve, POST /:id/reject
2. 「儲存什麼資料？」→ OvertimeRequest 包含 employeeId, hours, reason, status, reviewerId
3. 「什麼會失敗？」→ 非主管嘗試批准、員工批准自己的申請

然後在你寫任何實作程式碼之前，生成包含所有六個指令的測試。

### Scenario 2: Bug Fix / 情境二：修 Bug

Report: "Email update returns old email in response but saves new email to DB."

回報：「更新 Email 時，回應中回傳舊 Email，但資料庫存的是新 Email。」

**What happens:**

No spec ceremony. No PRD questions. The skill goes straight to:
1. Create a user with `old@example.com` (EntitySetup — direct DB)
2. PATCH with `new@example.com` (ApiCall)
3. Assert response has `new@example.com` (ResponseValidate — this catches the bug)
4. Assert DB has `new@example.com` (EntityValidate — this confirms the write works)

The ResponseValidate + EntityValidate combo is exactly how you diagnose response/persistence discrepancies.

**會發生什麼：**

不需要規格流程。不需要 PRD 問題。技能直接進入：
1. 建立一個 `old@example.com` 的使用者（EntitySetup — 直接 DB）
2. PATCH 更新為 `new@example.com`（ApiCall）
3. 驗證回應中是 `new@example.com`（ResponseValidate — 這會抓到 bug）
4. 驗證資料庫中是 `new@example.com`（EntityValidate — 確認寫入正確）

ResponseValidate + EntityValidate 的組合正是診斷回應與持久化不一致的方法。

### Scenario 3: Productionizing a Spike / 情境三：原型上線

You: "This overtime thing is working, let's make it production-ready."

你：「加班功能可以了，準備上線。」

**What happens:**

The skill reads your existing routes and generates comprehensive test files:
- Reads the controller/route code to understand endpoints
- Reads the entity schema to understand data shape
- Generates test files matching your project's existing patterns
- You review and tweak — 15-30 minutes instead of writing from scratch

**會發生什麼：**

技能讀取你現有的路由，生成完整的測試檔案：
- 讀取 controller/route 程式碼來理解端點
- 讀取 entity schema 來理解資料結構
- 生成符合你專案現有模式的測試檔案
- 你審查和調整 — 15-30 分鐘，而不是從零開始寫

### Scenario 4: Reviewing Existing Tests / 情境四：審查現有測試

You: "Review the tests in src/test/orders.test.ts"

你：「審查 src/test/orders.test.ts 裡的測試」

**What the review skill catches:**

```
[CRITICAL] orders.test.ts:10 — Test data created via API call (POST /users)
  → Use prisma.user.create() instead to avoid test coupling

[CRITICAL] orders.test.ts:22 — No DB verification after POST /orders
  → Add: const order = await prisma.order.findUnique({ where: { id: res.body.id } })

[HIGH] orders.test.ts:30 — Error case doesn't check DB
  → Add: const orders = await prisma.order.findMany({ where: { userId } })
         expect(orders).toHaveLength(0)
```

---

## Eval Results / 評估結果

Tested against 5 realistic scenarios with 27 assertions:

用 5 個真實情境和 27 個斷言進行測試：

| | With Skill | Without Skill | Delta |
|---|---|---|---|
| **Pass Rate** | 96.3% (26/27) | 59.3% (16/27) | **+37%** |

| Eval | With / 有技能 | Without / 無技能 | Impact / 影響 |
|---|---|---|---|
| Prisma backend test | 6/7 | 4/7 | +2 (DB verification + time control) |
| Drizzle/Hono detection | 6/6 | 2/6 | **+4** (real queries vs mocked DB) |
| Test review | 5/5 | 1/5 | **+4** (catches SpecFormula violations) |
| Bug fix (no ceremony) | 4/4 | 4/4 | 0 (skill correctly minimal) |
| Vue component | 5/5 | 5/5 | 0 (Claude already good here) |

---

## File Structure / 檔案結構

```
etoil-bdd-skills/
├── spec-driven-test/                  ← Primary skill: writing tests
│   ├── SKILL.md                       ← Decision tree entry point
│   ├── references/
│   │   ├── six-instructions.md        ← Deep dive on the 6 instructions
│   │   ├── three-specs.md             ← Three-spec discipline
│   │   ├── constraints.md             ← CAS-equivalent assertion helpers
│   │   ├── time-control.md            ← Time mocking patterns
│   │   ├── test-isolation.md          ← Cleanup strategies per ORM
│   │   ├── adapters/
│   │   │   ├── prisma.md              ← Prisma-specific patterns
│   │   │   ├── drizzle.md             ← Drizzle-specific patterns
│   │   │   └── mikroorm.md            ← MikroORM-specific patterns
│   │   ├── frontend/
│   │   │   ├── e2e-playwright.md      ← Playwright E2E patterns
│   │   │   ├── component-vue.md       ← Vue 3 component test patterns
│   │   │   └── component-react.md     ← React component test patterns
│   │   └── http-clients/
│   │       ├── supertest.md           ← NestJS supertest patterns
│   │       └── hono-testing.md        ← Hono test helper patterns
│   └── templates/
│       └── backend-test.ts            ← Skeleton test file
├── spec-test-review/                  ← Review skill: checking tests
│   └── SKILL.md                       ← Review checklist
├── evals/                             ← Test cases for skill validation
│   └── evals.json
├── docs/                              ← Architecture and design docs
│   ├── specformula-ts-architecture.md
│   └── specformula-ts-handoff.md
├── plugin.json
└── README.md
```

---

## Origin / 起源

Adapted from [SpecFormula ISA](https://github.com/nicotw) — a Java BDD framework by 水球軟體學院 (Waterball Software Academy) where Gherkin specifications are directly executable tests via Cucumber + Spring Boot. This TypeScript adaptation keeps the methodology (three specs, six instructions, verify both layers) but replaces the Java runtime with native Vitest/Playwright patterns.

改編自 [SpecFormula ISA](https://github.com/nicotw) — 水球軟體學院開發的 Java BDD 框架，其中 Gherkin 規格透過 Cucumber + Spring Boot 可直接作為可執行測試。這個 TypeScript 改編版保留了方法論（三個規格、六個指令、雙層驗證），但將 Java 執行環境替換為原生的 Vitest/Playwright 模式。

---

## License

MIT
