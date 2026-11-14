# TIP-048b — exact file manifest

M = sửa, C = tạo mới. Mọi path M đã có trên cây hiện tại.
- TIP-048 tạo `packages/channels/src/oauth.ts`, `packages/core/src/kernel/oauth/token-vault.ts`, `packages/core/src/kernel/oauth/pending-connect.ts`, `packages/core/src/kernel/oauth/providers.ts`, `packages/actions/src/oauth.ts`: 048b chỉ dùng, không sửa (không nằm trong bảng).
- Chung file với 048 (ghép 048 → 048b): `packages/channels/src/index.ts`, `packages/actions/src/index.ts`, `packages/shared/src/i18n/server/vi/channels.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `.env.example`.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/channels/src/webhook.ts` | `ChannelWebhook` (`challenge?` / `verify` / `split`), `HookItem`, so chữ ký thời gian hằng |
| M | `packages/channels/src/types.ts` | `connect.oauth` / `connect.via`; `capabilities.window` / `comments` / `live` / `sync`; `NormalizedInbound.thread`; `OutboundMessage.mode` / `targetExternalId` / `windowTag`; `adapter.webhook` + `handleWebhook(item, account, sink)`; `ChannelDeps.hooks` / `extra` |
| M | `packages/channels/src/registry.ts` | Nhận `deps.extra` (chỉ test); kiểm bất biến manifest khi build (`oauth` / `via` / `window`, bỏ qua `coming_soon`) |
| M | `packages/channels/src/coming-soon.ts` | Chỉ khi Rà #6 thấy thiếu: thêm type "Sắp có" của PD-903 (WhatsApp, WhatsApp Business API, Telegram, LINE, Viber, WeChat); không bật type nào |
| M | `packages/channels/src/index.ts` | Export `webhook.ts` + kiểu mới |
| C | `packages/channels/test/fixtures/fake-webhook-channel.ts` | Kênh webhook giả `fake_hook` (OAuth, cửa sổ 24 giờ + tag 168 giờ) và biến thể đếm tin (48 giờ / 10 / +3) |
| C | `packages/channels/test/webhook.test.ts` | `verify` đúng / sai / thiếu header; `split` nhiều route; `challenge` |
| M | `packages/channels/test/contract.test.ts` | Thêm driver kênh webhook giả: normalize qua `handleWebhook`, dedupe, send, probe, rate limit |
| M | `packages/channels/test/registry.test.ts` | Bất biến manifest; `extra`; số type nếu Rà #6 thêm type "Sắp có" |
| M | `packages/db/prisma/tenant/channels.prisma` | `ChannelAccount.oauthGrantId`; model `ChannelWebhookEvent` |
| M | `packages/db/prisma/tenant/inbox.prisma` | `Conversation.lastInboundAt` |
| M | `packages/db/prisma/platform/routing.prisma` | Model `TenantChannelWebhookRoute` |
| C | `packages/db/prisma/tenant/migrations/20261115110000_channel_webhooks/migration.sql` | `channel_webhook_event` + CHECK + FK + 2 index partial; `channel_account.oauth_grant_id` + index; `conversation.last_inbound_at`; index đếm tin ra (nếu Rà #9 thiếu) |
| C | `packages/db/prisma/platform/migrations/20261115110100_channel_webhook_route/migration.sql` | `tenant_channel_webhook_route` + CHECK status + idx(workspace_id) |
| C | `packages/core/src/channels/hooks/hook-ingress.service.ts` | challenge / verify / split / tra route / ghi biên nhận theo workspace / enqueue; 401 / 413 / 503 |
| C | `packages/core/src/channels/hooks/hook-route.ts` | Đọc lô route (cache 60 giây), claim (409 `channel_in_use_elsewhere`), bù, disable |
| C | `packages/core/src/channels/jobs/hook-events.processor.ts` | Queue `channel-hooks`: `handleWebhook` → `InboundSink`; outcome / attempts; sweeper 5 phút; dọn > 7 ngày |
| C | `packages/core/src/channels/hooks/echo-match.ts` | Echo: khớp theo `external_msg_id` → theo khoá gửi trong cửa sổ ngắn → tin `out` nguồn `external`; khoá dòng tin |
| C | `packages/core/src/channels/oauth/channel-oauth.handlers.ts` | `channel.oauth_select` / `channel.reauthorize`; consumer `oauth.grant_revoked` → tài khoản `expired` |
| C | `packages/core/src/inbox/services/send-window.ts` | `windowState()` thuần: `open` / `tag` / `closed` + mã lỗi |
| C | `packages/core/src/channels/services/channel-kinds.ts` | Đọc registry thay danh sách cứng: `sendableType(type, kind)`, `isLiveType(type)` |
| M | `packages/core/src/channels/channels.module.ts` | `channelRegistryFor` truyền `deps.hooks`; đăng ký ingress, route, handler, consumer |
| M | `packages/core/src/channels/channels.env.ts` | `CHANNEL_HOOKS_MAX_BYTES`, `CHANNEL_HOOKS_CONCURRENCY`, `CHANNEL_HOOK_RETENTION_DAYS`; chặn `extra` / transport giả ở production |
| M | `packages/core/src/channels/jobs/channels.jobs.module.ts` | Đăng ký queue `channel-hooks` + processor + sweeper + dọn |
| M | `packages/core/src/channels/services/accounts.service.ts` | Ngắt kết nối → route `disabled`; đọc `oauth_grant_id` |
| M | `packages/core/src/channels/services/read.service.ts` | `GET /settings/channels`: trường danh mục + `external_id` + `grant` (đọc lô) |
| M | `packages/core/src/channels/services/send-queue.ts` | `SendJob.sender` (`human` / `automation`; thiếu = `automation`) |
| M | `packages/core/src/inbox/services/meta.service.ts` | `/inbox/connect-channels` trả danh mục đủ type registry |
| M | `packages/core/src/inbox/services/outbound.ts` | Kiểm cửa sổ trước khi ghi (409 sớm); tag `human_agent` cho người gửi |
| M | `packages/core/src/channels/jobs/send.processor.ts` | Chốt cửa sổ trước `adapter.send` (đóng → `window_closed` cuối, không thử lại); `rate_limited` → hoãn theo `retryAfterMs`, không tính chuỗi tự tạm dừng; ghi ACK có điều kiện (echo tới trước) |
| M | `packages/core/src/inbox/services/pipeline.ts` | Cập nhật `last_inbound_at` cùng câu stats; bỏ qua `thread.kind = 'comment'` (048f) |
| C | `packages/actions/src/channel-oauth.ts` | `defineAction` `channel.oauth_select` + `channel.reauthorize` |
| M | `packages/actions/src/index.ts` | Export action mới |
| C | `apps/api/src/http/channels/channel-hooks.controller.ts` | `GET` / `POST /hooks/channels/:type` (raw body ≤ 1MB) |
| M | `apps/api/src/http/channels/channels.http.module.ts` | Đăng ký controller |
| M | `apps/api/src/bootstrap.ts` | Giới hạn body 1MB riêng cho `/hooks/channels/*` (chỉ sửa nếu Rà #5 thấy parser toàn cục chặn) |
| M | `packages/shared/src/api/channels.ts` | `channelCatalogItemSchema`; nhóm kênh + tài khoản thêm trường danh mục / `external_id` / `grant` |
| M | `packages/shared/src/api/inbox.ts` | `connectChannelsSchema` = mảng `channelCatalogItemSchema` (chỉ thêm trường) |
| M | `packages/shared/src/crm/labels.ts` | `CONTACT_SOURCES` + `zalo_oa`, `facebook`, `instagram`, `tiktok`; `SOURCE_STYLE`; `sourceOfChannel` |
| M | `packages/shared/src/support/ticket-state.ts` | `TICKET_CHANNELS` thêm 4 type D62 (test gác ở `channel-kinds.test.ts`) |
| M | `packages/shared/src/booking/appointment-state.ts` | `APPOINTMENT_SOURCES` thêm 4 type D62 |
| M | `packages/core/src/sales/quotes/services/quote-send.ts` | Nhánh `auto`: kênh hội thoại qua `sendableType(type, 'file')`, bỏ mảng 3 kênh |
| M | `packages/core/src/sales/orders/actions/order-confirmation.handler.ts` | Như trên |
| M | `packages/core/src/sales/payments/actions/receipt-send.handler.ts` | Như trên |
| M | `packages/core/src/support/events/ai-complaint.consumer.ts` | Kênh ticket theo registry |
| M | `packages/core/src/insights/services/calendar-follow-ups.ts` | Kênh theo registry |
| M | `packages/shared/src/i18n/server/vi/channels.ts` | 6 mã lỗi §10 |
| M | `packages/shared/src/i18n/server/en/channels.ts` | Như trên (en) |
| M | `apps/web/messages/vi/customers.json` | `source.zalo_oa`, `source.facebook`, `source.instagram`, `source.tiktok` |
| M | `apps/web/messages/en/customers.json` | Như trên (en) |
| M | `.env.example` | Khối "Kênh webhook" (4 biến §9) |
| C | `packages/core/test/send-window.test.ts` | Bảng ca `windowState` (24 giờ + tag, 48 giờ / 10 / +3, không cửa sổ, chưa có tin vào) |
| C | `packages/core/test/echo-match.test.ts` | AC14: echo trước ACK, echo lặp, echo từ app nền tảng, echo + ACK cùng lúc |
| C | `packages/core/test/channel-kinds.test.ts` | `sendableType` / `isLiveType`; gác `TICKET_CHANNELS` / `APPOINTMENT_SOURCES` / `CONTACT_SOURCES` phủ type D62 có `send` |
| C | `apps/api/test/integration/channel-hooks.test.ts` | AC1–3, AC12, AC14: chữ ký, trùng, nhiều workspace, 503, sweeper, EXPLAIN, echo |
| C | `apps/api/test/integration/channel-oauth-select.test.ts` | AC4–6: 409 nơi khác, hạn mức, nối lại, pending người khác, uỷ quyền lại |
| C | `apps/api/test/integration/send-window.test.ts` | AC7–8, AC10, AC13: 409 sớm, chốt cuối `window_closed`, tag chỉ người gửi, registry thay danh sách cứng, hoãn khi bị giới hạn tốc độ |
