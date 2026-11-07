# TIP-031c — Bên giữ tồn chuẩn theo kết nối bán hàng (stock_master appchat / external)

## HEADER
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before006d.
- TIP-ID: TIP-031c; Project: AppChat V2; Module: order sync + catalog stock; Priority: P1; Estimated: M. TIP bổ sung cho TIP-031 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 027b, 012 order-sync port đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-031c-files.md) — 9 paths (2 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/order-sync.jobs.ts`; integrate 003c before031c.
- **Parallel-safe with TIP-035c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/order-sync.jobs.ts`; integrate 031c before035c.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before031c.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before031c.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before031c.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before031c.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before031c.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before031c.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx`; integrate 012b before031c.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx`; integrate 012c before031c.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014b before031c.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/services/order-import.ts`; integrate 015c before031c.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/services/order-import.ts`; integrate 015f before031c.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before031c.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020d before031c.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020e before031c.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 022b before031c.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/services/order-write.ts`; integrate 025b before031c.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 026b before031c.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 030b before031c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/orders/services/order-write.ts`; integrate 032b before031c.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/orders/services/order-write.ts`; integrate 032c before031c.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 033b before031c.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 034b before031c.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 037 before031c.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 039 before031c.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before031c.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042 before031c.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042b before031c.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/services/order-import.ts`; integrate 042c before031c.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 043 before031c.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 045b before031c.
- **Dòng COVERAGE nhận:** COM-4b-5; REQ-F07b-3.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `sales/orders/services/order-import.ts:53` đơn sàn luôn ghi sổ kho; `order-write.ts:4` chỉ comment stock_master; manifest mock `integrations/src/connectors/mock/order-sync.ts:16` không có trường; port `ports/order-sync.ts:38` chỉ có `pull`/`mapStatus`, không đọc tồn.
  - COMMERCE §4b L109 (luật đã chốt): mỗi kết nối chọn bên giữ tồn chuẩn `appchat` (AppChat đẩy tồn lên sàn — P2) hoặc `external` (Sapo/KiotViet là gốc, AppChat **nhận tồn về**); **đơn sàn vẫn ghi `stock_movement`, quy tắc Q8 giữ nguyên** ở cả hai chế độ.
  - Đẩy tồn lên sàn là P2 (COMMERCE §4b) — ngoài phạm vi.

## APPLICABLE STANDARDS
- COMMERCE §4b L109; integrations/provider-ports.md.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 031c` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc COMMERCE §4b nguyên văn; mọi lệch với L109 là dừng, hỏi (L2) — không đổi luật kho.

## TASK
Mỗi kết nối OrderSync có cấu hình `stock_master`; cả hai chế độ đơn sàn vẫn ghi `stock_movement` theo Q8; `external` thêm đồng bộ tồn về từ hệ ngoài (idempotent theo snapshot); `appchat` (đẩy tồn lên) là P2.

## SPECIFICATIONS
### 1. Cấu hình
1. `integration_connection.settings.stock_master` (appchat|external, mặc định appchat); action `integration.update_settings` (risk config).
2. Import đơn **luôn** ghi `stock_movement` theo Q8 (không đổi so với hiện tại), ở cả hai chế độ.
### 2. Nhận tồn về (external)
1. Port `OrderSyncProvider.pullStock?(cursor)` trả snapshot `{sku, on_hand, as_of, snapshot_id}`; mock trả dữ liệu mẫu, adapter thật P2.
2. Job đối soát: với mỗi SKU khớp, ghi `stock_movement(kind=sync_adjust, qty = on_hand_ngoài − on_hand_AppChat, ref = snapshot_id)`; idempotent theo `(connection_id, snapshot_id, sku)`; SKU không khớp → báo cáo, không tạo sản phẩm.
3. Chế độ `appchat`: không pull tồn; thẻ đẩy tồn lên sàn hiện "Sắp có" (P2).

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Kết nối external nhập đơn|ghi `stock_movement` theo Q8 như appchat|
|2|external, snapshot ngoài on_hand=7, AppChat=10|một movement sync_adjust −3; chạy lại cùng snapshot không ghi thêm|
|3|Kết nối appchat|không pull tồn; trừ kho như cũ|
|4|Đổi cờ|chỉ áp lượt đồng bộ sau đó|

### Commands / evidence gate
- `pnpm --filter @appchat/api test:integration -- test/integration/order-sync-stock.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không đẩy tồn lên sàn (P2); không đổi luật kho COMMERCE §4b / Q8.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 9 path, header khai hai phía, 4 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
