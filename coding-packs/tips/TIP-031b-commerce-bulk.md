# TIP-031b — Thanh chọn nhiều Khách / Báo giá / Hợp đồng / Đơn: Gán phụ trách hàng loạt + Chuyển tiếp (DC-296)

## HEADER
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/actions/src/quotes.ts`; integrate 031b before026c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 031b before032e.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 033c before031b.
- TIP-ID: TIP-031b; Project: AppChat V2; Module: commerce bulk assignment; Priority: P1; Estimated: M. TIP bổ sung cho TIP-031 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 032c (assigned_user_id CAS), 015d, 045b (per-item receipts), 006b đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-031b-files.md) — 19 paths (8 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 003e before031b.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 013c before031b.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 003c before031b.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 012b before031b.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 012c before031b.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 014b before031b.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 015b before031b.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 015c before031b.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 015e before031b.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/orders/components/OrdersToolbar.tsx`, `packages/actions/src/orders.ts`; integrate 015f before031b.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 019c before031b.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 020b before031b.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 020e before031b.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 022b before031b.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 023b before031b.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 023c before031b.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 023d before031b.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 023e before031b.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 023f before031b.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/contracts.ts`, `packages/actions/src/orders.ts`, `packages/actions/src/quotes.ts`; integrate 025b before031b.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 026b before031b.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 027b before031b.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/contracts.ts`; integrate 030b before031b.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/contracts.ts`; integrate 030c before031b.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/contracts.ts`, `packages/actions/src/orders.ts`, `packages/actions/src/quotes.ts`; integrate 032b before031b.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 032d before031b.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 033b before031b.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `packages/actions/src/orders.ts`; integrate 031b before033d.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 034b before031b.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 034c before031b.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 034d before031b.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 036 before031b.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 037 before031b.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/contracts/components/ContractsToolbar.tsx`, `apps/web/src/features/orders/components/OrdersToolbar.tsx`, `apps/web/src/features/quotes/components/QuotesToolbar.tsx`; integrate 038 before031b.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 038b before031b.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 039 before031b.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 040 before031b.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 041 before031b.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 042 before031b.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 042b before031b.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 043 before031b.
- **Dòng COVERAGE nhận:** PRO-quotes-bulkfwd; PRO-contracts-bulkfwd; PRO-orders-bulkfwd; Q-021.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `QuotesToolbar.tsx:133,141`, `ContractsToolbar.tsx:120,128`, `OrdersToolbar.tsx:161,169` là `message.info` (Chuyển tiếp / Gán phụ trách).
  - `reports/commerce-bulk-source-audit-2026-11-02.md`: 032c có `order.update`/`contract.update assigned_user_id` (contract chỉ draft); gán báo giá đơn lẻ thuộc 015d (theo khách) — chưa có hợp đồng quyền gán báo giá riêng.
  - Q-021 đã duyệt 2026-11-03 → DC-296: "Chuyển tiếp" = gửi danh sách bản ghi đã chọn cho một thành viên (thông báo in-app + link lọc). `CrmToolbar.tsx:2` đang ẩn nút Chuyển tiếp ở thanh chọn nhiều khách.

## APPLICABLE STANDARDS
- actions/action-registry.md (bulk: true + preview bắt buộc); authz/rbac-permissions.md; domain/concurrency.md §7 (lô > 50 → job 202); mẫu 034c ticket bulk.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 031b` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. DC-296 áp cho cả bốn thanh chọn (Khách L2478, Báo giá, Hợp đồng, Đơn); không cấp quyền, không gửi ra kênh khách.
4. Đọc 034c (ticket bulk) + `kernel/jobs/bulk-dispatch.ts` (045b) đã tích hợp; dùng lại, không viết dispatcher thứ hai.

## TASK
Gán phụ trách hàng loạt thật cho đơn và hợp đồng (bọc action canonical), báo giá theo luật đã có, và Chuyển tiếp danh sách cho thành viên ở bốn thanh chọn theo DC-296.

## SPECIFICATIONS
### 1. Gán
1. `order.bulk_assign`, `contract.bulk_assign` (risk write, `bulk: true`, `preview()` bắt buộc trả số mục + số mục sẽ bị từ chối theo quyền/trạng thái): ≤ 50 mục chạy đồng bộ; > 50 → job qua `kernel/jobs/bulk-dispatch.ts`, trả 202 + job id, receipt từng mục (045b), huỷ phần chưa chạy / chạy lại mục lỗi. Mỗi mục gọi handler update canonical với `if_version`, kết quả từng mục (ok / denied / stale / invalid_state), undo theo mục 24h.
2. Báo giá: nút Gán phụ trách gọi `quote.bulk_assign` chỉ khi người gán có quyền như `contact.transfer_owner` của 015d áp lên phần operational assignment (không đổi attribution); thiếu luật → nút ẩn + Q.
### 2. Chuyển tiếp (DC-296)
1. Action `record.forward_list {entity: contact|quote|contract|order, ids[≤ 200], to_user_id, note?}` (risk write, quyền xem module): tạo thông báo in-app cho người nhận kèm link bộ lọc `?ids=`; người nhận mở thấy đúng các bản ghi mình có quyền lúc mở (lọc lại theo scope), bản ghi không có quyền hiện số lượng bị ẩn. Không cấp quyền, không đổi phụ trách, không gửi ra kênh khách.
2. Nút Chuyển tiếp hiện ở CrmToolbar (khách) và ba toolbar chứng từ.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Gán 20 đơn|preview hiện số mục; chạy đồng bộ, kết quả từng mục|
|2|Gán 60 đơn trạng thái lẫn lộn|202 + job; 60 receipt từng mục; huỷ giữa chừng dừng phần chưa chạy|
|3|Mục bị sửa giữa chừng|stale, mục khác vẫn chạy|
|4|Hoàn tác|đúng mục đã đổi|
|5|Chuyển tiếp 5 khách cho thành viên Sale|Sale nhận 1 thông báo; mở link thấy đúng khách thuộc scope của mình, phần còn lại hiện "n bản ghi bạn không có quyền xem"|
|6|Chuyển tiếp|không đổi owner, không gửi tin ra kênh khách — integration|

### Commands / evidence gate
- `pnpm --filter @appchat/api test:integration -- test/integration/commerce-bulk.test.ts`
- `pnpm e2e orders contracts quotes`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không đổi attribution/KPI; Chuyển tiếp không cấp quyền (DC-296).
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 19 path, header khai hai phía, 6 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
