# TIP-049 — exact file manifest

M = sửa, C = tạo mới. Các file kernel OAuth của TIP-048 (`TokenVault`, `oauth-state`, `pending-connect`, `providers`, `packages/channels/src/oauth.ts`) chỉ dùng lại, không sửa.
`packages/channels/src/coming-soon.ts` + `packages/channels/test/registry.test.ts` do 048d / 048e / 048h sửa trước (thứ tự 048h → 049).
Năm file của TIP khác sửa có chủ đích: `tenant/integrations.prisma` (012), `tenant/sales-orders.prisma` (031), `tenant/catalog.prisma` (027), `platform/routing.prisma` (002), `catalog-write.ts` (027b).

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/integrations/src/oauth.ts` | `TokenSet` / `OAuthAccount` / `OAuthClient` cùng hình dạng `packages/channels/src/oauth.ts` (không import channels / core) |
| C | `packages/integrations/src/connectors/marketplace-kit.ts` | `shopKey`, `buyerAccountId` (uuidv5), `splitWindow`, `advanceOnly`, `hmacHex` / `safeEqualHex`, `RateGate`, kiểu `MarketplaceWebhook` / `MarketplaceHookItem` |
| M | `packages/integrations/src/types.ts` | Manifest `hosts` / `oauth` / `webhook.ack` / `rateLimit` / `capabilities` / `requiresEnv`; `ConnectionCtx` `externalAccountId` / `meta` / `token()` / `http` |
| M | `packages/integrations/src/define.ts` | Kiểm `oauth2` ⇒ `oauth` + `hosts`; có `webhook` ⇒ adapter có `webhook` |
| M | `packages/integrations/src/ports/order-sync.ts` | `pull(conn, cursor)` → `{ orders, nextCursor, done }`; `getOrder?` / `getTracking?` / `listProducts?`; `ExternalOrder` thêm buyer id, model, seller_sku, cod, updatedAt; `ExternalProduct` |
| M | `packages/integrations/src/connectors/mock/order-sync.ts` | Chữ ký pull mới; connector thử `mock_shop` (oauth2 giả, webhook HMAC giả, nhiều shop, listing) |
| M | `packages/integrations/src/registry.ts` | Đăng ký `mock_shop` cùng điều kiện `mock_marketplace`; `requiresEnv` → `coming_soon` |
| M | `packages/integrations/src/index.ts` | Export `oauth`, `marketplace-kit`, kiểu port mới |
| M | `packages/integrations/src/provider-http.ts` | `post()` raw body, `redirect: 'manual'`, timeout 15 giây, cắt 5MB, log không query |
| C | `packages/integrations/test/marketplace-kit.test.ts` | AC12: shopKey / buyerAccountId ổn định, splitWindow, advanceOnly, safeEqualHex, ProviderHttp POST + redirect + cắt body |
| M | `packages/integrations/test/order-sync.test.ts` | Chữ ký pull theo cursor + `mock_shop` |
| M | `packages/integrations/test/registry.test.ts` | `mock_shop`, `requiresEnv` → coming_soon |
| M | `packages/channels/src/coming-soon.ts` | Bỏ `shopee`, `tiktok_shop` (sàn là connector; chat sàn Sắp có ở REQ-B08b) |
| M | `packages/channels/test/registry.test.ts` | Kỳ vọng danh sách Sắp có mới |
| M | `packages/core/src/integrations/operations/provider-http.ts` | Allowlist theo `manifest.hosts` (sepay / casso mặc định), chỉ https, `host_not_allowed`, ghi `integration_call_log` |
| M | `packages/core/src/integrations/services/connections.service.ts` | `attachOAuthShop` (nối mới / nối lại cùng dòng theo shop), ctx có `token()` qua `TokenVault` |
| C | `packages/core/src/integrations/services/shop-route.ts` | Giành / trả route `tenant_shop_route` (`shop_in_use_elsewhere`), tra route theo shop |
| C | `packages/core/src/integrations/services/marketplace-hooks.service.ts` | Webhook mức App: verify → split → route → `integration_event` + outbox → ack theo manifest |
| C | `packages/core/src/integrations/services/marketplace-listings.ts` | Upsert `marketplace_listing`, gợi ý ghép, trang listing D42 deferred join |
| C | `packages/core/src/integrations/oauth/connector-oauth.handlers.ts` | `integration.oauth_select` + preview; uỷ quyền lại đúng shop |
| C | `packages/core/src/integrations/actions/marketplace.handlers.ts` | `marketplace.import_products` / `map_sku` / `unmap_sku` / `listings` + `integration.auth_event` |
| M | `packages/core/src/integrations/actions/integration-disconnect.handler.ts` | Kết nối OAuth: route `disabled`, thu hồi grant không còn dùng |
| M | `packages/core/src/integrations/actions/integration-sync.handler.ts` | Kết nối `order_sync` → xếp job pull (bỏ `no_bank_binding`) |
| M | `packages/core/src/integrations/services/read.service.ts` | Connector `auth_kind` / `oauth_provider` / `capabilities`; kết nối `external_account_id` / `shop_name` / `expired` / `grant_expires_at` / `last_run` |
| M | `packages/core/src/integrations/integrations.module.ts` | Đăng ký handler + service mới |
| M | `packages/core/src/integrations/jobs/integrations.jobs.module.ts` | System adapter `integrations.auth` + verifier; call op đọc listing |
| M | `packages/db/prisma/tenant/integrations.prisma` | `external_account_id`, `oauth_grant_id`, `sync_state`, enum `expired`, model `marketplace_listing` |
| M | `packages/db/prisma/tenant/sales-orders.prisma` | `order.external_shop_key` + unique / index; `blocked_external_order.external_shop_key` |
| M | `packages/db/prisma/tenant/catalog.prisma` | `stock_movement` unique thêm `variant_id` (chú thích NULLS NOT DISTINCT viết SQL) |
| M | `packages/db/prisma/platform/routing.prisma` | `tenant_shop_route` |
| C | `packages/db/prisma/tenant/migrations/20261115140000_marketplace_sync/migration.sql` | Cột / enum / bảng / unique partial / index (gồm `integration_mapping (entity, local_id)`) / backfill `external_shop_key` / unique sổ kho theo biến thể |
| C | `packages/db/prisma/platform/migrations/20261115140100_shop_route/migration.sql` | Bảng `tenant_shop_route` + index |
| M | `packages/db/test/factories/index.ts` | Export factory sàn |
| C | `packages/db/test/factories/marketplace.ts` | Factory 100k đơn sàn + 20k listing cho EXPLAIN (AC11) |
| M | `packages/core/src/sales/orders/services/order-import.ts` | Lỗi 1 (vận chuyển ~L89 / ~L97), lỗi 2 (khách / đơn theo shop ~L105–109), gọi `sku-match` + `advanceOnly`, khoá advisory |
| M | `packages/core/src/sales/orders/services/order-sync.ts` | `syncWorkspace` thành xếp job; `handleEvent` → job theo đơn / vận đơn |
| C | `packages/core/src/sales/orders/services/order-pull.ts` | Pull theo cursor, cửa sổ đầu `initial_days`, giới hạn trang, `sync_state`, lease |
| C | `packages/core/src/sales/orders/services/sku-match.ts` | Ghép theo `integration_mapping` → variant sku → product code, theo lô |
| M | `packages/core/src/sales/orders/services/external-order-payload.ts` | Schema + hash nhận trường mới |
| M | `packages/core/src/sales/orders/services/blocked-imports.ts` | Biên nhận chặn khoá theo `external_shop_key` |
| M | `packages/core/src/sales/orders/system/import.ts` | Bỏ Map trong tiến trình → advisory lock trong transaction |
| M | `packages/core/src/sales/orders/services/order-write.ts` | `deductStock` / `returnStock` mang `variant_id` (~L149–159) |
| M | `packages/core/src/sales/orders/services/order-view.ts` | `external_ref.connector` / `shop_key` / `shop_name`, `shipping.source` |
| M | `packages/core/src/sales/orders/actions/order-sync.handler.ts` | `order.sync_now` chỉ xếp job (~L19–23) |
| M | `packages/core/src/sales/jobs/order-sync.jobs.ts` | Lượt quét chỉ xếp `pull:<ws>:<connId>`; processor gọi `order-pull` |
| M | `packages/core/src/catalog/services/catalog-write.ts` | `recordMovement` rẽ sang tồn biến thể khi có `variantId` |
| C | `packages/core/src/catalog/services/variant-stock.ts` | `recordVariantMovement`: khoá product → variant, sổ kho theo biến thể, cộng tồn |
| C | `packages/core/test/sku-match.test.ts` | AC8 thứ tự ghép, trùng nhiều bản ghi, không N+1 |
| C | `packages/core/test/variant-stock.test.ts` | AC9 trừ / hoàn theo biến thể, hai biến thể một sản phẩm, song song |
| M | `packages/core/test/assistant-coverage.test.ts` | Action mới có preview, đường tra `listing_id` / `connection_id` |
| C | `packages/actions/src/marketplace.ts` | `integration.oauth_select`, `marketplace.import_products` / `map_sku` / `unmap_sku` / `listings`, internal `integration.auth_event` |
| M | `packages/actions/src/index.ts` | Export + registry nhóm marketplace |
| M | `packages/actions/src/orders.ts` | `order.sync_now` output `queued` + default 0, mô tả xếp hàng |
| M | `packages/core/src/ai/assistant/catalog.ts` | `SYSTEM_ONLY` thêm `integration.auth_event`; mô tả nhóm marketplace |
| C | `packages/shared/src/api/marketplace.ts` | DTO listing, trang listing D42, kết quả `oauth_select` |
| M | `packages/shared/src/api/index.ts` | Export DTO marketplace |
| M | `packages/shared/src/api/integrations.ts` | Connector `auth_kind` / `oauth_provider` / `capabilities`; kết nối shop / `expired` / `grant_expires_at` / `last_run` |
| M | `packages/shared/src/api/orders.ts` | `external_ref` connector / shop, `shipping.source` (optional) |
| M | `packages/shared/src/events.ts` | Topic `integration.auth_changed` (chỉ id) |
| M | `packages/shared/src/events/protocol/aggregate.ts` | `by('integration_connection','connection_id')` |
| M | `packages/shared/test/event-protocol.test.ts` | Topic mới khớp registry + aggregate |
| M | `packages/shared/src/notify/catalog.ts` | Kind `integration_expired`, `integration_expiring` |
| M | `packages/shared/src/i18n/server/vi/notify.ts` | Tiêu đề 2 kind mới |
| M | `packages/shared/src/i18n/server/en/notify.ts` | Như trên (en) |
| M | `packages/shared/src/i18n/server/vi/sales.ts` | Lỗi `shop_in_use_elsewhere` / `oauth_account_mismatch` / `sku_already_mapped` / `connection_expired` / `shop_region_unsupported` / `listing_variant_required` / `listing_not_found` |
| M | `packages/shared/src/i18n/server/en/sales.ts` | Như trên (en) |
| M | `apps/worker/src/event-protocol.manifest.ts` | `action('integrations.auth', ['oauth.grant_revoked', 'integration.auth_changed'])` |
| C | `apps/api/src/http/integrations/marketplace-hooks.controller.ts` | `POST /hooks/marketplace/:connector` rawBody ≤ 256KB, không JWT, ack theo manifest |
| M | `apps/api/src/http/integrations/integrations.controller.ts` | `GET /v1/integrations/:id/listings` (D42) |
| M | `apps/api/src/http/integrations/integrations.http.module.ts` | Đăng ký controller webhook sàn |
| C | `apps/api/test/integration/marketplace-oauth.test.ts` | AC1, AC2, AC5: chọn shop, route, nối lại, refresh một lần, thu hồi / deauth → expired |
| C | `apps/api/test/integration/marketplace-sync.test.ts` | AC3, AC4, AC6–AC10: webhook, cursor, năm lỗi, thanh toán, loyalty |
| M | `apps/api/test/integration/actions/order.sync_now.action.test.ts` | `order.sync_now` chỉ xếp job (`queued`) |
| M | `apps/api/test/integration/contact-lifecycle-blocked-import.test.ts` | Biên nhận chặn theo shop; sync_now xếp job rồi chạy job |
| M | `apps/web/messages/vi/actions.json` | `actions.<id>.title` 6 action mới |
| M | `apps/web/messages/en/actions.json` | Như trên (en) |
| M | `.env.example` | `MARKETPLACE_PULL_MAX_PAGES`, ghi chú `<X>_TRANSPORT=fake` (cấm production) |
