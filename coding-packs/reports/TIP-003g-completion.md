# Báo cáo hoàn thành TIP-003g — Vệ sinh Clock, nhắc giờ làm việc & ngân sách query list

**Trạng thái:** DONE  
**Nhánh:** `tip/003g-time-query-hygiene` (tách từ `origin/dev` `4d55d8b8`)  
**Commit code + test:** `994a7a2f` (`feat(kernel,web): TIP-003g vệ sinh Clock, nhắc giờ làm việc, ngân sách query list`)  
**Worktree:** `D:/CODING/AppChat-Agy` (`wt1`, Postgres 16 `*_wt1`, Memurai `6381`)

---

## 1. Tóm tắt thay đổi

1. **Vệ sinh Clock (`STD-domain-money-2.2`, `STD-code-testing-4b`):**
   - Dọn toàn bộ lời gọi `new Date()` không đối số và `Date.now()` trực tiếp trong 17 file nghiệp vụ (`packages/core/src/{ai,billing,booking,channels,contracts,crm,integrations,loyalty,platform,sales}/**`): `send.processor.ts:38,184`, `sessions.ts:6`, `channels.module.ts:142,167,176`, `channels.jobs.module.ts`, `create-group.processor.ts`, `provider-operations.processor.ts`, `integration-call.processor.ts`, `kb-search.handler.ts`, `reply.service.ts`, `billing.jobs.module.ts`, `quota.service.ts`, `wallet.service.ts`, `contract-file.handlers.ts`, `contact-owner.handlers.preview.ts`, `config.handler.ts`, `model.handlers.ts`, `finance-config.handlers.ts`.
   - Thêm rule ESLint `no-restricted-syntax` tại `packages/core/eslint.config.mjs:20-34` cho glob `src/**/{services,actions,jobs}/**/*.ts`, chặn `NewExpression[callee.name='Date'][arguments.length=0]` và `CallExpression[callee.object.name='Date'][callee.property.name='now']` (vẫn cho phép parse chuỗi/số `new Date(x)` và `performance.now()`).
2. **Dời mốc nhắc ngoài giờ làm việc (`STD-domain-money-2.5`):**
   - Tạo `packages/core/src/kernel/time/reminder-schedule.ts` (`reminderCalendarOf`, `toReminderCalendar`, `nextBusinessMoment`, `isBusinessMoment`, `quoteRemindScheduledAt`, `isQuoteRemindDue`, `invoiceRemindScheduledAt`, `dueInvoiceReminder`, `appointmentRemindScheduledAt`, `dueAppointmentReminder`).
   - Đọc `workspace.settings.business_hours` (múi giờ mặc định `Asia/Ho_Chi_Minh`, fallback lịch hành chính Mon–Fri khi chưa cấu hình), dời sang khung làm việc kế tiếp qua `addBusinessMinutes(at, 0, cal)` cho báo giá `T-2`, đề nghị thanh toán `T-1 / T+1 / T+7`, và lịch hẹn `24h` (`remindInvoices` quét lùi 14 ngày tại `packages/core/src/sales/system/dispatch.ts:52` để mốc cuối tuần vẫn chạy vào sáng làm việc kế tiếp). Riêng nhắc lịch hẹn `2h` miễn dời (gửi 24/7).
   - Nối vào `sales/{quotes/services/quote-system.ts,payments/services/payment-system.ts,system/dispatch.ts,jobs/{sales.jobs.module,payment.jobs}.ts}` và `booking/{services/booking-system.ts,system/dispatch.ts,jobs/booking.jobs.module.ts}`.
3. **Frontend ngày hiện tại tươi qua nửa đêm (`DEF-032-3`):**
   - Bổ sung hook `useToday()` tại `apps/web/src/shared/time/today.ts:21-53`: giữ `MOCK_TODAY = '2026-06-24'` ở chế độ `mock` để bảo toàn parity; ở chế độ `http` tự làm mới khi mount, khi đồng hồ qua 00:00 (`msUntilNextMidnight`), khi `window.focus` và `visibilitychange`.
   - Thay `const TODAY = todayIso()` cấp module bằng `useToday()` tại `OrderFormModal.tsx:44`, `ContractFormModal.tsx:87`, `InvoiceFormModal.tsx:52`, `PaymentModals.tsx:29`.
