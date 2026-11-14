# TIP-049b — Shopee: connector Open Platform v2 (đơn, vận đơn, đọc sản phẩm / biến thể, webhook push, token 4 giờ) (Sàn, D63)

## HEADER
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `.env.example`, `packages/core/src/integrations/integrations.module.ts`, `packages/integrations/src/registry.ts`, `packages/integrations/test/registry.test.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 049 before049b.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048 before049b.
- **Parallel-safe with TIP-049c (coverage-closure manifest):** sequential, shares `.env.example`, `packages/core/src/integrations/integrations.module.ts`, `packages/integrations/src/coming-soon.ts`, `packages/integrations/src/registry.ts`, `packages/integrations/test/registry.test.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 049b before049c.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before049b.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `packages/core/src/integrations/integrations.module.ts`, `packages/integrations/src/registry.ts`; integrate 012b before049b.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `packages/core/src/integrations/integrations.module.ts`, `packages/integrations/src/registry.ts`; integrate 012c before049b.
- **Parallel-safe with TIP-012d (coverage-closure manifest):** sequential, shares `packages/integrations/src/coming-soon.ts`, `packages/integrations/src/registry.ts`; integrate 012d before049b.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 015d before049b.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`; integrate 020e before049b.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 022c before049b.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 023b before049b.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `packages/core/src/integrations/integrations.module.ts`; integrate 023c before049b.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 030b before049b.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032b before049b.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032c before049b.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032e before049b.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before049b.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `packages/core/src/integrations/integrations.module.ts`; integrate 045b before049b.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before049b.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048b before049b.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048d before049b.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048e before049b.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048h before049b.
- **TIP-ID:** TIP-049b · **Project:** AppChat V2 · **Module:** Sàn — connector Shopee (`packages/integrations`) · **Priority:** P0 · **Estimated:** L
- **Depends on:** 049 và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 049c, 049d, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 049 dựng toàn bộ nền: port `OrderSyncProvider` theo cursor, `marketplace-kit.ts` (shopKey, buyerAccountId, HMAC, RateGate, kiểu webhook), manifest `hosts` / `oauth` / `webhook.ack` / `requiresEnv`, `ProviderHttp.post` + allowlist + call log, `integration.oauth_select`, route `tenant_shop_route`, `POST /hooks/marketplace/:connector`, pull theo hàng đợi, năm lỗi đồng bộ, ghép SKU, `integration.auth_event`.
  - 048 (qua 049): `TokenVault` làm mới có khoá — refresh Shopee dùng một lần, chỉ `TokenVault` được gọi `refresh`.
  - 049b chỉ thêm adapter + đăng ký; không sửa logic nền. Thiếu gì ở nền → L2, không vá trong adapter.
- **Files touched:** [exact M/C manifest](manifests/TIP-049b-files.md). Thư mục mới `packages/integrations/src/connectors/shopee/` + `packages/core/src/integrations/shopee/`. Không đổi schema.
- **Quyết định nguồn:** D63 · DC-918 · DC-917 · DC-909 · Q-914 · COMMERCE §4b · Blueprint §4.7, §10 (K9).
- **Dòng COVERAGE nhận:** REQ-F07c (Shopee) · D63-shopee · DC-918 · Q-914.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. Adapter nằm ở `packages/integrations` (không import core); core chỉ đăng ký OAuth provider + token refresher.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - Sau 049: `marketplace-kit.ts`, `ports/order-sync.ts` (pull theo cursor, `getOrder?`, `getTracking?`, `listProducts?`), `mock_shop` làm mẫu adapter oauth2 + webhook.
  - Mẫu adapter + contract test + fixtures JSON: `connectors/sepay`, `connectors/casso` (`test/sepay-contract.test.ts`, `test/casso-contract.test.ts`, `test/fixtures/sepay/*`).
  - `packages/integrations/src/coming-soon.ts` (32): kiotviet / sapo / haravan / woocommerce. Shopee chưa có ở đây (049 đã bỏ khỏi `packages/channels/src/coming-soon.ts`).
  - Nhãn Lazada chỉ có ở `packages/shared/src/i18n/server/vi/sales.ts` ~L129.
  - **Shopee Open Platform v2 (khảo sát 2026-11-13):**
    - App ERP (mọi API trừ Chat + Ads); ISV cần pháp nhân, sản phẩm thật, domain HTTPS TLS ≥ 1.2, khai IP; ≤ 10 app; go-live ~24 giờ (Q-914).
    - Uỷ quyền `/api/v2/shop/auth_partner` (chữ ký, hết hạn 5 phút) → redirect `code` + `shop_id` (hoặc `main_account_id` cho tài khoản chính nhiều shop). Seller chọn hạn uỷ quyền 7–365 ngày. Code dùng một lần, 10 phút.
    - Token: `/api/v2/auth/token/get` → access **4 giờ** (token cũ còn 5 phút sau khi làm mới), refresh **30 ngày, dùng một lần**; `/api/v2/auth/access_token/get` làm mới.
    - Ký: `sign = hex HMAC-SHA256(partner_key, partner_id + path + timestamp + access_token + shop_id)`; API public bỏ `access_token` + `shop_id`; `timestamp` lệch ≤ 5 phút.
    - API: `v2.order.get_order_list` (`time_range_field`, `time_from` / `time_to` ≤ 15 ngày, `page_size` ≤ 100, `cursor`, `more`), `v2.order.get_order_detail` (≤ 50 `order_sn`), `v2.logistics.get_tracking_number`, `v2.product.get_item_list`, `v2.product.get_item_base_info`, `v2.product.get_model_list`.
    - Push: `order_status_push` (code 3, timeout 3 giây, gửi lại 5 phút / 30 phút / 3 giờ), `order_trackingno_push` (4), sắp hết uỷ quyền (12, trước 7 ngày); `webchat_push` (10) app ERP không nhận. `Authorization = hex HMAC-SHA256(partner_key, url + "|" + body)`. Trả **2xx body rỗng**; > 600 push / 6 giờ mà thành công < 30% → Shopee tắt push.
    - Chat: whitelist → Sắp có. Livestream: app loại Livestream Management riêng → Sắp có.
- **Key files to read first:** TIP-049 (bản đã ghép) · DC-918 · COMMERCE §4b · `standards/integrations/provider-ports.md` · `connectors/sepay/*` · `marketplace-kit.ts`.
- **Patterns to follow:** adapter `connectors/sepay` (manifest + client + contract test + fixtures), `mock_shop` (049), `TokenVault` + `registerOAuthProvider` (048).

## APPLICABLE STANDARDS
- [integrations/provider-ports](../standards/integrations/provider-ports.md) — manifest, port, sandbox / live, contract test bằng fixture, test live chỉ khi `INTEG_LIVE_SHOPEE=1`.
- [domain/concurrency](../standards/domain/concurrency.md) — refresh dùng một lần dưới khoá, webhook idempotent.
- [domain/state-machine](../standards/domain/state-machine.md) · [domain/money-time-numbering](../standards/domain/money-time-numbering.md) — ánh xạ trạng thái về hai trục; tiền VND chuỗi; thời điểm epoch giây → ISO có offset.
- [ops/observability-security](../standards/ops/observability-security.md) — không log `partner_key`, `access_token`, `sign`, tên / địa chỉ / SĐT người mua.
- [plans/COMMERCE-DECISIONS](../plans/COMMERCE-DECISIONS.md) §4b — không đổi luật.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` sau khi 049 đã merge. `python -X utf8 tools/obligations/manifests.py 049b`. Kiểm lại số dòng `~` trên dev; lệch → sửa TIP dòng "Rà lại <ngày>".
2. Đọc lại bản mới nhất: tài liệu Shopee Open Platform v2 (path, giới hạn, mã push, `main_account_id`), TIP-049 đã ghép (tên hàm `marketplace-kit`, hình `SyncCursor`, `ConnectionCtx.token()`), TIP-048 `registerOAuthProvider` / `TokenVault`.
3. Q-914: có partner test (sandbox) chưa? Chưa → mọi AC chạy `SHOPEE_TRANSPORT=fake`, ô live ghi "chưa nghiệm thu với provider thật". Có → chạy thêm `INTEG_LIVE_SHOPEE=1` trên shop thử.
4. Đối chiếu trạng thái đơn Shopee với bảng §6 (tài liệu có thể thêm trạng thái). Trạng thái lạ → ánh xạ an toàn (giữ trục, chỉ cập nhật `platform_status`) + log cảnh báo.
5. Kiểm 049 ghi `account.tokens` theo shop cho Shopee (§3). Không có đường đó → L2 (không tự viết lưu token).

## TASK
Thêm connector `shopee` (port `order_sync`, `auth.kind = 'oauth2'`): uỷ quyền + chọn shop, kéo đơn theo cursor, chi tiết đơn, vận đơn, đọc sản phẩm / biến thể, webhook push, transport `fake`. Không ghi gì lên Shopee.

## SPECIFICATIONS

### 1. Bố cục (`packages/integrations/src/connectors/shopee/`, mỗi file ≤ 300 dòng)
`manifest.ts` · `sign.ts` · `oauth.ts` · `client.ts` · `order-sync.ts` · `products.ts` · `webhook.ts` · `status-map.ts` · `fake-server.ts` · `provider-capabilities.md`. Core: `packages/core/src/integrations/shopee/token-refresher.ts`.

### 2. Manifest + env
- `key: 'shopee'`, `port: 'order_sync'`, `group: 'commerce'`, `status: 'beta'`, `auth: { kind: 'oauth2', fields: z.object({}) }`, `oauth: { provider: 'shopee', picker: 'shop' }`, `webhook: { ack: 'empty_2xx' }`, `modes: ['sandbox', 'live']`, `rateLimit: { rps: 5 }`, `capabilities: { orders: true, tracking: true, products: true, buyerChat: 'soon' }`, `requiresEnv: ['SHOPEE_PARTNER_ID', 'SHOPEE_PARTNER_KEY']`.
- `hosts`: `partner.shopeemobile.com` (live), `partner.test-stable.shopeemobile.com` (sandbox) — tên host kiểm ở Rà #2.
- Env: `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`, `SHOPEE_HOST` (mặc định live; sandbox khi `mode = 'sandbox'`), `SHOPEE_TRANSPORT` (`http` | `fake`; production cấm `fake`).
- Thiếu `SHOPEE_PARTNER_ID` / `SHOPEE_PARTNER_KEY` → thẻ "Sắp có" (049 `requiresEnv`), không lỗi boot.

### 3. Ký + OAuth
- **`sign.ts`:** `signShop(path, ts, accessToken, shopId)` = hex HMAC-SHA256(partner_key, `partner_id + path + ts + access_token + shop_id`); `signPublic(path, ts)` (bỏ token + shop); `ts` = giây theo `Clock`. Dùng `hmacHex` của kit. Test vector cố định trong fixture.
- **`oauth.ts`** (`OAuthClient`, `provider: 'shopee'`, `pkce: false`):
  - `authorizeUrl({ state, redirectUri })` → `https://<host>/api/v2/shop/auth_partner?partner_id&timestamp&sign&redirect=<redirectUri?state=…>`. Shopee không có tham số `state` riêng: gắn `state` vào `redirect`. Callback 048 đọc `state` từ query như mọi provider (kiểm ở Rà).
  - `exchange({ code, query })`:
    - `query.shop_id` → một shop;
    - `query.main_account_id` → `token/get` theo tài khoản chính, trả `shop_id_list` → nhiều shop.
    - Mỗi shop gọi `v2.shop.get_shop_info` lấy tên + `region`. Region ≠ `VN` → vẫn trả để 049 từ chối `shop_region_unsupported`.
    - Trả `accounts[]` với `tokens` **riêng từng shop** (access / refresh theo shop) để 049 tạo grant theo shop. `grant` = token của shop đầu (subject = `shop:<shop_id>`).
  - `refresh(t)` → `POST /api/v2/auth/access_token/get` `{ refresh_token, partner_id, shop_id }` → cặp mới (`refreshExpiresAt = now + 30 ngày`). `error = invalid_refresh_token` / `error_auth` → ném lỗi `invalid_grant` để `TokenVault` chuyển `revoked`.
- **`token-refresher.ts` (core):** `registerOAuthProvider(shopeeOAuth, { purposes: ['connector'], permission: 'integrations.manage' })` + hạn làm mới sớm 30 phút trước hạn access (4 giờ). Job `oauth-refresh` (048) quét grant `shopee` còn < 30 phút. Không tự gọi `refresh` ngoài `TokenVault`.

### 4. Client
- `client.ts`: `call(conn, path, { query?, body? })` qua `ctx.http` (ProviderHttp — allowlist + call log), ký mỗi lần, token qua `ctx.token()`.
- Lỗi Shopee (`error` khác rỗng):
  - `error_auth` / `invalid_access_token` → gọi lại một lần sau khi `TokenVault` làm mới; lần hai vẫn lỗi → `connection_auth_failed`.
  - `error_server` / 5xx / timeout → retry theo hàng đợi.
  - Giới hạn tần suất → `RateGate` back-off.
- Mỗi request có `request_id` của Shopee vào call log (không payload).

### 5. Đơn + vận đơn (`order-sync.ts`)
- `pull(conn, cursor)`:
  - Cửa sổ của 049 chia ≤ 15 ngày (`splitWindow(…, 15)`), `time_range_field = 'update_time'`, `page_size = 100`, `cursor` của Shopee lưu ở `SyncCursor.token`.
  - Mỗi trang lấy danh sách `order_sn` rồi `get_order_detail` theo lô 50 (`response_optional_fields`: `buyer_user_id`, `buyer_username`, `item_list`, `payment_method`, `total_amount`, `pay_time`, `update_time`, `shipping_carrier`, `cod`…).
  - `more = false` và hết cửa sổ con → `done`.
- Chuẩn hoá `ExternalOrder`:
  - `externalId = order_sn`; `buyer.externalId = String(buyer_user_id)`, tên = `buyer_username`. Không lấy SĐT / địa chỉ bị che làm dữ liệu khách.
  - Dòng: `externalItemId = item_id`, `externalModelId = model_id` (0 → rỗng), `sellerSku = model_sku || item_sku`, `variantName = model_name`, `qty = model_quantity_purchased`, đơn giá = `model_discounted_price` (VND, chuỗi số nguyên).
  - Tổng = `total_amount`; `cod = payment_method` là COD (kiểm giá trị chuỗi ở Rà #2); `paidAt = pay_time`; `updatedAt = update_time`.
  - Shipping: `carrier = shipping_carrier` (khác rỗng mới gửi); `tracking` không có trong detail → `getTracking`.
- `getOrder(conn, order_sn)` → `get_order_detail` một đơn.
- `getTracking(conn, order_sn)` → `v2.logistics.get_tracking_number`; rỗng → `null` (giữ dữ liệu hiện có — lỗi 1 của 049).

### 6. Ánh xạ trạng thái (`status-map.ts` — `mapStatus(platform_status, { cod })`)
| Shopee | `status` | `pay_status` |
|---|---|---|
| `UNPAID` | `new` | `unpaid` |
| `READY_TO_SHIP` · `PROCESSED` · `RETRY_SHIP` | `processing` | `paid` (trả trước) · `unpaid` (COD) |
| `SHIPPED` · `TO_CONFIRM_RECEIVE` | `processing` | như trên |
| `COMPLETED` | `completed` | `paid` (COD: `paid` khi hoàn tất — COMMERCE §4b) |
| `IN_CANCEL` | giữ trục hiện tại | giữ |
| `CANCELLED` | `cancelled` | `unpaid` (chưa thu) · `refunded` (đã thu trên sàn) |
| `TO_RETURN` | giữ trục hiện tại | giữ (Returns API — gap 049) |

- `advanceOnly` (kit) chặn kéo lùi. `platform_status` gốc luôn lưu. Trạng thái lạ → giữ trục + log cảnh báo.
- `new → processing` là xác nhận đơn → trừ kho theo Q8 (đường của 049, theo `stock_master`). `cancelled` → hoàn kho.
- Đơn trả trước khi vào `paid`: ghi `customer_payment(method = marketplace)` qua đường nhập của 049; **không** sinh Đề nghị thanh toán.

### 7. Sản phẩm / biến thể (`products.ts` — chỉ đọc)
- `listProducts(conn, cursor)`: `v2.product.get_item_list` (`item_status = NORMAL`, `offset` / `page_size` 100 → cursor = offset) → `get_item_base_info` (≤ 50 id / lần) → item có biến thể (`has_model`) gọi `get_model_list`.
- Mỗi model = một `ExternalProduct` (`externalModelId = model_id`, `sellerSku = model_sku`, giá = `price_info[0].current_price`, `stock` = tồn khả dụng theo `stock_info_v2`); item không biến thể = một `ExternalProduct` (`externalModelId` rỗng, `sellerSku = item_sku`).
- Không gọi API ghi (`update_stock`, `update_price`, `add_item`…). Test khẳng định client không có path ghi.

### 8. Webhook (`webhook.ts` — `MarketplaceWebhook`)
- `verify(raw, headers, { url, secrets })`: `safeEqualHex(headers.authorization, hmacHex(partner_key, url + '|' + raw))`. `url` = URL callback đầy đủ đã khai với Shopee (`HOOKS_PUBLIC_URL + '/hooks/marketplace/shopee'`, giữ đúng chuỗi).
- `split(raw)`: một push một item; `shopId = String(shop_id)`; `eventKey = code + ':' + shop_id + ':' + (data.ordersn ?? '') + ':' + timestamp`.
  - Code 3 → `kind: 'order'` (`externalId = data.ordersn`).
  - Code 4 → `kind: 'tracking'`.
  - Code 12 → `kind: 'auth_expiring'`.
  - Khác (gồm 10 webchat) → `kind: 'other'` (bỏ, vẫn 2xx).
- Trả 200 body rỗng (049 theo `webhook.ack`). Không xử lý trong request.
- Hết uỷ quyền thật đến qua `invalid_refresh_token` / `error_auth` khi làm mới (`TokenVault` → `oauth.grant_revoked`) → kết nối `expired` + thông báo (049 §8).

### 9. Transport `fake` + fixtures
- `fake-server.ts`: cài `ProviderHttp` giả trong tiến trình, trả fixtures theo path, kiểm chữ ký đầu vào (sai → lỗi `error_sign`), đếm số lời gọi theo path (test "refresh một lần"), trạng thái đơn đổi theo kịch bản.
- Fixtures (`packages/integrations/test/fixtures/shopee/`): `order_list.json` (2 trang, cursor, `more`), `order_detail.json` (trả trước + COD + 2 model cùng item + đơn huỷ), `tracking.json`, `item_list.json`, `model_list.json`, `push_order_status.json` (kèm `Authorization` mẫu + URL ký).
- `provider-capabilities.md`: bảng API dùng / không dùng, giới hạn, mã push, việc Sắp có (chat, livestream, đẩy tồn / trạng thái), việc cần tài khoản (Q-914).

### 10. Đăng ký + chuỗi
- `packages/integrations/src/registry.ts`: thêm `shopee` (đăng ký luôn; `requiresEnv` quyết định thẻ).
- `packages/integrations/src/coming-soon.ts`: không có thẻ Shopee trùng; nếu Rà thấy dòng Shopee ở đây → bỏ.
- `packages/core/src/integrations/integrations.module.ts`: import `token-refresher` (đăng ký provider OAuth).
- i18n server `sales.ts` vi + en: nhãn trạng thái Shopee (`platform_status.shopee.*` theo nhóm nhãn sàn hiện có ~L129) + lỗi `connection_auth_failed`.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given test vector cố định, when ký request shop và request public, then `sign` đúng hex mong đợi; `timestamp` lệch > 5 phút (đồng hồ giả) → fake trả `error_sign` | `packages/integrations/test/shopee.test.ts` |
| 2 | Given `SHOPEE_TRANSPORT=fake`, when uỷ quyền bằng `main_account_id` có 2 shop VN + 1 shop SG, then `exchange` trả 3 account có token riêng; `integration.oauth_select` → 2 kết nối, 2 grant theo shop, shop SG 422 `shop_region_unsupported` | `apps/api/test/integration/shopee-sync.test.ts` |
| 3 | Given fixture 2 trang (cursor + `more`), when pull, then nhập đủ đơn một lần; chạy lại không trùng; cửa sổ 30 ngày chia ≤ 15 ngày (fake đếm `time_from` / `time_to` mỗi lời gọi) | `shopee.test.ts` + `shopee-sync.test.ts` |
| 4 | Given đơn `READY_TO_SHIP` trả trước, COD, `COMPLETED`, `CANCELLED`, when nhập, then hai trục đúng bảng §6; trả trước có `customer_payment(method = marketplace)`, không Đề nghị thanh toán; COD `paid` chỉ khi `COMPLETED`; sự kiện `READY_TO_SHIP` đến sau `COMPLETED` không kéo lùi | `shopee-sync.test.ts` |
| 5 | Given push code 3 ký đúng, when `POST /hooks/marketplace/shopee`, then **200 body rỗng** (`Content-Length: 0`), một `integration_event`, job lấy `get_order_detail` cập nhật đơn; ký sai → 401, không ghi; gửi lặp → một sự kiện | `shopee-sync.test.ts` |
| 6 | Given access còn 5 phút, when hai worker gọi API cho cùng shop song song, then fake `access_token/get` được gọi đúng 1 lần (refresh dùng một lần); fake trả `invalid_refresh_token` → grant `revoked`, kết nối `expired`, thông báo `integration_expired` | `shopee-sync.test.ts` |
| 7 | Given đơn có 2 model cùng item, listing đã ghép model 1 với biến thể X, when nhập, then dòng 1 nhận X qua `integration_mapping`, dòng 2 khớp theo `model_sku`; xác nhận → trừ tồn đúng từng biến thể | `shopee-sync.test.ts` |
| 8 | Given `get_tracking_number` trả rỗng rồi trả `SPXVN123`, when đồng bộ hai lượt, then vận đơn nhập tay giữ ở lượt 1; lượt 2 ghi `SPXVN123`, `shipping.source.tracking = 'platform'` | `shopee-sync.test.ts` |
| 9 | Given `item_list` + `model_list`, when `marketplace.import_products`, then `marketplace_listing` có đủ item / model + gợi ý ghép theo SKU; không có `product` mới; client Shopee không có path ghi | `shopee.test.ts` + `shopee-sync.test.ts` |
| 10 | Given log + `integration_call_log` của các ca trên, when tìm `partner_key`, `access_token`, `sign`, tên / SĐT người mua, then không thấy | `shopee-sync.test.ts` (quét log + bảng) |
| 11 | Given tài khoản Shopee ISV + shop thật (Q-914) + domain HTTPS (Q-006), when uỷ quyền, kéo đơn thật, nhận push thật, then như AC2–AC8 | **chưa nghiệm thu với provider thật** (chờ Q-914 / Q-006); chạy `INTEG_LIVE_SHOPEE=1` khi có |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{integrations,shared,core,api}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check`.
- Unit: `pnpm --filter @appchat/integrations test -- test/shopee.test.ts test/registry.test.ts`.
- Integration (`--workers=1`, slot Postgres): `pnpm --filter @appchat/api test:integration -- test/integration/shopee-sync.test.ts`.
- Live (khi có Q-914): `INTEG_LIVE_SHOPEE=1 SHOPEE_TRANSPORT=http pnpm --filter @appchat/integrations test -- test/shopee.test.ts`.

## CONSTRAINTS
- **DO NOT:**
  - Gọi API ghi của Shopee (tồn, giá, sản phẩm, trạng thái, vận chuyển) — đẩy lên sàn là P2, đăng sản phẩm ngoài phạm vi.
  - Gọi `refresh` ngoài `TokenVault`; giữ token trong adapter.
  - Log / lưu `partner_key`, `access_token`, `sign`, dữ liệu người mua bị che.
  - Xử lý push trong request; trả body khác rỗng cho push.
  - Thêm thư viện SDK Shopee (HMAC = `node:crypto`, HTTP = `fetch` qua ProviderHttp).
  - Sửa logic nền 049 trong adapter.
- **REUSE:**
  - `marketplace-kit.ts`, `ProviderHttp`, `TokenVault`, `registerOAuthProvider`.
  - `integration.oauth_select`, route shop, webhook mức App, pull theo hàng đợi, ghép SKU (049).
  - Mẫu `connectors/sepay` + contract test fixtures.
- **SKIP:**
  - Chat người mua (whitelist — Sắp có), livestream Shopee (app riêng — Sắp có).
  - Returns API, Ads, đẩy tồn / trạng thái.
  - UI (049d).

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync 049 049b 049c 049d`.
- [x] Ký, OAuth, đơn, vận đơn, sản phẩm, webhook theo tài liệu Shopee v2 (khảo sát 2026-11-13); Rà #2 đối chiếu bản mới.
- [x] Refresh dùng một lần chỉ qua `TokenVault` (AC6).
- [x] Luật COMMERCE §4b không đổi (AC4).
- [x] 11 AC; ô cần tài khoản thật ghi "chưa nghiệm thu với provider thật".
- **Gap đã khai:**
  - Q-914: chưa có app ISV / shop thật — mọi AC bằng `fake`.
  - Push Shopee có thể bị tắt nếu tỉ lệ thành công thấp: pull 5 phút của 049 vẫn đối soát.
  - Trả hàng (`TO_RETURN`) chỉ giữ `platform_status`.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; mỗi file ≤ 300 dòng.
- [ ] AC 1–10 có kết quả từng cái, dán output thật; AC11 ghi "chưa nghiệm thu với provider thật" nếu chưa có Q-914.
- [ ] **Luật COMMERCE §4b (BUILDER-HANDOFF §2):** đơn sàn khoá dòng / giá, thanh toán qua sàn không sinh Đề nghị thanh toán, COD `paid` khi hoàn tất, tích điểm mặc định tắt.
- [ ] **Bí mật:** `partner_key` chỉ ở env; token chỉ ở `oauth_grant` (mã hoá); log / call log không chứa token, `sign`, dữ liệu người mua.
- [ ] **Action-first (BUILDER-HANDOFF #3):** webhook chỉ qua 049 (`integration_event` + outbox); không ghi DB trong adapter.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
