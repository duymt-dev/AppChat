### COMPLETION REPORT — TIP-017

**STATUS:** DONE
**COMMIT:** `0eec696` (code) + `d2929dd` (relay bỏ workspace đã xoá + test ổn định) trên nhánh `tip/017-web-widget` (xếp chồng trên `tip/016-inbox-backend`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Schema: migration `tenant/migrations/20261031300000_017_webchat` (`webchat_widget`, `webchat_visitor`, 2 FK nội DB).
  - Shared: `src/api/webchat.ts` (Cài đặt widget + giao thức `/widget`).
  - Channels: `webchat/adapter.ts` (`WebchatAdapter` sau `WidgetPublisher`).
  - Core: `channels/webchat/{widget.service.ts, webchat.handlers.ts, visitor.service.ts, visitor-token.ts, publisher.ts}`, `channels/jobs/stateless.ts`.
  - API: `apps/api/src/http/channels/{widget.controller.ts, widget.gateway.ts, widget-script.controller.ts}`.
  - Widget: `apps/widget` (`src/{main,ui,styles,i18n,types}.ts`, `scripts/build.mjs`, test jsdom).
  - Test: `apps/api/test/integration/webchat.test.ts` (9), `apps/web/src/shared/api/mock/widget-shape.test.ts`, `apps/web/e2e/http/webchat.spec.ts`, `apps/widget/test/ui.test.ts` (5).
  - TIP: `coding-packs/tips/TIP-017-web-widget.md`.
- Modified: `packages/db/prisma/tenant/channels-webchat.prisma`; `packages/actions/src/settings-apps.ts` (`webchat.update_widget` + `enabled` / `color` / `allowed_domains`, output + `channel_account_id` / `public_key`, `db: 'platform'`); `packages/channels/src/{registry.ts, index.ts}`; `packages/shared/src/{api/index.ts, i18n/server/*/channels.ts}`; `packages/core/src/channels/{channels.module.ts, channels.env.ts (WIDGET_API_URL / WIDGET_SCRIPT_URL), public.ts, jobs/channels.jobs.module.ts, actions/channel-manage.handlers.ts (channel.test theo manifest)}`, `crm/services/identity.service.ts` + `inbox/services/pipeline.ts` (email pre-chat vào khách nháp), `kernel/outbox/relay.ts`; `apps/api/src/http/{channels/channels.http.module.ts, kernel/prefix.ts (/widget.js ngoài /v1), notify/realtime/ws.gateway.ts (registerNamespace)}`; FE `features/settings/{components/WidgetSection.tsx, types.ts}`, mock `settings-apps.ts`, i18n `settings.json` (vi / en), fixture `settings.json` (widget: enabled / key / màu / domain, mã nhúng mới); `tools/contract/src/cases.ts`, `tools/scripts/e2e-http.mjs`; test `contract.test.ts` (gói Team), `relay-sequence.test.ts`, `workspaces.test.ts`; `coding-packs/{DECISIONS.md, QUESTIONS.md}`.

**TEST RESULTS:**
- Acceptance criteria: 9/9 pass
  1. Migration 017: 2 bảng, unique `public_key` / `channel_account_id`, index (channel_account_id, created_at), 2 FK — **pass**
  2. Chưa bật → mặc định (`enabled: false`, chưa mã nhúng); sales 403; bật → tài khoản webchat `connected` + `tenant_widget_route` (domain) + `tenant_channel_route`, mã nhúng có `data-key`; cấu hình (lời chào / màu / pre-chat / nút / handoff / giọng) phản ánh ở GET; Kênh kết nối hiện tài khoản webchat; gói Miễn phí đã đủ kênh → thêm Zalo 402 `PLAN_LIMIT_REACHED` — **pass**
  3. Socket: key lạ / sai dạng `NOT_FOUND`, Origin ngoài `allowed_domains` `FORBIDDEN`, tên miền con được; `visitor.hello` cấp token, kết nối lại bằng token giữ đúng khách — **pass**
  4. Pre-chat chưa khai → `VALIDATION_FAILED {prechat}`; khai → gửi → khách nháp (tên / SĐT chuẩn hoá / email, nguồn `website`) + hội thoại webchat ở `/conversations?channel=webchat`; trùng `client_id` một tin; KPI lượt mở / hội thoại thật; 21 tin / phút → `RATE_LIMITED` — **pass**
  5. Trả lời ở Hộp thư → khách nhận `message.new` (redis-emitter → `/widget`), tin `sent` + `external_msg_id` = id realtime; kết nối lại → lịch sử hai chiều — **pass**
  6. Tắt widget → kết nối mới `INVALID_STATE`, gửi ra 409, `channel.test` false; bật lại chạy; ngắt tài khoản → ngoại tuyến, worker gửi đóng; bật lại dùng lại tài khoản + `public_key` + khách cũ — **pass**
  7. `widget.js` IIFE **16.6 KB gzip** (ngân sách 40 KB, build lỗi nếu vượt); jsdom 5 ca: hello / lịch sử / màu / token, pre-chat, gửi + gửi lại cùng `client_id` + bỏ trùng, ngoại tuyến, chọn ngôn ngữ — **pass**
  8. Mock FE parse cùng schema (+ action trả đúng output); contract `webchat.update_widget` mock + HTTP (16/16); E2E http: bật widget → mã nhúng → trang website (origin khác) nhúng widget.js thật → pre-chat + nhắn → Hộp thư thấy → trả lời → khách thấy realtime → tải lại giữ lịch sử — **pass**; E2E mock `settings` (công tắc bật / tắt, mã nhúng) — **pass**
  9. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (9 package đổi) 27/27 task; `pnpm depcheck` xanh (1199 module); `lint:size` 1222 file; `i18n:check` 100% (4487 key); `lint:tokens` xanh.
- **Cổng "chốt TIP":** `pnpm turbo run lint typecheck test build` **46/46** task · `api test:integration` **160 passed** (18 file) · `db test:integration` 7 passed · smoke bản build (`API_PORT=4119`): `/v1/health` 200, `/v1/settings/widget` không token 401, `/widget.js` 200; worker `ROLE=channels` + `ROLE=jobs` — 0 log error · **E2E http 13 passed · 7 skipped** · full E2E hồi quy mock **222 passed · 0 failed · 196 skipped** (3.0m) · parity `settings:web-widget` **2.57%**, `settings:channels` **4.19%**.

**INDEX / EXPLAIN:** tra widget theo `public_key` (unique) / `channel_account_id` (unique); khách web theo PK; KPI đếm `webchat_visitor (channel_account_id, created_at)` + `conversation` theo `(channel_account_id, external_thread_id)` unique; lịch sử widget = hội thoại theo unique `(channel_account_id, external_thread_id)` rồi `message (conversation_id, created_at DESC, id DESC)` LIMIT 50.

**ISSUES DISCOVERED:**
- Outbox relay trả workspace lỗi lại set bẩn kể cả workspace **đã xoá** → set dev tích 95 id chết, mỗi lượt `max = 50` có thể không tới workspace thật (production: workspace bị xoá cũng kẹt mãi) → bỏ id `WorkspaceNotFoundError` (`d2929dd`).
- EXPLAIN membership phụ thuộc thống kê bảng dev dùng chung → kiểm "index của membership, không Seq Scan".
- Chromium chặn trang origin công khai gọi về `localhost` (Local Network Access) → E2E cấp quyền cho trang giả; production API có domain công khai, không ảnh hưởng.
- Cổng 3000 của máy dev đang có app khác (`OPCHUB`) — parity chạy app ở cổng riêng (`PARITY_APP_URL`), không đụng tiến trình đó.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-086 … DC-090. **Câu hỏi mới:** Q-015 (nhiều widget / workspace).

**DEVIATIONS FROM SPEC:** không có (thêm trường input / output cho `webchat.update_widget` theo Blueprint §2.2 cột `webchat_widget` — DC-086).

**Chưa nghiệm thu với provider thật:** không áp dụng (webchat không có bên thứ ba). Nginx `widget.<domain>` chưa dựng (hạ tầng — TIP-044); tới lúc đó API phục vụ `/widget.js` (DC-089).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-022 (AI): `ai_chat` / `mode` / `handoff` / `tone` / `knowledge_on` / `collect_on` của widget nằm ở `webchat_widget.settings`; agent trực = `settings.agent_id` của tài khoản (hội thoại mới nhận theo pipeline).
- TIP-021: `agents` của `/settings/widget` hiện chỉ có agent đã chọn — thay bằng danh sách `ai_agent`.
- TIP-044: nginx `widget.<domain>` phục vụ `apps/widget/dist/widget.js` + proxy socket `/widget`; đặt `WIDGET_API_URL` / `WIDGET_SCRIPT_URL`.
- Typing indicator / `agent.status` (Blueprint §4.6) chưa phát — làm cùng copilot (TIP-022) khi có trạng thái agent.
