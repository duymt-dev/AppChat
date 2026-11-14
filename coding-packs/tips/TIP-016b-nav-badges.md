# TIP-016b — Badge đếm trên rail đọc GET /nav/badges thật

## HEADER
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/api/test/integration/nav-badges.test.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/core/src/inbox/services/nav-badges.ts`; integrate 016b before032e.
- TIP-ID: TIP-016b; Project: AppChat V2; Module: shell + inbox/ticket/calendar counts; Priority: P0; Estimated: S. TIP bổ sung cho TIP-016 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 025b (conversation.counts), 034b, 033b đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-016b-files.md) — 6 paths (2 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-006c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 006c before016b.
- **Parallel-safe with TIP-006b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 006b before016b.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 012b before016b.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 012c before016b.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 015d before016b.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 015e before016b.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 015f before016b.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 019b before016b.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/public.ts`; integrate 022c before016b.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 026b before016b.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 034c before016b.
- **Dòng COVERAGE nhận:** BP-4.4-fe-nav; PRO-shell-navbadges.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `apps/web/src/shared/shell/useShellData.ts:34` gọi `/nav/badges`; chỉ mock trả lời (`routes.json missing`).

## APPLICABLE STANDARDS
- database/indexing.md; authz scope; events/outbox (invalidation).
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 016b` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Lấy định nghĩa badge từ prototype L1089 (Hộp thư chưa đọc của tôi, Ticket quá hạn/đang mở của tôi, Lịch hôm nay).

## TASK
API đếm badge theo quyền + scope người xem, cập nhật qua sự kiện invalidation đã có.

## SPECIFICATIONS
### 1. API
1. `GET /v1/nav/badges` → `{inbox, tickets, calendar}`; mỗi số một COUNT có index, áp scopeFilter; cache 15s theo user.
2. FE invalidate khi nhận `conversation.counts` / sự kiện ticket/appointment.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Có 3 hội thoại chưa đọc|badge 3 — E2E http|
|2|Sales scope Của tôi|chỉ đếm bản ghi của mình|
|3|Không quyền module|không có khoá đó|

### Commands / evidence gate
- `pnpm --filter @appchat/api test:integration -- test/integration/nav-badges.test.ts`
- `pnpm e2e:http shell`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không lộ số liệu ngoài scope.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 6 path, header khai hai phía, 3 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
