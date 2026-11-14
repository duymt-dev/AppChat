# TIP-003e — if_version cho mọi entity còn thiếu, bảng chỉ thêm, đính chính hành động đã gửi

## HEADER
- **Parallel-safe with TIP-051d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before051d.
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before051.
- **Parallel-safe with TIP-051c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before051c.
- **Parallel-safe with TIP-050 (coverage-closure manifest):** sequential, shares `packages/actions/src/support.ts`; integrate 003e before050.
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before049.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before048.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 003e before048b.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before048g.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `packages/actions/src/support.ts`; integrate 003e before047b.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before047c.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before026c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before032e.
- TIP-ID: TIP-003e; Project: AppChat V2; Module: kernel + domain concurrency; Priority: P0; Estimated: L. TIP bổ sung cho TIP-003 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 032c (quote/contract/order CAS), 015d/015f/025b/026b (contact + profile_layout CAS), 027b (product), 033b (appointment CAS), 034c (ticket bulk/version DTO) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-003e-files.md) — 23 paths (10 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-006b (coverage-closure manifest):** sequential, shares `packages/db/prisma/tenant/kernel.prisma`; integrate 006b before003e.
- **Parallel-safe with TIP-012d (coverage-closure manifest):** sequential, shares `packages/db/prisma/tenant/kernel.prisma`; integrate 003e before012d.
- **Parallel-safe with TIP-001c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/actions/useAction.ts`; integrate 003e before001c.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/core/src/kernel/actions/executor.ts`; integrate 003b before003e.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate 003c before003e.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/errors.json`, `apps/web/messages/vi/errors.json`, `packages/actions/src/crm.ts`; integrate 003e before003f.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 012b before003e.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 012c before003e.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/db/prisma/tenant/crm.prisma`; integrate 003e before013c.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 014b before003e.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 015b before003e.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/crm.ts`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate 015c before003e.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/crm.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-flow.handlers.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/core/src/support/actions/ticket-edit.handlers.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 015e before003e.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 019c before003e.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 020b before003e.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 020e before003e.
- **Parallel-safe with TIP-021b (coverage-closure manifest):** sequential, shares `packages/actions/src/ai.ts`; integrate 021b before003e.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/ai.ts`, `packages/actions/src/index.ts`, `packages/db/prisma/tenant/ai-agents.prisma`; integrate 022b before003e.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/actions/useAction.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-flow.handlers.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/core/src/support/actions/ticket-edit.handlers.ts`; integrate 023b before003e.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/actions/useAction.ts`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate 023c before003e.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate 023d before003e.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 023e before003e.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 023f before003e.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 030b before003e.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 030c before003e.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 003e before031b.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/actions/useAction.ts`, `packages/actions/src/index.ts`, `packages/actions/src/invoices.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate 032b before003e.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 032d before003e.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/booking.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-flow.handlers.ts`; integrate 033b before003e.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-flow.handlers.ts`; integrate 033c before003e.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 034b before003e.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 034d before003e.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 036 before003e.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 037 before003e.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 038 before003e.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 038b before003e.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/actions/useAction.ts`, `packages/actions/src/index.ts`; integrate 039 before003e.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/actions/useAction.ts`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate 040 before003e.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate 041 before003e.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 042 before003e.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 042b before003e.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/db/prisma/tenant/crm.prisma`; integrate 042c before003e.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 043 before003e.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/actions/useAction.ts`, `packages/actions/src/crm.ts`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 045b before003e.
- **Dòng COVERAGE nhận:** STD-domain-concurrency-1a; STD-domain-concurrency-1b; STD-domain-concurrency-T; DEF-030-3; REQ-E09c; STD-code-testing-2c.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `if_version` hiện chỉ ở product (`catalog/.../product.handlers.ts:86`) và doc_template (`documents/actions/doc-template.handlers.ts:69`). Contact/quote/contract/order/product đã có TIP chờ nhận CAS (015d/f, 025b, 026b, 032c, 027b); profile_layout → 026b SPEC 5, appointment confirm/update/deactivate → 033b, ticket version DTO/patch → 034c. Còn trống: **invoice (customer_payment request), ticket (sửa đơn lẻ ngoài phần 034c), ai_agent**. Campaign → 037.
  - `ticket` (`support.prisma:83`), payment request (`sales-payments.prisma:155`) có cột `version` nhưng handler không nhận `if_version`.
  - Undo hiện xoá bảng sự kiện: `order-edit.handlers.ts:73,182`, `order-flow.handlers.ts:87,117`, `payments/services/payment-write.ts:105` xoá `order_event`; `order-create.handlers.ts:97` xoá `order`, `ticket-create.handler.ts:134` xoá `ticket`, `product.handlers.ts:70` xoá `product` → cascade (`onDelete: Cascade`, `catalog.prisma:131`, `sales-orders.prisma:135`, `support.prisma`) xuống bảng sự kiện. Trigger chặn DELETE vô điều kiện sẽ phá undo 24h.
  - `action_log` (`kernel.prisma:43–65`) không có cột đính chính.
  - FE: `STALE_VERSION` chỉ có ở mock; `useAction.ts` không xử lý 409, không có chuỗi `errors.STALE_VERSION`.
  - Bảng chỉ thêm: chỉ `contract_signature_event` có trigger (migration 030). `stock_movement` (`catalog.prisma:119`), `order_event` (`sales-orders.prisma:124`), `ticket_event` (`support.prisma:110`) chưa chặn UPDATE/DELETE.
  - REQ-E09c: undo 24h đạt; action risk `send` không undo được nhưng không có "ghi đính chính".

## APPLICABLE STANDARDS
- domain/concurrency.md §1, §7, test; events/outbox.md; actions/action-registry.md (undo); REQ-E09.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 003e` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc lại 032c/015d/026b/027b/033b/034c đã tích hợp: entity nào đã có CAS thì bỏ khỏi phạm vi, không làm lại.
4. Liệt kê mọi đường undo/xoá chạm `stock_movement`/`order_event`/`ticket_event` (trực tiếp và cascade) trên mã đã tích hợp; mỗi đường phải chạy trong `withUndoAllowance` trước khi bật trigger.
5. Kiểm `timeline_event`, `integration_event`, `action_log` có UPDATE hợp lệ không (vd undo đánh dấu) trước khi thêm trigger — chỉ chặn bảng thật sự chỉ thêm.

## TASK
Hoàn tất khoá lạc quan cho entity còn trống, FE xử lý xung đột thống nhất, trigger chặn sửa/xoá bảng sự kiện, và ghi đính chính cho hành động đã gửi ra ngoài.

## SPECIFICATIONS
### 1. Version
1. Migration thêm `row_version int not null default 1` cho `ai_agent` (cột `version` hiện là số phiên bản cấu hình — không lẫn). profile_layout (026b) và appointment (033b) không thuộc TIP này.
2. Action update/flow của invoice request, ticket (phần 034c chưa phủ), ai_agent nhận `if_version` tuỳ chọn; có thì `UPDATE … WHERE id AND version = $v` → 0 dòng = `STALE_VERSION` 409; luôn tăng version.
### 2. FE
1. `useAction` nhận 409 `STALE_VERSION` → Modal "Bản ghi vừa được người khác cập nhật" + nút Tải lại (invalidate query) và Giữ bản của tôi (không tự ghi đè).
2. Form sửa của các entity trên gửi `if_version` từ dữ liệu đã tải.
### 3. Bảng chỉ thêm (tương thích undo — DC-292)
1. Trigger `BEFORE UPDATE` + `BEFORE TRUNCATE` luôn raise cho `stock_movement`, `order_event`, `ticket_event` (mẫu migration 030).
2. `BEFORE DELETE` raise trừ khi `current_setting('app.undo_allow', true) = 'on'`; cờ chỉ đặt bằng `SET LOCAL app.undo_allow = 'on'` trong helper `withUndoAllowance(tx)` mà `ActionExecutor` gọi duy nhất ở nhánh undo (cùng transaction, tự hết khi commit/rollback). Cascade từ xoá `order`/`ticket`/`product` khi undo đi qua cùng cờ.
3. Mọi đường xoá khác (job, handler thường, SQL tay) vẫn bị chặn; test grep: `app.undo_allow` chỉ xuất hiện trong helper.
### 4. Đính chính
1. Cột `action_log.correction jsonb null` (migration cùng TIP). Action `action_log.add_correction` (risk write) yêu cầu đúng permission của action gốc trong registry (vd `quote.send`) **và** scope tới bản ghi gốc — không tạo permission mới (DC-292); chỉ ghi được một lần cho mỗi log, sửa tiếp = thêm mục mới vào mảng `correction[]` (không ghi đè). Ghi `correction[{note, by, at}]` vào bản ghi action gốc risk `send`, hiện ở nhật ký Trợ lý + Cài đặt › Nhật ký; tuỳ chọn tạo bản nháp tin đính chính (không tự gửi).
### 5. Contract test
1. Contract test API đọc FE↔BE: so shape `packages/shared/src/api/*` với response thật của mọi route GET trong routes.json (integration), kênh dùng chung contract của 045b.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Hai client cùng `if_version` sửa ticket/invoice request/agent|đúng một thành công, một 409|
|2|FE nhận 409|modal + Tải lại; không mất nội dung đang nhập — E2E mock + http|
|3|`UPDATE stock_movement` / `DELETE order_event` ngoài undo|lỗi trigger — integration|
|4|Bật trigger, undo tạo đơn `new`, undo thu tiền, undo tạo ticket, undo tạo sản phẩm trong 24h|undo vẫn thành công, sự kiện con xoá theo cascade — integration|
|5|Người chỉ có `audit.view` gọi add_correction trên log `quote.send`|403|
|6|Action send đã chạy|nút Hoàn tác ẩn, có "Ghi đính chính"; log hiện đính chính|
|7|Test song song chuyển trạng thái|một transition thắng, còn lại 409/CONFLICT — `concurrency.test.ts`|
|8|Đổi field DTO mà không cập nhật shared|contract test đỏ|

### Commands / evidence gate
- `pnpm --filter @appchat/core test -- test/concurrency-unit.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/concurrency.test.ts`
- `pnpm e2e concurrency`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không làm lại CAS đã thuộc 015d/026b/032c/027b/033b/034c/037; không đổi luật COMMERCE; không tạo permission mới.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 23 path, header khai hai phía, 8 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [x] Rà trước khi làm xong; manifest khớp (lệch ghi DV-126).
- [x] Mọi AC có test chạy thật, dán output.
- [x] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [x] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
