### COMPLETION REPORT — TIP-014

**STATUS:** DONE (chưa nghiệm thu với Zalo thật — Q-003)
**COMMIT:** `dbc96cb` (code) trên nhánh `tip/014-channels-zalo` (xếp chồng trên `tip/015-crm-core`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`
**Q-003:** chưa có tài khoản Zalo phụ → adapter viết theo type thật của `zca-js@2.2.0` (MIT) sau cổng `ZaloTransport`; mọi luồng nghiệm thu bằng transport giả (`ZALO_TRANSPORT=fake`, cấm production — DC-074). Spike với Zalo thật chạy khi Chủ nhà cấp tài khoản.

**FILES CHANGED:**
- Created:
  - Channels: `src/zalo-personal/{transport.ts, zca-transport.ts (nơi duy nhất import zca-js), fake-transport.ts, adapter.ts, render.ts, normalize.ts}`; test `test/{zalo-render.test.ts, zalo-adapter.test.ts}`.
  - Schema: migration `tenant/migrations/20261031100000_014_channels` (`channel_account`, `channel_account_stat_daily` + unique partial `channel_account_external_live_key`, partial covering `channel_account_live_idx`, FK thống kê).
  - Shared: `src/api/channels.ts` (`settingsChannelListSchema`, `channelAccountStatsSchema`, `channelLoginStateSchema`), `i18n/server/{vi,en}/channels.ts`.
  - Core: `channels/{channels.env.ts, public.ts}`, `services/{accounts.service.ts, read.service.ts, control.ts, send-queue.ts}`, `actions/{channel-connect.handlers.ts, channel-manage.handlers.ts}`, `jobs/{lease.ts, sessions.ts, login.processor.ts, send.processor.ts}`, `events/channels.rules.ts`.
  - API: `apps/api/src/http/channels/channels.controller.ts`.
  - Web: `features/settings/{components/ZaloQrStep.tsx, hooks/useZaloLogin.ts}`.
  - Test: `apps/api/test/integration/channels.test.ts` (8), `apps/web/src/shared/api/mock/channels-shape.test.ts` (2), `apps/web/e2e/http/channels.spec.ts`.
  - TIP: `coding-packs/tips/TIP-014-channels-zalo.md`.
- Modified: `packages/channels/src/{types.ts (display, beginLogin, syncHistory, LoginEvent, ChannelAuthError…), define.ts (thứ tự hiển thị, hasAdapter, kết nối được theo manifest — DC-068), registry.ts (buildChannelRegistry), coming-soon.ts + 3 manifest (display), index.ts}`, `packages/channels/test/registry.test.ts`, `packages/db/prisma/tenant/channels.prisma`, `packages/shared/src/{events.ts (channel.connected, channel.status_changed), api/index.ts, i18n/server/index.ts}`, `packages/actions/src/settings-apps.ts` (`channel.zalo.start_login` `db: 'platform'` — DC-069), `packages/core/src/{index.ts, channels/channels.module.ts, channels/jobs/channels.jobs.module.ts}`, `apps/api/src/{app.module.ts, http/channels/channels.http.module.ts}`, `apps/api/test/integration/setup.ts` (dọn `tenant_channel_route`), `apps/web/src/features/settings/{api.ts, channel-types.ts, settings-store.ts, components/{ConnectChannelModal.tsx, ManageChannelDrawer.tsx}, styles/channel-wizard.styles.ts}`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `apps/web/messages/{vi,en}/settings.json` (3 key), `tools/contract/src/cases.ts`, `tools/scripts/e2e-http.mjs` (thêm worker ROLE=channels Zalo giả), `package.json` của channels / core / api / worker (+ `zca-js`, `@appchat/channels`), `coding-packs/{DECISIONS.md, QUESTIONS.md}`.

**TEST RESULTS:**
- Acceptance criteria: 12/12 pass
  1. Migration 014: 2 bảng, `type` text (không enum), unique partial `(type, external_id) WHERE status <> 'disconnected'`, partial covering `(type, created_at) INCLUDE (status, name)`, FK thống kê — **pass**
  2. Unit channels 21: render (đậm / nghiêng / gạch, lồng nhau, `*` lẻ / snake_case giữ nguyên, chia đoạn ≤ 2000 theo dòng / chữ, style tính lại mỗi đoạn), normalize (chữ / ảnh / file + mime + size / sticker / voice / nhóm + mention, bỏ tin của mình), adapter + transport giả (QR → credential, huỷ / từ chối, start bằng credential + thu hồi → `ChannelAuthError`, gửi chữ chia đoạn / file / sticker, bị đá → `expired`, đồng bộ lịch sử theo ngày, stop), registry (16 kênh đúng thứ tự + hiển thị prototype, `buildChannelRegistry` gắn adapter) — **pass**
  3. `start_login` → `connecting` + route; worker phát QR (Redis `/login` `waiting` + WS `channel.zalo.qr` tới người bấm); quét → `connected`, `credentials_enc` giải ra credential, không lộ ở API / action_log; nhãn giữ; outbox `channel.connected`; lease giữ — **pass**
  4. Gói Miễn phí (1 kênh) đã có 1 → 402 `PLAN_LIMIT_REACHED { resource: channels, limit: 1 }`; sales → 403 (action + GET) — **pass**
  5. `/settings/channels` khớp schema: 16 loại, Zalo `accounts[]`, Facebook "Sắp có", lọc on / off; `/stats` 7 ngày (FRT `1'12`); id lạ / không phải uuid 404 — **pass**
  6. `update_settings` (tên, agent, chế độ, giờ, lời chào, cách chia, SLA, đồng bộ; `agent_id: ''` bỏ gán); `test` báo phiên sống; `pause` → route `paused`, phiên + lease nhả; `resume` → giữ phiên lại; `sync_history` lưu ngày + đẩy tin cũ trong khoảng vào `channel-inbound` — **pass**
  7. Tin vào → job `channel-inbound` (NormalizedInbound đúng, nhóm `mentionsMe`); trùng msgId không thêm job; `last_event_at` cập nhật — **pass**
  8. Gửi qua `chsend-<id>`: rich text (style `b`), sink nhận `external_msg_id`; ref trùng gửi 1 lần; 3 lỗi / 10 phút → tự tạm dừng, route `paused`, outbox reason `send_errors`, thông báo `channel_down` — **pass**
  9. Bị đá phiên → `expired` + route + thông báo "Kênh Zalo CSKH bị ngắt kết nối"; `test` báo lỗi; `reconnect` → QR mới → `connected`, cùng một tài khoản — **pass**
  10. `disconnect` → `disconnected`, credential xoá, phiên dừng, route `disconnected`, biến khỏi list; tài khoản cuối → kênh "Chưa kết nối"; ngắt lần 2 404; `channel.test` dạng form → 501 `{ tip: '018' }` — **pass**
  11. Mock FE parse cùng schema (2 ca, luồng QR mock); contract 13/13 mock + HTTP (thêm `channel.zalo.start_login`); E2E http Kênh (wizard Zalo → QR từ worker → cấu hình nhanh → drawer lời chào + chế độ AI giữ sau tải lại → tạm dừng / tiếp tục → ngắt → Chưa kết nối) — **pass**; E2E mock `settings` / `inbox` xanh trong full hồi quy — **pass**
  12. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (9 package đổi) 27/27 task (lần 1 đỏ lint web: mảng key literal + setState trong effect → sửa); `pnpm depcheck` xanh (1149 module); `lint:size` 1174 file; `i18n:check` 100% (4481 key).
- **Cổng "chốt TIP":** `pnpm lint` / `typecheck` / `test` 13/13 task · `pnpm build` 3/3 · `api test:integration` **134 passed** (16 file) · `db test:integration` 7 passed · `pnpm depcheck` xanh · `pnpm i18n:check` 100% · smoke bản build (`API_PORT=4119`): `/v1/health` 200, `/v1/settings/channels`, `/:id/stats`, `/:id/login` không token 401, 0 log error; worker `ROLE=channels` (zca thật) + `ROLE=channels ZALO_TRANSPORT=fake` khởi động sạch, 0 log error · **E2E http 11 passed · 5 skipped** (thêm worker ROLE=channels Zalo giả) · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (2.7m). Parity: N/A — bố cục không đổi (bước 2 Zalo hiện ảnh QR thật thay biểu tượng khi đã bấm Tiếp tục; trước đó giữ như prototype).

**INDEX:** danh sách tài khoản / đếm hạn mức đọc `status <> 'disconnected'` → partial `channel_account_live_idx (type, created_at) INCLUDE (status, name)`; thống kê 7 / 30 ngày theo PK `(channel_account_id, day)`. Bảng nhỏ (≤ vài chục tài khoản / workspace) — không có list phân trang.

**ISSUES DISCOVERED:**
- Luật "kết nối được ⇔ có adapter" (TIP-001) mâu thuẫn với adapter cần dependency lúc chạy → DC-068 (như DC-042 của connector).
- FE chưa có client Socket.IO → QR không tới được chỉ qua WS → thêm `GET /settings/channels/:id/login` (DC-070).
- `Worker.close()` của BullMQ chờ job đang chạy → tự tạm dừng ngay trong job gửi bị treo; tách bước tạm dừng / hết hạn ra sau khi job kết thúc.
- Route của workspace test đã xoá làm worker log lỗi mỗi nhịp → lỗi một tài khoản không chặn tài khoản khác, thử lại sau 60 giây.
- Bảng `ai_agent` chưa có (TIP-021) → `agent_id` lưu trong settings, tên hiển thị chờ TIP-021 (DC-076); drawer trước đây gửi tên agent làm `agent_id` → sửa gửi id.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-068 … DC-076. **Câu hỏi mới:** Q-013 (cap tin chủ động / ngày).

**DEVIATIONS FROM SPEC:** không có (`channel.zalo.start_login` thêm `db: 'platform'` — metadata thực thi, schema giữ nguyên; DC-069).

**Chưa nghiệm thu với provider thật:** Zalo cá nhân (QR, listener, gửi ảnh / file / sticker, đồng bộ lịch sử) — chờ tài khoản phụ (Q-003).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-016: processor queue `channel-inbound` = inbound pipeline (dedupe DB, `ContactIdentityService.resolve`, upsert hội thoại); `ChannelSendQueue.enqueue` từ outbox_message + `registerSendResultSink('inbox', …)`; cộng `channel_account_stat_daily` (hội thoại mới, FRT); bộ lọc tài khoản Hộp thư đọc `channel_account` (REQ-B09).
- TIP-017 / 018: adapter webchat / email gắn vào `buildChannelRegistry`; `channel.email.connect`, `channel.test` dạng form.
- TIP-021: cài `AgentNames` (tên agent theo id) + kiểm `agent_id` tồn tại.
- TIP-037: cap tin chủ động / ngày (Q-013) qua `settings.daily_cap` / manifest.
