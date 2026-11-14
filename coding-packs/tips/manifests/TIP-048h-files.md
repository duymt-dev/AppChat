# TIP-048h — exact file manifest

M = sửa, C = tạo mới. TIP trước cần đã tích hợp (không có M path tương lai — mọi file M đã có trên dev):
- TIP-048 có `registerOAuthProvider` + `TokenVault` (`packages/core/src/kernel/oauth/*`); 048h chỉ gọi, không sửa.
- TIP-048b có `ChannelWebhook`, `send-window.ts` (tham số `tiktok_messaging`), `channel.oauth_select`; TIP-048f có hội thoại `comment`, `social_comment.private_reply_eligible`, action `comment.*`.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/channels/src/tiktok/manifest.ts` | Type `tiktok_messaging` (Beta): connect OAuth, `window` 48 giờ / 10 / +3, `comments`, `sync`, `rateLimit` |
| C | `packages/channels/src/tiktok/adapter.ts` | `webhook`, `handleWebhook`, `send` (direct / bình luận), `probe`, `operations.moderateComment` |
| C | `packages/channels/src/tiktok/oauth.ts` | `OAuthClient` `tiktok_messaging`: authorize, exchange, refresh (access 1 ngày, refresh 1 năm), danh sách tài khoản Business |
| C | `packages/channels/src/tiktok/webhook.ts` | `TikTok-Signature: t=…,s=…` (HMAC-SHA256 app secret, `t + "." + body`, lệch ≤ 5 phút); split theo tài khoản |
| C | `packages/channels/src/tiktok/normalize.ts` | `im_receive_msg` / `im_send_msg` (echo) / `im_referral_msg` → `NormalizedInbound` |
| C | `packages/channels/src/tiktok/comments.ts` | Accounts API comment list / reply / hide / delete; `comment.update`; `im_receive_high_intent_comment` → nhắn riêng `direct_reply` |
| C | `packages/channels/src/tiktok/api.ts` | Client Business API (`fetch`, header `Access-Token`), mã lỗi → `ChannelOperationError` / `expired` / chậm lại |
| C | `packages/channels/src/tiktok/fake-transport.ts` | Transport `fake` (env `TIKTOK_TRANSPORT=fake`) cho test / e2e |
| C | `packages/channels/src/tiktok/provider-capabilities.md` | Ma trận năng lực TikTok BM + Accounts API (2026-11), điều kiện comment-to-message |
| C | `packages/channels/test/tiktok.test.ts` | Chữ ký, normalize, echo, gửi direct / bình luận, hạn mức 10 / +3, refresh token, `fake` |
| C | `packages/channels/test/fixtures/tiktok/im_receive_msg.json` | Webhook tin khách (text + ảnh) |
| C | `packages/channels/test/fixtures/tiktok/im_send_msg.json` | Webhook echo tin shop gửi |
| C | `packages/channels/test/fixtures/tiktok/im_receive_high_intent_comment.json` | Webhook bình luận high-intent (comment-to-message) |
| C | `packages/channels/test/fixtures/tiktok/comment_update.json` | Webhook `comment.update` (bình luận video organic) |
| C | `packages/channels/test/fixtures/tiktok/oauth_token.json` | Phản hồi đổi code / làm mới token |
| C | `packages/core/src/channels/tiktok/tiktok-comments-sync.ts` | Đối soát bình luận video theo trang (Accounts API `comment/list`) qua hàng đợi |
| C | `apps/api/test/integration/tiktok-messaging.test.ts` | AC1–AC10 (webhook giả + DB thật) |
| M | `packages/channels/src/registry.ts` | Đăng ký adapter `tiktok_messaging` |
| M | `packages/channels/src/coming-soon.ts` | Bỏ dòng `tiktok_messaging` (giữ `tiktok_shop` — sàn ở D63) |
| M | `packages/channels/test/registry.test.ts` | Số kênh có adapter / Beta mới |
| M | `packages/core/src/channels/channels.module.ts` | Deps TikTok (`hooks.secrets`, transport) + `registerOAuthProvider('tiktok_messaging')` |
| M | `packages/core/src/channels/channels.env.ts` | `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET`, `TIKTOK_TRANSPORT` (cấm `fake` ở production) |
| M | `.env.example` | Khối TikTok |
| M | `packages/shared/src/i18n/server/vi/channels.ts` | Lỗi `tiktok_quota_exhausted`, `tiktok_not_eligible`, nhãn kênh |
| M | `packages/shared/src/i18n/server/en/channels.ts` | Như trên (en) |
| M | `apps/web/messages/vi/settings.json` | Thẻ TikTok Messaging (Beta), mô tả điều kiện, hạn uỷ quyền |
| M | `apps/web/messages/en/settings.json` | Như trên (en) |
| M | `apps/web/messages/vi/inbox.json` | Nhãn hạn mức "còn N tin", lý do khoá nhắn riêng TikTok |
| M | `apps/web/messages/en/inbox.json` | Như trên (en) |
| M | `apps/api/test/integration/channels.test.ts` | Danh sách kênh: `tiktok_messaging` có adapter, Beta |
| M | `apps/web/e2e/http/channels.spec.ts` | Thẻ TikTok mở được luồng OAuth (transport `fake`) |
