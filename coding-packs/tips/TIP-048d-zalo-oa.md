# TIP-048d — Kênh Zalo OA: adapter webhook, tin tư vấn 7 ngày, rate hai tầng (Kênh, D62)

## HEADER
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/index.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048 before048d.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/index.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048b before048d.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048c before048d.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/index.ts`, `packages/channels/src/operations.ts`, `packages/channels/src/registry.ts`, `packages/core/src/channels/channels.module.ts`, `packages/core/src/channels/operations/provider-event.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 014b before048d.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/scripts/e2e-http.mjs`; integrate 048d before046.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `.env.example`, `apps/api/test/integration/channels.test.ts`, `apps/web/e2e/http/channels.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/index.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`, `tools/scripts/e2e-http.mjs`; integrate 048d before048e.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `packages/channels/src/operations.ts`, `packages/core/src/channels/operations/provider-event.ts`; integrate 048d before048f.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `.env.example`, `apps/api/test/integration/channels.test.ts`, `apps/web/e2e/http/channels.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048d before048h.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `.env.example`, `tools/scripts/e2e-http.mjs`; integrate 035d before048d.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/channels.module.ts`; integrate 003c before048d.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before048d.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before048d.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012b before048d.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012c before048d.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before048d.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before048d.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before048d.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/operations/provider-event.ts`; integrate 015c before048d.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before048d.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before048d.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before048d.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020d before048d.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020e before048d.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 022b before048d.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/operations/provider-event.ts`; integrate 022c before048d.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`, `tools/scripts/e2e-http.mjs`; integrate 023b before048d.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 023c before048d.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `packages/channels/src/index.ts`; integrate 023f before048d.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `packages/channels/src/operations.ts`; integrate 025b before048d.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 026b before048d.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 030b before048d.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before048d.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 032b before048d.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 033b before048d.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 034b before048d.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 037 before048d.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 039 before048d.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before048d.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042 before048d.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042b before048d.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 043 before048d.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/channels/src/index.ts`, `packages/core/src/channels/channels.module.ts`; integrate 045b before048d.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before048d.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before048d.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047d before048d.
- **TIP-ID:** TIP-048d · **Project:** AppChat V2 · **Module:** Kênh — Zalo OA (adapter + limiter; không bảng mới, không UI mới) · **Priority:** P0 · **Estimated:** L
- **Depends on:** 048b, 048c và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 048e, 048f, 048g, 048h, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - TIP-048 (gián tiếp qua 048b) tạo OAuth Zalo OA (`packages/channels/src/zalo-oa/oauth.ts`), bảng `oauth_grant`, `TokenVault`, `oauth.start`. 048d chỉ dùng. Không tự lưu / tự làm mới token: refresh Zalo dùng một lần, ZCC (047c) cùng OA dùng chung grant `zalo_oa` (DC-909).
  - 048b tạo hợp đồng `ChannelWebhook` / `HookItem`, `connect.oauth`, `capabilities.window` / `sync`, route `/hooks/channels/:type`, biên nhận `channel_webhook_event`, route nền tảng `tenant_channel_webhook_route`, `channel.oauth_select`, `send-window.ts`, `conversation.last_inbound_at`, `CONTACT_SOURCES` có `zalo_oa`.
  - 048c dựng giao diện kết nối theo `connect.kind` (OAuth + chọn tài khoản) và khối Đồng bộ theo `capabilities.sync`. 048d chỉ thêm manifest + chuỗi, không sửa màn kết nối.
  - 048e đứng sau vì cùng sửa `registry.ts`, `coming-soon.ts`, `channels.env.ts`, `channels.module.ts`, `channels.test.ts`, `e2e/http/channels.spec.ts`.
- **Files touched:** [exact M/C manifest](manifests/TIP-048d-files.md). Thư mục mới `packages/channels/src/zalo-oa/` (cạnh `oauth.ts` của 048) và `packages/core/src/channels/zalo-oa/`. Không file prisma, không migration (dùng bảng của 048 / 048b). Sửa có chủ đích file của TIP khác: `registry.ts` / `coming-soon.ts` / `index.ts` / `operations.ts` (gói kênh — `ProviderEvent` thêm `contact_info`), `provider-event.ts` (014b), `channels.module.ts` + `channels.env.ts`, `channels.test.ts` + `e2e/http/channels.spec.ts` (014), `tools/scripts/e2e-http.mjs` (transport giả cho E2E http).
- **Quyết định nguồn:** D62 (#1, #2, #5, #6) · DC-909 (một App Zalo, grant `zalo_oa`) · DC-910 (nền webhook) · DC-912 · Q-909 · Q-907 (hạn mức kênh — tạm: có) · Blueprint §6 (~L1249), §8 (~L1424), K13.
- **Dòng COVERAGE nhận:** REQ-B08 (zalo_oa) · BP-6-zalo-oa · D62-channels · DC-912 · Q-909

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. Kênh webhook: không lease, không phiên giữ trong worker; token lấy qua `TokenVault` mỗi lần gọi.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Gói kênh:**
    - `packages/channels/src/coming-soon.ts` ~L9: `zalo_oa` là thẻ "Sắp có" (`oauth`, `display` Zalo OA / `Z` / `#0068FF` / `msg` / `pop` / sort 1).
    - `registry.ts` ~L24–31: `buildChannelRegistry(deps)` gắn adapter theo `ChannelDeps`; `channelRegistry` là bản chỉ manifest (API, FE, AI đọc).
    - `registry.test.ts` ~L13 `RELEASE = [zalo_personal, webchat, email]`, ~L26–30 đòi đúng 3 GA, ~L42–46 `isConnectable`. 048b có thể đã đổi — kiểm lại ở Rà.
    - Mẫu adapter: `email/` (manifest 24 dòng, adapter 102, `fake-transport.ts` 82) và `zalo-personal/` (`render.ts` chia đoạn, `provider-capabilities.md`, `FileFetcher` ~L16–24).
  - **Core kênh:**
    - `channels.env.ts` ~L29–34: guard `fake` cấm production (mẫu cho `ZALO_OA_TRANSPORT`).
    - `channels.module.ts` ~L78–92: `channelRegistryFor(env)` dựng registry theo env.
    - `jobs/stateless.ts`: mở worker gửi cho kênh `session = 'webhook'` có adapter (quét route).
    - `jobs/send.processor.ts`: `pace` ~L131–140 (Redis `chrate:<account>:<phút>`); xử lý lỗi ~L143–170 (`ChannelAuthError` → `expire`; `ChannelOperationError('rejected')` = chắc chắn chưa tới khách; 3 lỗi / 10 phút → tự tạm dừng ~L20–21).
  - **Tin vào:**
    - `inbox/services/pipeline.ts` ~L77 `run(tx, ws, m, now, origin)` chỉ ghi `direction 'in'` (~L173–178), chống trùng `UNIQUE(channel_account_id, external_msg_id)`.
    - Sự kiện ngoài tin: `sink.event` → `ProviderEvent` (`operations.ts` ~L120): `self_ref`, `recalled`, `reaction`, `friend`, `delivered` / `seen` → `provider-event.ts` (`applyReceipt`, `applyFriendEvent`).
    - Tin "ra" gửi từ app khác (echo): hợp đồng 048b có `HookItem.kind = 'echo'`. Kiểm ở Rà processor `channel-hooks` của 048b ghi echo thế nào (§6).
  - **Khách:** `crm/services/identity.service.ts` ~L42–50 khớp SĐT chuẩn hoá, khách nháp ghi `phone` từ `sender.phone`. SĐT chuẩn hoá là unique (`duplicates.service.ts` ~L1–3).
  - **Chuỗi:** `i18n/server/{vi,en}/channels.ts` `name` chỉ có 3 kênh (~L3). Web `settings.json` có sẵn `channels.desc.zalo_oa` (~L481); wizard ~L521; drawer ~L572.
  - **Test gác:** `apps/api/test/integration/channels.test.ts` ~L148–160 (16 loại; `facebook` `available: false`; `filter=off` 15). `apps/web/e2e/http/channels.spec.ts` ~L15–16 (16 thẻ; `st-ch-facebook` disabled).
  - **Mã hoá / ký:** `kernel/crypto.ts` (`encryptSecret`); mẫu HMAC + so khớp an toàn `webchat/visitor-token.ts`.
