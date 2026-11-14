# Báo cáo hoàn thành TIP-031c — Bên giữ tồn chuẩn theo kết nối bán hàng (`stock_master` appchat / external)

**TIP:** `031c` · **Nhánh:** `tip/031c-stock-master` (`wt1` `D:/CODING/AppChat-Agy`) · **Nền rebase:** `(sẽ cập nhật sau rebase origin/dev)` · **Commit code:** `(sẽ cập nhật sau commit/rebase)` · **PR:** `(sẽ cập nhật sau gh pr create)` (`--base dev`) · **Ngày:** 2026-11-15  
**Trạng thái nghiệm thu provider thật:** **chưa nghiệm thu với provider thật** (`Q-914` Shopee, `Q-915` TikTok Shop — toàn bộ unit / integration / HTTP E2E chạy qua kết nối giả `mock_marketplace` trên Postgres 16 + Memurai 6381).

---

## 1. Rà trước khi làm (code thật trước khi sửa)

1. **Rà manifest & code hiện hữu trước khi sửa:**
   - `packages/integrations/src/ports/order-sync.ts`: chưa có kiểu `StockMaster`, helper `stockMasterOf`, kiểu `StockSnapshotItem` / `StockPullResult`, và phương thức tuỳ chọn `pullStock?(ctx, cursor)` trên `OrderSyncProvider`.
   - `packages/integrations/src/connectors/mock/order-sync.ts`: `mockMarketplaceManifest.auth.fields` chưa có trường `stock_master` / `stock_snapshots`; chưa có `validate({ config })` và chưa cài `pullStock`.
   - `packages/db/prisma/tenant/catalog.prisma`: `enum StockMovementKind` chưa có giá trị `sync_adjust` nên chưa thể phân biệt bút toán đối soát tồn từ sàn/POS với `sale`, `cancel_return`, `adjust`.
   - `packages/core/src/integrations/services/connections.service.ts` & `packages/actions/src/settings-apps.ts`: chưa có action `integration.update_settings` (risk `config`, quyền `integrations.manage`) để đổi cờ `stock_master` mà không chạm bí mật hoặc làm tăng `credentialRev`.
   - `packages/core/src/sales/orders/services/order-import.ts` & `order-sync.ts`: chỉ nhập đơn sàn và gọi `deductStock` / `returnStock` theo Q8; chưa có service/action nội bộ đối soát tồn `stock-sync.ts`.
   - `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx` & `apps/web/messages/{vi,en}/settings.json`: chưa có trường chọn `stock_master` (`appchat` / `external`) và huy hiệu `"Sắp có"` cho tính năng đẩy tồn P2 trên kết nối thương mại điện tử.
2. **Kiểm tra phụ thuộc & giao file:** `python -X utf8 tools/obligations/manifests.py --order` báo `cạnh thứ tự: 3209; vấn đề: 7; vòng: 0` (7 cảnh báo thứ tự đều là cặp có sẵn trên nền `dev`, không liên quan `031c`). Ngoài 9 file gốc ở `tips/manifests/TIP-031c-files.md`, triển khai thực tế cần chạm thêm 24 file schema / shared / actions / core / web / test tách riêng → giữ nguyên manifest gốc và ghi sổ `DV-704`.
3. **Đọc nguyên văn `plans/COMMERCE-DECISIONS.md` §4b L109 (`coding-packs/plans/COMMERCE-DECISIONS.md:109`):**
   > *"Kho: mỗi kết nối chọn bên giữ tồn chuẩn: `appchat` (AppChat đẩy tồn lên sàn — P2) hoặc `external` (Sapo / KiotViet là gốc, AppChat nhận tồn về). Đơn sàn vẫn ghi `stock_movement`, quy tắc Q8 giữ nguyên."*
   → Giữ nguyên toàn bộ luồng `deductStock` / `returnStock` ở cả 2 chế độ; không đẩy tồn lên sàn (P2).

---

## 2. Giả định đã chọn

