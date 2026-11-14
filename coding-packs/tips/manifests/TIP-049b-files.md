# TIP-049b — exact file manifest

M = sửa, C = tạo mới. Cần TIP-049 đã tích hợp: `marketplace-kit.ts`, port theo cursor, `requiresEnv`, `ProviderHttp.post`, `integration.oauth_select`, route shop, webhook mức App, `mock_shop` (M path tương lai `packages/integrations/test/registry.test.ts` đã do 049 sửa).
Thư mục mới `packages/integrations/src/connectors/shopee/` và `packages/core/src/integrations/shopee/`. Không đổi schema.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/integrations/src/connectors/shopee/manifest.ts` | Manifest `shopee` (oauth2, `order_sync`, `hosts`, `webhook.ack = empty_2xx`, `rateLimit`, `capabilities`, `requiresEnv`) |
| C | `packages/integrations/src/connectors/shopee/sign.ts` | `signShop` / `signPublic` HMAC-SHA256(partner_key, partner_id + path + timestamp + access_token + shop_id) |
| C | `packages/integrations/src/connectors/shopee/oauth.ts` | `OAuthClient` `shopee`: `auth_partner`, `token/get` (shop / main account → nhiều shop, token theo shop), `access_token/get`, `invalid_grant` |
| C | `packages/integrations/src/connectors/shopee/client.ts` | Gọi API qua `ctx.http` + ký + token; phân loại lỗi, gọi lại một lần sau làm mới |
| C | `packages/integrations/src/connectors/shopee/order-sync.ts` | `pull` theo cursor (cửa sổ ≤ 15 ngày), `getOrder`, `getTracking`, chuẩn hoá `ExternalOrder` |
| C | `packages/integrations/src/connectors/shopee/products.ts` | `listProducts`: `get_item_list` → `get_item_base_info` → `get_model_list` (chỉ đọc) |
| C | `packages/integrations/src/connectors/shopee/webhook.ts` | `verify` (hex HMAC-SHA256(partner_key, url + dấu gạch đứng + body)), `split` push 3 / 4 / 12 |
| C | `packages/integrations/src/connectors/shopee/status-map.ts` | `mapStatus` trạng thái Shopee → hai trục (§6) |
| C | `packages/integrations/src/connectors/shopee/fake-server.ts` | Transport `fake`: trả fixtures theo path, kiểm chữ ký, đếm lời gọi, kịch bản trạng thái |
| C | `packages/integrations/src/connectors/shopee/provider-capabilities.md` | API dùng / không dùng, giới hạn, mã push, Sắp có, việc cần tài khoản (Q-914) |
| C | `packages/core/src/integrations/shopee/token-refresher.ts` | `registerOAuthProvider(shopee)` + làm mới sớm 30 phút qua `oauth-refresh` (048) |
| M | `packages/integrations/src/registry.ts` | Đăng ký `shopee` |
| M | `packages/integrations/src/coming-soon.ts` | Bảo đảm không còn thẻ Shopee trùng |
| M | `packages/integrations/test/registry.test.ts` | Kỳ vọng `shopee` (thiếu env → coming_soon) |
| M | `packages/core/src/integrations/integrations.module.ts` | Import `token-refresher` Shopee |
| M | `.env.example` | `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`, `SHOPEE_HOST`, `SHOPEE_TRANSPORT` |
| M | `packages/shared/src/i18n/server/vi/sales.ts` | Nhãn trạng thái Shopee + lỗi `connection_auth_failed` |
| M | `packages/shared/src/i18n/server/en/sales.ts` | Như trên (en) |
| C | `packages/integrations/test/shopee.test.ts` | AC1, AC3, AC9: ký, cửa sổ / cursor, status map, sản phẩm, không path ghi |
| C | `packages/integrations/test/fixtures/shopee/order_list.json` | 2 trang, cursor, `more` |
| C | `packages/integrations/test/fixtures/shopee/order_detail.json` | Trả trước, COD, 2 model cùng item, đơn huỷ |
| C | `packages/integrations/test/fixtures/shopee/tracking.json` | Rỗng + có mã |
| C | `packages/integrations/test/fixtures/shopee/item_list.json` | Danh sách item |
| C | `packages/integrations/test/fixtures/shopee/model_list.json` | Model + `model_sku` + giá + tồn |
| C | `packages/integrations/test/fixtures/shopee/push_order_status.json` | Push code 3 + `Authorization` mẫu + URL ký |
| C | `apps/api/test/integration/shopee-sync.test.ts` | AC2, AC4–AC8, AC10 (fake + DB thật) |