4. **Bỏ `SELECT *` & kiểm ngân sách SQL O(1) (`STD-database-indexing-8`, `STD-database-indexing-9`):**
   - Sửa `packages/core/src/ai/tasks/tasks.read.ts:137` thay `SELECT r.*` bằng danh sách cột tường minh.
   - Bật `log: [{ emit: 'event', level: 'query' }]` trong `createTenantDb` (`packages/db/src/clients.ts:17`) để `countQueries` (`packages/core/test/support/count-queries.ts:14-48`) đo được câu SQL thật trên `TenantDb` lấy từ `TenantDbResolver`.
   - Tạo `apps/api/test/integration/query-budget.test.ts` (seed 10 → 100 bản ghi kèm quan hệ con, warm-up 1 lượt, đo 5 list API `/contacts`, `/quotes`, `/orders`, `/tickets`, `/ai-tasks`).

---

## 2. Rà trước khi làm (trên code thật)

1. **Audit `new Date()` / `Date.now()` (`packages/core/src`):**
   - Sửa sạch toàn bộ lời gọi business-time trong `src/**/{services,actions,jobs}/**/*.ts` (17 file nêu trên) và bật lint `no-restricted-syntax` (`pnpm --filter @appchat/core lint` → exit `0`).
   - Kiểm tra `git grep -n -E "Date\.now\(|new Date\(\s*\)" -- packages/core/src` còn 35 dòng ngoài thư mục nghiệp vụ / thuộc hạ tầng hợp lệ:
     - Đo hiệu năng / latency / sleep backoff polling: `ai/assistant/genui/turn-wait.ts:26,27,30`, `ai/runs/run-lineage.ts:39,48`, `data-transfer/adapters/catalog.ts:44,48`, `identity/lifecycle/{archive-run.ts:113,138, dispatcher.ts:87,89, restore-run.ts:51,66,73,76}`, `integrations/operations/call-runner.ts:68,81,85,114`.
     - Định nghĩa / fallback tuỳ chọn khi không inject `Clock`: `kernel/clock.ts:1,10` (`SystemClock`), `kernel/ids.ts:8` (`uuidv7`), `kernel/rate-limit.ts:62`, `ai/assistant/discovery/cache.ts:42`, `ai/runs/runner.ts:141`, `ai/tasks/event-fanout.ts:66`, `inbox/groups/group-read.ts:46`, `kernel/events/protocol/{cutover.ts:57, v2-job.ts:24}`, `marketing/ai/marketing-ai.jobs.ts:45`.
     - Sinh mã kỹ thuật / log / docstring: `identity/lifecycle/lifecycle.providers.ts:62` (BullMQ jobId), `integrations/mail/module.ts:34` (fake SMTP messageId), `notify/delivery/admission.ts:31` (delivery enqueue timestamp), `channels/jobs/send.processor.ts:37` (comment).
2. **Nhịp job quét nhắc & cấu trúc `business_hours`:**
   - Job quét chạy theo nhịp cố định trong code thật: `booking.jobs.module.ts:22` (`EVERY_MS = 5 * 60_000`), `sales.jobs.module.ts:33` (`EVERY_MS = 15 * 60_000`, báo giá), `payment.jobs.ts:17` (`PAYMENT_SWEEP_EVERY_MS = 30 * 60_000`, đề nghị).
   - `workspace.settings.business_hours` đọc qua `reminderCalendarOf(w)` — ngoài giờ `isBusinessMoment(now, cal)` trả `false`, nên các job quét bỏ qua hoặc dời sang sáng/ngày làm việc kế tiếp, chống gửi lặp bằng `reminded_at` (quote) và `reminders_sent` (invoice, appointment).
