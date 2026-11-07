# TIP-003g — Đồng hồ qua Clock, nhắc trong giờ làm việc, ngày hôm nay ở FE, không SELECT *, test đếm query

## HEADER
- TIP-ID: TIP-003g; Project: AppChat V2; Module: kernel time + query budget; Priority: P0; Estimated: M. TIP bổ sung cho TIP-003 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 019b, 012c, 014b (channels jobs chung file) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-003g-files.md) — 16 paths (5 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-022d (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 003g before022d.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `apps/web/src/features/contracts/components/ContractFormModal.tsx`, `apps/web/src/features/invoices/components/InvoiceFormModal.tsx`, `apps/web/src/features/orders/components/OrderFormModal.tsx`; integrate 003f before003g.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/sessions.ts`, `packages/core/src/sales/payments/services/payment-system.ts`; integrate 003b before003g.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/sessions.ts`, `packages/core/src/sales/jobs/sales.jobs.module.ts`, `packages/core/src/sales/payments/services/payment-system.ts`; integrate 003c before003g.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/sales.jobs.module.ts`; integrate 012b before003g.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 015c before003g.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/sales.jobs.module.ts`; integrate 015d before003g.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/sales/payments/services/payment-system.ts`; integrate 015f before003g.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 020c before003g.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 022c before003g.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/jobs/sessions.ts`; integrate 023b before003g.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/src/features/contracts/components/ContractFormModal.tsx`; integrate 030b before003g.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/sales.jobs.module.ts`, `packages/core/src/sales/payments/services/payment-system.ts`; integrate 032b before003g.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/src/features/contracts/components/ContractFormModal.tsx`, `apps/web/src/features/orders/components/OrderFormModal.tsx`; integrate 032c before003g.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/components/OrderFormModal.tsx`; integrate 003g before033d.
- **Parallel-safe with TIP-035b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/tasks/tasks.read.ts`; integrate 003g before035b.
- **Parallel-safe with TIP-035c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/sales.jobs.module.ts`; integrate 003g before035c.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 037 before003g.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 040 before003g.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/sessions.ts`; integrate 041 before003g.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/src/features/invoices/components/InvoiceFormModal.tsx`, `apps/web/src/features/invoices/components/PaymentModals.tsx`, `apps/web/src/features/orders/components/OrderFormModal.tsx`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/sales/jobs/sales.jobs.module.ts`; integrate 045b before003g.
- **Dòng COVERAGE nhận:** STD-code-testing-4b; STD-domain-money-2.2; STD-domain-money-2.5; DEF-032-3; STD-database-indexing-8; STD-database-indexing-9.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `FixedClock` có (`kernel/clock.ts`); `channels/jobs/send.processor.ts:50,103`, `sessions.ts:81–123` còn `Date.now()`/`new Date()` cho thời gian nghiệp vụ.
  - `sales/payments/services/payment-system.ts:41` `remindDue` và nhắc báo giá hết hạn không xét giờ làm việc; job chạy `every` cố định (`sales.jobs.module.ts:90`). `packages/shared/src/time/business-time.ts` đã có hàm giờ làm việc.
  - FE `shared/time/today.ts:7–11` + `OrderFormModal.tsx:37`, `ContractFormModal.tsx:48`, `InvoiceFormModal.tsx:33`, `PaymentModals.tsx:19` tính TODAY ở module scope — tab mở qua nửa đêm dùng ngày cũ.
  - `ai/tasks/tasks.read.ts:137` `SELECT r.*` trong list; không có test đếm query (grep `$on('query'` = 0).

## APPLICABLE STANDARDS
- code/testing.md §4b; domain/money-time-numbering.md §2.2, §2.5; database/indexing.md §8–9.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 003g` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Grep toàn bộ `Date.now()|new Date()` trong `packages/core/src/**` (không tính parse timestamp, đo hiệu năng) — phân loại, lưu danh sách vào report.

## TASK
Thời gian nghiệp vụ chỉ qua Clock (có lint), nhắc dời vào giờ làm việc, FE tính "hôm nay" khi render, bỏ SELECT * khỏi list, thêm test đếm query cho repo list.

## SPECIFICATIONS
### 1. Clock
1. Inject `Clock` vào send.processor, sessions và mọi callsite đã phân loại; ESLint rule `no-restricted-syntax` cấm `Date.now()`/`new Date()` không đối số trong `packages/core/src/**/{services,actions,jobs}` (cho phép có comment `// perf` hoặc parse).
### 2. Giờ làm việc
1. Nhắc T-2 báo giá, T-1/T+1/T+7 đề nghị thanh toán, lịch hẹn 24h: tính mốc → `nextBusinessMoment(workspace.working_hours, tz)`; ngoài giờ dời tới đầu giờ kế tiếp; idempotent theo (đối tượng, mốc).
### 3. FE ngày
1. `useToday()` đọc lại khi mở form và khi focus tab; mock giữ 2026-06-24 cho parity.
### 4. Query
1. `tasks.read.ts` chọn cột tường minh; test helper `countQueries(prisma, fn)` (Prisma `$on("query")`) cho list contact/quote/order/ticket/task: số query không phụ thuộc số dòng.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Lint Clock|0 vi phạm sau sửa|
|2|Nhắc rơi vào 22:00|gửi lúc đầu giờ kế tiếp — unit với FixedClock|
|3|Tab mở 23:59 → 00:01 mở form|ngày mới — unit useToday|
|4|List 10 vs 100 dòng|cùng số query — `query-budget.test.ts`|
|5|grep `SELECT \*` trong list API|0|

### Commands / evidence gate
- `pnpm --filter @appchat/core test -- test/business-time-reminders.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/query-budget.test.ts`
- `pnpm --filter @appchat/web test`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không đổi mốc nhắc COMMERCE; chỉ dời theo giờ làm việc.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 16 path, header khai hai phía, 5 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