- **Tài liệu Zalo (khảo sát 2026-11-13 — đọc lại ở Rà):**
  - OAuth v4 + token: 048 lo (access 25 giờ; refresh 3 tháng, dùng một lần).
  - Webhook: `user_send_text | image | gif | file | sticker | link | audio | video | location | business_card`, `follow` / `unfollow`, `user_received_message`, `user_seen_message`, `user_reacted_message`, echo `oa_send_*`, `user_submit_info`.
    - URL HTTPS theo domain (không host:port), domain phải xác thực ở Zalo Developers.
    - Trả 200 ≤ 2 giây. Gửi lại sau 30 giây, 5', 15', 30', 1 giờ (header `num_retry`).
  - Chữ ký `X-ZEvent-Signature = sha256(appId + data + timeStamp + OA secret key)`: SHA-256 thường (không HMAC); `data` = raw JSON body; khoá là **OA secret key** ở trang Webhook (không phải App Secret).
  - Tin tư vấn `POST openapi.zalo.me/v3.0/oa/message/cs`: ≤ 7 ngày từ tương tác cuối (bình luận bài, gọi, bấm menu cũng là tương tác). 48 giờ đầu miễn phí, sau đó trừ ví OA (shop trả Zalo).
  - Đính kèm: ảnh jpg / png ≤ 1MB, GIF ≤ 5MB, file PDF / DOC / DOCX / CSV ≤ 5MB; quota upload 5.000 / tháng; Zalo giữ tệp 7 ngày.
  - Hồ sơ: tên, ảnh, `user_is_follower`, `is_sensitive`. SĐT chỉ có khi khách chia sẻ (`request_user_info` → `user_submit_info`).
  - Gói OA (từ 01/06/2026, OA đã xác thực): chỉ **Tăng trưởng** (100 req / phút / OA, ≤ 3 app) và **Toàn diện** (2.000 req / phút) gọi được API. Rate **App** 4.000 req / phút tính trên ứng dụng — mọi OA nối AppChat dùng chung; vượt → lỗi −32.
  - Bình luận bài viết OA: không có API (Sắp có).
- **Key files to read first:** TIP-048 + TIP-048b (hợp đồng) · `packages/channels/src/zalo-oa/oauth.ts` (048) · `packages/channels/src/webhook.ts` (048b) · `packages/core/src/inbox/services/send-window.ts` (048b) · `packages/core/src/kernel/oauth/token-vault.ts` (048) · `packages/channels/src/email/manifest.ts` · `packages/channels/src/email/adapter.ts` · `packages/channels/src/email/fake-transport.ts` · `packages/channels/src/zalo-personal/render.ts` · `packages/channels/src/zalo-personal/provider-capabilities.md` · `send.processor.ts` · `stateless.ts`.
- **Patterns to follow:**
  - Adapter không giữ phiên như `webchat` / `email`: `manifest.ts` + `adapter.ts` + `normalize.ts` + `render.ts` + transport giả trong bộ nhớ, chọn theo env ở `channelRegistryFor`.
  - `provider-capabilities.md` như Zalo cá nhân: bảng năng lực, cột "Kiểm thật" = CHỜ-TK tới khi có OA thật.
  - Lỗi kênh: `ChannelAuthError` (token hỏng) · `ChannelOperationError('rejected' | 'invalid')` (Zalo từ chối rõ / kiểm trước khi gọi) · lỗi mạng ném nguyên (core ghi `unknown`, không gửi lại mù).
  - Tệp gửi ra đi qua `FileFetcher(url, bind)` do core cấp; adapter không tự `fetch` URL tệp (chặn SSRF — TIP-045b).
  - HTTP ra Zalo: `fetch` của Node 24 + `AbortSignal.timeout(10_000)`; không SDK, không thư viện mới.