3. **Audit `SELECT *` & danh sách endpoint:**
   - `git grep -n -E "SELECT\s+(\w+\.)?\*" -- apps/api/src packages/core/src`: 0 kết quả `SELECT *` trong bất kỳ list API nào (duy nhất 1 dòng comment tại `contact-view.ts:30` và nội bộ CTE `ins.*` / `b.*` / `cur.*` tại `support/trends/{projection,read}.ts`).
   - Kết quả đo thực tế trên PostgreSQL 16 (`query-budget.test.ts`, 10 bản ghi vs 100 bản ghi kèm quan hệ con, không `SELECT *`):

| Endpoint (`limit=100`) | Số query @10 | Số query @100 | `SELECT *` | Kết luận |
|---|---:|---:|---|---|
| `GET /contacts?page=1&limit=100` | 10 | 10 | 0 | O(1) PASS |
| `GET /quotes?page=1&limit=100` | 13 | 13 | 0 | O(1) PASS |
| `GET /orders?page=1&limit=100` | 9 | 9 | 0 | O(1) PASS |
| `GET /tickets?page=1&limit=100` | 8 | 8 | 0 | O(1) PASS |
| `GET /ai-tasks` | 8 | 8 | 0 | O(1) PASS |

---

## 3. Giả định đã chọn & lệch manifest / ca đỏ sẵn ngoài TIP

- **`DC-701` (`coding-packs/DECISIONS.md`):** Chính sách dời mốc nhắc ngoài giờ (`reminderCalendarOf` + `addBusinessMinutes(at, 0, cal)`, `remindInvoices` quét lùi 14 ngày để mốc cuối tuần chạy vào sáng làm việc kế tiếp, lịch hẹn `2h` miễn dời 24/7) + bật Prisma `log: [{ emit: 'event', level: 'query' }]` trong `createTenantDb` (`packages/db/src/clients.ts:17`).
- **`DV-701` (`coding-packs/DEVIATIONS.md`):** `tips/manifests/TIP-003g-files.md` liệt kê 16 file; thực tế sửa tổng 38 file (giữ nguyên manifest theo `DV-122 / DV-125`): +15 file trong `core` để rule ESLint Clock xanh 0 lỗi, +6 file `sales/booking` phủ báo giá `T-2` + lịch hẹn `24h` / `2h`, +1 file `packages/db/src/clients.ts` cho query event.
- **Ca đỏ có sẵn trên `origin/dev` ngoài phạm vi TIP-003g (đã chứng minh):**
  1. **`e2e/http/orders.spec.ts:56` (`Q-058`, ghi từ `2026-11-08`):** Trong run gộp `orders.spec.ts contracts.spec.ts invoices.spec.ts`, tạo đơn `DH-001001` qua `OrderFormModal` (`useToday()`), xác nhận và hoàn tất đều qua bình thường (`lines 34–54`), tới dòng 56 lỗi `Expected > 0, Received 0` vì spec này tạo đơn chỉ có tiền cọc `paidTotal = 0` rồi hoàn tất ngay trong khi luật TIP-036 (`DC-297 c`, `earnBase` ở `packages/shared/src/loyalty/math.ts:39-46`) tính điểm theo thực thu (`0đ → 0 điểm`). TIP-003g không sửa `loyalty` hay `orders.spec.ts`; giữ nguyên theo `Q-058`.
  2. **`pnpm parity -- --done`:** 103/109 màn `PASS` / `PAID` / `DEBT` (gồm toàn bộ 15 màn `orders`, `contracts`, `invoices` đều `PASS` `0.0153`–`0.0398`). Có 6 màn đỏ sẵn trên `origin/dev` do cập nhật prototype v2026-11-10 (`c4bb2221`, D60–D64): `inbox:default` (`0.0814`), `inbox:folder-rail` (`0.0647`), `inbox:conv-menu` (`0.0669`), `inbox:chat-menu` (`0.0739`), `customers:360` (`0.1287`), `calendar:create` (`size mismatch 540x810 vs 540x779`). Chứng minh ngoài TIP: `git diff --stat origin/dev -- apps/web/` chỉ chạm 5 file (`shared/time/today.ts` và 4 modal `contracts / invoices / orders`), `0` dòng đụng `inbox`, `customers`, hay `calendar`.

---

## 4. Đối chiếu standards

