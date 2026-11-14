# TIP-049d — exact file manifest

M = sửa, C = tạo mới. Cần TIP-049 / 049b / 049c (action + DTO + connector sàn) và TIP-048c (`OAuthConnectStep`, icon brand, `settings.json`, `parity.manifest.ts`) đã tích hợp; `apps/web/src/shared/oauth/useOAuthConnect.ts` (TIP-048) chỉ dùng lại, không sửa.
Ba file backend đọc catalog (027b) sửa có chủ đích: `product-view.ts`, `catalog-read.service.ts`, `shared/catalog/labels.ts`. Không sửa `apps/web/src/features/settings/types.ts` (384 dòng, gần trần).

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `apps/web/src/features/settings/components/MarketplaceConnectStep.tsx` | OAuth sàn + chọn shop + `initial_days` / bên giữ tồn + kết quả từng shop (dùng `useOAuthConnect`) |
| C | `apps/web/src/features/settings/components/MarketplaceConnectStep.test.tsx` | Gọi `oauth_select` một lần, kết quả từng shop, lỗi `oauth_error` |
| C | `apps/web/src/features/settings/components/MarketplaceShops.tsx` | Danh sách shop: trạng thái, lần đồng bộ cuối, hạn uỷ quyền, Uỷ quyền lại / Đồng bộ ngay / Ngắt |
| M | `apps/web/src/features/settings/components/IntegrationsSection.tsx` | Thẻ Shopee / TikTok Shop nhóm TMĐT; `requiresEnv` → Sắp có |
| M | `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx` | Rẽ `auth_kind` (`oauth2` → `MarketplaceConnectStep`); bỏ `SECRET` cứng ~L13 |
| M | `apps/web/src/features/settings/components/IntegrationDetailDrawer.tsx` | Connector sàn → `MarketplaceShops` |
| M | `apps/web/src/features/settings/integration-types.ts` | Kiểu connector sàn / shop / listing (không đụng `settings/types.ts`) |
| C | `apps/web/src/features/orders/components/MarketplaceBadge.tsx` | Badge sàn + shop + tooltip mã ngoài |
| M | `apps/web/src/features/orders/columns.tsx` | `SourceBadge` ~L37–46 dùng `MarketplaceBadge` |
| M | `apps/web/src/features/orders/components/DetailTabs.tsx` | Banner ~L44–53: trạng thái sàn có nhãn, "Thanh toán qua sàn", ẩn nút Đề nghị thanh toán |
| M | `apps/web/src/features/orders/components/ShippingCard.tsx` | Trường `shipping.source = platform` chỉ đọc ~L32 |
| M | `apps/web/src/features/orders/components/OrdersToolbar.tsx` | `order.sync_now` đọc `queued` ~L34 |
| C | `apps/web/src/features/products/components/SkuMappingDrawer.tsx` | Drawer Ghép SKU: chọn shop, bảng listing D42, Ghép / Bỏ ghép / chọn sản phẩm khác, Đọc sản phẩm từ sàn |
| C | `apps/web/src/features/products/components/SkuMappingDrawer.test.tsx` | Lọc về trang 1, lỗi tại dòng, chỉ xem khi thiếu quyền |
| C | `apps/web/src/features/products/hooks/useSkuMapping.ts` | Tải listing theo trang + `map_sku` / `unmap_sku` / `import_products` |
| M | `apps/web/src/features/products/api.ts` | Fetcher `GET /v1/integrations/:id/listings` |
| M | `apps/web/src/features/products/columns.tsx` | Cột Kênh ~L131–143 theo ánh xạ thật |
| M | `apps/web/src/features/products/components/SyncSources.tsx` | Nguồn sàn thật, nút mở Ghép SKU |
| M | `apps/web/src/features/products/components/ProductDrawer.tsx` | "Kênh bán" theo ánh xạ + mở Ghép SKU |
| M | `apps/web/src/features/products/screens/ProductsScreen.tsx` | ~L103 nối drawer Ghép SKU (giữ orchestrator ≤ 250) |
| M | `packages/core/src/catalog/services/product-view.ts` | "Kênh bán" theo `integration_mapping` theo lô (~L108–111) |
| M | `packages/core/src/catalog/services/catalog-read.service.ts` | `meta()` ~L89–121: sàn `active` khi có kết nối |
| M | `packages/shared/src/catalog/labels.ts` | `SALES_SOURCES` ~L35–42 thêm `shopee`, `tiktok_shop` |
| M | `packages/shared/src/api/catalog.ts` | DTO kênh bán theo sản phẩm (optional) |
| C | `apps/web/src/shared/api/mock/domains/marketplace.ts` | Mock connector sàn, shop, listing (≥ 60), `oauth_select`, `pending_get` sàn |
| C | `apps/web/src/shared/api/mock/marketplace-shape.test.ts` | Mock khớp schema `api/marketplace.ts` |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Đăng ký mock marketplace |
| M | `apps/web/src/shared/api/mock/domains/settings-apps.ts` | Thẻ Shopee / TikTok Shop |
| M | `apps/web/src/shared/api/mock/domains/orders.ts` | 3 đơn sàn mẫu (trả trước, COD, vận đơn sàn) |
| M | `apps/web/src/shared/api/mock/domains/orders-actions.ts` | `order.sync_now` trả `queued` |
| M | `apps/web/src/shared/api/mock/domains/products.ts` | Kênh bán theo ánh xạ trong mock |
| M | `apps/web/messages/vi/settings.json` | Thẻ sàn, bước OAuth sàn, chọn shop, drawer shop, lỗi |
| M | `apps/web/messages/en/settings.json` | Như trên (en) |
| M | `apps/web/messages/vi/orders.json` | Badge, banner, trạng thái sàn, vận đơn theo sàn, toast; `platform.tiktok` → `platform.tiktok_shop` |
| M | `apps/web/messages/en/orders.json` | Như trên (en) |
| M | `apps/web/messages/vi/products.json` | Ghép SKU, kênh bán |
| M | `apps/web/messages/en/products.json` | Như trên (en) |
| M | `tools/parity/parity.manifest.ts` | Mask PD-907 (thẻ sàn OAuth) / PD-908 (đơn sàn, vận đơn, Ghép SKU) |
| C | `apps/web/e2e/marketplace.spec.ts` | AC1–AC6, AC9 (mock + mobile 390×844) |
| C | `apps/web/e2e/http/marketplace.spec.ts` | AC8 luồng `http` với transport `fake` |
| M | `apps/web/e2e/orders.spec.ts` | Kỳ vọng cột Nguồn mới (nếu ca cũ khẳng định) |
| M | `apps/web/e2e/products.spec.ts` | Kỳ vọng cột Kênh theo ánh xạ (nếu ca cũ khẳng định) |
| M | `apps/api/test/integration/catalog.test.ts` | AC7 kênh bán theo ánh xạ + đếm query |