## APPLICABLE STANDARDS
- [channels/omnichannel-adapter](../standards/channels/omnichannel-adapter.md) — checklist "Thêm một kênh mới": manifest + adapter + normalize + render + test riêng; đăng ký registry; i18n; chữ ký webhook trong adapter; không sửa `inbox/`, `crm/`, `ai/`; gửi qua outbox + limiter; credential mã hoá.
- [integrations/provider-ports](../standards/integrations/provider-ports.md) — webhook: kiểm chữ ký trong adapter, biên nhận idempotent theo id nhà cung cấp, trả 200 nhanh, xử lý nền; test bằng `fake` + fixture.
- [ops/observability-security](../standards/ops/observability-security.md) — không log token / SĐT / nội dung tin / payload webhook; sai chữ ký → 401 + `warn`, không lộ lý do; metric `channel_send_total{type,result}`.
- [events/outbox](../standards/events/outbox.md) · [domain/concurrency](../standards/domain/concurrency.md) — webhook lặp / lệch thứ tự idempotent; limiter Redis nguyên tử, dùng chung nhiều worker.
- [domain/validation-defaults](../standards/domain/validation-defaults.md) — text ≤ 2000, kích thước / loại tệp kiểm trước khi gọi kênh.
- [database/tenant-db](../standards/database/tenant-db.md) — không bảng mới; `channel_account.settings` mở bằng zod (`oa_tier`).
- [i18n/i18n](../standards/i18n/i18n.md) · [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase lên `origin/dev` mới nhất sau khi 048, 048b, 048c đã merge.
   - `python -X utf8 tools/obligations/manifests.py 048d`.
   - Kiểm lại mọi số dòng `~` trong TIP này trên code thật. Lệch → sửa TIP, thêm dòng "Rà lại <ngày>".
2. Đọc code thật đã merge của 048 / 048b; lệch brief thì theo code, ghi report:
   - Tên hàm lấy token cho tài khoản OAuth (`TokenVault.access` qua runtime tài khoản hay qua `ChannelDeps`).
   - `ChannelWebhook` (`challenge` / `verify` / `split`), `HookItem.kind`, `handleWebhook(item, account, sink)`, hình dạng `ChannelDeps.hooks`.
   - Processor `channel-hooks` làm gì với `echo` / `read` / `reaction` / `other`; echo tới trước khi ACK gửi ghi `external_msg_id` thì xử lý ra sao (§6).
   - `windowState` đọc `capabilities.window`; 048c xử lý `connect.oauth.picker = false` thế nào.
3. Đọc lại tài liệu Zalo bản mới nhất (developers.zalo.me), ghi ngày đọc vào `provider-capabilities.md`:
   - Công thức `X-ZEvent-Signature`; khoá ký cấp theo App hay theo OA (§2).
   - Danh sách `event_name` và vị trí `oa_id` trong từng sự kiện.
   - Hạn mức gói OA; mã lỗi: −32 (rate), token sai / hết hạn (−216, −124 …), ngoài cửa sổ tương tác, tham số sai, hết quota upload.
   - Endpoint upload ảnh / GIF / file, `user/detail`, `getoa`; dạng tin ảnh / file trong `message/cs`; có trích dẫn tin (`quote`) không.
4. Tìm đường làm giàu khách nguồn `system` có sẵn (pipeline / `ContactIdentityService` / action nội bộ) cho `user_submit_info` (§7). Không có → chỉ gợi ý, ghi "Giả định đã chọn".
5. Kiểm `channels.test.ts` / `e2e/http/channels.spec.ts` sau 048b / 048c (đếm, `available`, test id). Chỉ sửa đúng phần của `zalo_oa`.

## TASK
Bật kênh **Zalo OA** thật (GA) trên nền webhook của 048b, không sửa Inbox / CRM / AI:
- Manifest `zalo_oa` (OAuth `zalo_oa`, cửa sổ 168 giờ rồi chặn, gửi text / ảnh / file).
- Webhook: kiểm `X-ZEvent-Signature`, tách theo `oa_id`, chuẩn hoá tin vào / echo / đã xem / cảm xúc / quan tâm / `user_submit_info`.
- Gửi tin tư vấn qua OpenAPI v3 (chia đoạn ≤ 2000, upload ảnh / GIF / file đúng giới hạn).
- Limiter hai tầng: App 4.000 / phút chung mọi OA + OA theo gói; lỗi −32 → chậm lại, không mất tin.
- `probe` theo `getoa`; token hỏng → tài khoản `expired` qua đường 048.
- Transport `http` (fetch) + `fake` (test / E2E), env + guard production; bỏ thẻ "Sắp có".
- `provider-capabilities.md` + test riêng + fixtures JSON.

## SPECIFICATIONS

### 1. Manifest `packages/channels/src/zalo-oa/manifest.ts`
| Trường | Giá trị |
|---|---|
| `type` / `label` / `icon` / `group` / `status` | `zalo_oa` · `channels.zalo_oa.label` · `zalo` · `chat` · `ga` |
| `display` | Giữ đúng dòng "Sắp có" cũ: `Zalo OA` · `Z` · `#0068FF` · `msg` · `pop` · sort 1 (registry test so với fixture prototype) |
| `connect` | `{ kind: 'oauth', oauth: { provider: 'zalo_oa', picker: false, scopes: [] }, riskNotice: 'channels.zalo_oa.plan_notice' }` — một lần uỷ quyền = một OA (callback trả `oa_id`), không có bước chọn nhiều tài khoản |
| `capabilities` | `direct: true` · `group: false` · `mentions: false` · `reactions: false` · `send: ['text', 'image', 'file']` (GIF đi đường `image`) · `maxTextLength: 2000` · `markdown: 'none'` · `proactive: 'template_only'` (ngoài cửa sổ chỉ ZNS — Sắp có; `send` không có `template` nên thực tế chặn) |
| `capabilities.window` | `{ hours: 168, after: 'blocked' }` (048b `send-window.ts` đọc) |
| `capabilities.sync` | `['messages', 'auto_contact']` — không `history` (chưa đồng bộ lịch sử), không `comments` (bài viết OA không có API) |
| `rateLimit` | `{ perMinute: 60 }` — chừa ~40 lượt / phút / OA cho upload + `user/detail` trong hạn mức gói Tăng trưởng 100 / phút |
| `session` | `webhook` |

- `operations` vắng (thu hồi / cảm xúc phía OA không có API) → menu tin không hiện thao tác kênh.
- Chiến dịch marketing không mở cho `zalo_oa` (giữ luật 048b).

### 2. Webhook `packages/channels/src/zalo-oa/webhook.ts` (hợp đồng `ChannelWebhook` của 048b)
1. **`challenge`:** không có (Zalo không gọi GET xác minh). Xác thực domain làm ở Zalo Developers (meta tag / tệp HTML trên domain) — việc vận hành, ghi ở `provider-capabilities.md`.
2. **`verify(raw, headers, secrets)`:**
   - Lấy header `x-zevent-signature`; thiếu → false.
   - Parse raw lấy `app_id`, `timestamp`. `app_id` khác `ZALO_APP_ID` → false.
   - Tính `sha256(app_id + raw.toString('utf8') + timestamp + secrets.ZALO_OA_SECRET_KEY)` (hex, SHA-256 thường). So bằng `timingSafeEqual` trên hai buffer cùng độ dài (mẫu `webchat/visitor-token.ts`).
   - `timestamp` cũ hơn 7 ngày (bằng hạn dọn biên nhận 048b) hoặc lệch tương lai > 5 phút → false. Không siết hơn vì Zalo gửi lại tới ~2 giờ sau.
   - Khoá ký: đọc ở Rà #3. Nếu khoá theo từng OA (không theo App) → không verify được ở mức App như 048b thiết kế → dừng, escalate L2.
3. **`split(raw)`:** Zalo gửi một sự kiện mỗi POST → một `HookItem`:
   - `routeKey = 'zalo_oa:<oa_id>'`. `oa_id` lấy theo họ sự kiện: tin khách gửi `recipient.id`; echo `oa_send_*` `sender.id`; `follow` / `unfollow` `oa_id`; `user_submit_info` `recipient.id`. Bảng chính xác theo tài liệu bản mới (Rà #3) + fixture.
   - `eventKey`: tin `msg:<message.msg_id>`; đã nhận / đã xem `seen:<msg_ids sắp xếp>:<user>`; cảm xúc `react:<msg_id>:<user>:<timestamp>`; quan tâm `follow:<user>:<timestamp>` / `unfollow:<user>:<timestamp>`; chia sẻ thông tin `submit:<user>:<timestamp>`; còn lại `h:<sha256(raw)>`.
   - `kind`: `user_send_*` → `message`; `oa_send_*` → `echo`; `user_received_message` / `user_seen_message` → `read`; `user_reacted_message` → `reaction`; `follow` / `unfollow` / `user_submit_info` / sự kiện lạ → `other`.
4. Không đọc / log nội dung tin ở bước verify / split. Log chỉ `event_name`, `routeKey` băm, độ dài body.

### 3. Tin vào — `adapter.handleWebhook(item, account, sink)` + `normalize.ts`
| Sự kiện | Xử lý |
|---|---|
| `user_send_text` | `sink.push`: `externalThreadId` = id người dùng theo OA (`sender.id`), `externalMsgId` = `msg_id`, `isGroup: false`, `kind: 'text'`, `sentAt` từ `timestamp` (ms) |
| `user_send_image` / `gif` | `kind: 'image'`, `attachments[{ url, mime, name? }]` từ `payload.url` |
| `user_send_file` | `kind: 'file'` (tên, cỡ, mime theo phần mở rộng) |
| `user_send_sticker` | `kind: 'sticker'` (URL ảnh sticker) |
| `user_send_audio` | `kind: 'audio'` |
| `user_send_video` | `kind: 'file'`, mime `video/*` |
| `user_send_link` / `location` / `business_card` | `kind: 'text'`: link = URL; vị trí = `lat,lng`; danh thiếp = tên + SĐT trong thân tin (không làm giàu khách — chỉ §7 làm) |
| `oa_send_*` (echo) | Tin OA gửi từ app khác (OA Manager, app thứ ba): đi đường echo của 048b → tin `direction out`, `sender_type user`, không kích AI / FRT / chưa đọc. Echo của tin AppChat vừa gửi: `msg_id` trùng `external_msg_id` đã ACK → không tạo dòng (UNIQUE). Echo tới trước ACK → dùng cơ chế chờ / khớp của 048b (Rà #2) |
| `user_received_message` / `user_seen_message` | `sink.event({ kind: 'delivered' \| 'seen', msgIds, recipients: [user] })` — khớp tin ra theo id |
| `user_reacted_message` | `sink.event({ kind: 'reaction', self: false, emoji })`. Mã cảm xúc Zalo (`/-heart`, `/-strong`, `:>`, `:o`, `:-((`, `:-h`) → 6 emoji AppChat; mã lạ → bỏ |
| `follow` / `unfollow` | `sink.event({ kind: 'friend', type: 'added' \| 'removed', self: false })` — trạng thái quan tâm OA. Không tạo khách / hội thoại |
| `user_submit_info` | §7 |
| sự kiện lạ | bỏ qua, không lỗi (processor ghi `ignored`) |

- **Tên / ảnh người gửi:** webhook không mang tên. Định danh chưa gặp → `GET /v3.0/oa/user/detail` (qua limiter), cache bộ nhớ trong adapter (≤ 5.000 mục, 1 giờ). Lỗi → bỏ tên (pipeline dùng tên mặc định), không chặn tin.
- **Tệp Zalo** chỉ lưu 7 ngày. Nếu pipeline đã có bước lưu tệp vào Storage cho kênh khác → dùng; chưa có → Gap đã khai (lưu lại tệp thuộc TIP sau).
- `raw` trong `NormalizedInbound` chỉ `{ event_name }` — không giữ payload (PII).

### 4. Gửi — `render.ts` + `api.ts` (`adapter.send(accountId, msg, ledger)`)
1. **Token + `oa_id` + gói:** lấy qua đường 048b cấp cho adapter OAuth (`TokenVault.access` theo `channel_account.oauth_grant_id`; tên hàm kiểm ở Rà #2). Adapter không đọc DB, không giữ token quá một lệnh, không log token.
2. **Chữ:** `render.ts` chia đoạn ≤ 2000 ký tự (ưu tiên ngắt dòng / câu, giống `zalo-personal/render.ts`). Mỗi đoạn một lần `POST /v3.0/oa/message/cs` (`recipient.user_id` = `externalThreadId`). `markdown: 'none'` → bỏ cú pháp đánh dấu, giữ xuống dòng.
3. **Sổ gửi từng phần** (`SendLedger`): `reserve(partNo, hash)` trước mỗi lần gọi, `confirm(partNo, { msgId })` sau ACK. Lỗi sau khi có phần đã tới → `PartialSendError(receipt)`. `externalMsgId` = `message_id` của phần đầu; `parts` = đủ các phần theo thứ tự.
4. **Ảnh / GIF / tệp** (kiểm TRƯỚC `reserve`, trước khi gọi Zalo):
   - Tải bằng `FileFetcher(url, { fileId, sha256 })` do core cấp. Không tự `fetch` URL tệp.
   - Ảnh jpg / png ≤ 1MB · GIF ≤ 5MB · tệp PDF / DOC / DOCX / CSV ≤ 5MB. Mime theo magic bytes + phần mở rộng.
   - Sai loại / quá cỡ → `ChannelOperationError('invalid', 'attachment_too_large' | 'attachment_type')`. Chưa gọi Zalo nên tin `failed` rõ lý do.
   - Upload (`upload/image`, `upload/gif`, `upload/file` — endpoint theo tài liệu bản mới, Rà #3) → `attachment_id` / `token` → `message/cs` dạng ảnh / tệp. Có chữ kèm → gửi chữ thành phần riêng sau tệp.
   - Quota upload 5.000 / tháng / OA: đếm ở limiter (§5). Hết → `ChannelOperationError('rejected', 'zalo_upload_quota')` trước khi gọi.
5. **Trả lời trích dẫn:** Zalo có trường trích dẫn tin (Rà #3) → điền từ `replyToExternalMsgId`; không có → bỏ, không lỗi.
6. **Phân loại lỗi Zalo** (mã chính xác ở Rà #3; bảng đặt ở `api.ts`, không rải chuỗi số):
   | Zalo trả | Adapter ném | Core làm (có sẵn) |
   |---|---|---|
   | Token sai / hết hạn / bị thu hồi | `ChannelAuthError` (sau một lần làm mới qua 048 nếu vault cho phép) | Tài khoản `expired` + thông báo Owner |
   | Ngoài cửa sổ tương tác (quá 7 ngày) | `ChannelOperationError('rejected', 'window_closed')` | Lưới cuối khi 048b chưa chặn kịp (đồng hồ lệch) |
   | −32 (vượt hạn mức App) | Báo limiter `backoff('app', 60s)` rồi `ChannelOperationError('rate_limited', { retryAfterMs: 60000 })` (`provider_rate_limited` — 048b §7.5b) | Tin chưa tới khách; `send.processor` hoãn job, không tính lỗi, không tự tạm dừng tài khoản |
   | Vượt hạn mức OA / OA chưa mua gói | `ChannelOperationError('rejected', 'zalo_oa_plan')` | `failed` + chuỗi "OA cần gói Tăng trưởng / Toàn diện" |
   | Tham số sai / người nhận không hợp lệ | `ChannelOperationError('rejected', 'zalo_invalid')` | `failed` |
   | Mạng / hết giờ / 5xx sau khi gọi | ném nguyên lỗi | `unknown`, không gửi lại mù |
7. **Không** gửi `template` / ZNS / tin giao dịch / tin truyền thông. Ngoài cửa sổ chặn từ 048b (`window_closed` 409 ở `outbound.ts`, chốt cuối ở `send.processor.ts`).

### 5. Limiter hai tầng — `packages/core/src/channels/zalo-oa/app-limiter.ts`
1. **Vì sao ở core:** hạn mức App 4.000 / phút tính trên ỨNG DỤNG — mọi OA của mọi workspace nối AppChat dùng chung. Cần một bộ đếm Redis toàn hệ thống. `pace` của `send.processor.ts` chỉ đếm theo tài khoản.
2. **Hợp đồng** (`ZaloOaLimiter` khai ở `packages/channels/src/zalo-oa/api.ts`; core cài, tiêm qua `ChannelDeps` ở `channelRegistryFor`):
   - `take(oaId, tier, cost = 1)` → `{ ok: true } | { ok: false; retryAfterMs }`. Một script Lua: kiểm cả hai bộ đếm, tăng cả hai hoặc không tăng gì.
   - `backoff(scope: 'app' | oaId, ms)` → đặt khoá chậm lại. Trong lúc còn khoá, `take` trả `ok: false`.
   - `takeUpload(oaId)` → bộ đếm tháng.
3. **Khoá Redis** (không PII; `oa_id` không phải dữ liệu cá nhân):
   - App: `zoa:app:<ZALO_APP_ID>:<phút>`, trần `ZALO_OA_APP_RPM` (mặc định 3.600 = 90% của 4.000, chừa cho ZCC cùng App — DC-909).
   - OA: `zoa:oa:<oa_id>:<phút>`, trần theo `channel_account.settings.oa_tier`: `growth` 100 · `comprehensive` 2.000 · vắng = `growth`.
   - Chậm lại: `zoa:slow:app` / `zoa:slow:<oa_id>` (TTL = ms).
   - Upload: `zoa:upload:<oa_id>:<YYYYMM>` (TTL 35 ngày), trần `ZALO_OA_UPLOAD_MONTHLY` (mặc định 5.000).
4. **Ai gọi:** mọi lệnh `api.ts` (gửi, upload, `user/detail`, `getoa`) đi qua `take` TRƯỚC khi gọi Zalo và trước `ledger.reserve`.
   - Gửi hết lượt → ném lỗi hết lượt nhà cung cấp của 048 / 048b (`provider_rate_limited`, có `retryAfterMs`). `send.processor` (048b) hoãn job, không tính lỗi, không tự tạm dừng tài khoản. Kiểm ở Rà #2; thiếu đường này → L2, không tự sửa `send.processor.ts`.
   - `user/detail` hết lượt → bỏ tên, không chặn tin vào.
5. **`oa_tier`:** mặc định `growth` (gói thấp nhất gọi được API). `probe` ghi `comprehensive` nếu `getoa` trả thông tin gói (Rà #3). Không thêm ô UI ở TIP này. Tin ra mặc định 60 / phút / OA (manifest) nằm dưới trần OA.
6. ZCC (047c) gọi Zalo qua cùng App: dùng chung `take('app')` nếu Zalo tính chung hạn mức (Rà #3). Không sửa file 047c ở TIP này; ghi report.

### 6. Echo, đã xem, cảm xúc, quan tâm
- **Echo `oa_send_*`:** tin OA gửi từ OA Manager / app khác vào lịch sử hội thoại: `direction out`, `sender_type user` (tên `OA Manager` nếu không biết người gửi), `status sent`. Không đếm chưa đọc / FRT, không kích AI.
  - Echo của tin AppChat vừa gửi: `message_id` đã có ở `external_msg_id` (ACK) → không tạo dòng.
  - Echo tới TRƯỚC ACK: theo cách 048b khớp (Rà #2). Không đoán theo nội dung.
- **Đã nhận / đã xem:** `sink.event` `delivered` / `seen` theo `msg_ids` (khớp `message_provider_ref` / `external_msg_id` của đúng tài khoản). Tin không khớp → bỏ.
- **Cảm xúc của khách:** `sink.event` `reaction` (`self: false`). Bảng mã Zalo → 6 emoji AppChat ở `normalize.ts`; mã ngoài bảng → bỏ.
- **Quan tâm / bỏ quan tâm:** `FriendEvent` `added` / `removed` (`self: false`) qua đường bạn bè có sẵn. Không tạo khách / hội thoại. Hiển thị trên dòng thời gian khách nếu đường có sẵn hỗ trợ; không thì chỉ lưu trạng thái (Gap).

### 7. `user_submit_info` → SĐT khách (DC-912 d — không ghi đè)
1. Adapter chuẩn hoá thành sự kiện mới `ProviderEvent` `{ kind: 'contact_info'; accountId; key; userId; phone?: string; at }` (thêm vào union ở `packages/channels/src/operations.ts`). Tên / địa chỉ / thành phố trong payload bỏ qua.
2. Core áp ở `packages/core/src/channels/operations/contact-info.ts` (gọi từ `provider-event.ts`, cùng transaction + outbox như sự kiện kênh khác):
   - `normalizePhone`; số sai → bỏ (`ignored`).
   - Tìm `contact_identity (channel_account_id, external_id = userId)` → khách còn sống. Không có → bỏ (không tạo khách; `request_user_info` chỉ gửi trong hội thoại đã có).
   - Khách chưa có SĐT và số chưa thuộc khách khác → điền `phone` + `phone_norm`, ghi dòng thời gian "Khách chia sẻ SĐT qua Zalo OA", outbox như cập nhật khách có sẵn (đường ghi cụ thể theo Rà #4).
   - Khách đã có đúng số đó → không làm gì.
   - Khách có SĐT khác, hoặc số thuộc khách khác → **không đổi, không gộp**. Ghi gợi ý trên dòng thời gian khách (`channels.zalo_oa.phone_suggestion`, kèm mã khách kia nếu có) để nhân viên tự sửa / gộp.
   - Dùng hàm của `crm/public.ts` (`writeTimeline` …). Thiếu loại / khoá dòng thời gian phù hợp → L2, không tự sửa `crm/`.
3. Không log SĐT. Biên nhận webhook (048b) giữ payload theo hạn dọn 7 ngày của 048b.

### 8. Probe, token hết hiệu lực, uỷ quyền lại
- `probe(accountId)` → `GET getoa` (qua limiter): ok → `connected`; lỗi token → `expired`; 5xx / mạng → `degraded`. Probe ghi `oa_tier = 'comprehensive'` khi đọc được gói (Rà #3); không đọc được → giữ `growth`.
- Token hỏng có hai đường, cả hai về `expired` + thông báo Owner (đường của 048 / có sẵn):
  - Làm mới gặp `invalid_grant` → `TokenVault` đặt grant `revoked` → outbox `oauth.grant_revoked` → tài khoản dùng grant chuyển `expired`.
  - Zalo trả lỗi token khi gọi API → adapter ném `ChannelAuthError` → `send.processor` chạy `expire` (có sẵn).
- OA gỡ quyền App (nếu Zalo có sự kiện — Rà #3) → `HookItem.kind = 'account'` → processor 048b đặt `expired`.
- Uỷ quyền lại: nút của 048c (`channel.reauthorize`). Cùng `oa_id` → nối lại đúng tài khoản cũ (theo `(type, external_id)` — 048b).
- Ngắt kênh OA không thu hồi grant khi `call_line` (ZCC) còn dùng — luật của 048; 048d không đụng.

### 9. Env, registry, transport
1. `channels.env.ts` thêm:
   - `ZALO_OA_TRANSPORT`: `http` | `fake`, mặc định `http`. Production + `fake` → lỗi boot (mẫu ~L29–34).
   - `ZALO_OA_SECRET_KEY`: OA secret key ở trang Webhook của App (khoá ký `X-ZEvent-Signature`), tuỳ chọn.
   - `ZALO_OA_APP_RPM`: mặc định 3.600 (1–4.000). `ZALO_OA_UPLOAD_MONTHLY`: mặc định 5.000.
   - `ZALO_APP_ID` / `ZALO_APP_SECRET` đọc từ env của 048, không khai lại.
2. **Chưa cấu hình** (`http` mà thiếu `ZALO_APP_ID` / `ZALO_APP_SECRET` / `ZALO_OA_SECRET_KEY`): registry dựng `zalo_oa` với `status: 'coming_soon'` (thẻ "Sắp có", không kết nối được), log `warn` một lần, không chặn boot — App chưa duyệt vẫn chạy được (K13). API và worker đọc cùng luật (Rà #2 — nơi API lấy registry).
3. `registry.ts`: `ChannelDeps.zaloOa?: { transport: ZaloOaTransport; limiter: ZaloOaLimiter }` → gắn `ZaloOaAdapter`. `coming-soon.ts`: bỏ dòng `zalo_oa`. `index.ts`: export adapter, hai transport, kiểu `ZaloOaLimiter`.
4. `channels.module.ts` `channelRegistryFor` (~L78–92): chọn `HttpZaloOaTransport` (ở `api.ts`; `fetch` Node 24, timeout 10 giây, base `https://openapi.zalo.me`) hoặc `fakeZaloOaTransport`; tạo limiter Redis của §5 (thêm tham số Redis cho hàm nếu chưa có — Rà #2).
5. `fake-transport.ts` (bộ nhớ, tất định):
   - Ghi `sent[]` / `uploads[]`; trả `msg_id` `fake-oa-<n>`; `getoa` trả OA giả.
   - `failNext(code)` giả lỗi Zalo (−32, token, ngoài cửa sổ, gói).
   - `signedHook(event)` dựng `{ raw, headers }` có chữ ký đúng theo khoá test — dùng cho test và E2E.
6. `.env.example`: khối "Zalo OA" ngay dưới khối App Zalo của 048, kèm chú thích "khoá ký webhook = OA secret key trang Webhook, không phải App Secret".

### 10. Chuỗi, tài liệu năng lực, test
- **i18n server** `i18n/server/{vi,en}/channels.ts`: `name.zalo_oa` · `zalo_oa.plan` ("OA cần gói Tăng trưởng hoặc Toàn diện để dùng API") · `zalo_oa.window` ("Đã quá 7 ngày từ lần khách tương tác cuối — Zalo không cho gửi tin tư vấn") · `zalo_oa.rate` · `zalo_oa.attachment_too_large` ("Ảnh tối đa 1MB, GIF / tệp tối đa 5MB") · `zalo_oa.attachment_type` · `zalo_oa.upload_quota` · `zalo_oa.phone_suggestion` (có `{phone}`, `{code}`).
- **i18n web** `messages/{vi,en}/settings.json`: `channels.zalo_oa.label` (nếu thiếu) · `channels.zalo_oa.plan_notice` (riskNotice: OA cần gói Tăng trưởng / Toàn diện; tin tư vấn chỉ trong 7 ngày; phí ngoài 48 giờ do Zalo trừ ví OA). `channels.desc.zalo_oa` giữ.
- **`provider-capabilities.md`** (mẫu Zalo cá nhân): ngày đọc tài liệu · bảng sự kiện webhook → xử lý · công thức chữ ký + khoá · bảng endpoint (gửi, upload, `user/detail`, `getoa`) · giới hạn (2.000 ký tự, cỡ tệp, quota, cửa sổ, rate hai tầng) · bảng mã lỗi → lỗi adapter · việc vận hành (xác thực domain, URL webhook `HOOKS_PUBLIC_URL/hooks/channels/zalo_oa`, bật sự kiện ở App) · cột "Kiểm thật" = CHỜ-TK (Q-909).
- **Test:**
  - `packages/channels/test/zalo-oa.test.ts` (unit, fixtures): verify đúng / sai / app lạ / quá hạn; split + `eventKey`; normalize từng fixture; render chia đoạn; kiểm tệp; bảng lỗi; ledger từng phần.
  - `packages/channels/test/registry.test.ts`: `zalo_oa` GA, `isConnectable`, `buildChannelRegistry({ zaloOa })` gắn adapter; số GA / "Sắp có" đúng.
  - `apps/api/test/integration/zalo-oa.test.ts` (Postgres + Redis thật, transport `fake`): AC1–9, AC11.
  - `apps/api/test/integration/channels.test.ts` (~L148–160): `zalo_oa` `available: true`.
  - `apps/web/e2e/http/channels.spec.ts` (~L15–16): thẻ Zalo OA bật; OAuth giả (048) → OA giả kết nối → POST webhook ký đúng → tin hiện ở Hộp thư → trả lời → transport giả nhận.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given OA giả đã kết nối (route `zalo_oa:<oa_id>`), when POST `/hooks/channels/zalo_oa` với `user_send_text` ký đúng `X-ZEvent-Signature`, then 200, một `channel_webhook_event`, một `message` `in` ở hội thoại của khách; ký sai / `app_id` lạ / `timestamp` quá hạn → 401, không biên nhận, log `warn` không chứa body | `packages/channels/test/zalo-oa.test.ts` (verify) + `apps/api/test/integration/zalo-oa.test.ts` |
| 2 | Given cùng `msg_id` gửi lại 3 lần (`num_retry` 0 / 1 / 2), when ingress nhận, then cả 3 lần trả 200 trong < 2 giây, đúng 1 biên nhận + 1 `message`, chưa đọc tăng 1 | `zalo-oa.test.ts` (đo thời gian phản hồi) |
| 3 | Given AppChat vừa gửi tin (ACK `msg_id` X), when tới echo `oa_send_text` X, then không tạo dòng mới; when tới echo `msg_id` Y lạ (gửi từ OA Manager), then 1 `message` `out` `sender_type user`, không tăng chưa đọc, không FRT, không kích AI | `zalo-oa.test.ts` |
| 4 | Given hội thoại `last_inbound_at` = 8 ngày trước, when `message.send`, then 409 `window_closed`, không job gửi; 6 ngày trước → gửi được; job đang chờ mà qua mốc 168 giờ → kết quả `window_closed` cuối, transport giả không nhận lời gọi | `zalo-oa.test.ts` (đồng hồ giả) |
| 5 | Given tệp đính kèm, when gửi ảnh 1,2MB / tệp `.exe` / GIF 4MB / ảnh 900KB, then hai ca đầu `failed` (`attachment_too_large` / `attachment_type`) không upload; hai ca sau upload rồi gửi; quota upload chạm 5.000 → lần kế bị từ chối trước khi gọi Zalo | `zalo-oa.test.ts` (unit) + `zalo-oa.test.ts` (integration) |
| 6 | Given `ZALO_OA_APP_RPM=5`, 2 workspace mỗi nơi 1 OA, when gửi 8 tin trong một phút, then transport giả nhận đúng 5 lời gọi trong phút đó, 3 tin còn lại gửi ở phút sau, không `failed`, không tự tạm dừng tài khoản; OA `growth` trần 100 / phút; Zalo giả trả −32 → limiter chậm lại 60 giây, tin gửi thành công sau đó | `zalo-oa.test.ts` (Redis thật) |
| 7 | Given Zalo giả trả lỗi token khi gửi, when job chạy, then tin `failed`, tài khoản `expired`, Owner nhận thông báo; given làm mới gặp `invalid_grant`, then grant `revoked` → tài khoản `expired` (đường 048) | `zalo-oa.test.ts` |
| 8 | Given `user_submit_info` của khách đã có identity, when khách chưa có SĐT, then điền SĐT + dòng thời gian; when khách có SĐT khác, hoặc số thuộc khách khác, then không đổi, không gộp, có gợi ý trên dòng thời gian; log không chứa SĐT | `zalo-oa.test.ts` + kiểm output logger |
| 9 | Given `user_seen_message` / `user_reacted_message` / `follow` / `unfollow` / sự kiện lạ, when xử lý, then tin ra đổi `seen`, cảm xúc khách gắn đúng tin, trạng thái quan tâm đổi, sự kiện lạ `ignored`; không tạo khách / hội thoại | `zalo-oa.test.ts` |
| 10 | Given registry sau TIP, when chạy test gác, then `zalo_oa` GA + kết nối được; `/settings/channels` trả `zalo_oa` `available: true`; E2E http: thẻ Zalo OA bật → OAuth giả → OA giả kết nối → webhook ký đúng → tin hiện ở Hộp thư → trả lời → transport giả nhận | `packages/channels/test/registry.test.ts` + `apps/api/test/integration/channels.test.ts` + `apps/web/e2e/http/channels.spec.ts` |
| 11 | Given `NODE_ENV=production` + `ZALO_OA_TRANSPORT=fake`, when boot, then lỗi chỉ nêu tên biến; given `http` thiếu `ZALO_OA_SECRET_KEY`, then thẻ Zalo OA "Sắp có", API / worker vẫn chạy | `zalo-oa.test.ts` (đọc env + registry) |
| 12 | Given App AppChat có quyền OA API + OA thử gói Tăng trưởng (Q-909), when kết nối OA thật, nhận / gửi tin, kiểm chữ ký thật, chạm −32, then đúng như AC1–7 | **chưa nghiệm thu với provider thật** — `provider-capabilities.md` cột "Kiểm thật" = CHỜ-TK |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/channels --filter=@appchat/core --filter=@appchat/shared --filter=@appchat/api` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check`.
- Integration (cổng riêng theo slot Postgres của 035d, `--workers=1`): `pnpm --filter @appchat/api test:integration -- test/integration/zalo-oa.test.ts test/integration/channels.test.ts test/integration/channel-hooks.test.ts test/integration/send-window.test.ts`.
- E2E luồng TIP: `pnpm e2e:http channels` (http, `ZALO_OA_TRANSPORT=fake`) + `pnpm e2e settings` (mock: thẻ Zalo OA bật theo manifest).
- Parity màn Cài đặt › Kênh (id ở `tools/parity/parity.manifest.ts`): thẻ đổi "Sắp có" → kết nối được, mask PD-903 của 048c.

## CONSTRAINTS
- **DO NOT:**
  - Tự lưu / tự làm mới token OA hay đưa token vào `credentials_enc` — chỉ `TokenVault` (refresh Zalo dùng một lần, chung grant với ZCC).
  - Gửi ZNS / template / tin truyền thông; gửi ngoài 7 ngày; mở chiến dịch marketing cho `zalo_oa`.
  - Thêm bảng / cột / migration.
  - `switch (type)` / `if (type === 'zalo_oa')` ở inbox / crm / ai / `send.processor.ts` — khác biệt đi qua manifest.
  - Log payload webhook, SĐT, nội dung tin, token, khoá ký.
  - Ghi đè / tự gộp SĐT khách khi khác số.
  - Làm bình luận bài OA, đồng bộ lịch sử, ô chọn gói OA trên UI.
  - Thêm SDK / thư viện Zalo — chỉ `fetch`.
  - Sửa `send.processor.ts`, `pipeline.ts`, processor `channel-hooks`, `send-window.ts` (048b sở hữu): thiếu móc nối → L2.
- **REUSE:**
  - `TokenVault`, `oauth.start`, OAuth `zalo_oa` (048); `channel.oauth_select`, `channel.reauthorize`, ingress, biên nhận, route, `send-window.ts` (048b); bước OAuth + khối Đồng bộ (048c).
  - `InboundSink.push` / `event`, `ProviderEvent` (`delivered` / `seen` / `reaction` / `friend`), `SendLedger`, `PartialSendError`, `ChannelAuthError`, `ChannelOperationError`, `FileFetcher`.
  - `normalizePhone`, `writeTimeline` (`crm/public.ts`), guard env `fake` (`channels.env.ts`), mẫu so khớp an toàn `webchat/visitor-token.ts`.
- **SKIP:**
  - ZNS, bình luận bài viết OA (Sắp có).
  - Nút "Xin thông tin khách" (`request_user_info`) trên UI.
  - Lưu lại tệp Zalo quá 7 ngày nếu pipeline chưa có đường.
  - Nghiệm thu OA thật (Q-909).

## Quality Gate
- [x] Manifest chính xác (file-level M/C); path tương lai do 048 / 048b tạo ghi rõ ở manifest.
- [x] Khớp DC-912 (a)–(e), D62 #1 / #2 / #5, DC-909 (một App Zalo, grant chung ZCC), DC-910 (nền webhook).
- [x] Theo checklist "Thêm một kênh mới": manifest + adapter + normalize + render + test riêng + registry + i18n + chữ ký trong adapter.
- [x] Webhook: verify mức App, idempotent theo id Zalo, 200 ≤ 2 giây, xử lý nền.
- **Gap đã khai:**
  - Chưa nghiệm thu với OA thật (Q-909: App chưa có quyền OA API, OA thử chưa mua gói).
  - Mã lỗi Zalo chính xác, endpoint upload, trường trích dẫn, khoá ký App / OA: đọc ở Rà #3.
  - Tệp Zalo chỉ giữ 7 ngày: lưu lại vào Storage thuộc TIP sau nếu pipeline chưa có.
  - `oa_tier` chưa có ô UI (mặc định `growth`, probe nâng nếu đọc được gói).
  - Sự kiện `contact_info` + `operations/contact-info.ts` thêm ngoài brief (cần cho DC-912 d).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope.
- [ ] AC 1–12 có kết quả từng cái, dán output thật; AC12 ghi "chưa nghiệm thu với provider thật" (Q-909).
- [ ] **Core không import SDK kênh (BUILDER-HANDOFF, omnichannel-adapter #1):** HTTP Zalo chỉ ở `packages/channels/src/zalo-oa/`; core chỉ có limiter Redis + áp sự kiện.
- [ ] **Credential mã hoá (omnichannel-adapter #10, ops §2):** token chỉ qua `TokenVault`; khoá ký từ env; log không có token / SĐT / nội dung tin (test bắt output logger).
- [ ] **Gửi qua outbox + limiter (omnichannel-adapter #6):** không gọi Zalo trong request HTTP; limiter hai tầng chạy trước mọi lời gọi; không `switch (type)` ở inbox / crm / ai.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