| Standard | Tuân thủ / Bằng chứng (`file:dòng` · test) | Lệch |
|---|---|---|
| `standards/domain/money-time-numbering.md` (§2.2 Clock, §2.4 ngày FE, §2.5 nhắc giờ làm việc) | `packages/core/eslint.config.mjs:20-34`; 17 file nghiệp vụ dùng `Clock` (`send.processor.ts:38,184`, `sessions.ts:6`, …); `reminder-schedule.ts` + `sales/{system/dispatch,payments/services/payment-system,quotes/services/quote-system,jobs/*}.ts` + `booking/{system/dispatch,services/booking-system,jobs/booking.jobs.module}.ts` (`business-time-reminders.test.ts` 4/4); `apps/web/src/shared/time/today.ts:21-53` (`today.test.ts` 2/2) | `DV-701` (sửa thêm 21 file `core` so với manifest để dứt điểm rule & AC2) |
| `standards/database/indexing.md` (§8 cấm `SELECT *`, §9 không N+1 + test đếm query) | `packages/core/src/ai/tasks/tasks.read.ts:137` liệt kê cột tường minh (`git grep` 0 hit list API); `packages/db/src/clients.ts:17` (`log: [{ emit: 'event', level: 'query' }]`); `packages/core/test/support/count-queries.ts:36`; `apps/api/test/integration/query-budget.test.ts:219-252` O(1) 10 vs 100 trên 5 endpoint | `DV-701` (`packages/db/src/clients.ts` thêm 1 dòng bật event) |
| `standards/code/testing.md` (§4b Clock cố định + ngân sách query) | `packages/core/test/business-time-reminders.test.ts` (`FixedClock`), `apps/web/src/shared/time/today.test.ts` (`vi.useFakeTimers`), `packages/core/test/support/count-queries.ts` (`countQueries`), `apps/api/test/integration/query-budget.test.ts` | — |
| `standards/ui/frontend-structure.md` | Logic `useToday()` đặt gọn trong `apps/web/src/shared/time/today.ts` (53 dòng), tách unit test `today.test.ts` (59 dòng); 4 modal giữ dưới trần dòng (`lint:size` pass) | — |
| `standards/ui/prototype-parity.md` | `todayIso()` / `useToday()` giữ `MOCK_TODAY = '2026-06-24'` ở chế độ `mock` (D38 / parity §4); `pnpm parity -- orders contracts invoices` đạt 15/15 `PASS` (`0.0153`–`0.0398`, đều `< 5%`) | `inbox/*`, `customers:360`, `calendar:create` đỏ sẵn trên `origin/dev` (`c4bb2221`, không thuộc TIP-003g) |
| `standards/ui/interaction-patterns.md` | Không đổi bố cục hay luồng modal; cập nhật trường ngày hiệu lực tự động khi mở modal qua ngày / focus tab không làm mất input đang nhập | — |
| `standards/i18n/i18n.md` | Không thêm hardcoded text UI mới; `pnpm i18n:check` đạt 100.0% (`7391` key `en` / `vi`) | — |
| `coding-packs/docs/06-prototype/DEVIATIONS.md` | Không phát sinh PD mới (`pnpm lint:masks` 56 mask / 44 PD đều có căn cứ) | — |

---

## 5. Kết quả chạy lệnh kiểm chứng thật

### 5.1 Turbo lint / typecheck / unit / build & static gates (`origin/dev` → HEAD)
```text
$ pnpm turbo run lint typecheck test build --filter=...[origin/dev]
• Packages in scope: @appchat/api, @appchat/core, @appchat/db, @appchat/web, @appchat/worker
@appchat/db:test:       Test Files  6 passed (6), Tests  35 passed (35)
@appchat/worker:test:   Test Files  2 passed (2), Tests  7 passed (7)
@appchat/api:test:      Test Files  2 passed (2), Tests  11 passed (11)
@appchat/web:test:      Test Files  172 passed (172), Tests  592 passed (592) (gồm today.test.ts 2/2)
@appchat/core:test:     all passed (gồm test/business-time-reminders.test.ts 4/4)
Tasks:    18 successful, 18 total (8m32.534s)

$ pnpm depcheck
✔ no dependency violations found (4613 modules, 19391 dependencies cruised)

$ pnpm lint:size
lint:size — 4688 file, không file nào vượt trần

$ pnpm lint:tokens
lint:tokens — 1135 file, đúng thang D41

$ pnpm lint:masks
lint:masks — 56 mask, 44 PD trong sổ, đều có căn cứ

$ pnpm i18n:check
en: 7391 key, phủ 100.0%
vi: 7391 key, phủ 100.0%
```

