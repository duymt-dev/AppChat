# TIP-048h — TikTok Business Messaging + bình luận video (Kênh, D62)

## HEADER
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `.env.example`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048 before048h.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048b before048h.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 048c before048h.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 048f before048h.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before048h.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `.env.example`, `apps/api/test/integration/channels.test.ts`, `apps/web/e2e/http/channels.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048d before048h.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `.env.example`, `apps/api/test/integration/channels.test.ts`, `apps/web/e2e/http/channels.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048e before048h.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 048g before048h.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/channels.module.ts`; integrate 003c before048h.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before048h.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before048h.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012b before048h.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012c before048h.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before048h.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before048h.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/registry.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 014b before048h.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 014c before048h.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 015b before048h.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 015d before048h.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 015f before048h.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before048h.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before048h.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 019c before048h.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before048h.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 020c before048h.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 020d before048h.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020e before048h.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 022b before048h.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 023b before048h.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 023c before048h.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 025b before048h.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 026b before048h.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 026c before048h.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 030b before048h.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before048h.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 032b before048h.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 032e before048h.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 033b before048h.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 033c before048h.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 034b before048h.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 037 before048h.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 039 before048h.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before048h.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042 before048h.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042b before048h.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 043 before048h.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/channels/channels.module.ts`; integrate 045b before048h.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before048h.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before048h.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 047d before048h.
- **TIP-ID:** TIP-048h · **Project:** AppChat V2 · **Module:** Kênh — TikTok (`tiktok_messaging`, Beta) · **Priority:** P1 · **Estimated:** L (2 pha: P1 OAuth + webhook + tin nhắn + cửa sổ; P2 bình luận video + comment-to-message)
- **Depends on:** 048b, 048c, 048f và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 049, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 048b: route `/hooks/channels/:type`, `ChannelWebhook`, biên nhận, `channel.oauth_select` + route nền tảng, cửa sổ gửi `send-window.ts` có sẵn tham số `tiktok_messaging` (48 giờ, `maxBeforeReply` 10, `graceAfterWindow` 3).
  - 048c: modal kết nối rẽ theo `connect.kind = 'oauth'` + chọn tài khoản (`useOAuthConnect`), khối Đồng bộ theo `capabilities.sync`.
  - 048f: hội thoại `comment`, `social_post` / `social_comment.private_reply_eligible`, action `comment.*`, agent trả lời bình luận như tin direct (DC-921), lệnh bền bình luận.
  - Qua 048b gián tiếp: OAuth + `TokenVault` + `registerOAuthProvider` (048).
  - 049 (nền sàn) đứng sau: chung `coming-soon.ts`, `registry.test.ts` (D63 bỏ `tiktok_shop` khỏi danh sách Sắp có).
