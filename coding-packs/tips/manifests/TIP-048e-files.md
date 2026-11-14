# TIP-048e — exact file manifest

M = sửa, C = tạo mới. Hai pha, mỗi pha một PR: P1 Facebook Page (lõi `meta/` + `facebook/` + `token-check`), P2 Instagram + data deletion. M path tương lai do TIP-048b tạo (cần 048 → 048b → 048c → 048d đã tích hợp):
- `apps/api/src/http/channels/channel-hooks.controller.ts` (048b) — thêm route data deletion, không đổi route `:type`.
- `packages/channels/src/webhook.ts` (048b) — hợp đồng `ChannelWebhook` mà `meta/webhook.ts` cài; 048e chỉ đọc, không sửa.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/channels/src/meta/graph.ts` | P1. Graph client `fetch` (`META_GRAPH_VERSION`, Bearer, `appsecret_proof`), `HttpMetaTransport`, Send API text / tệp multipart, `subscribed_apps`, `debug_token`; bảng lỗi 190 / 10 / 200 / 613 / 551 / 100 → lỗi adapter; giới hạn tệp |
| C | `packages/channels/src/meta/oauth.ts` | P1. `OAuthClient` `facebook`: Login for Business `config_id` → user token dài hạn → `/me/accounts` → page token từng Page + IG Business gắn Page; lọc task `MESSAGING` |
| C | `packages/channels/src/meta/webhook.ts` | P1 / P2. `challenge` (`META_VERIFY_TOKEN`), `verify` `X-Hub-Signature-256`, `split` `entry[]` → `facebook:<page_id>` / `instagram:<ig_id>`, `eventKey`, `kind`; `changes[]` bỏ qua |
| C | `packages/channels/src/meta/fake-transport.ts` | Graph + OAuth giả tất định: 3 Page, `sent[]`, `subscribed[]`, `failNext`, `debugToken`, `signedHook`, `signedDeletion` |
| C | `packages/channels/src/meta/provider-capabilities.md` | Ma trận năng lực Page / IG, webhook, lỗi, giới hạn, quyền App Review, việc vận hành; "Kiểm thật" CHỜ-TK (Q-908) |
| C | `packages/channels/src/facebook/manifest.ts` | P1. Manifest `facebook` GA theo env (`window` 24 giờ → `tag_human_agent` 168 giờ khi `META_HUMAN_AGENT`) |
| C | `packages/channels/src/facebook/adapter.ts` | P1. `FacebookAdapter`: `webhook`, `handleWebhook`, `send` (RESPONSE / MESSAGE_TAG HUMAN_AGENT theo `windowTag`, ledger), `probe` |
| C | `packages/channels/src/facebook/normalize.ts` | P1. `messaging[]` Page → `NormalizedInbound` / `ProviderEvent` (tin, tệp, postback, echo, cảm xúc, đã xem, đã nhận) |
| C | `packages/channels/src/facebook/render.ts` | P1. Chia đoạn (2.000 ký tự Messenger / 1.000 byte IG), kiểm loại / cỡ tệp |
| C | `packages/channels/src/instagram/manifest.ts` | P2. Manifest `instagram` GA theo env, cùng provider `facebook` |
| C | `packages/channels/src/instagram/adapter.ts` | P2. `InstagramAdapter` dùng grant Page gắn; gửi qua Send API |
| C | `packages/channels/src/instagram/normalize.ts` | P2. Sự kiện `object: instagram` → `NormalizedInbound` / `ProviderEvent` |
| M | `packages/channels/src/registry.ts` | `ChannelDeps.meta` → gắn adapter `facebook` / `instagram`; thiếu cấu hình → "Sắp có"; `messenger` theo trạng thái `facebook` |
| M | `packages/channels/src/coming-soon.ts` | Bỏ `facebook`, `instagram`; `messenger` = thẻ `connect.via = 'facebook'`, không adapter |
| M | `packages/channels/src/index.ts` | Export adapter, transport, kiểu Meta |
| C | `packages/channels/test/meta.test.ts` | Unit: challenge / verify / signed_request, split nhiều entry, normalize từng fixture, render, bảng lỗi, tag, OAuth giả |
| C | `packages/channels/test/fixtures/meta/messages.json` | Fixture tin Page (chữ + tệp, nhiều `entry`) |
| C | `packages/channels/test/fixtures/meta/message_echoes.json` | Fixture echo (AppChat + Meta Business Suite) |
| C | `packages/channels/test/fixtures/meta/postback.json` | Fixture postback |
| C | `packages/channels/test/fixtures/meta/reactions.json` | Fixture cảm xúc |
| C | `packages/channels/test/fixtures/meta/reads.json` | Fixture đã xem / đã nhận |
| C | `packages/channels/test/fixtures/meta/ig_messages.json` | Fixture tin Instagram |
| M | `packages/channels/test/registry.test.ts` | `facebook` / `instagram` GA; `messenger` `via`; thiếu env → "Sắp có" |
| C | `packages/core/src/channels/meta/token-check.ts` | P1. Job 6 giờ `debug_token` theo grant Page; không hợp lệ → đường thu hồi của 048 → `expired` + thông báo |
| C | `packages/core/src/channels/meta/data-deletion.ts` | P2. Kiểm `signed_request`, audit `sha256(user_id)`, job tìm khách theo identity → thông báo Owner + lối tắt quên khách; tiến độ Redis; trạng thái theo `contact.privacy_status` |
| M | `packages/core/src/channels/channels.module.ts` | `channelRegistryFor`: transport `http` / `fake`; `registerOAuthProvider` `facebook` |
| M | `packages/core/src/channels/channels.env.ts` | `META_TRANSPORT`, `META_APP_ID`, `META_APP_SECRET`, `META_LOGIN_CONFIG_ID`, `META_VERIFY_TOKEN`, `META_GRAPH_VERSION`, `META_HUMAN_AGENT`; `fake` cấm production |
| M | `packages/core/src/channels/jobs/channels.jobs.module.ts` | Lịch `meta-token-check` + hàng đợi `meta-data-deletion` |
| M | `apps/api/src/http/channels/channel-hooks.controller.ts` | P2. `POST /hooks/channels/facebook/data-deletion` → `{ url, confirmation_code }`; `GET …/data-deletion/:code` (30 / phút / IP) |
| M | `.env.example` | Khối "Meta (Facebook / Instagram)" + URL webhook / data deletion |
| M | `tools/scripts/e2e-http.mjs` | API + worker channels chạy `META_TRANSPORT=fake` + khoá test |
| M | `packages/shared/src/i18n/server/vi/channels.ts` | `name.facebook` / `name.instagram`; lỗi Meta; trạng thái data deletion; thông báo Owner |
| M | `packages/shared/src/i18n/server/en/channels.ts` | Như trên (en) |
| M | `apps/web/messages/vi/settings.json` | `channels.facebook.review_notice`, `channels.instagram.review_notice`, `channels.instagram.via_page` (+ nhãn nếu thiếu) |
| M | `apps/web/messages/en/settings.json` | Như trên (en) |
| C | `apps/api/test/integration/meta-messaging.test.ts` | AC1–9, AC11: webhook, nhiều workspace, trùng, echo, cửa sổ + tag, lỗi Graph, token-check, chọn Page + IG, data deletion |
| M | `apps/api/test/integration/channels.test.ts` | `/settings/channels`: `facebook` / `messenger` / `instagram` `available: true`, đếm on / off mới |
| M | `apps/web/e2e/http/channels.spec.ts` | Thẻ Facebook bật; OAuth giả → chọn Page + IG → webhook → Hộp thư → trả lời |
