# TIP-049c — exact file manifest

M = sửa, C = tạo mới. Cần TIP-049 (nền sàn) và TIP-049b (đã sửa `registry.ts`, `coming-soon.ts`, `integrations.module.ts`, `.env.example`, `i18n/server/{vi,en}/sales.ts`) đã tích hợp.
Thư mục mới `packages/integrations/src/connectors/tiktok-shop/` và `packages/core/src/integrations/tiktok-shop/`. Không đổi schema.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/integrations/src/connectors/tiktok-shop/manifest.ts` | Manifest `tiktok_shop` (oauth2, `order_sync`, `hosts`, `webhook.ack = json_200`, `rateLimit`, `capabilities`, `requiresEnv`) |
| C | `packages/integrations/src/connectors/tiktok-shop/sign.ts` | `sign` HMAC-SHA256 bọc app_secret: path + key/value sắp xếp + body |
| C | `packages/integrations/src/connectors/tiktok-shop/oauth.ts` | `OAuthClient` `tiktok_shop`: link uỷ quyền, `token/get` (auth_code 30 phút), `token/refresh`, danh sách shop + `shop_cipher`, `invalid_grant` |
| C | `packages/integrations/src/connectors/tiktok-shop/client.ts` | Gọi API qua `ctx.http` + `sign` + `x-tts-access-token` + `shop_cipher`; 429 / 36009002 back-off |
| C | `packages/integrations/src/connectors/tiktok-shop/order-sync.ts` | `pull` theo `page_token`, `getOrder`, `getTracking` (VN trống tới khi gửi), chuẩn hoá `ExternalOrder` |
| C | `packages/integrations/src/connectors/tiktok-shop/products.ts` | `listProducts`: product search / get, `skus[].seller_sku`, giá, tồn (chỉ đọc) |
| C | `packages/integrations/src/connectors/tiktok-shop/webhook.ts` | `verify` (hex HMAC-SHA256(app_secret, app_key + raw_body)), `split` topic 1 / 4 / SELLER_DEAUTHORIZATION / UPCOMING_AUTHORIZATION_EXPIRATION |
| C | `packages/integrations/src/connectors/tiktok-shop/status-map.ts` | `mapStatus` trạng thái TikTok Shop → hai trục (§6) |
| C | `packages/integrations/src/connectors/tiktok-shop/fake-server.ts` | Transport `fake`: fixtures theo path, kiểm chữ ký / token / cipher, đếm lời gọi, giả 429 |
| C | `packages/integrations/src/connectors/tiktok-shop/provider-capabilities.md` | API dùng / không dùng, QPS, topic, Sắp có, việc cần tài khoản (Q-915) |
| C | `packages/core/src/integrations/tiktok-shop/token-refresher.ts` | `registerOAuthProvider(tiktok_shop)` + làm mới khi access còn < 1 ngày |
| M | `packages/integrations/src/registry.ts` | Đăng ký `tiktok_shop` |
| M | `packages/integrations/src/coming-soon.ts` | Bảo đảm không còn thẻ TikTok Shop trùng |
| M | `packages/integrations/test/registry.test.ts` | Kỳ vọng `tiktok_shop` (thiếu env → coming_soon) |
| M | `packages/core/src/integrations/integrations.module.ts` | Import `token-refresher` TikTok Shop |
| M | `.env.example` | `TTS_APP_KEY`, `TTS_APP_SECRET`, `TTS_SERVICE_ID`, `TTS_TRANSPORT` |
| M | `packages/shared/src/i18n/server/vi/sales.ts` | Nhãn trạng thái TikTok Shop |
| M | `packages/shared/src/i18n/server/en/sales.ts` | Như trên (en) |
| C | `packages/integrations/test/tiktok-shop.test.ts` | AC1, AC3, AC9: ký, cursor / 429, status map, sản phẩm, không path ghi |
| C | `packages/integrations/test/fixtures/tiktok-shop/order_search.json` | 2 trang, `next_page_token` |
| C | `packages/integrations/test/fixtures/tiktok-shop/order_detail.json` | Trả trước, COD, 2 SKU cùng product, huỷ, `live_id` |
| C | `packages/integrations/test/fixtures/tiktok-shop/package_detail.json` | Package trống + có mã vận đơn |
| C | `packages/integrations/test/fixtures/tiktok-shop/product_search.json` | Product + `skus[]` + `seller_sku` + giá + tồn |
| C | `packages/integrations/test/fixtures/tiktok-shop/webhook_order_status.json` | Topic 1 + `Authorization` mẫu |
| C | `packages/integrations/test/fixtures/tiktok-shop/webhook_deauth.json` | `SELLER_DEAUTHORIZATION` + `Authorization` mẫu |
| C | `apps/api/test/integration/tiktok-shop-sync.test.ts` | AC2, AC4–AC8, AC10 (fake + DB thật) |
