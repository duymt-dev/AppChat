# TIP-049c — TikTok Shop: connector Partner API VN (đơn, package / vận đơn, đọc sản phẩm / SKU, webhook, huỷ uỷ quyền) (Sàn, D63)

## HEADER
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `.env.example`, `packages/core/src/integrations/integrations.module.ts`, `packages/integrations/src/registry.ts`, `packages/integrations/test/registry.test.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 049 before049c.
- **Parallel-safe with TIP-049b (coverage-closure manifest):** sequential, shares `.env.example`, `packages/core/src/integrations/integrations.module.ts`, `packages/integrations/src/coming-soon.ts`, `packages/integrations/src/registry.ts`, `packages/integrations/test/registry.test.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 049b before049c.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048 before049c.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before049c.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `packages/core/src/integrations/integrations.module.ts`, `packages/integrations/src/registry.ts`; integrate 012b before049c.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `packages/core/src/integrations/integrations.module.ts`, `packages/integrations/src/registry.ts`; integrate 012c before049c.
- **Parallel-safe with TIP-012d (coverage-closure manifest):** sequential, shares `packages/integrations/src/coming-soon.ts`, `packages/integrations/src/registry.ts`; integrate 012d before049c.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 015d before049c.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`; integrate 020e before049c.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 022c before049c.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 023b before049c.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `packages/core/src/integrations/integrations.module.ts`; integrate 023c before049c.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 030b before049c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032b before049c.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032c before049c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032e before049c.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before049c.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `packages/core/src/integrations/integrations.module.ts`; integrate 045b before049c.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before049c.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048b before049c.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048d before049c.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048e before049c.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048h before049c.
- **TIP-ID:** TIP-049c · **Project:** AppChat V2 · **Module:** Sàn — connector TikTok Shop (`packages/integrations`) · **Priority:** P0 · **Estimated:** L
- **Depends on:** 049, 049b và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 049d, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 049: nền sàn (port theo cursor, `marketplace-kit.ts`, manifest `hosts` / `oauth` / `webhook.ack` / `requiresEnv`, `ProviderHttp.post`, `integration.oauth_select`, route shop, webhook mức App, pull theo hàng đợi, năm lỗi đồng bộ, ghép SKU, `integration.auth_event`).
  - 049b: cùng sửa `packages/integrations/src/registry.ts`, `coming-soon.ts`, `integrations.module.ts`, `.env.example`, `i18n/server/{vi,en}/sales.ts`; dùng lại khuôn adapter Shopee (bố cục, fake-server, contract test). Ghép theo thứ tự 049b → 049c.
  - 048 (qua 049): `TokenVault` làm mới có khoá.
- **Files touched:** [exact M/C manifest](manifests/TIP-049c-files.md). Thư mục mới `packages/integrations/src/connectors/tiktok-shop/` + `packages/core/src/integrations/tiktok-shop/`. Không đổi schema.
- **Quyết định nguồn:** D63 · DC-919 · DC-917 · DC-909 · Q-915 · COMMERCE §4b · Blueprint §4.7, §10 (K9).
- **Dòng COVERAGE nhận:** REQ-F07c (TikTok Shop) · D63-tiktok-shop · DC-919 · Q-915.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. Adapter ở `packages/integrations` (không import core).
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - Sau 049 / 049b: `marketplace-kit.ts`, port theo cursor, adapter `shopee` làm khuôn.
  - Nhãn web `apps/web/messages/*/orders.json` `platform.tiktok` (~L46–50) khác key backend `tiktok_shop` — 049d sửa nhãn; 049c dùng key `tiktok_shop` thống nhất.
  - Chat TikTok (TIP-048h, `tiktok_messaging`) là hệ thống khác; tin nhắn TikTok Shop không đi qua kênh đó.
  - **TikTok Shop Partner API VN (khảo sát 2026-11-13):**
    - App ISV / seller developer qua Partner Center; duyệt ~4–6 tuần (thẩm định ~5 ngày làm việc, ARD 3–5, app 7–10, listing 7–10 / thị trường, DSPR ~2 tuần nếu bị yêu cầu) (Q-915).
    - Uỷ quyền: seller cài app qua link uỷ quyền (`TTS_SERVICE_ID`) → redirect `code` (auth_code **30 phút, một lần**) → `GET auth.tiktok-shops.com/api/v2/token/get` (`app_key`, `app_secret`, `auth_code`, `grant_type=authorized_code`) → access **7 ngày**; refresh theo hạn seller cấp; `/api/v2/token/refresh`.
    - Một uỷ quyền = một người bán; `GET /authorization/<version>/shops` trả các shop + `cipher` (`shop_cipher` bắt buộc ở API theo shop).
    - Ký: `sign` = hex HMAC-SHA256(app_secret, `app_secret + path + (key + value sắp xếp theo key, bỏ sign / access_token) + body + app_secret`); header `x-tts-access-token`; tham số `app_key`, `timestamp`, `shop_cipher`.
    - Order search / detail (có LIVE session id, nickname người mua); package / tracking: VN **trống tới khi gửi hàng / in nhãn**; product search / get: `skus[].seller_sku`, giá, tồn.
    - Webhook: `Authorization` = hex HMAC-SHA256(app_secret, `app_key + raw_body`); topic order status (1), package update (4), `SELLER_DEAUTHORIZATION`, `UPCOMING_AUTHORIZATION_EXPIRATION` (trước 30 ngày); tin nhắn (13, 14) không dùng. TikTok khuyên poll đối soát.
    - Rate: QPS động theo App × Shop (~3–10 rps); vượt → HTTP 429 / mã `36009002`.
    - Customer Service API (chat người mua): cần ≥ 1.000 seller uỷ quyền hoặc ≥ 1 triệu call / ngày → coi như không có (Sắp có). LIVE: chỉ analytics.
- **Key files to read first:** TIP-049 + TIP-049b (bản đã ghép) · DC-919 · COMMERCE §4b · `standards/integrations/provider-ports.md` · `connectors/shopee/*` · `marketplace-kit.ts`.
- **Patterns to follow:** adapter `connectors/shopee` (049b), `mock_shop` (049), `TokenVault` + `registerOAuthProvider` (048).

## APPLICABLE STANDARDS
- [integrations/provider-ports](../standards/integrations/provider-ports.md) — manifest, port, sandbox / live, contract test bằng fixture, test live chỉ khi `INTEG_LIVE_TIKTOK_SHOP=1`.
- [domain/concurrency](../standards/domain/concurrency.md) — làm mới dưới khoá, webhook idempotent, back-off 429.
- [domain/state-machine](../standards/domain/state-machine.md) · [domain/money-time-numbering](../standards/domain/money-time-numbering.md) — ánh xạ trạng thái; tiền VND chuỗi; epoch giây → ISO có offset.
- [ops/observability-security](../standards/ops/observability-security.md) — không log `app_secret`, token, `sign`, `shop_cipher`, dữ liệu người mua.
- [plans/COMMERCE-DECISIONS](../plans/COMMERCE-DECISIONS.md) §4b — không đổi luật.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` sau khi 049b đã merge. `python -X utf8 tools/obligations/manifests.py 049c`. Kiểm lại số dòng `~` trên dev; lệch → sửa TIP dòng "Rà lại <ngày>".
2. Đọc lại bản mới nhất: tài liệu TikTok Shop Partner API (phiên bản path `202309` / mới hơn, host `open-api.tiktokglobalshop.com`, thuật toán ký, tên topic webhook, trạng thái đơn VN), TIP-049 / 049b đã ghép.
3. Q-915: có app ISV duyệt + shop thử VN chưa? Chưa → mọi AC chạy `TTS_TRANSPORT=fake`, ô live ghi "chưa nghiệm thu với provider thật".
4. Kiểm 049 tạo một grant chung cho nhiều shop của cùng người bán (account không mang `tokens` riêng) — TikTok Shop cần đúng đường này. Không có → L2.
5. Đối chiếu trạng thái đơn TikTok Shop với bảng §6; trạng thái lạ → giữ trục + log cảnh báo.

## TASK
Thêm connector `tiktok_shop` (port `order_sync`, `auth.kind = 'oauth2'`): uỷ quyền người bán + chọn shop, kéo đơn theo cursor, chi tiết, package / vận đơn, đọc sản phẩm / SKU, webhook (gồm huỷ uỷ quyền), transport `fake`. Không ghi gì lên TikTok Shop.

## SPECIFICATIONS

### 1. Bố cục (`packages/integrations/src/connectors/tiktok-shop/`, mỗi file ≤ 300 dòng)
`manifest.ts` · `sign.ts` · `oauth.ts` · `client.ts` · `order-sync.ts` · `products.ts` · `webhook.ts` · `status-map.ts` · `fake-server.ts` · `provider-capabilities.md`. Core: `packages/core/src/integrations/tiktok-shop/token-refresher.ts`.

### 2. Manifest + env
- `key: 'tiktok_shop'`, `port: 'order_sync'`, `group: 'commerce'`, `status: 'beta'`, `auth: { kind: 'oauth2', fields: z.object({}) }`, `oauth: { provider: 'tiktok_shop', picker: 'shop' }`, `webhook: { ack: 'json_200' }`, `modes: ['sandbox', 'live']`, `rateLimit: { rps: 3 }`, `capabilities: { orders: true, tracking: true, products: true, buyerChat: 'soon' }`, `requiresEnv: ['TTS_APP_KEY', 'TTS_APP_SECRET', 'TTS_SERVICE_ID']`.
- `hosts`: `auth.tiktok-shops.com`, `open-api.tiktokglobalshop.com` (kiểm ở Rà #2).
- Env: `TTS_APP_KEY`, `TTS_APP_SECRET`, `TTS_SERVICE_ID`, `TTS_TRANSPORT` (`http` | `fake`; production cấm `fake`).
- Thiếu env → thẻ "Sắp có" (049 `requiresEnv`), không lỗi boot.

### 3. Ký + OAuth
- **`sign.ts`:** `signRequest(path, query, body)`: bỏ `sign` + `access_token` khỏi query, sắp xếp key tăng dần, nối `key + value`, chuỗi = `path + nối + body` (body JSON nguyên văn, bỏ khi multipart), `sign = hex HMAC-SHA256(app_secret, app_secret + chuỗi + app_secret)`. Dùng `hmacHex` của kit. Test vector cố định.
- **`oauth.ts`** (`OAuthClient`, `provider: 'tiktok_shop'`, `pkce: false`):
  - `authorizeUrl({ state })` → link uỷ quyền theo `TTS_SERVICE_ID` + `state` (kiểm dạng URL thị trường VN ở Rà #2).
  - `exchange({ code })` → `token/get` → grant (subject = `seller:<open_id>`; `accessExpiresAt` 7 ngày; `refreshExpiresAt` theo phản hồi) → `GET /authorization/<ver>/shops` → `accounts[]`: `external_id = shop_id`, `name`, `meta.region`, `meta.cipher = shop_cipher`. **Không** có `tokens` theo shop (một grant cho mọi shop của người bán — 049 §3).
  - `refresh(t)` → `token/refresh`; lỗi refresh hết hạn / bị thu hồi → `invalid_grant` để `TokenVault` chuyển `revoked`.
- **`token-refresher.ts` (core):** `registerOAuthProvider(ttsOAuth, { purposes: ['connector'], permission: 'integrations.manage' })`; làm mới khi access còn < 1 ngày (job `oauth-refresh` của 048).

### 4. Client
- `client.ts`: `call(conn, path, { query?, body? })` qua `ctx.http`; thêm `app_key`, `timestamp`, `shop_cipher` (từ `conn.meta.cipher`), `sign`; header `x-tts-access-token` = `ctx.token()`.
- Lỗi:
  - Hết hạn / token sai → gọi lại một lần sau khi `TokenVault` làm mới; vẫn lỗi → `connection_auth_failed`.
  - HTTP 429 / `36009002` → `RateGate` back-off.
  - 5xx / timeout → retry theo hàng đợi.
- `request_id` vào call log (không payload).

### 5. Đơn + package (`order-sync.ts`)
- `pull(conn, cursor)`: Order Search theo `update_time_ge` / `update_time_lt` (cửa sổ của 049), `page_size` 50, `page_token` lưu ở `SyncCursor.token`; hết `next_page_token` → `done`. Chi tiết theo lô (`ids` ≤ 50).
- Chuẩn hoá `ExternalOrder`:
  - `externalId = order id`; `buyer.externalId = user_id`, tên = `buyer_nickname` (không lấy SĐT / địa chỉ bị che làm dữ liệu khách).
  - Dòng: `externalItemId = product_id`, `externalModelId = sku_id`, `sellerSku = seller_sku`, `variantName = sku_name`, `qty`, đơn giá = `sale_price` (VND chuỗi).
  - Tổng = `payment.total_amount`; `cod = is_cod`; `paidAt = paid_time`; `updatedAt = update_time`.
  - `live_id` (nếu có) chỉ ghi vào `external_ref.meta` để hiển thị; không đổi luồng.
- `getTracking(conn, orderId)`: package detail / tracking — VN trống tới khi gửi / in nhãn → `null` (giữ dữ liệu hiện có — lỗi 1 của 049); có thì `carrier = shipping_provider_name`, `tracking = tracking_number`.

### 6. Ánh xạ trạng thái (`status-map.ts` — `mapStatus(platform_status, { cod })`)
| TikTok Shop | `status` | `pay_status` |
|---|---|---|
| `UNPAID` · `ON_HOLD` | `new` | `unpaid` |
| `AWAITING_SHIPMENT` · `PARTIALLY_SHIPPING` · `AWAITING_COLLECTION` | `processing` | `paid` (trả trước) · `unpaid` (COD) |
| `IN_TRANSIT` · `DELIVERED` | `processing` | như trên |
| `COMPLETED` | `completed` | `paid` (COD: `paid` khi hoàn tất — COMMERCE §4b) |
| `CANCELLED` | `cancelled` | `unpaid` (chưa thu) · `refunded` (đã thu trên sàn) |

- `advanceOnly` chặn kéo lùi; `platform_status` gốc luôn lưu; trạng thái lạ → giữ trục + log.
- Trả hàng / hoàn tiền một phần (Return & Refund API) không làm (gap 049).
- Trừ kho / hoàn kho / `customer_payment(method = marketplace)` theo đường của 049; không sinh Đề nghị thanh toán.

### 7. Sản phẩm / SKU (`products.ts` — chỉ đọc)
- `listProducts(conn, cursor)`: Product Search (`page_size` 100, `page_token`) → Product Get khi cần đủ SKU.
- Mỗi `skus[]` = một `ExternalProduct` (`externalItemId = product_id`, `externalModelId = sku id`, `sellerSku = seller_sku`, giá = `price.sale_price`, `stock` = tổng `inventory[].quantity`).
- Không gọi API ghi (tồn, giá, đăng / sửa sản phẩm). Test khẳng định client không có path ghi.

### 8. Webhook (`webhook.ts` — `MarketplaceWebhook`)
- `verify(raw, headers)`: `safeEqualHex(headers.authorization, hmacHex(app_secret, app_key + raw))`.
- `split(raw)`: một item; `shopId = shop_id`; `eventKey = type + ':' + shop_id + ':' + (data.order_id ?? data.package_id ?? '') + ':' + timestamp` (có id thông báo riêng thì dùng id đó — kiểm ở Rà #2).
  - type 1 → `kind: 'order'`.
  - type 4 → `kind: 'tracking'`.
  - `SELLER_DEAUTHORIZATION` → `kind: 'deauthorized'` (049 §8: kết nối `expired` + thông báo `integration_expired`).
  - `UPCOMING_AUTHORIZATION_EXPIRATION` → `kind: 'auth_expiring'` (thông báo `integration_expiring`).
  - 13 / 14 (tin nhắn) và khác → `kind: 'other'` (bỏ, vẫn 200).
- Trả 200 `{ data: { accepted } }` (049 `json_200`); xử lý nền.

### 9. Transport `fake` + fixtures
- `fake-server.ts`: ProviderHttp giả; kiểm `sign` + `x-tts-access-token` + `shop_cipher`; trả fixtures; đếm lời gọi theo path; giả lập 429 / `36009002` theo kịch bản; package trống rồi có mã.
- Fixtures (`packages/integrations/test/fixtures/tiktok-shop/`): `order_search.json` (2 trang, `next_page_token`), `order_detail.json` (trả trước, COD, 2 SKU cùng product, huỷ, có `live_id`), `package_detail.json` (trống + có mã), `product_search.json` (product + `skus[]` + `seller_sku` + tồn), `webhook_order_status.json` (+ `Authorization` mẫu), `webhook_deauth.json`.
- `provider-capabilities.md`: API dùng / không dùng, QPS, topic, Sắp có (chat người mua, LIVE, đẩy tồn / trạng thái), việc cần tài khoản (Q-915).

### 10. Đăng ký + chuỗi
- `packages/integrations/src/registry.ts`: thêm `tiktok_shop`.
- `packages/integrations/src/coming-soon.ts`: không có thẻ TikTok Shop trùng.
- `packages/core/src/integrations/integrations.module.ts`: import `token-refresher` TikTok Shop.
- i18n server `sales.ts` vi + en: nhãn trạng thái TikTok Shop (`platform_status.tiktok_shop.*`); dùng lại `connection_auth_failed` (049b).

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given test vector cố định (query không sắp xếp, có `access_token` + `sign`, body JSON), when ký, then `sign` đúng hex mong đợi; fake từ chối chữ ký sai | `packages/integrations/test/tiktok-shop.test.ts` |
| 2 | Given `TTS_TRANSPORT=fake`, người bán có 2 shop VN, when uỷ quyền + `integration.oauth_select` cả hai, then một grant `tiktok_shop` + 2 kết nối cùng `oauth_grant_id`, mỗi kết nối có `shop_cipher` riêng trong `config`; workspace khác chọn lại shop → 409 `shop_in_use_elsewhere` | `apps/api/test/integration/tiktok-shop-sync.test.ts` |
| 3 | Given fixture 2 trang `next_page_token`, when pull, then nhập đủ đơn một lần, chạy lại không trùng; 429 / `36009002` → back-off rồi tiếp đúng trang, không mất đơn | `tiktok-shop.test.ts` + `tiktok-shop-sync.test.ts` |
| 4 | Given đơn trả trước, COD, `COMPLETED`, `CANCELLED`, when nhập, then hai trục đúng bảng §6; trả trước có `customer_payment(method = marketplace)`, không Đề nghị thanh toán; COD `paid` chỉ khi `COMPLETED`; tích điểm mặc định không cộng | `tiktok-shop-sync.test.ts` |
| 5 | Given webhook type 1 ký đúng, when `POST /hooks/marketplace/tiktok_shop`, then 200, một `integration_event`, job cập nhật đơn; ký sai → 401, không ghi; gửi lặp → một sự kiện | `tiktok-shop-sync.test.ts` |
| 6 | Given webhook `SELLER_DEAUTHORIZATION` của shop A, when xử lý, then kết nối A `expired`, thông báo `integration_expired` tới người có `integrations.manage`, pull A bỏ qua, shop B vẫn `connected`; gửi lặp không thêm thông báo | `tiktok-shop-sync.test.ts` |
| 7 | Given access còn < 1 ngày, when hai worker cùng gọi API cho hai shop chung grant, then fake `token/refresh` gọi đúng 1 lần, cả hai dùng token mới | `tiktok-shop-sync.test.ts` |
| 8 | Given package trống (VN chưa gửi) rồi có mã, when đồng bộ hai lượt, then vận đơn nhập tay giữ ở lượt 1; lượt 2 ghi mã sàn + `shipping.source.tracking = 'platform'` | `tiktok-shop-sync.test.ts` |
| 9 | Given `product_search.json`, when `marketplace.import_products`, then `marketplace_listing` theo từng SKU + gợi ý ghép theo `seller_sku`; không `product` mới; client không có path ghi; đơn có 2 SKU cùng product → trừ tồn đúng từng biến thể | `tiktok-shop.test.ts` + `tiktok-shop-sync.test.ts` |
| 10 | Given log + `integration_call_log` của các ca trên, when tìm `app_secret`, token, `sign`, `shop_cipher`, tên / SĐT người mua, then không thấy | `tiktok-shop-sync.test.ts` |
| 11 | Given app ISV TikTok Shop VN đã duyệt + shop thật (Q-915) + domain HTTPS (Q-006), when uỷ quyền, kéo đơn thật, nhận webhook thật, then như AC2–AC8 | **chưa nghiệm thu với provider thật** (chờ Q-915 / Q-006); chạy `INTEG_LIVE_TIKTOK_SHOP=1` khi có |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{integrations,shared,core,api}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check`.
- Unit: `pnpm --filter @appchat/integrations test -- test/tiktok-shop.test.ts test/registry.test.ts`.
- Integration (`--workers=1`, slot Postgres): `pnpm --filter @appchat/api test:integration -- test/integration/tiktok-shop-sync.test.ts`.
- Live (khi có Q-915): `INTEG_LIVE_TIKTOK_SHOP=1 TTS_TRANSPORT=http pnpm --filter @appchat/integrations test -- test/tiktok-shop.test.ts`.

## CONSTRAINTS
- **DO NOT:**
  - Gọi API ghi của TikTok Shop (tồn, giá, sản phẩm, trạng thái, ship package) — đẩy lên sàn là P2, đăng sản phẩm ngoài phạm vi.
  - Dùng Customer Service API (chat người mua) — Sắp có.
  - Trộn với kênh `tiktok_messaging` (048h) — hệ thống khác, grant khác.
  - Gọi `refresh` ngoài `TokenVault`; giữ token / `shop_cipher` trong log.
  - Thêm SDK TikTok (HMAC = `node:crypto`, HTTP = `fetch` qua ProviderHttp).
  - Sửa logic nền 049 trong adapter.
- **REUSE:**
  - `marketplace-kit.ts`, `ProviderHttp`, `TokenVault`, `registerOAuthProvider`.
  - `integration.oauth_select` (grant chung nhiều shop), route shop, webhook mức App, `integration.auth_event` (049).
  - Khuôn adapter `connectors/shopee` (049b).
- **SKIP:**
  - Chat người mua, LIVE (chỉ analytics), Return & Refund API, Affiliate, Ads.
  - UI (049d).

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync 049 049b 049c 049d`.
- [x] Ký, OAuth (một người bán nhiều shop), đơn, package, sản phẩm, webhook gồm huỷ uỷ quyền theo tài liệu Partner API (khảo sát 2026-11-13); Rà #2 đối chiếu bản mới.
- [x] Làm mới dưới khoá (AC7); huỷ uỷ quyền → `expired` + thông báo (AC6).
- [x] Luật COMMERCE §4b không đổi (AC4).
- [x] 11 AC; ô cần tài khoản thật ghi "chưa nghiệm thu với provider thật".
- **Gap đã khai:**
  - Q-915: app ISV duyệt ~4–6 tuần — mọi AC bằng `fake` tới khi có.
  - QPS động: `rateLimit` 3 rps là mức an toàn, chỉnh theo thực đo khi có app thật.
  - Trả hàng / hoàn một phần chỉ giữ `platform_status`.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; mỗi file ≤ 300 dòng.
- [ ] AC 1–10 có kết quả từng cái, dán output thật; AC11 ghi "chưa nghiệm thu với provider thật" nếu chưa có Q-915.
- [ ] **Luật COMMERCE §4b (BUILDER-HANDOFF §2):** khoá dòng / giá, thanh toán qua sàn không sinh Đề nghị thanh toán, COD `paid` khi hoàn tất, tích điểm mặc định tắt.
- [ ] **Bí mật:** `app_secret` chỉ ở env; token chỉ ở `oauth_grant` (mã hoá); log / call log không chứa token, `sign`, `shop_cipher`, dữ liệu người mua.
- [ ] **Action-first (BUILDER-HANDOFF #3):** webhook chỉ qua 049; huỷ uỷ quyền đi `integration.auth_event`; adapter không ghi DB.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
