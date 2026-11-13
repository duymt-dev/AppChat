# TIP-006c — Sự kiện realtime còn thiếu (credits.changed, ui.command) và vô hiệu cache registry nhiều tiến trình

## HEADER
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `packages/shared/src/events.ts`; integrate 006c before047c.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 006c before047d.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 006c before032e.
- TIP-ID: TIP-006c; Project: AppChat V2; Module: realtime + registry cache; Priority: P1; Estimated: M. TIP bổ sung cho TIP-006 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 019b (run.step/run.done), 025b (conversation.counts), 023c (ui), 039 (wallet) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-006c-files.md) — 9 paths (3 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/core/src/billing/services/wallet.service.ts`, `packages/shared/src/events.ts`; integrate 003b before006c.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`; integrate 003c before006c.
- **Parallel-safe with TIP-006b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/core/src/notify/realtime/emitter.ts`; integrate 006b before006c.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/shared/src/events.ts`; integrate 012b before006c.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/shared/src/events.ts`; integrate 012c before006c.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `packages/shared/src/events.ts`; integrate 014b before006c.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `packages/shared/src/events.ts`; integrate 015b before006c.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/notify/realtime/emitter.ts`; integrate 015c before006c.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/shared/src/events.ts`; integrate 015d before006c.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/shared/src/events.ts`; integrate 015e before006c.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/shared/src/events.ts`; integrate 015f before006c.
- **Parallel-safe with TIP-016b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 006c before016b.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`; integrate 019c before006c.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `packages/shared/src/events.ts`; integrate 022b before006c.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`; integrate 022c before006c.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`; integrate 023b before006c.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`; integrate 023d before006c.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`, `packages/shared/src/events.ts`; integrate 023e before006c.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`; integrate 023f before006c.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`; integrate 023g before006c.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/shared/src/events.ts`; integrate 026b before006c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`, `packages/shared/src/events.ts`; integrate 032b before006c.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/shared/src/events.ts`; integrate 033b before006c.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`; integrate 033c before006c.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/shared/src/events.ts`; integrate 034b before006c.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 034c before006c.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`; integrate 038 before006c.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `packages/db/src/tenant-resolver.ts`; integrate 040 before006c.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `packages/db/src/tenant-resolver.ts`; integrate 041 before006c.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`, `packages/db/src/tenant-resolver.ts`; integrate 045b before006c.
- **Dòng COVERAGE nhận:** BP-4.6-b; DEF-002-2.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - Blueprint §4.6 L1008: `run.step`, `run.done` thuộc 019b; `conversation.counts` (invalidation) thuộc 025b; **`credits.changed` và `ui.command` chưa ai phát**.
  - `packages/db/src/tenant-resolver.ts:81` cache registry TTL 60s trong tiến trình; `invalidate` (L62) chỉ xoá cục bộ — nhiều tiến trình api/worker thấy workspace đã suspend/archive tới 60s.

## APPLICABLE STANDARDS
- events/outbox.md; ops/observability-security.md; database/tenant-db.md.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 006c` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Xác nhận 019b/025b đã phát đúng 3 sự kiện của họ; TIP này không làm lại.

## TASK
Phát `credits.changed` khi ví đổi và `ui.command` khi Trợ lý ra lệnh UI; vô hiệu cache registry tenant qua Redis pub/sub.

## SPECIFICATIONS
### 1. Sự kiện
1. Wallet ghi ledger → outbox `credits.changed {balance_plan, balance_topup}` tới phòng workspace (chỉ người có `billing.manage` nhận số dư — danh mục quyền không có `billing.view`; người khác nhận sự kiện không kèm số để invalidate).
2. Meta-tool `ui` của Trợ lý → `ui.command` tới đúng socket phiên người ra lệnh (không broadcast).
3. FE `event-invalidation.ts` xử lý cả hai.
### 2. Registry cache
1. `invalidate(ws)` publish `tenant-registry:invalidate`; mọi tiến trình subscribe xoá cục bộ; mất Redis → TTL 60s như cũ (không chặn).

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Nạp Credit|UI số dư cập nhật không F5 — E2E http|
|2|Trợ lý ra lệnh mở màn|chỉ tab người ra lệnh nhận|
|3|Suspend workspace ở tiến trình A|tiến trình B từ chối trong < 2s — integration hai tiến trình|

### Commands / evidence gate
- `pnpm --filter @appchat/api test:integration -- test/integration/realtime-events.test.ts`
- `pnpm --filter @appchat/db test -- test/registry-invalidate.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không lộ số dư cho người không có quyền xem billing.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 9 path, header khai hai phía, 3 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
