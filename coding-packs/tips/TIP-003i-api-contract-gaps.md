# TIP-003i — Khớp API với Blueprint §4: cursor chuẩn, /action-logs đủ lọc, /kb/*, /runs/:id/cancel, /profile-layouts?as_role

## HEADER
- **Parallel-safe with TIP-050 (coverage-closure manifest):** sequential, shares `packages/actions/src/registry.test.ts`; integrate 003i before050.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `packages/core/src/booking/services/calendar-read.service.ts`; integrate 003i before047c.
- TIP-ID: TIP-003i; Project: AppChat V2; Module: api read contracts; Priority: P1; Estimated: M. TIP bổ sung cho TIP-003 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 003d (OpenAPI), 019b (runs), 020b (kb), 023b, 045b (audit projection) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-003i-files.md) — 16 paths (3 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`; integrate 003i before004b.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`; integrate 003i before013b.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/action-logs.read.ts`, `packages/core/src/ai/kb/kb.read.ts`, `packages/core/src/booking/services/calendar-read.service.ts`; integrate 015c before003i.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/api/src/http/ai/agents.controller.ts`; integrate 015d before003i.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `packages/core/src/booking/services/calendar-read.service.ts`; integrate 015e before003i.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `packages/core/src/ai/kb/kb.read.ts`; integrate 020e before003i.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/api/src/http/ai/assistant.controller.ts`; integrate 023c before003i.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/api/src/http/ai/assistant.controller.ts`; integrate 023d before003i.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/api/src/http/ai/assistant.controller.ts`; integrate 023f before003i.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `apps/api/src/http/ai/assistant.controller.ts`; integrate 023g before003i.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/api/src/http/crm/crm-settings.controller.ts`; integrate 026b before003i.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `packages/core/src/booking/services/calendar-read.service.ts`; integrate 033b before003i.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `packages/core/src/booking/services/calendar-read.service.ts`; integrate 033c before003i.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/api/src/http/ai/agents.controller.ts`, `packages/core/src/booking/services/calendar-read.service.ts`; integrate 038 before003i.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `packages/core/src/billing/payments/invoices.service.ts`; integrate 039 before003i.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`, `packages/core/src/identity/settings/settings-read.service.ts`; integrate 042 before003i.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/booking/services/calendar-read.service.ts`; integrate 042c before003i.
- **Dòng COVERAGE nhận:** BP-4.1-c; BP-4.3-c; BP-4.4-ai-d; BP-4.5-c; BP-4.4-crm-b; BP-3.3-b.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - Cursor `base64(sortKey,id)` chỉ có ở `billing/services/billing-read.service.ts:22`; nhiều list trả `next_cursor: null` cố định: `ai/assistant/action-logs.read.ts:135`, `billing/payments/invoices.service.ts`, `booking/services/calendar-read.service.ts`, `identity/settings/settings-read.service.ts`, `apps/api/src/http/ai/{agents,ai,assistant}.controller.ts`, `documents/doc-templates.controller.ts`, `identity/settings.controller.ts`.
  - `GET /action-logs` (`apps/api/src/http/ai/assistant.controller.ts:81`) chỉ lọc kind/status/day/q (shape FE), thiếu `actor_type, action_id, module, from, to, cursor` (Blueprint §4.3).
  - Không có `GET /kb/folders`, `/kb/sources` (chỉ `/settings/kb`, `ai.controller.ts:48`) — 020b chỉ thêm `/kb/sources/:id/download`.
  - Không có `POST /runs/:id/cancel` (chỉ action `run.cancel`, `ai/runs/run-cancel.handler.ts:17`).
  - Hồ sơ 360: có `/settings/fields`, `/settings/profile-layouts` (`crm-settings.controller.ts:16,24`) thay `/custom-fields?entity=`, `/profile-layouts/:id?as_role=` mà không DV ghi.
  - `ticket.bulk_update` thiếu `bulk:true` (`packages/actions/src/support.ts:177`) — 034c đã nhận sửa; dòng BP-3.3-b còn yêu cầu **mọi** action bulk luôn preview kèm số bản ghi kể cả nguồn ui → kiểm toàn registry.

## APPLICABLE STANDARDS
- api/response-envelope.md; database/indexing.md (cursor, keyset, deferred join); actions/action-registry.md (bulk); Blueprint §4.1–4.5.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 003i` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Lấy danh sách list route thật từ `tools/obligations/routes.json`; đánh dấu route nào thuộc 9 bảng D42 (page+limit) — những route đó giữ phân trang số trang, không đổi sang cursor.
4. Xác nhận 034c đã đặt `bulk:true` cho ticket; TIP này chỉ thêm test registry quét mọi action bulk.

## TASK
Đưa các list còn lại về cursor chuẩn (trừ bảng D42), bổ sung route đọc thiếu theo Blueprint, ghi DV cho route đổi tên có chủ đích, và chặn action bulk thiếu cờ preview.

## SPECIFICATIONS
### 1. Cursor
1. Helper `kernel/http/cursor.ts` encode/decode `base64url(JSON[sortKey,id])`; mọi list không thuộc D42 trả `next_cursor` thật, `limit` ≤ 100 mặc định 30, keyset `(sort, id)` có index tương ứng; EXPLAIN ghi report.
### 2. Route bổ sung
1. `GET /v1/action-logs` nhận `actor_type, action_id, module, from, to, cursor` (giữ tham số cũ FE đang dùng), quyền audit.view/assistant theo hiện hành.
2. `GET /v1/kb/folders`, `GET /v1/kb/sources?folder_id=&status=&cursor=` (kb.manage hoặc kb.view theo hiện hành), dùng chung service với `/settings/kb`.
3. `POST /v1/runs/:id/cancel` = gọi action `run.cancel` qua Executor (không đường ghi thứ hai).
### 3. Hồ sơ 360 + bulk
1. Giữ `/settings/fields`, `/settings/profile-layouts`; thêm `GET /v1/profile-layouts/:id?as_role=` (xem trước theo vai trò); ghi DV đổi tên route.
2. Test registry: mọi action có `bulk` đầu vào mảng ID ≥ 2 phải khai `bulk:true` → policy luôn preview.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|List 250 dòng|duyệt hết bằng cursor, không trùng/sót — integration mỗi route|
|2|`/action-logs?module=crm&from=…`|lọc đúng; cursor|
|3|`/kb/sources?folder_id=`|đúng thư mục, tôn trọng visibility|
|4|`POST /runs/:id/cancel`|huỷ run qua Executor, có action_log|
|5|`/profile-layouts/:id?as_role=sales`|layout theo vai trò|
|6|Registry test bulk|đỏ nếu action bulk thiếu cờ|

### Commands / evidence gate
- `pnpm --filter @appchat/actions test -- src/registry.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/read-contracts.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- 9 bảng D42 giữ page+limit; không đổi shape FE đang dùng (chỉ thêm tham số).
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 16 path, header khai hai phía, 6 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