- **Files touched:** [exact M/C manifest](manifests/TIP-048h-files.md). Adapter mới `packages/channels/src/tiktok/`. Không đổi schema (dùng `social_post` / `social_comment` của 048f, `oauth_grant` của 048).
- **Quyết định nguồn:** D62 (#1, #3, #5) · DC-916 · DC-910 · DC-914 · DC-921 · Q-910 · REQ-B08 · REQ-B13.
- **Dòng COVERAGE nhận:** REQ-B08 (tiktok) · BP-6-tiktok · DC-916 · Q-910

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. DB tenant riêng mỗi workspace: không `workspace_id`, không RLS.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Danh sách kênh:** `packages/channels/src/coming-soon.ts` (~44 dòng) có `tiktok_messaging` Beta ~L16 và `tiktok_shop` ~L20 (sàn — D63, không đụng). `registry.ts` (~33 dòng) `buildChannelRegistry` deps ~L15–31. `registry.test.ts` (~82 dòng) khẳng định số type / GA (~L13, ~L26–30, ~L42–46).
  - **Env:** `channels.env.ts` (~43 dòng), guard cấm `fake` ở production ~L29–34.
  - **Sau 048 / 048b / 048c / 048f** (theo hợp đồng brief §3.1–3.3):
    - `OAuthClient { provider, pkce, authorizeUrl, exchange, refresh }`, `registerOAuthProvider(client, { purposes, permission })`, `TokenVault.access(db, grantId)` (vault tự mở transaction riêng) (làm mới khi còn < 10 phút, khoá Redis + `FOR UPDATE`), job `oauth-refresh`.
    - `ChannelWebhook { challenge?, verify, split }`, `HookItem.kind`, `handleWebhook(item, account, sink)`.
    - `windowState(conv, manifest, now, sender)` kiểm ở `outbound.ts` (409 sớm) + `send.processor.ts` (chốt cuối).
    - `ingestComment`, hội thoại `comment`, `comment.reply` / `comment.private_reply` / `comment.hide` / `comment.unhide` / `comment.delete`.
  - **Test phải sửa khi bật kênh:** `apps/api/test/integration/channels.test.ts` ~L151 / ~L155; `apps/web/e2e/http/channels.spec.ts` ~L16.
  - **Prototype:** thẻ "TikTok Messaging" badge Beta (chanMeta L8971–8989), sơ đồ "KÊNH VÀO" TikTok L1422; Hộp thư không vẽ bình luận TikTok (PD-904 của 048f áp chung).
  - **TikTok (khảo sát 2026-11-13):**
    - Business Messaging API: Open Beta APAC (gồm VN); app developer được duyệt → form → review ≤ 10 ngày làm việc + DSPR; chỉ tài khoản VBA hoặc Advanced Access. Tin TikTok Shop là hệ thống riêng.
    - Token: access 1 ngày, refresh 1 năm.
    - Hạn mức: sau tin đầu của khách, shop gửi ≤ 10 tin / 48 giờ; khách trả lời thì không giới hạn trong 48 giờ; quá 48 giờ không trả lời chỉ thêm 3 tin. Loại tin text / ảnh / Q&A.
    - Webhook `/business/webhook/update/`, event `DIRECT_MESSAGE`: `im_receive_msg`, `im_send_msg`, `im_mark_read_msg`, `im_referral_msg`, `im_receive_high_intent_comment`, `im_auto_message_*`. Chữ ký `TikTok-Signature: t=…,s=…` = HMAC-SHA256(app secret, `t + "." + body`).
    - Comment-to-message: chỉ VN / ID / TH, chỉ bình luận high-intent, VBA hoặc Advanced Access + đã chạy Messaging Ads 7 ngày; `POST /business/message/direct_reply/update/`.
    - Bình luận video organic: Accounts API `/business/comment/list/`, `/business/comment/reply/create/`, `/business/comment/hide/`, `/business/comment/delete/`; webhook `comment.update` (scope `comment.list`); từ 20/03/2026 phải nộp Accounts API Access Application Form.
    - Bình luận livestream TikTok: không có API (Sắp có).
- **Key files to read first:** DC-916, D62, Q-910 · TIP-048 (OAuth), TIP-048b §3.2, TIP-048e (mẫu adapter webhook + OAuth chọn tài khoản), TIP-048f §2–§6 · `standards/channels/omnichannel-adapter.md` · các file nêu trên.
- **Patterns to follow:**
  - Adapter Meta của 048e: `oauth.ts` → `exchange` trả `accounts[]`; `webhook.ts` kiểm chữ ký mức App + split; `fake-transport.ts`; `provider-capabilities.md`.
  - Bình luận theo `facebook/comments.ts` của 048f (normalize → `thread.kind = 'comment'`, gửi theo `mode`, `moderateComment`).
  - Một nơi khai kênh: `registry.ts` + manifest; UI / AI chỉ đọc manifest.

## APPLICABLE STANDARDS
- [channels/omnichannel-adapter](../standards/channels/omnichannel-adapter.md) — thêm kênh = adapter + manifest; contract test; không `switch (type)`.
- [integrations/provider-ports](../standards/integrations/provider-ports.md) — client HTTP bằng `fetch`, transport `fake`, ma trận năng lực.
- [actions/action-registry](../standards/actions/action-registry.md) · [api/response-envelope](../standards/api/response-envelope.md) — kết nối qua `oauth.start` / `channel.oauth_select`; lỗi `{ error: { code } }`.
- [events/outbox](../standards/events/outbox.md) — gửi qua outbox + limiter.
- [database/tenant-db](../standards/database/tenant-db.md) — không đổi schema; token mã hoá trong `oauth_grant`.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — `channels.manage` kết nối; `inbox.reply` / `inbox.manage` theo 048f.
- [domain/concurrency](../standards/domain/concurrency.md) — đếm hạn mức dưới khoá hội thoại; làm mới token có khoá.
- [domain/gap-filling](../standards/domain/gap-filling.md) — hành vi gửi đã chốt (DC-921: agent là nhân viên); không permission mới (Q-912).
- [ops/observability-security](../standards/ops/observability-security.md) — không log token / chữ ký / nội dung tin.
- [i18n/i18n](../standards/i18n/i18n.md) · [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` mới nhất sau khi 048b, 048c, 048f đã merge.
   - `python -X utf8 tools/obligations/manifests.py 048h`. Tích hợp trước các TIP chung file.
   - Kiểm lại mọi số dòng `~` ở CONTEXT. Lệch → sửa TIP, thêm dòng "Rà lại <ngày>".
2. Đọc lại tài liệu TikTok bản mới nhất: Business Messaging API (endpoint gửi, loại tin, hạn mức, event webhook), Accounts API comment (đường dẫn, scope, `comment.update`), OAuth Business (authorize URL, token endpoint, hạn token), định dạng `TikTok-Signature`. Khác ghi chú → sửa `provider-capabilities.md` + ghi report. Đường dẫn trong TIP là theo khảo sát 2026-11-13.
3. Kiểm `send-window.ts` (048b) đã có tham số `tiktok_messaging` và đếm `maxBeforeReply` / `graceAfterWindow` theo số tin `out` sau `last_inbound_at`. Thiếu → escalation L2, không sửa file 048b.
4. Kiểm Q-910 (BM API + Accounts API form): chưa duyệt → toàn bộ test dùng transport `fake` + fixtures; ghi "chưa nghiệm thu với provider thật".
5. Kiểm `registry.test.ts` / `channels.test.ts` / `channels.spec.ts` đang khẳng định gì về số kênh GA / Beta (048d, 048e đã đổi); sửa đúng số mới.

## TASK
Bật kênh `tiktok_messaging` (Beta): kết nối bằng đăng nhập TikTok Business, nhận / gửi tin nhắn trong cửa sổ 48 giờ, bình luận video organic vào Hộp thư, nhắn riêng bình luận high-intent (comment-to-message) khi đủ điều kiện.
- **Pha 1:** manifest + OAuth (`TokenVault`) + webhook chữ ký + tin nhắn direct + echo + cửa sổ / hạn mức; registry, Sắp có, env, test kênh.
- **Pha 2:** bình luận video (webhook `comment.update` + đối soát `comment/list`), trả lời / ẩn / xoá; comment-to-message theo cờ từng bình luận.

## SPECIFICATIONS

### 1. Manifest — `tiktok/manifest.ts`
- `type: 'tiktok_messaging'`, `group: 'social'`, `status: 'beta'`, `session: 'webhook'`, nhãn / icon theo `coming-soon.ts` hiện tại (thẻ "TikTok Messaging", badge Beta).
- `connect: { kind: 'oauth', oauth: { provider: 'tiktok_messaging', picker: true, scopes: [<scope BM + comment — kiểm ở Rà>] } }`.
- `capabilities`:
  - `direct: true`, `group: false`, `mentions: false`, `reactions: false`, `send: ['text', 'image']`, `maxTextLength` theo tài liệu (kiểm ở Rà), `markdown: 'none'`, `proactive: 'disallowed'`.
  - `window: { hours: 48, after: 'blocked', maxBeforeReply: 10, graceAfterWindow: 3 }` (048b).
  - `comments: { publicReply: true, privateReply: false, hide: true, delete: true, like: false }` — `privateReply` mặc định tắt; bật theo từng bình luận bằng cờ `private_reply_eligible` (§5).
  - `operations: { comment_hide: 'remote', comment_unhide: 'remote', comment_delete: 'remote' }`.
  - `live: false` (live TikTok Sắp có). `sync: ['messages', 'comments', 'auto_contact']` (không `history` — API không trả lịch sử cũ).
- `rateLimit` theo tài liệu (kiểm ở Rà); mặc định an toàn `perMinute: 60`, không `perDayProactive`.
- `coming-soon.ts`: bỏ dòng `tiktok_messaging`; giữ `tiktok_shop` (D63 / 049 xử lý).

### 2. OAuth + token — `tiktok/oauth.ts`
1. `OAuthClient` provider `tiktok_messaging`, đăng ký ở `channels.module.ts` bằng `registerOAuthProvider(client, { purposes: ['channel'], permission: 'channels.manage' })`.
2. `authorizeUrl` → trang uỷ quyền TikTok Business (URL kiểm ở Rà), `state` ký của 048, redirect `HOOKS_PUBLIC_URL/hooks/oauth/tiktok_messaging/callback`.
3. `exchange` → `TokenSet { access (1 ngày), refresh (1 năm), accessExpiresAt, refreshExpiresAt, subject: <business_id>, scopes }` + `accounts: [{ externalId: <business_id>, name, avatarUrl }]` (thông tin tài khoản Business qua API).
4. `refresh` → cặp mới. `TokenVault.access` làm mới khi còn < 10 phút; job `oauth-refresh` (048) làm mới trước hạn. Adapter không tự làm mới, không giữ token trong bộ nhớ quá một lần gọi.
5. Refresh lỗi `invalid_grant` / hết hạn 1 năm → grant `revoked` (048) → tài khoản `expired` + thông báo "Uỷ quyền lại".
6. Chọn tài khoản: `channel.oauth_select` (048b) với `external_ids = [business_id]` → `channel_account` type `tiktok_messaging`, route `tiktok_messaging:<business_id>`; `QuotaService.assert('channels')` (Q-907).

### 3. Webhook — `tiktok/webhook.ts`
1. `verify(raw, headers, secrets)`: header `TikTok-Signature` dạng `t=<unix>,s=<hex>`; `s` = HMAC-SHA256(`TIKTOK_APP_SECRET`, `t + "." + raw`); so sánh thời gian hằng (`timingSafeEqual`); `|now − t| > 300 giây` → sai. Sai → 401, không biên nhận (048b).
2. `split(raw)` → `HookItem[]`: `routeKey = 'tiktok_messaging:<business_id>'` (id tài khoản nhận trong payload — kiểm tên trường ở Rà), `eventKey` = id sự kiện (không có → hash `event + id tin / bình luận + create_time`), `kind`:
   - `im_receive_msg` / `im_referral_msg` → `message`; `im_send_msg` → `echo`; `im_mark_read_msg` → `read`;
   - `im_receive_high_intent_comment` và `comment.update` → `comment`;
   - `im_auto_message_*` → `other` (bỏ, ghi biên nhận `ignored`).
3. Luôn 200 nhanh; xử lý nền qua `channel-hooks` (048b). Một POST nhiều sự kiện → nhiều item.
4. Đăng ký webhook (`/business/webhook/update/`) chạy một lần khi cấu hình App (script / hướng dẫn trong `provider-capabilities.md`), không chạy mỗi lần kết nối tài khoản.

### 4. Tin nhắn direct — `tiktok/normalize.ts` + `adapter.ts`
1. **Vào:** `im_receive_msg` → `NormalizedInbound` (`thread.kind = 'direct'`, `externalMsgId` = id tin, người gửi = id người dùng TikTok, `kind` text / image). Tin Q&A / thẻ → text tóm tắt + `providerRef`. Loại không hỗ trợ → text "[Tin không hỗ trợ]" (không mất tin).
2. **Echo:** `im_send_msg` → tin AppChat đã gửi trùng `external_msg_id` → bỏ; shop gửi từ app TikTok → tin `out` (không kích AI, không tính vào hạn mức lần nữa vì đếm theo dòng `message`).
3. **Đọc:** `im_mark_read_msg` → `ProviderEvent` receipt có sẵn (`seen`).
4. **Ra:** `send(accountId, msg)` → endpoint gửi BM API (kiểm ở Rà) với `TokenVault.access`; text / ảnh (ảnh upload theo tài liệu hoặc URL ký của `FileFetcher`). Lỗi → `api.ts` phân loại: token hết hạn → `expired`; hạn mức / cửa sổ → `failed` mã `window_closed`; rate → chậm lại theo limiter.
5. **Cửa sổ + hạn mức** (048b `send-window.ts`, không viết lại):
   - Khách nhắn tin đầu → `last_inbound_at` mở 48 giờ.
   - Chưa có tin khách sau tin `out` gần nhất: tối đa 10 tin `out` trong 48 giờ; tin thứ 11 → 409 `window_closed` ở `outbound.ts`.
   - Khách trả lời → đếm lại từ 0 (không giới hạn trong 48 giờ theo tài liệu — đếm vẫn theo luật 048b).
   - Quá 48 giờ không trả lời → thêm tối đa 3 tin (`graceAfterWindow`), sau đó `blocked`.
   - Job chờ trong hàng đợi mà cửa sổ đóng → `send.processor.ts` chốt cuối `window_closed`, không thử lại.
   - AI / follow-up / chiến dịch không dùng tag (TikTok không có tag).
6. **FE:** 048h chỉ thêm chuỗi i18n (`inbox.json`: "Còn N tin", lý do khoá). Hiển thị dùng chỗ 048b / 048c đã dựng cho trạng thái cửa sổ (nếu DTO hội thoại có `window`). Chưa có chỗ hiển thị → lỗi `window_closed` hiện bằng toast theo mã; ghi report, không sửa `Composer.tsx` ở TIP này.

### 5. Bình luận video + comment-to-message — `tiktok/comments.ts`
1. **Bình luận organic (Accounts API):**
   - Webhook `comment.update` → `NormalizedInbound` `thread: { kind: 'comment', post: { externalId: <video_id>, kind: 'video', permalink?, caption? } , parentExternalId? }` → `ingestComment` (048f). Sửa / xoá phía TikTok → `ProviderEvent comment_changed` (048f).
   - Đối soát `tiktok-comments-sync.ts`: mỗi 10 phút với tài khoản bật đồng bộ bình luận, `GET /business/comment/list/` cho video có bình luận trong 7 ngày (theo `social_post.last_comment_at`), trang theo cursor, dedupe như 048f. Chạy qua hàng đợi `channel-hooks` (job), không gọi trong request.
   - Trả lời công khai: `comment.reply` (048f) → `POST /business/comment/reply/create/`. Ẩn / hiện: `/business/comment/hide/` (lệnh bền). Xoá: `/business/comment/delete/` (lệnh bền). Thích: không hỗ trợ → 409 `comment_unsupported`.
2. **Comment-to-message (bình luận high-intent):**
   - Webhook `im_receive_high_intent_comment` → `ingestComment` (048f) + `ProviderEvent comment_changed` `change: 'private_reply_eligible'` → `social_comment.private_reply_eligible = true`.
   - Bình luận thường (không có sự kiện high-intent) → nhắn riêng khoá (`manifest.comments.privateReply = false`), tooltip "TikTok chỉ cho nhắn riêng bình luận có ý định cao".
   - `comment.private_reply` (048f) → `POST /business/message/direct_reply/update/` với id bình luận; trả id hội thoại / người nhận → hội thoại direct cùng khách (048f §4). Một lần / bình luận (khoá của 048f). Hạn: theo tài liệu (kiểm ở Rà; mặc định 7 ngày như 048f).
   - Điều kiện tài khoản (VN / ID / TH, VBA / Advanced Access, đã chạy Messaging Ads 7 ngày) do TikTok kiểm; TikTok từ chối → `failed` mã `tiktok_not_eligible`, hiện lý do; không thử lại.
3. Agent trên hội thoại bình luận TikTok làm như 048f §6 (DC-921): `auto` trả lời công khai thẳng, nhắn riêng bình luận high-intent khi được cấp `comment.private_reply`. Không nhắn riêng hàng loạt (D06).

### 6. Env, i18n, test kênh
- Env (`channels.env.ts` + `.env.example`): `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET`, `TIKTOK_TRANSPORT=http|fake` (mặc định `http`; production cấm `fake` theo guard ~L29–34). `hooks.secrets.tiktok_messaging` = app secret.
- Lỗi server (`i18n/server/{vi,en}/channels.ts`): `tiktok_quota_exhausted` (hạn mức 10 / +3 đã hết — hiển thị), `tiktok_not_eligible`. Dùng lại `window_closed`, `comment_unsupported`, `private_reply_used`, `private_reply_expired` (048b).
- Web: `settings.json` thẻ TikTok Messaging (Beta, điều kiện tài khoản, hạn uỷ quyền 1 năm); `inbox.json` nhãn "Còn N tin", lý do khoá nhắn riêng. `pnpm i18n:check`.
- `registry.test.ts`, `channels.test.ts` (~L151 / ~L155), `e2e/http/channels.spec.ts` (~L16) sửa theo số kênh mới. Contract test chung (`contract.test.ts`) chạy cho adapter mới qua `extra` / DRIVERS (048b).
- Không màn FE mới: modal kết nối (048c), Hộp thư (048f) đọc manifest.

### 7. Lỗi
| Mã | HTTP | Khi nào |
|---|---|---|
| `window_closed` (048b) | 409 | Ngoài 48 giờ + hết 3 tin, hoặc đã gửi 10 tin chưa có trả lời |
| `tiktok_quota_exhausted` (mới, server vi + en) | 409 | TikTok trả lỗi hạn mức dù AppChat đếm còn (lệch đếm) — `failed`, không thử lại |
| `tiktok_not_eligible` (mới, server vi + en) | 409 | Comment-to-message bị TikTok từ chối (tài khoản / vùng / quảng cáo chưa đủ điều kiện) |
| `comment_unsupported` (048b) | 409 | Thích bình luận; nhắn riêng bình luận không high-intent |
| `private_reply_used` / `private_reply_expired` (048b) | 409 | Như 048f |
| `oauth_*` / `grant_revoked` (048) | 400 / 409 | Lỗi uỷ quyền / token bị thu hồi |

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given webhook TikTok có `TikTok-Signature` đúng / sai chữ ký / `t` lệch 6 phút, when POST `/hooks/channels/tiktok_messaging`, then đúng → 200 + biên nhận; sai hoặc lệch → 401, không biên nhận; gửi lặp cùng sự kiện → một biên nhận | `packages/channels/test/tiktok.test.ts` + `apps/api/test/integration/tiktok-messaging.test.ts` |
| 2 | Given luồng OAuth (transport `fake`), when `oauth.start` → callback → `channel.oauth_select`, then grant `tiktok_messaging` mã hoá trong `oauth_grant`, tài khoản `connected`, route `tiktok_messaging:<business_id>`; tài khoản đã gắn workspace khác → 409 `channel_in_use_elsewhere` | `tiktok-messaging.test.ts` + fixture `oauth_token.json` |
| 3 | Given access còn 5 phút, when gửi tin, then `TokenVault` làm mới đúng một lần dưới khoá (hai lần gửi song song không làm mới hai lần); refresh lỗi `invalid_grant` → grant `revoked`, tài khoản `expired` + thông báo | `tiktok-messaging.test.ts` + `tiktok.test.ts` |
| 4 | Given khách nhắn `im_receive_msg` (text + ảnh) và shop gửi từ app TikTok (`im_send_msg`), when xử lý, then tin vào đúng hội thoại direct, khách theo `contact_identity`; tin AppChat đã gửi không tạo trùng; tin gửi từ app thành tin `out` | `tiktok-messaging.test.ts` + fixtures `im_receive_msg.json` / `im_send_msg.json` |
| 5 | Given khách nhắn một tin rồi im lặng, when shop gửi 10 tin trong 48 giờ, then tin thứ 11 → 409 `window_closed`; khách trả lời → gửi tiếp được; quá 48 giờ không trả lời → thêm đúng 3 tin rồi `window_closed`; job chờ khi cửa sổ đóng → `failed` `window_closed`, không thử lại | `tiktok-messaging.test.ts` (đồng hồ giả) |
| 6 | Given webhook `comment.update` + đối soát `comment/list` trả cùng bình luận, when xử lý, then một hội thoại `comment` theo (video, người bình luận), một tin; `comment.reply` gọi `reply/create`; `comment.hide` / `comment.delete` qua lệnh bền, đổi trạng thái chỉ sau ACK; `comment.like` → 409 `comment_unsupported` | `tiktok-messaging.test.ts` + fixture `comment_update.json` |
| 7 | Given bình luận thường, when `comment.private_reply`, then 409 `comment_unsupported`; given `im_receive_high_intent_comment`, then `private_reply_eligible = true`, nhắn riêng lần 1 gọi `direct_reply/update` → hội thoại direct cùng khách; lần 2 → 409 `private_reply_used`; TikTok từ chối → `failed` `tiktok_not_eligible`, không thử lại | `tiktok-messaging.test.ts` + fixture `im_receive_high_intent_comment.json` |
| 8 | Given agent gán hội thoại TikTok, when khách bình luận / nhắn, then bình luận: agent `auto` trả lời công khai qua `reply/create` (048f §6); tin direct: agent trả lời theo `ai_mode`, cửa sổ / hạn mức chặn như mọi người gửi; follow-up / chiến dịch không chọn kênh TikTok (`proactive: 'disallowed'`) | `tiktok-messaging.test.ts` |
| 9 | Given registry, when chạy test kênh, then `tiktok_messaging` có adapter, `status: 'beta'`, không còn trong Sắp có; `tiktok_shop` vẫn Sắp có; contract test chung pass cho adapter mới; production với `TIKTOK_TRANSPORT=fake` → khởi động lỗi | `pnpm --filter @appchat/channels test` + `apps/api/test/integration/channels.test.ts` + test env |
| 10 | Given web (transport `fake`), when mở Cài đặt → Kênh → TikTok Messaging, then luồng OAuth + chọn tài khoản chạy; gửi vượt hạn mức hiện lỗi `window_closed` theo i18n; tài khoản Business thật | `pnpm e2e:http channels` — TikTok thật: chưa nghiệm thu với provider thật (Q-910) |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{channels,shared,core,api,web}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check`.
- Unit: `pnpm --filter @appchat/channels test -- test/tiktok.test.ts test/registry.test.ts test/contract.test.ts`.
- Integration (`--workers=1`, `TENANT_CLIENT_CACHE=10`, kiểm slot Postgres trước): `pnpm --filter @appchat/api test:integration -- test/integration/tiktok-messaging.test.ts test/integration/channels.test.ts`.
- FE: `pnpm e2e:http channels`.
- Provider thật: BM API + Accounts API form chưa duyệt (Q-910) → ghi "chưa nghiệm thu với provider thật" cho AC1–AC10 phần gọi TikTok thật.

## CONSTRAINTS
- **DO NOT:**
  - Gửi chủ động / chiến dịch / follow-up qua TikTok (`proactive: 'disallowed'`).
  - Vượt hạn mức 10 / +3 hoặc gửi ngoài 48 giờ; tự thử lại tin `window_closed`.
  - Nhắn riêng bình luận không high-intent (luật TikTok); nhắn riêng hàng loạt; luật riêng cho agent (DC-921).
  - Thêm permission mới (Q-912); thêm bảng / cột (dùng schema 048 / 048f).
  - Lẫn tin TikTok Shop (hệ thống riêng — D63, chat sàn Sắp có) vào kênh này; bỏ `tiktok_shop` khỏi Sắp có (049 làm).
  - Adapter tự làm mới token hoặc lưu token ngoài `oauth_grant`.
  - Thêm SDK / thư viện TikTok (HTTP bằng `fetch`).
  - Log token, chữ ký, nội dung tin / bình luận.
- **REUSE:**
  - `OAuthClient` / `TokenVault` / `registerOAuthProvider` / `useOAuthConnect` (048).
  - `ChannelWebhook`, ingress, biên nhận, `channel.oauth_select`, `send-window.ts` (048b); modal kết nối + khối Đồng bộ (048c).
  - `ingestComment`, `comment.*`, `social_comment.private_reply_eligible`, `comment-reply.ts`, lệnh bền bình luận (048f).
  - Mẫu adapter / `fake-transport.ts` / `provider-capabilities.md` của 048e.
- **SKIP:**
  - Bình luận livestream TikTok (không có API — Sắp có).
  - Tin TikTok Shop / Customer Service API (D63).
  - Q&A / tin mẫu / tin tự động TikTok (`im_auto_message_*` bỏ qua).
  - Messaging Ads / quảng cáo.

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync` khi Chủ thầu ghép dải 048 / 049.
- [x] Khớp DC-916 + brief §4 (048h): chữ ký, hạn mức 48 giờ / 10 / +3 qua cửa sổ 048b, comment-to-message theo điều kiện, Accounts API, token 1 ngày qua TokenVault.
- [x] Không schema mới; không permission mới (Q-912); agent là nhân viên (DC-921).
- [x] 10 AC có Given / When / Then + bằng chứng; ô cần TikTok thật ghi trung thực.
- **Gap đã khai:**
  - BM API + Accounts API chưa duyệt (Q-910) → chỉ test transport `fake` + fixtures; đường dẫn / tên trường theo khảo sát 2026-11-13, kiểm lại ở Rà.
  - Bình luận video không high-intent không nhắn riêng được (giới hạn TikTok).
  - Lịch sử tin cũ không đồng bộ (API không có).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; file BE 200–400 dòng (trần 600).
- [ ] AC 1–10 có kết quả từng cái, dán output thật (`pnpm …`); ô cần TikTok thật ghi "chưa nghiệm thu với provider thật".
- [ ] **Kênh qua adapter + manifest (BUILDER-HANDOFF, omnichannel-adapter):** core / UI không `switch (type)`; gửi qua outbox + limiter; cửa sổ chặn ở cả `outbound.ts` và `send.processor.ts`.
- [ ] **Action-first:** kết nối qua `oauth.start` / `channel.oauth_select`; trả lời / nhắn riêng / ẩn / xoá qua `comment.*` (048f) chạy `ActionExecutor`; webhook chỉ ghi biên nhận rồi xử lý nền.
- [ ] **Agent là nhân viên (DC-921, D51):** agent trả lời bình luận / tin direct như người; cửa sổ / hạn mức nền tảng chặn mọi người gửi; không gửi chủ động (`proactive: 'disallowed'`).
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
