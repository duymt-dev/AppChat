# TIP-048e — Facebook Page (Messenger) + Instagram: adapter Graph, cửa sổ 24 giờ + HUMAN_AGENT, data deletion (Kênh, D62)

## HEADER
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048e before051.
- **Parallel-safe with TIP-051b (coverage-closure manifest):** sequential, shares `apps/web/e2e/http/channels.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048e before051b.
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/coming-soon.ts`, `packages/channels/test/registry.test.ts`; integrate 048e before049.
- **Parallel-safe with TIP-049b (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048e before049b.
- **Parallel-safe with TIP-049c (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048e before049c.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048e before049d.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/index.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048 before048e.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `.env.example`, `apps/api/src/http/channels/channel-hooks.controller.ts`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/index.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048b before048e.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048c before048e.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `.env.example`, `apps/api/test/integration/channels.test.ts`, `apps/web/e2e/http/channels.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/index.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`, `tools/scripts/e2e-http.mjs`; integrate 048d before048e.
- **Parallel-safe with TIP-045 (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 048e before045.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/scripts/e2e-http.mjs`; integrate 048e before046.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `packages/channels/src/facebook/adapter.ts`, `packages/channels/src/facebook/manifest.ts`, `packages/channels/src/facebook/normalize.ts`, `packages/channels/src/instagram/adapter.ts`, `packages/channels/src/instagram/manifest.ts`, `packages/channels/src/instagram/normalize.ts`, `packages/channels/src/meta/webhook.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 048e before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `packages/channels/src/facebook/manifest.ts`, `packages/channels/src/instagram/manifest.ts`, `packages/channels/src/meta/webhook.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 048e before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `.env.example`, `apps/api/test/integration/channels.test.ts`, `apps/web/e2e/http/channels.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048e before048h.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `.env.example`, `tools/scripts/e2e-http.mjs`; integrate 035d before048e.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/channels.module.ts`; integrate 003c before048e.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before048e.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before048e.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012b before048e.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012c before048e.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before048e.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before048e.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/index.ts`, `packages/channels/src/registry.ts`, `packages/core/src/channels/channels.module.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 014b before048e.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before048e.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before048e.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before048e.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before048e.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020d before048e.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020e before048e.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 022b before048e.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/channels.module.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`, `tools/scripts/e2e-http.mjs`; integrate 023b before048e.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 023c before048e.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `packages/channels/src/index.ts`; integrate 023f before048e.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 026b before048e.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 030b before048e.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before048e.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 032b before048e.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 033b before048e.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 034b before048e.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 037 before048e.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 039 before048e.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before048e.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042 before048e.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042b before048e.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 043 before048e.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/index.ts`, `packages/core/src/channels/channels.module.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 045b before048e.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before048e.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before048e.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047d before048e.
- **TIP-ID:** TIP-048e · **Project:** AppChat V2 · **Module:** Kênh — Meta (Facebook Page / Messenger, Instagram; không bảng mới, không bình luận / live) · **Priority:** P0 · **Estimated:** XL (2 pha: P1 Facebook Page · P2 Instagram + data deletion)
- **Depends on:** 048b, 048c, 048d và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 048f, 048g, 048h, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - TIP-048 (gián tiếp qua 048b) tạo `OAuthClient`, `registerOAuthProvider`, `TokenVault`, `oauth.start` / `oauth.pending_get`, callback `/hooks/oauth/:provider/callback`. 048e đăng ký thêm provider `facebook` (Instagram đi chung luồng Facebook Login).
  - 048b tạo `ChannelWebhook` / `HookItem`, `connect.oauth` + `connect.via`, `capabilities.window` (`tag_human_agent`), `OutboundMessage.windowTag`, ingress `/hooks/channels/:type` (một POST nhiều route nhiều workspace), `channel_webhook_event`, `tenant_channel_webhook_route`, `channel.oauth_select` (chọn nhiều Page), `send-window.ts`, controller `channel-hooks.controller.ts`.
  - 048c dựng bước OAuth + chọn tài khoản (`picker: true`) và thẻ `connect.via` (Messenger mở luồng Facebook Page).
  - 048d ghép trước vì cùng sửa `registry.ts`, `coming-soon.ts`, `channels.env.ts`, `channels.module.ts`, `channels.test.ts`, `e2e/http/channels.spec.ts`, `.env.example`, chuỗi kênh.
  - 048f (bình luận) / 048g (live) xây trên `meta/graph.ts`, `meta/webhook.ts`, adapter `facebook` / `instagram` của TIP này.
- **Files touched:** [exact M/C manifest](manifests/TIP-048e-files.md). Thư mục mới `packages/channels/src/meta/`, `facebook/`, `instagram/` và `packages/core/src/channels/meta/`. Không file prisma, không migration. Sửa có chủ đích file của TIP khác: `channel-hooks.controller.ts` (048b — route data deletion), `registry.ts` / `coming-soon.ts` / `index.ts`, `channels.module.ts` + `channels.env.ts`, `channels.jobs.module.ts` (lịch `token-check`), `channels.test.ts` + `e2e/http/channels.spec.ts`, `tools/scripts/e2e-http.mjs` (transport giả cho E2E http).
- **Quyết định nguồn:** D62 (#1, #2, #5, #6) · DC-909 (kho token chung) · DC-910 (nền webhook) · DC-913 · Q-908 · Q-907 (hạn mức kênh — tạm: có) · DC-921 (agent là nhân viên; tag HUMAN_AGENT là chính sách Meta — người thật) · Blueprint §6 (~L1249), §4.7 (~L1090), K13.
- **Dòng COVERAGE nhận:** REQ-B08 (facebook, instagram) · BP-6-meta · D62-channels · DC-913 · Q-908

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. Kênh webhook: không lease; token Page lấy qua `TokenVault` mỗi lần gọi.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Gói kênh:**
    - `coming-soon.ts` ~L10–12: `facebook` (sort 3), `messenger` (sort 4), `instagram` (sort 5) là thẻ "Sắp có" `oauth`; `display` Facebook Page `f` `#1877F2` · Messenger `f` `#1877F2` · Instagram `◎` `#E1306C`, nhãn `pop`.
    - `registry.ts` ~L24–31 gắn adapter theo `ChannelDeps`. `registry.test.ts` so 16 type với fixture prototype + đếm GA (048d đã thêm `zalo_oa` — kiểm lại ở Rà).
    - Không có mã Meta nào. Mẫu: `packages/channels/src/zalo-oa/` (048d), `email/`, `zalo-personal/render.ts`.
  - **Core kênh:** như 048d — `channels.env.ts` ~L29–34 (guard `fake`), `channels.module.ts` ~L78–92 (`channelRegistryFor`), `jobs/channels.jobs.module.ts` (~L151 `StatelessChannels`, lịch job), `send.processor.ts` (lỗi ~L143–170).
  - **Ingress:** `apps/api/src/http/channels/channel-hooks.controller.ts` (048b): `GET|POST /hooks/channels/:type`; GET gọi `adapter.webhook.challenge`. Tiền tố `/hooks/{*path}` mọi method (`prefix.ts` ~L8), không rate limit (`api-rate-limit.guard.ts` ~L13), raw body (`bootstrap.ts` ~L15).
  - **Quên khách (privacy 015c):**
    - Action `contact.forget` (`packages/actions/src/privacy.ts` ~L34–47): `privacy.erase`, risk `delete`, `agentGrantable: false`, `requiredApprovalSources` chặn nguồn gián tiếp, preview bắt buộc (`inventory_revision`).
    - `privacy/services/operation.ts` (`acceptForget`), `journal.ts`; tombstone `recreation.ts`.
    - `inbox/privacy/adapter.ts` `erase` = `eraseNotImplemented` (~L9); `crm/privacy/cleanup.ts` xoá `contact_identity`.
    - Chưa có đường "yêu cầu xoá từ nhà cung cấp" → TIP này thêm (§8).
  - **Chuỗi:** `i18n/server/{vi,en}/channels.ts` `name` (048d thêm `zalo_oa`). Web `settings.json` có sẵn `channels.desc.facebook` / `messenger` / `instagram` (~L482–484).
  - **Test gác:** `apps/api/test/integration/channels.test.ts` ~L148–160 (`facebook` `available: false`); `apps/web/e2e/http/channels.spec.ts` ~L15–16 (`st-ch-facebook` disabled); `apps/web/e2e/agents.spec.ts` ~L30 cấm chữ "Facebook" (048c xử lý).
- **Tài liệu Meta (khảo sát 2026-11-13 — đọc lại ở Rà):**
  - **Messenger:** cửa sổ 24 giờ từ tin cuối của khách (7 ngày nếu từ quảng cáo Click-to-Messenger). Từ 27/04/2026 chỉ còn tag `HUMAN_AGENT` (7 ngày, người thật trả lời, cần quyền Human Agent qua App Review); tag khác → lỗi 100.
  - **Webhook Page** (`object: 'page'`): `messages`, `messaging_postbacks`, `message_echoes`, `message_reactions`, `message_reads`, `message_deliveries`, `messaging_handovers`, `message_edits`. GET `hub.mode` / `hub.verify_token` / `hub.challenge`. `X-Hub-Signature-256 = sha256=` + HMAC-SHA256(raw body, App Secret). Một POST có nhiều `entry[]` (nhiều Page).
  - **Quyền:** `pages_show_list`, `pages_manage_metadata`, `pages_messaging`, `pages_read_engagement`, `business_management`, `instagram_basic`, `instagram_manage_messages`. Người cấp cần task MESSAGING trên Page. Page token dài hạn không hết hạn (vô hiệu khi đổi mật khẩu / mất vai trò / gỡ app).
  - **Instagram** (gắn Page, Facebook Login): webhook `object: 'instagram'` — `messages`, `messaging_postbacks`, `messaging_seen`, `message_reactions`, `messaging_referral`. Gửi qua Page token `POST /{page-id}/messages` (hoặc `/{ig-id}/messages` — Rà #3). Instagram Login (`graph.instagram.com`, token 60 ngày) **không làm** (DC-913 e).
  - **Rate:** Send API 300 / giây / Page (text), 10 / giây (audio / video); 24 giờ ≤ 200 × số người tương tác. Lỗi 613 / 4 / 17 / 32 (rate), 551 (người nhận không nhận được), 10 / 200 (thiếu quyền), 190 (token), 100 (tham số / tag sai).
  - **App Review:** Advanced Access cho Page / IG của shop khác; Business Verification; ≥ 1 lời gọi thành công / quyền / 30 ngày; Privacy Policy URL; Data Deletion Callback (`signed_request` → `{ url, confirmation_code }`).
- **Key files to read first:** TIP-048 · TIP-048b · TIP-048c · TIP-048d (mẫu kênh webhook) · `packages/channels/src/webhook.ts` · `packages/channels/src/oauth.ts` · `packages/core/src/kernel/oauth/token-vault.ts` · `packages/core/src/kernel/oauth/providers.ts` · `packages/core/src/inbox/services/send-window.ts` · `packages/channels/src/zalo-oa/adapter.ts` · `packages/actions/src/privacy.ts` · `packages/core/src/privacy/services/operation.ts` · `packages/core/src/privacy/actions/forget.handler.ts`.
- **Patterns to follow:**
  - Kênh webhook mẫu 048d: manifest + adapter + normalize + render + transport giả + `provider-capabilities.md`; chọn transport theo env ở `channelRegistryFor`.
  - Phần chung Meta ở `meta/` (Graph client, OAuth, webhook, transport giả); mỗi type một thư mục mỏng (`facebook/`, `instagram/`). Không lặp code Graph.
  - `OAuthClient` của 048 (`authorizeUrl` / `exchange` / `refresh`), đăng ký bằng `registerOAuthProvider`.
  - Callback hệ thống → action nội bộ nguồn `system` qua system adapter (mẫu DC-904); không ghi DB từ controller.
  - HTTP Graph: `fetch` Node 24, `AbortSignal.timeout(10_000)`, base `https://graph.facebook.com/<META_GRAPH_VERSION>`; token gửi bằng header `Authorization: Bearer`, không đặt trên URL (URL hay vào log).

## APPLICABLE STANDARDS
- [channels/omnichannel-adapter](../standards/channels/omnichannel-adapter.md) — checklist "Thêm một kênh mới" cho `facebook` và `instagram`; manifest là nguồn duy nhất (`connect.via` cho thẻ Messenger); chữ ký trong adapter; không sửa `inbox/`, `crm/`, `ai/`; gửi qua outbox + limiter; credential mã hoá.
- [integrations/provider-ports](../standards/integrations/provider-ports.md) — webhook: chữ ký trong adapter, biên nhận idempotent theo id Meta, 200 nhanh, xử lý nền; `fake` + fixture.
- [ops/observability-security](../standards/ops/observability-security.md) — không log token / PSID / nội dung tin / `signed_request`; sai chữ ký → 401 + `warn`; audit kết nối / ngắt kênh.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — không thêm permission (Q-912 tạm): `channels.manage` kết nối; `inbox.reply` gửi (kể cả tag HUMAN_AGENT).
- [actions/action-registry](../standards/actions/action-registry.md) · [events/outbox](../standards/events/outbox.md) — data deletion chạy action nội bộ nguồn `system`; outbox trong transaction.
- [domain/concurrency](../standards/domain/concurrency.md) · [domain/validation-defaults](../standards/domain/validation-defaults.md) — webhook lặp / lệch thứ tự; giới hạn chữ / tệp kiểm trước khi gọi Graph.
- [api/response-envelope](../standards/api/response-envelope.md) — route data deletion trả JSON đúng định dạng Meta (ngoại lệ ngoài `/v1`, ghi rõ).
- [i18n/i18n](../standards/i18n/i18n.md) · [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase lên `origin/dev` mới nhất sau khi 048, 048b, 048c, 048d đã merge.
   - `python -X utf8 tools/obligations/manifests.py 048e`.
   - Kiểm lại mọi số dòng `~` trên code thật. Lệch → sửa TIP, thêm dòng "Rà lại <ngày>".
2. Đọc code thật đã merge của 048 / 048b / 048c / 048d; lệch brief thì theo code, ghi report:
   - `OAuthClient.exchange` trả `accounts[].tokens` (token riêng từng Page) → `channel.oauth_select` lưu grant theo từng tài khoản hay một grant chung. Page token phải là grant riêng mỗi Page (`subject = page_id`).
   - `windowState` + `OutboundMessage.windowTag`: đường action `message.send` / outbound đặt `windowTag = 'human_agent'` khi trạng thái `tag` và người gửi là người.
   - Processor `channel-hooks` xử lý `echo` / `read` / `reaction` / `other` / `account`; móc nối limiter `provider_rate_limited` (048d).
   - `ChannelDeps.hooks.secrets` (tên khoá) và chỗ API lấy registry (`channelRegistryFor` ~L159).
3. Đọc lại tài liệu Meta bản mới nhất, ghi ngày đọc vào `meta/provider-capabilities.md`:
   - Phiên bản Graph hiện hành (đặt mặc định `META_GRAPH_VERSION`).
   - Facebook Login for Business (`config_id`, loại token cấp ra) + cách lấy Page token dài hạn.
   - Trường `instagram_business_account` trên Page; gửi IG qua `/{page-id}/messages` hay `/{ig-id}/messages`.
   - Định dạng `entry[].messaging[]` (Page) và Instagram; `is_echo`, `app_id` trong echo; `message_edits`.
   - Mã lỗi (100, 190 + `error_subcode`, 10, 200, 4 / 17 / 32 / 613, 551, 2018xxx); cỡ tệp đính kèm.
   - Data deletion callback (`signed_request`: chữ ký HMAC-SHA256 base64url bằng App Secret, thuật toán `HMAC-SHA256`, trường `user_id` = app-scoped id).
4. Tìm đường quên khách sẵn có cho §8:
   - `contact.forget` cần `if_version` + `inventory_revision` (preview) và chặn nguồn gián tiếp; xem `privacy/services/operation.ts` có hàm nội bộ dùng được cho nguồn `system` (bỏ qua chặn đơn / hợp đồng mở theo DC-262?).
   - Không có đường an toàn → dừng phần §8, escalate L2 kèm đề xuất (đừng tự đổi luật 015c).
5. Kiểm `channels.test.ts` / `e2e/http/channels.spec.ts` / `registry.test.ts` sau 048d. Chỉ sửa đúng phần `facebook` / `messenger` / `instagram`.

## TASK
Bật **Facebook Page (Messenger)** và **Instagram** (gắn Page) thật trên nền webhook của 048b, không sửa Inbox / CRM / AI. Hai pha, mỗi pha một PR:
- **P1 — Facebook Page:**
  - Lõi Meta: Graph client + bảng lỗi, OAuth Facebook Login for Business (Page token theo từng Page), webhook (`hub.challenge`, `X-Hub-Signature-256`, tách `entry[]`), transport giả.
  - Adapter `facebook`: tin vào / echo / postback / cảm xúc / đã xem / đã nhận; gửi chữ + ảnh + tệp; cửa sổ 24 giờ, ngoài đó chỉ người gửi với `HUMAN_AGENT` ≤ 7 ngày.
  - Thẻ `messenger` = `connect.via = 'facebook'` (mở luồng Facebook Page, không phải kênh riêng).
  - `token-check` (page token không hết hạn — kiểm định kỳ, thu hồi → `expired`).
- **P2 — Instagram + data deletion:**
  - Adapter `instagram` (IG Business gắn Page, cùng grant Page, cùng webhook App).
  - Data deletion callback `POST /hooks/channels/facebook/data-deletion` + trang trạng thái `GET …/data-deletion/:code`, chạy luồng quên khách sẵn có.
- Env + guard production; bỏ 3 thẻ "Sắp có"; `provider-capabilities.md`; test riêng + fixtures.

## SPECIFICATIONS

### 1. Lõi Graph — `packages/channels/src/meta/graph.ts` (P1)
1. `MetaGraph` gọi `https://graph.facebook.com/<META_GRAPH_VERSION>/…` bằng `fetch` (timeout 10 giây). Token đặt ở header `Authorization: Bearer`, không đặt trên URL. Không log URL kèm query, không log body.
2. Gửi kèm `appsecret_proof` (HMAC-SHA256(token, App Secret)) ở mọi lời gọi có token, để App bật được "Require App Secret".
3. **Bảng lỗi Meta → lỗi adapter** (mã chính xác ở Rà #3; bảng một chỗ, không rải số):
   | Meta trả | Adapter ném | Core làm (có sẵn) |
   |---|---|---|
   | 190 (token hết hiệu lực / bị thu hồi; mọi subcode) | `ChannelAuthError` | Tài khoản `expired` + thông báo Owner |
   | 10 / 200 / 2018xxx thiếu quyền (thiếu `pages_messaging`, thiếu Human Agent) | `ChannelOperationError('forbidden', 'meta_permission')` | `failed`, chuỗi "Page chưa cấp quyền nhắn tin / tag Người hỗ trợ" |
   | 4 / 17 / 32 / 613 (vượt rate) | lỗi hết lượt nhà cung cấp `provider_rate_limited` (`retryAfterMs` từ header `X-Business-Use-Case-Usage`, mặc định 60 giây) | Hoãn job, không tính lỗi, không tự tạm dừng (đường của 048d) |
   | 551 (người nhận không nhận được tin) | `ChannelOperationError('rejected', 'meta_recipient_unavailable')` | `failed`, không thử lại |
   | 100 + subcode ngoài cửa sổ / tag không hợp lệ | `ChannelOperationError('rejected', 'window_closed')` | Lưới cuối khi 048b chưa chặn kịp |
   | 100 khác (tham số sai) | `ChannelOperationError('rejected', 'meta_invalid')` | `failed` |
   | Mạng / hết giờ / 5xx sau khi gọi | ném nguyên lỗi | `unknown`, không gửi lại mù |
4. Chỉ hai endpoint ghi: `POST /{page-id}/messages` (Send API) và `POST /{page-id}/subscribed_apps`. Còn lại chỉ đọc: `/me/accounts`, `/{page-id}?fields=…`, `/{psid}?fields=name,profile_pic`, `/debug_token`.

### 2. OAuth Facebook Login for Business — `packages/channels/src/meta/oauth.ts` (P1)
1. Provider `facebook` (`OAuthClient`, `pkce: false`). Đăng ký ở `channels.module.ts`: `registerOAuthProvider(client, { purposes: ['channel'], permission: 'channels.manage' })`.
2. `authorizeUrl` → `https://www.facebook.com/<ver>/dialog/oauth` với `client_id = META_APP_ID`, `redirect_uri = <HOOKS_PUBLIC_URL>/hooks/oauth/facebook/callback`, `state`, `config_id = META_LOGIN_CONFIG_ID`, `response_type = code`, `override_default_response_type = true`. Quyền nằm trong cấu hình `config_id` (Login for Business), không ghép `scope`.
3. `exchange`:
   - Đổi `code` → user token (`/oauth/access_token`), rồi sang user token dài hạn (`fb_exchange_token`).
   - `GET /me/accounts?fields=id,name,picture,access_token,tasks,instagram_business_account{id,username,profile_picture_url}` (đọc hết các trang).
   - Mỗi Page có task `MESSAGING` → một `OAuthAccount`: `externalId = page_id`, `name`, `avatarUrl`, `tokens = { access: page_token, subject: page_id }` (page token dài hạn, không hạn, không refresh), `meta.ig = { id, username, avatarUrl }` nếu Page gắn IG Business.
   - Page thiếu task `MESSAGING` → không vào danh sách. Không còn Page nào → `oauth_exchange_failed` chi tiết `no_messaging_page`.
   - User token chỉ dùng trong lúc exchange, không lưu.
4. `refresh(t)`: page token không làm mới được → ném `invalid_grant` (vault đặt `revoked`). `token-check` (§7) phát hiện sớm hơn.
5. **Chọn tài khoản** (048c, `picker: true`):
   - Danh sách gồm Page (`type facebook`) và IG gắn Page (`type instagram`, `external_id = ig_id`, nhãn `@username · qua Page <tên>`). Chọn một hoặc nhiều.
   - Mỗi mục chọn = một `channel_account` + route `facebook:<page_id>` / `instagram:<ig_id>`.
   - Grant: `oauth_grant (provider 'facebook', subject = page_id)` một dòng mỗi Page. Instagram dùng chung grant của Page nó gắn.
   - Hạn mức kênh tính từng tài khoản (Q-907).
6. **Sau khi chọn** (móc kết nối của 048b — tên kiểm ở Rà #2): `POST /{page-id}/subscribed_apps` với `subscribed_fields = messages, messaging_postbacks, message_echoes, message_reactions, message_reads, message_deliveries` (+ field IG theo tài liệu). Lỗi → tài khoản `error` + `last_error`, chuỗi "Không đăng ký nhận tin cho Page".
7. Page / IG đã gắn workspace khác → 409 `channel_in_use_elsewhere` (route nền tảng 048b).

### 3. Webhook — `packages/channels/src/meta/webhook.ts` (P1; nhánh Instagram ở P2)
1. **`challenge(query)`:** `hub.mode = subscribe` và `hub.verify_token` khớp `META_VERIFY_TOKEN` (so khớp an toàn) → trả `hub.challenge`; sai → null (controller trả 403). Dùng chung cho `facebook` và `instagram`. URL đăng ký ghi ở `provider-capabilities.md`.
2. **`verify(raw, headers, secrets)`:** header `x-hub-signature-256` = `sha256=` + hex HMAC-SHA256(raw, `META_APP_SECRET`); so `timingSafeEqual`. Thiếu / sai → false (401).
3. **`split(raw)`:** một POST có thể nhiều `entry[]` (nhiều Page / IG, nhiều workspace), mỗi entry nhiều `messaging[]` → mỗi phần tử một `HookItem`:
   - `object = page` → `routeKey = facebook:<entry.id>`; `object = instagram` → `routeKey = instagram:<entry.id>`.
   - `eventKey`: tin và echo `mid:<message.mid>` (cùng khoá — echo của tin đã ghi bị biên nhận bỏ); postback `pb:<sender>:<timestamp>:<sha1(payload)>`; cảm xúc `react:<mid>:<sender>:<action>:<timestamp>`; đã xem `read:<sender>:<watermark>`; đã nhận `dlv:<sender>:<watermark>`; sửa tin `edit:<mid>:<num_edit>`; còn lại `h:<sha256(phần tử)>`.
   - `kind`: `message` (cả postback) · `echo` (`message.is_echo`) · `read` (reads / deliveries / `messaging_seen`) · `reaction` · `other` (handover, referral, sửa tin, sự kiện lạ).
   - `entry[].changes[]` (feed / comments / live) → `kind` `comment` / `live` — 048e bỏ qua (`ignored`); 048f / 048g xử lý.
4. Route không có (Page chưa nối / đã ngắt) → processor 048b bỏ đúng phần tử đó; phần còn lại vẫn xử lý; luôn 200.

### 4. Tin vào — `facebook/normalize.ts` + `instagram/normalize.ts` (adapter `handleWebhook`)
| Sự kiện | Xử lý |
|---|---|
| `messages` chữ | `sink.push`: `externalThreadId = sender.id` (PSID / IGSID), `externalMsgId = mid`, `isGroup: false`, `kind: text`, `sentAt` từ `timestamp` |
| `messages` có `attachments` | ảnh → `image`; audio → `audio`; tệp / video → `file` (video mime `video/*`); sticker → `sticker`; `fallback` / chia sẻ / `story_mention` / `reel` → `text` kèm link; chữ đi kèm tệp giữ ở `text` |
| `messaging_postbacks` | `kind: text`, chữ = `postback.title`; `externalMsgId` theo `eventKey` postback |
| echo (`is_echo`) | Echo tin AppChat gửi: `mid` trùng `external_msg_id` đã ACK → không tạo dòng. Echo tin Page gửi từ Meta Business Suite / app khác (`app_id` khác `META_APP_ID`) → tin `direction out`, `sender_type user` (tên "Meta Business Suite"), không tăng chưa đọc, không FRT, không kích AI. Echo tới trước ACK → cách khớp của 048b (Rà #2) |
| `message_reactions` | `sink.event` `reaction` (`self: false`; `react` / `unreact`); emoji ngoài 6 emoji AppChat → bỏ |
| `message_reads` / `messaging_seen` | `sink.event` `seen` cho tin ra tới `watermark` (nếu `ReceiptEvent` chỉ nhận `msgIds` → adapter không biết danh sách; Rà #2 chọn cách, ghi report) |
| `message_deliveries` | `sink.event` `delivered` theo `mids` |
| `message_edits` | bỏ qua (`ignored`) — hợp đồng chưa có sửa tin (Gap) |
| handover / referral / lạ | bỏ qua, không lỗi |

- **Tên / ảnh** người gửi: `GET /{psid}?fields=name,profile_pic` (Page) hoặc `fields=name,username,profile_pic` (IG) qua limiter; cache bộ nhớ ≤ 5.000 mục, 1 giờ. Lỗi → bỏ tên, không chặn tin.
- **Tệp Meta** là URL CDN có hạn: dùng bước lưu tệp của pipeline nếu có; chưa có → Gap như 048d.
- `raw` chỉ `{ object, field }`, không giữ payload (PII).
- Instagram không có `message_deliveries`. Tin IG từ người chưa theo dõi vẫn nhận như thường.

### 5. Manifest + gửi — `facebook/manifest.ts`, `instagram/manifest.ts`, `facebook/render.ts`, adapter `send`
1. **Manifest:**
   | Trường | `facebook` (P1) | `instagram` (P2) |
   |---|---|---|
   | `label` / `icon` / `group` / `status` | `channels.facebook.label` · `facebook` · `social` · `ga` | `channels.instagram.label` · `instagram` · `social` · `ga` |
   | `display` | giữ dòng "Sắp có" cũ: `Facebook Page` · `f` · `#1877F2` · `msg` · `pop` · sort 3 | `Instagram` · `◎` · `#E1306C` · `msg` · `pop` · sort 5 |
   | `connect` | `{ kind: 'oauth', oauth: { provider: 'facebook', picker: true, scopes: [7 quyền ở CONTEXT] }, riskNotice: 'channels.facebook.review_notice' }` | như Facebook (cùng luồng, 048c lọc sẵn mục IG), `riskNotice: 'channels.instagram.review_notice'` |
   | `capabilities` | `direct` · không `group` / `mentions` / `reactions` · `send: ['text', 'image', 'file', 'audio']` · `maxTextLength: 2000` · `markdown: 'none'` · `proactive: 'window_24h'` | như Facebook, `send: ['text', 'image']` (thêm loại khác nếu tài liệu cho phép — Rà #3) · `maxTextLength: 1000` (byte UTF-8 — Rà #3) |
   | `capabilities.window` | `{ hours: 24, after: 'tag_human_agent', tagHours: 168 }` | như Facebook |
   | `capabilities.sync` | `['messages', 'auto_contact']` (048f thêm `comments`) | như Facebook |
   | `rateLimit` / `session` | `{ perMinute: 60 }` (dưới xa 300 / giây / Page) · `webhook` | như Facebook |
   - `operations` vắng: thu hồi / cảm xúc phía Page không làm ở TIP này.
   - Thẻ `messenger` (ở `coming-soon.ts`): `connect: { kind: 'oauth', via: 'facebook' }`, trạng thái theo `facebook` (GA khi Meta đã cấu hình), không adapter. 048c mở luồng Facebook Page; 048b không bao giờ tạo tài khoản `messenger` (kiểm ở Rà #2).
2. **Token:** lấy qua `TokenVault` theo `channel_account.oauth_grant_id` (đường 048b, Rà #2). Instagram dùng grant của Page gắn, `page_id` = `subject` của grant. Adapter không giữ token quá một lệnh, không log.
3. **Chữ:** `render.ts` chia đoạn ≤ 2000 ký tự (Messenger) / ≤ 1000 byte UTF-8 (Instagram, cùng hàm, tham số trần). Mỗi đoạn một `POST /{page-id}/messages` với `recipient.id = externalThreadId`.
4. **Loại tin gửi:**
   - Trong 24 giờ: `messaging_type: RESPONSE`.
   - `OutboundMessage.windowTag = 'human_agent'` (048b chỉ đặt khi người gửi là người và trong 7 ngày): `messaging_type: MESSAGE_TAG`, `tag: HUMAN_AGENT`.
   - Adapter **không bao giờ** tự đặt tag. `windowTag` có mà `META_HUMAN_AGENT = 0` (App chưa được cấp quyền Human Agent — Q-908) → `ChannelOperationError('forbidden', 'meta_human_agent_unavailable')` trước khi gọi Graph.
5. **Tệp** (kiểm TRƯỚC `ledger.reserve`, trước khi gọi Graph):
   - Tải bằng `FileFetcher(url, { fileId, sha256 })`. Không gửi URL ký nội bộ cho Meta, không tự `fetch` URL tệp.
   - Kiểm loại + cỡ theo bảng giới hạn trong `meta/graph.ts` (Rà #3; mặc định Messenger 25MB mọi loại, Instagram ảnh 8MB jpg / png). Sai → `ChannelOperationError('invalid', 'attachment_too_large' | 'attachment_type')`, tin `failed` rõ lý do, không gọi Graph.
   - Gửi bằng multipart (`FormData` + `Blob` của Node 24, trường `filedata`) cùng Send API. Chữ kèm tệp → phần chữ riêng sau tệp.
6. **Sổ gửi từng phần** như 048d: `reserve` → gọi → `confirm(partNo, { msgId: message_id })`; lỗi sau khi có phần đã tới → `PartialSendError`. `externalMsgId` = `message_id` phần đầu (cũng là `mid` của echo — echo bị biên nhận bỏ).
7. **Trả lời trích dẫn:** Send API có `reply_to` (Rà #3) → điền từ `replyToExternalMsgId`; không có → bỏ, không lỗi.
8. Không gửi template / tin chủ động / tag khác `HUMAN_AGENT`; không `sender_action` (đang gõ / đã xem) ở TIP này.

### 6. Cửa sổ 24 giờ + HUMAN_AGENT (dùng `send-window.ts` của 048b, không viết lại)
- `last_inbound_at` ≤ 24 giờ → `open`: mọi nguồn gửi được (người, AI, agent, follow-up).
- 24 giờ < t ≤ 7 ngày → `tag` chỉ khi người thật gửi (nguồn `ui`, actor người dùng) — chính sách HUMAN_AGENT của Meta, không phải luật riêng của AppChat cho agent (DC-921); agent / follow-up / chiến dịch → `window_closed` (409 ở `outbound.ts`; job đã chờ qua mốc → kết quả cuối `window_closed` ở `send.processor.ts`, không thử lại).
- > 7 ngày → `closed` với mọi nguồn.
- Cửa sổ quảng cáo Click-to-Messenger 7 ngày: không làm (hợp đồng `window` chưa có), ghi Gap.
- Chiến dịch marketing không mở cho `facebook` / `instagram` (luật 048b).

### 7. Token Page — `packages/core/src/channels/meta/token-check.ts` (P1)
- Page token không có hạn → `oauth-refresh` (048) không quét. Job `meta-token-check` (lặp 6 giờ, ROLE=channels, đăng ký ở `channels.jobs.module.ts`) làm:
  - Quét route nền tảng `facebook:*` / `instagram:*` trạng thái `active` → gom theo grant (IG dùng chung grant Page → một lần kiểm).
  - `GET /debug_token?input_token=<page_token>` bằng app token (`META_APP_ID|META_APP_SECRET`).
  - `is_valid = false`, hoặc mất `pages_messaging` → gọi đường thu hồi của 048 (`revoked` + outbox `oauth.grant_revoked` → mọi tài khoản dùng grant chuyển `expired` + thông báo Owner). Tên hàm công khai kiểm ở Rà #2; thiếu → L2, không ghi thẳng `oauth_grant`.
  - Lỗi mạng / 5xx → bỏ lượt, `warn`, không đổi trạng thái.
- `probe(accountId)` → `GET /{page-id}?fields=id,name` (IG: `/{ig-id}?fields=id,username`): ok → `connected`; 190 → `expired`; 5xx / mạng → `degraded`.
- Gỡ App / đổi mật khẩu / mất vai trò Page → Meta vô hiệu page token → phát hiện ở lần gửi (190 → `expired`) hoặc lần `token-check` kế (≤ 6 giờ). Uỷ quyền lại: `channel.reauthorize` (048b / 048c), cùng `page_id` / `ig_id` → nối lại đúng tài khoản cũ.

### 8. Data deletion callback — `packages/core/src/channels/meta/data-deletion.ts` (P2)
1. **Route** (thêm vào `channel-hooks.controller.ts` của 048b, ngoài `/v1`, không đụng route `:type`):
   - `POST /hooks/channels/facebook/data-deletion` — body `application/x-www-form-urlencoded`, trường `signed_request`.
   - `GET /hooks/channels/facebook/data-deletion/:code` — trang trạng thái (HTML tối giản, chữ theo `Accept-Language` vi / en từ i18n server). Giới hạn 30 lần / phút / IP (`RateLimiter` của kernel — ops §3.2 trang công khai).
   - Controller chỉ gọi service; không ghi DB.
2. **Kiểm `signed_request`:** tách `<sig>.<payload>` (base64url); `sig` = HMAC-SHA256(phần payload, `META_APP_SECRET`), so `timingSafeEqual`; `algorithm = HMAC-SHA256`; `issued_at` không quá 7 ngày. Sai → 400, log `warn` không kèm body, không ghi gì.
3. **Nhận yêu cầu** (đồng bộ, nhanh):
   - `code` = uuidv7. Ghi `platform_audit_log` (`id = code`, `action_id = meta.data_deletion`, `input = { subject: sha256(user_id) }` — không lưu `user_id` thô).
   - Đẩy job `meta-data-deletion` (`{ code, subject_enc }`, `user_id` mã hoá `encryptSecret`), jobId = `code` (chạy lại không đôi).
   - Ghi tiến độ Redis `meta:dd:<code>` (TTL 180 ngày): `{ status: 'received', targets: [] }`.
   - Trả 200 `{ url: '<HOOKS_PUBLIC_URL>/hooks/channels/facebook/data-deletion/<code>', confirmation_code: '<code>' }` (định dạng Meta — ngoại lệ envelope, ghi chú ở controller).
4. **Job** (worker ROLE=channels, đăng ký ở `channels.jobs.module.ts`):
   - `user_id` của Meta là id theo App (ASID), không phải PSID / IGSID của khách nhắn Page. Đổi sang id theo Page bằng API ID Matching nếu Meta cho App gọi (Rà #3); luôn khớp thêm `external_id = user_id`.
   - Lấy workspace có route nền tảng `facebook:*` / `instagram:*` (bảng 048b, theo trang). Mỗi workspace: `contact_identity` có `channel_account_id` ∈ tài khoản FB / IG và `external_id` ∈ id đã đổi → khách.
   - Mỗi khách khớp → yêu cầu quên khách qua **đường privacy có sẵn** (015c). `contact.forget` là không đảo được và chặn mọi nguồn gián tiếp (`requiredApprovalSources`, preview bắt buộc, DC-262 chặn khi còn đơn / hợp đồng / công nợ mở) → mặc định: thông báo Owner "Meta yêu cầu xoá dữ liệu của khách <mã>" kèm lối tắt mở xem trước quên khách. Owner bấm `contact.forget` như thường. Rà #4 thấy 015c có đường nguồn `system` cho yêu cầu pháp lý thì dùng đường đó; không tự đổi luật 015c.
   - Ghi `targets [{ ws, contact_id }]` vào Redis; không khớp khách nào → `no_data`. Người gửi yêu cầu thường là nhân viên shop đã đăng nhập Facebook để kết nối Page: AppChat không lưu user token / hồ sơ Facebook của họ — trang trạng thái nói rõ.
5. **Trang trạng thái:** đọc Redis + `contact.privacy_status` (hàm đọc nội bộ) từng target → `received` · `processing` (chờ Owner / đang xoá) · `completed` (mọi target đã quên) · `no_data`. Hết TTL Redis mà còn dòng audit → "Đã nhận, xử lý theo chính sách quyền riêng tư"; không có cả hai → 404.
6. Không log `user_id` / `signed_request`. Owner nhận một thông báo mỗi khách (không gửi lặp khi Meta gửi lại cùng yêu cầu — jobId theo `code`; yêu cầu mới cùng `user_id` → `code` mới, kiểm thông báo trùng theo (ws, contact, 24 giờ)).

### 9. Env, registry, transport
1. `channels.env.ts` thêm:
   - `META_TRANSPORT`: `http` | `fake`, mặc định `http`. Production + `fake` → lỗi boot (mẫu ~L29–34).
   - `META_APP_ID`, `META_APP_SECRET` (ký webhook + `appsecret_proof` + `signed_request`), `META_LOGIN_CONFIG_ID` (Facebook Login for Business), `META_VERIFY_TOKEN` (`hub.verify_token`), `META_GRAPH_VERSION` (mặc định = bản Graph hiện hành lúc Rà, ghi vào `.env.example`).
   - `META_HUMAN_AGENT`: `0` | `1`, mặc định `0`. Bật khi App được cấp quyền Human Agent (Q-908).
2. **Chưa cấu hình** (`http` thiếu `META_APP_ID` / `META_APP_SECRET` / `META_LOGIN_CONFIG_ID` / `META_VERIFY_TOKEN`): `facebook`, `messenger`, `instagram` ở trạng thái "Sắp có", `warn` một lần, không chặn boot (K13).
3. **Manifest theo env:** `facebookManifest({ humanAgent })` / `instagramManifest({ humanAgent })` → `window.after = humanAgent ? 'tag_human_agent' : 'blocked'`. Tắt Human Agent thì 409 sớm ở `outbound.ts`, không phải lỗi lúc gửi. API và worker đọc cùng env (Rà #2).
4. `registry.ts`: `ChannelDeps.meta?: { transport: MetaTransport; humanAgent: boolean }` → gắn `FacebookAdapter` (P1) + `InstagramAdapter` (P2). `coming-soon.ts`: bỏ `facebook`, `instagram`; `messenger` tách khỏi mảng SOON thành manifest riêng `connect: { kind: 'oauth', via: 'facebook' }`, trạng thái theo `facebook`, không adapter. 048b / 048c không bao giờ tạo tài khoản `messenger` (Rà #2). `index.ts`: export adapter, transport, kiểu.
5. `channels.module.ts`: `channelRegistryFor` chọn `HttpMetaTransport` (trong `meta/graph.ts`) hoặc `fakeMetaTransport`; `registerOAuthProvider` cho `facebook` (§2). `channels.jobs.module.ts`: lịch `meta-token-check` (6 giờ) + hàng đợi `meta-data-deletion`.
6. `meta/fake-transport.ts` (bộ nhớ, tất định):
   - Graph giả: `/me/accounts` 3 Page (1 thiếu `MESSAGING`, 1 gắn IG), `sent[]`, `subscribed[]`, `debugToken(valid)`, `idsForPages(asid)`.
   - `failNext(code, subcode?)` giả lỗi 190 / 10 / 613 / 551 / 100.
   - OAuth giả: `code = fake-code` → đúng danh sách trên.
   - `signedHook(object, entries)` → `{ raw, headers }` có `X-Hub-Signature-256` đúng; `signedDeletion(userId)` → `signed_request` đúng.
7. `.env.example`: khối "Meta (Facebook / Instagram)" kèm chú thích "URL webhook = `HOOKS_PUBLIC_URL/hooks/channels/facebook` và `/instagram`; data deletion = `/hooks/channels/facebook/data-deletion`; Privacy Policy URL khai ở App". `tools/scripts/e2e-http.mjs`: API + worker channels chạy `META_TRANSPORT=fake` + khoá test.

### 10. Chuỗi, tài liệu năng lực, test
- **i18n server** `i18n/server/{vi,en}/channels.ts`: `name.facebook` · `name.instagram` · `meta.permission` ("Page chưa cấp quyền nhắn tin cho AppChat") · `meta.human_agent_unavailable` ("Quá 24 giờ — cần quyền Người hỗ trợ của Meta để trả lời") · `meta.recipient_unavailable` · `meta.subscribe_failed` · `meta.no_messaging_page` · `meta.attachment_too_large` · `meta.attachment_type` · `meta_deletion.received` / `processing` / `completed` / `no_data` / `not_found` / `owner_notice` (có `{code}`).
- **i18n web** `messages/{vi,en}/settings.json`: `channels.facebook.label` / `channels.instagram.label` (nếu thiếu) · `channels.facebook.review_notice` / `channels.instagram.review_notice` (ngoài 24 giờ chỉ nhân viên trả lời trong 7 ngày; AI không trả lời ngoài 24 giờ) · `channels.instagram.via_page` ("@{username} · qua Page {page}"). `channels.desc.*` giữ.
- **`meta/provider-capabilities.md`:** ngày đọc tài liệu · phiên bản Graph · bảng webhook field → xử lý (Page / IG) · chữ ký + `hub.challenge` + `signed_request` · endpoint dùng · giới hạn (2.000 ký tự Messenger, 1.000 byte IG, cỡ tệp, 300 / giây / Page, 24 giờ / 7 ngày) · bảng mã lỗi · quyền xin App Review (7 quyền + Human Agent; 3 quyền 048f) · việc vận hành (Business Verification, domain HTTPS, Privacy Policy URL, Data Deletion URL, webhook App, `config_id`) · cột "Kiểm thật" CHỜ-TK (Q-908).
- **Test:**
  - `packages/channels/test/meta.test.ts` (unit, fixtures): `challenge` / `verify` / `signed_request` đúng / sai; `split` nhiều entry; normalize từng fixture (Page + IG); render chia đoạn 2.000 ký tự / 1.000 byte; bảng lỗi; `messaging_type` / `tag` theo `windowTag`; OAuth giả lọc Page thiếu `MESSAGING`, ghép IG.
  - `packages/channels/test/registry.test.ts`: `facebook` / `instagram` GA; `messenger` `via = facebook`, không adapter; thiếu cấu hình → "Sắp có".
  - `apps/api/test/integration/meta-messaging.test.ts` (Postgres + Redis thật, transport `fake`): AC1–9, AC11.
  - `apps/api/test/integration/channels.test.ts` + `apps/web/e2e/http/channels.spec.ts`: AC10.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given App cấu hình, when GET `/hooks/channels/facebook` với `hub.verify_token` đúng / sai, then trả `hub.challenge` / 403; when POST ký đúng `X-Hub-Signature-256`, then 200 + biên nhận; ký sai / thiếu header → 401, không biên nhận, log `warn` không chứa body | `packages/channels/test/meta.test.ts` + `apps/api/test/integration/meta-messaging.test.ts` |
| 2 | Given hai workspace, mỗi nơi một Page (`facebook:P1`, `facebook:P2`) + một IG (`instagram:I1`), when một POST có 3 `entry` (P1, P2, Page lạ P9), then P1 / P2 mỗi nơi đúng 1 tin vào đúng DB workspace, P9 bỏ, trả 200 một lần; IG (P2) đi `instagram:I1` | `meta-messaging.test.ts` |
| 3 | Given cùng `mid` gửi 3 lần, when ingress, then 1 biên nhận + 1 `message`, chưa đọc tăng 1 | `meta-messaging.test.ts` |
| 4 | Given AppChat vừa gửi tin (ACK `mid` X), when tới echo X, then không tạo dòng; when echo `mid` Y từ Meta Business Suite (`app_id` khác), then 1 `message` `out` `sender_type user`, không tăng chưa đọc, không FRT, không kích AI | `meta-messaging.test.ts` |
| 5 | Given `last_inbound_at` 30 giờ trước, `META_HUMAN_AGENT=1`, when nhân viên gửi từ UI, then transport giả nhận `messaging_type MESSAGE_TAG` + `tag HUMAN_AGENT`; when agent AI / follow-up gửi, then 409 `window_closed`, không job; 8 ngày trước → 409 với mọi nguồn; 3 giờ trước → `RESPONSE`, không tag; `META_HUMAN_AGENT=0` + 30 giờ → 409 với cả nhân viên | `meta-messaging.test.ts` (đồng hồ giả) |
| 6 | Given Graph giả trả 613, when gửi, then job hoãn rồi gửi thành công, không `failed`, không tự tạm dừng; trả 551 → `failed` `meta_recipient_unavailable`, không thử lại; trả 10 → `failed` `meta_permission`; trả 190 → `failed` + tài khoản `expired` + thông báo Owner | `meta-messaging.test.ts` |
| 7 | Given `meta-token-check` chạy, when `debug_token` trả `is_valid: false` cho grant Page P1, then grant `revoked`, tài khoản `facebook:P1` + `instagram` gắn P1 đều `expired` + thông báo; Page khác giữ `connected`; lỗi mạng → không đổi | `meta-messaging.test.ts` |
| 8 | Given OAuth giả 3 Page (1 thiếu `MESSAGING`, 1 gắn IG), when `oauth.pending_get` rồi `channel.oauth_select` chọn Page + IG, then danh sách có 2 Page + 1 IG; tạo 2 tài khoản, mỗi Page một grant, IG dùng grant của Page; route ghi đủ; `subscribed_apps` gọi cho Page; Page đã thuộc workspace khác → 409 `channel_in_use_elsewhere` | `meta-messaging.test.ts` |
| 9 | Given khách có `contact_identity` FB khớp `user_id`, when POST data-deletion `signed_request` đúng, then 200 `{ url, confirmation_code }`, audit có `sha256(user_id)`, Owner nhận thông báo kèm lối tắt quên khách, trang `GET …/:code` trả `processing`; `signed_request` sai → 400, không ghi; `user_id` lạ → `no_data`; gửi lại cùng yêu cầu không thông báo trùng | `meta-messaging.test.ts` |
| 10 | Given registry sau TIP, when chạy test gác, then `facebook` / `instagram` GA; `messenger` mở luồng Facebook (`via`); thiếu env Meta → cả ba "Sắp có"; E2E http: thẻ Facebook bật → OAuth giả → chọn Page + IG → webhook ký đúng → tin vào Hộp thư → trả lời → transport giả nhận | `packages/channels/test/registry.test.ts` + `apps/api/test/integration/channels.test.ts` + `apps/web/e2e/http/channels.spec.ts` |
| 11 | Given ảnh 9MB gửi Instagram / tệp `.exe`, when gửi, then `failed` (`attachment_too_large` / `attachment_type`) trước khi gọi Graph; chữ 2.500 ký tự Messenger → 2 phần, ledger đủ `parts`; log không chứa token / PSID / nội dung tin | `meta.test.ts` + `meta-messaging.test.ts` (kiểm output logger) |
| 12 | Given App Meta qua Business Verification + App Review (Q-908) và domain HTTPS, when kết nối Page / IG thật, nhận / gửi tin, tag HUMAN_AGENT, token bị thu hồi, data deletion thật, then đúng như AC1–9 | **chưa nghiệm thu với provider thật** — `meta/provider-capabilities.md` cột "Kiểm thật" = CHỜ-TK |

### Commands / evidence gate
- Cổng commit (D59), mỗi pha: `pnpm turbo run lint typecheck test --filter=@appchat/channels --filter=@appchat/core --filter=@appchat/shared --filter=@appchat/api` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check`.
- Integration (slot Postgres của 035d, `--workers=1`): `pnpm --filter @appchat/api test:integration -- test/integration/meta-messaging.test.ts test/integration/channels.test.ts test/integration/channel-hooks.test.ts test/integration/send-window.test.ts test/integration/channel-oauth-select.test.ts`.
- E2E luồng TIP: `pnpm e2e:http channels` (`META_TRANSPORT=fake`) + `pnpm e2e settings` (mock).
- Parity màn Cài đặt › Kênh: thẻ Facebook / Messenger / Instagram đổi "Sắp có" → kết nối được, mask PD-903 của 048c.
- Mỗi pha một PR vào `dev` (P1 Facebook; P2 Instagram + data deletion).

## CONSTRAINTS
- **DO NOT:**
  - Lưu user token Facebook; đưa page token vào `credentials_enc`; đặt token trên URL; log token / PSID / IGSID / nội dung tin / `signed_request`.
  - Tự đặt tag; dùng tag khác `HUMAN_AGENT`; gắn tag cho tin không do người thật gửi (vi phạm chính sách Meta); gửi ngoài 7 ngày.
  - Làm Instagram Login (`graph.instagram.com`, token 60 ngày) — DC-913 e.
  - Làm bình luận / feed / livestream (048f / 048g): `changes[]` chỉ bỏ qua.
  - Thêm bảng / cột / migration; thêm permission (Q-912).
  - `switch (type)` ở inbox / crm / ai / `send.processor.ts`; sửa file 048b sở hữu ngoài `channel-hooks.controller.ts` (thiếu móc nối → L2).
  - Tự quên khách không qua người, hoặc đổi luật `contact.forget` / DC-262 (015c).
  - Thêm SDK Facebook / thư viện mới — chỉ `fetch` + `FormData` của Node 24.
- **REUSE:**
  - `OAuthClient` / `registerOAuthProvider` / `TokenVault` / đường thu hồi grant / `oauth.start` / callback (048).
  - Ingress + biên nhận + route + `channel.oauth_select` / `channel.reauthorize` + `send-window.ts` + `windowTag` (048b); bước OAuth + chọn tài khoản + thẻ `via` (048c).
  - Mẫu adapter webhook, limiter hết lượt `provider_rate_limited`, transport giả + env (048d).
  - `InboundSink`, `ProviderEvent`, `SendLedger`, `PartialSendError`, `ChannelAuthError`, `ChannelOperationError`, `FileFetcher`, `encryptSecret`, `RateLimiter`, `platform_audit_log`, đường thông báo Owner, `contact.privacy_status`.
- **SKIP:**
  - Bình luận / live (048f / 048g); Instagram Login; WhatsApp (Sắp có).
  - Cửa sổ 7 ngày của quảng cáo Click-to-Messenger; `message_edits`; handover protocol; `sender_action`; menu cố định / nút postback gửi ra.
  - Tự xoá dữ liệu khi Meta yêu cầu (chờ Owner bấm — luật 015c).
  - Nghiệm thu Meta thật (Q-908).

## Quality Gate
- [x] Manifest chính xác (file-level M/C); M path tương lai do 048b tạo (`channel-hooks.controller.ts`) ghi rõ.
- [x] Khớp DC-913 (a)–(e), D62 #1 / #2 / #5 / #6, DC-921 (tag HUMAN_AGENT chỉ người thật — chính sách Meta), DC-910 (một POST nhiều route nhiều workspace).
- [x] Theo checklist "Thêm một kênh mới" cho `facebook` + `instagram`; `messenger` chỉ là thẻ `via`.
- [x] Webhook: verify mức App, idempotent theo `mid`, 200 nhanh, xử lý nền; data deletion đúng định dạng Meta.
- **Gap đã khai:**
  - Chưa nghiệm thu Meta thật (Q-908: Business Verification, App Review, Human Agent, domain HTTPS, Privacy Policy URL).
  - `META_HUMAN_AGENT=0` tới khi được duyệt: ngoài 24 giờ chặn với mọi người.
  - Data deletion: chỉ thông báo Owner + lối tắt; xoá thật chờ người bấm `contact.forget` (luật 015c); id theo App ↔ id theo Page cần API ID Matching (Rà #3).
  - `seen` theo `watermark` có thể cần mở rộng `ReceiptEvent` (Rà #2).
  - Tệp CDN Meta có hạn: lưu lại thuộc TIP sau nếu pipeline chưa có.
  - Cửa sổ quảng cáo 7 ngày, `message_edits` chưa làm.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; mỗi pha một PR.
- [ ] AC 1–12 có kết quả từng cái, dán output thật; AC12 ghi "chưa nghiệm thu với provider thật" (Q-908).
- [ ] **Core không import SDK kênh (BUILDER-HANDOFF, omnichannel-adapter #1):** Graph chỉ gọi trong `packages/channels/src/meta/` (+ `facebook/`, `instagram/`); core chỉ có `token-check` / `data-deletion` gọi qua transport của gói kênh.
- [ ] **Credential mã hoá (omnichannel-adapter #10, ops §2):** page token chỉ qua `TokenVault`; App Secret / verify token từ env; log không có token / PSID / nội dung tin / `signed_request` (test bắt output logger).
- [ ] **Gửi qua outbox + limiter (omnichannel-adapter #6):** không gọi Graph trong request HTTP (trừ data deletion chỉ ghi + đẩy job); tag chỉ khi người gửi; không `switch (type)` ở inbox / crm / ai.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