- **`DC-704` (dải `7xx`, thay thế khoảng trống đặc tả trong `COMMERCE §4b` & `TIP-031c`):**
  1. Migration tenant `packages/db/prisma/tenant/migrations/20261115013000_031c_stock_master/migration.sql:1-2` thêm giá trị `'sync_adjust'` vào `enum stock_movement_kind` (`catalog.prisma`).
  2. Action cấu hình `integration.update_settings` (`integrations.manage`, risk `config`, hỗ trợ preview Trợ lý) hợp nhất `config.stock_master` (`appchat` / `external`) không chạm bí mật, `lastSyncAt` hay `credentialRev`; `integration.connect` bảo toàn `stock_master` cũ khi xoay khoá không truyền trường này.
  3. Action nội bộ `order.system_stock_sync` (`orderSystemStockSync`) chạy qua `ActionExecutor` + biên nhận `system_action_receipt` idempotent theo `(connection_id, snapshot_id, sku)` (`stock-sync.ts:38-134`): khoá hàng `product` với `FOR UPDATE`, bỏ qua khi `delta === 0`, ghi `recordMovement(kind='sync_adjust')`; khi `stock_master = appchat` bỏ qua `pullStock`; đơn sàn & đơn AppChat ở cả hai chế độ vẫn trừ/hoàn kho theo Q8.
  4. Khớp `lower(sku)` không phân biệt hoa thường (`product_variant` active ưu tiên trước `product.code`); SKU chưa khớp đưa vào `unmatched_skus` (không tự tạo sản phẩm và không đóng biên nhận để đối soát lại ở lượt sau); lưu `stock_cursor` đọc lại `latestCfg` (`stock-sync.ts:202-210`) để không ghi đè `stock_master` nếu đổi đồng thời.
  5. UI `ConnectIntegrationModal` chỉ hiển thị select `stock_master` + huy hiệu `"Sắp có"` khi connector thuộc nhóm `commerce` hoặc `port === 'order_sync'`, giữ nguyên DOM của mọi connector khác.
- **`DV-704` (lệch manifest `tips/manifests/TIP-031c-files.md`):** Giữ nguyên 9 file manifest (7 M + 2 C đã chạm đủ) và sửa/tạo thêm 24 file ngoài manifest (tổng 33 file code/schema/i18n/mock/test) để đủ migration, hợp đồng `@appchat/shared` & `@appchat/actions`, action `integration.update_settings` + `order.system_stock_sync`, mock web và unit/action-matrix test tách file riêng.
- **Provider thật (`Q-914`, `Q-915`):** **chưa nghiệm thu với provider thật** (Shopee / TikTok Shop triển khai ở `049 → 049d`); bản này kiểm chứng đầy đủ qua `mock_marketplace`.

---

## 3. Đối chiếu standards

| Standard / Nguồn | Trạng thái | Bằng chứng tuân thủ ở code / test hoặc mã lệch (`DV`) |
| --- | --- | --- |
| `plans/COMMERCE-DECISIONS.md` §4b L109 / Q8 (`COM-4b-5`) | Đạt (test qua `mock_marketplace`) | `order-import.ts` giữ nguyên `deductStock`/`returnStock` ở cả `appchat` và `external`; `stock-sync.ts:163-213` kéo `pullStock` chỉ khi `stock_master === 'external'` và không đẩy tồn lên sàn (P2); kiểm chứng ở `order-sync-stock.test.ts:52-196` (3/3). |
| `integrations/provider-ports.md` | Tuân thủ | `packages/integrations/src/ports/order-sync.ts` (`StockMaster`, `stockMasterOf`, `StockSnapshotItem`, `StockPullResult`, `pullStock?`); `connectors/mock/order-sync.ts` (`MockOrderSyncProvider.pullStock`, `validate`); unit test `packages/integrations/test/order-sync-stock.test.ts:1-33` (3/3). |
| `actions/action-registry.md` & `api/response-envelope.md` | Tuân thủ (`DC-704`, `DV-704`) | Mọi thao tác ghi đi qua `ActionExecutor`: `integration.update_settings` (`packages/actions/src/settings-apps.ts`, preview ở `integration-update-settings.handler.preview.ts`), `order.system_stock_sync` (`packages/actions/src/system/sales.ts`, `OrderSystemStockSyncHandler` ở `stock-sync.ts:87-134`), `order.sync_now` (`packages/actions/src/orders.ts`); ma trận `integration.update_settings.action.test.ts:20-48` (3/3) & `order.sync_now.action.test.ts` (3/3). |
| `authz/rbac-permissions.md` | Tuân thủ | `integration.update_settings` yêu cầu quyền `integrations.manage` và cô lập tenant; `order.system_stock_sync` là action nội bộ (403 khi gọi thiếu capability ở `stock-sync.ts:92-98`); kiểm 403 role `sales` và 404 cross-tenant trong `integration.update_settings.action.test.ts:21-42` & `order-sync-stock.test.ts:96`. |
| `database/tenant-db.md` & `database/indexing.md` | Tuân thủ (`DV-704`) | `packages/db/prisma/tenant/catalog.prisma` (`sync_adjust` trong `StockMovementKind`), migration `packages/db/prisma/tenant/migrations/20261115013000_031c_stock_master/migration.sql:1-2` áp thành công lên DB tenant template + test (`db:generate`, `db:migrate-tenants`, `db:setup`); không thêm list endpoint mới. |
| `domain/concurrency.md` & `events/outbox.md` | Tuân thủ (`DC-704`) | `stock-sync.ts:103-132` khoá `product` với `FOR UPDATE` trong `ActionExecutor` tx + biên nhận `system_action_receipt` (`stableTriggerId`, `settled`) đảm bảo idempotent theo `(connection_id, snapshot_id, sku)` và không đóng biên nhận cho SKU chưa khớp; `stock-sync.ts:203-210` đọc lại `latestCfg` trước khi ghi `stock_cursor`. |
| `domain/money-time-numbering.md` | Tuân thủ | `OrderSystemStockSyncHandler` & `ConnectionsService` inject `CLOCK` (`this.clock.now()` ở `stock-sync.ts:90,122`), không dùng `new Date()`/`Date.now()`; parse thời gian snapshot theo ISO có offset/UTC. |
| `domain/validation-defaults.md` & `domain/gap-filling.md` | Tuân thủ (`DC-704`, `DV-704`) | `mockMarketplaceManifest.validate` kiểm `stock_master` (`'appchat' | 'external'`, mặc định `'appchat'`); `integration.update_settings` trả `404 not_connected` / `422 not_order_sync` rõ ràng theo trường; toàn bộ bổ sung thiết kế ghi `DC-704` & lệch manifest ghi `DV-704`. |
| `ui/frontend-structure.md`, `ui/prototype-parity.md`, `ui/interaction-patterns.md`, `i18n/i18n.md`, `docs/06-prototype/DEVIATIONS.md` | Tuân thủ | `ConnectIntegrationModal.tsx` chỉ hiển thị `st-int-stock-master` + `st-int-push-stock-soon` cho connector thương mại điện tử; i18n `settings.json` & `actions.json` (vi/en) phủ 100%; parity `settings:integrations 0.0007`, `settings:integrations-connect 0.0207`, `orders:list 0.0342` (đều < 5%). |
| `code/testing.md` | Tuân thủ (`DV-704`) | Test tách file riêng (`packages/integrations/test/order-sync-stock.test.ts`, `apps/api/test/integration/order-sync-stock.test.ts`, `apps/api/test/integration/actions/integration.update_settings.action.test.ts`); `pnpm lint:size` & `pnpm depcheck` xanh. |