### 5.2 Integration trên PostgreSQL 16 + Memurai `wt1`
```text
$ pnpm --filter @appchat/db db:test-reset
db:test-reset xong — appchat_platform_test_wt1: drop 3 DB tenant test, platform 24 migration, template +0

$ pnpm --filter @appchat/api test:integration -- test/integration/query-budget.test.ts
[query-budget] {"contacts":{"q10":10,"q100":10},"quotes":{"q10":13,"q100":13},"orders":{"q10":9,"q100":9},"tickets":{"q10":8,"q100":8},"ai-tasks":{"q10":8,"q100":8}}
 ✓ test/integration/query-budget.test.ts (1 test) 5257ms
 Test Files  1 passed (1), Tests  1 passed (1)

$ pnpm --filter @appchat/api test:integration -- test/integration/quotes.test.ts test/integration/payments.test.ts test/integration/booking.test.ts test/integration/ai-tasks.test.ts
 ✓ test/integration/payments.test.ts (16 tests) 22308ms
 ✓ test/integration/ai-tasks.test.ts (13 tests) 4935ms
 ✓ test/integration/quotes.test.ts (17 tests) 16291ms
 ✓ test/integration/booking.test.ts (12 tests) 5592ms
 Test Files  4 passed (4), Tests  58 passed (58)
```

### 5.3 E2E Mock, E2E HTTP & Parity
```text
$ pnpm e2e -- orders contracts invoices
  21 skipped (viewport đối xứng desktop/mobile-390)
  21 passed (47.6s)

$ $env:TENANT_CLIENT_CACHE='10'; pnpm e2e:http -- contracts.spec.ts invoices.spec.ts
  ok 3 [desktop] › e2e\http\invoices.spec.ts:10:3 (14.0s)
  ok 2 [desktop] › e2e\http\contracts.spec.ts:31:3 (28.2s)
  2 skipped
  2 passed (47.2s)
(Lưu ý Q-058: chạy riêng e2e/http/orders.spec.ts qua bước tạo/xác nhận/hoàn tất đơn DH-001001 bằng OrderFormModal, dừng ở dòng 56 od-points = 0 do quy tắc TIP-036 DC-297 c đã ghi nhận từ trước tại Q-058.)

$ pnpm parity -- orders contracts invoices
PASS  contracts:list                     0.0347
PASS  contracts:kanban                   0.0203
PASS  contracts:detail                   0.0153
PASS  contracts:create                   0.0304
PASS  orders:list                        0.0342
PASS  orders:detail                      0.0352
PASS  orders:files                       0.0398
PASS  orders:create                      0.0293
PASS  invoices:list                      0.0203
PASS  invoices:detail-qr                 0.0322
PASS  invoices:record-payment            0.0341
PASS  invoices:files                     0.0207
PASS  invoices:create                    0.0396
PASS  contracts:ai                       0.0210
PASS  orders:ai                          0.0191
```
- `pnpm parity -- --done`: 103/109 màn đạt (`PASS` / `PAID` / `DEBT`); 6 màn đỏ sẵn trên `origin/dev` không chạm bởi TIP-003g (`inbox:default 0.0814`, `inbox:folder-rail 0.0647`, `inbox:conv-menu 0.0669`, `inbox:chat-menu 0.0739`, `customers:360 0.1287`, `calendar:create size mismatch 540x810 vs 540x779`).
- Provider thật: TIP-003g chỉ đụng kernel Clock / nhắc giờ / FE today / SQL query hygiene, không phát sinh giao tiếp mới với provider ngoài (mọi kiểm thử chạy trên Postgres 16 + Memurai `6381` thật tại `wt1`).