---

## 4. Phạm vi triển khai & kết quả test

### File đã chạm (33 file code/schema/i18n/mock/test + sổ/report)
- **9 file manifest (`tips/manifests/TIP-031c-files.md`):**
  - `packages/integrations/src/ports/order-sync.ts`
  - `packages/integrations/src/connectors/mock/order-sync.ts`
  - `packages/core/src/sales/orders/services/order-import.ts`
  - `packages/core/src/sales/orders/services/stock-sync.ts` (C)
  - `packages/core/src/sales/jobs/order-sync.jobs.ts`
  - `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx`
  - `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`
  - `apps/api/test/integration/order-sync-stock.test.ts` (C)
- **24 file ngoài manifest (`DV-704`):**
  - `packages/db/prisma/tenant/catalog.prisma`, `packages/db/prisma/tenant/migrations/20261115013000_031c_stock_master/migration.sql` (C)
  - `packages/shared/src/api/integrations.ts`, `packages/shared/src/i18n/server/{vi,en}/catalog.ts`
  - `packages/actions/src/{settings-apps.ts,orders.ts,system/sales.ts}`
  - `packages/core/src/catalog/services/catalog-write.ts`
  - `packages/core/src/integrations/{integrations.module.ts,services/connections.service.ts,services/read.service.ts,actions/integration-update-settings.handler.ts (C),actions/previews/integration-update-settings.handler.preview.ts (C)}`
  - `packages/core/src/sales/{sales.module.ts,orders/actions/order-sync.handler.ts,orders/services/order-sync.ts,orders/system/import.ts}`
  - `apps/web/src/features/settings/types.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `apps/web/messages/{vi,en}/actions.json`
  - `packages/integrations/test/order-sync-stock.test.ts` (C), `apps/api/test/integration/actions/integration.update_settings.action.test.ts` (C)
- **Tài liệu / sổ / kiểm tra nghĩa vụ:** `coding-packs/DECISIONS.md` (`DC-704`), `coding-packs/DEVIATIONS.md` (`DV-704`), `coding-packs/tips/TIP-031c-stock-master.md` (BUILDER-CHECKLIST ticked `[x]`), `tools/obligations/parts/part-decisions-commerce.md` (`COM-4b-5`), `tools/obligations/parts/part-req-fn.md` (`REQ-F07b-3`), `coding-packs/COVERAGE.md`, `coding-packs/goals/GOAL-RELEASE.md`, `coding-packs/HANDOFF-NEXT.md`, `coding-packs/reports/TIP-031c-completion.md`.

### Kết quả kiểm tra đã chạy
- **Worktree & dịch vụ `wt1`:** Memurai `wt1: PONG · cổng 6381 · PID 35660`; `pnpm slot -- --status` (`slot Postgres (NS 735035, 2 slot): trống`).
- **Migration & DB trên `wt1`:** `pnpm --filter @appchat/db run db:generate`, `db:migrate-tenants`, `db:migrate-tenants -- --test`, `db:setup`, `db:test-reset` — áp `20261115013000_031c_stock_master` (exit 0).
- **COVERAGE merge:** `python -X utf8 tools/obligations/merge.py` → `rows 1806 {'ĐẠT': 1292, 'CHỜ-TK': 58, 'MỘT PHẦN': 74, 'CHƯA': 262, 'NGOÀI': 36, 'KHÔNG LÀM': 2, 'QUY-TẮC': 69, 'GIẢ': 13} gaps 0 {}`.
- **Static checks (D59):**
  - `pnpm lint:size` → `4713 file, không file nào vượt trần`
  - `pnpm lint:tokens` → `1138 file, đúng thang D41`
  - `pnpm lint:masks` → `57 mask, 44 PD trong sổ, đều có căn cứ`
  - `pnpm i18n:check` → `en: 7424 key, phủ 100.0%` / `vi: 7424 key, phủ 100.0%`
  - `pnpm depcheck` → `no dependency violations found (4639 modules, 19531 dependencies cruised)`
  - `python -X utf8 tools/obligations/manifests.py --order` → `cạnh thứ tự: 3209; vấn đề: 7; vòng: 0`
- **Lint / Typecheck / Unit / Build (7 package đổi):** `Tasks: 23 successful, 23 total` (`@appchat/integrations` 13 files / 84 passed; `@appchat/shared` 38 files / 219 passed; `@appchat/actions` 14 files / 53 passed; `@appchat/db` 6 files / 35 passed; `@appchat/core` 209 passed | 1 skipped live, 1348 passed | 1 skipped; `@appchat/api` 2 files / 11 passed + `tsup` build; `@appchat/web` 175 files / 597 passed + `next build` 0 lint errors).
- **Integration (trên Postgres 16 + Memurai 6381 sau `db:test-reset`):**
  - `apps/api/test/integration/order-sync-stock.test.ts`: `3 passed (3)` (AC1–AC4 + Q8 + `/products/:id/activity` + SKU chưa khớp + 403 `sales`)
  - `apps/api/test/integration/actions/integration.update_settings.action.test.ts`: `3 passed (3)` (404 / 422 `not_order_sync` / 403 / 200 + preview + cô lập tenant khác 404)
  - `apps/api/test/integration/actions/order.sync_now.action.test.ts`: `3 passed (3)`
  - `apps/api/test/integration/orders.test.ts`: `15 passed (15)`
  - `apps/api/test/integration/system-actions-scope.test.ts`: `3 passed (3)`
- **E2E (`@appchat/web`):**
  - Mock: `settings` (`13 passed, 13 skipped (32.5s)`), `orders` (`7 passed, 7 skipped (29.4s)`).
  - HTTP: `pnpm e2e:http e2e/http/integrations.spec.ts --workers=1` (`1 passed, 1 skipped (55.0s)`).
- **Parity (`http://localhost:5100`, `NEXT_PUBLIC_API_MODE=mock`):**
  - Màn phạm vi TIP-031c: `settings:integrations 0.0007` (PASS), `settings:integrations-connect 0.0207` (PASS), `orders:list 0.0342` (PASS).
  - `pnpm parity --done`: `103/109` không FAIL (`99 PASS`, `3 PAID` [`tickets:list 0.0458`, `tickets:detail 0.0491`, `profile:me 0.0474`], `1 DEBT` [`inbox:zalo-group-info 0.0560`]; `orders:detail 0.0352`, `orders:create 0.0293`, `products:list 0.0395` đều PASS). Exit 1 chỉ do đúng 6 ca đỏ sẵn nền `dev` ngoài phạm vi TIP-031c: `inbox:default 0.0814`, `inbox:folder-rail 0.0647`, `inbox:conv-menu 0.0669`, `inbox:chat-menu 0.0739`, `customers:360 0.1287`, `calendar:create size mismatch 540x810 vs 540x779` (không có ca hồi quy mới).
