# TIP-014: Channels core + Zalo cá nhân — tài khoản kênh, adapter zca-js, lease phiên, gửi có giới hạn tốc độ, trang Kênh kết nối

## HEADER
- TIP-ID: TIP-014
- Project: AppChat V2
- Module: `packages/channels/src/{types.ts, registry.ts, zalo-personal/*}` · `packages/db/prisma/tenant/channels.prisma` · `packages/core/src/channels/**` · `apps/api/src/http/channels/**` · `packages/shared/src/api/channels.ts`
- Depends on: TIP-003 (action kernel), TIP-006 (notify / realtime), TIP-012 (`sealSecrets` / `openSecrets`), TIP-013 (settings) — nhánh xếp chồng từ `tip/015-crm-core`
- Priority: P0 · REQ: B01, B02, B03, B04, B07, B09, B10, B11
- Estimated effort: 22 giờ
- **Files touched:**
  - Channels: `types.ts` (+ `display`, `beginLogin`), `define.ts` / `registry.ts` (`buildChannelRegistry`), `zalo-personal/{transport.ts, zca-transport.ts, fake-transport.ts, normalize.ts, render.ts, adapter.ts}`, `coming-soon.ts`, manifest (+ `display`).
  - Schema: `tenant/channels.prisma` (`channel_account`, `channel_account_stat_daily`) + migration tenant `<ts>_014_channels`.
  - Shared: `src/api/channels.ts` (schema đọc), `src/events.ts` (`channel.connected`, `channel.status_changed`), `i18n/server/{vi,en}/channels.ts`.
  - Core: `channels/{channels.module.ts, env.ts, public.ts}`, `services/{accounts.service.ts, read.service.ts, login-state.ts, control.ts, send-queue.ts}`, `actions/*.handlers.ts`, `jobs/{channels.jobs.module.ts, sessions.ts, lease.ts, login.processor.ts, send.processor.ts}`, `events/channels.rules.ts`.
  - API: `apps/api/src/http/channels/{channels.controller.ts, channels.http.module.ts}`, `app.module.ts` (1 dòng `register()`).
  - Web: wizard Zalo hiện QR thật (poll `GET /settings/channels/:id/login`), mock route login, drawer chọn AI Agent theo id.
  - Test: `packages/channels/test/zalo-*.test.ts`, `apps/api/test/integration/channels.test.ts`, contract cases, `apps/web/e2e/http/channels.spec.ts`.

## CONTEXT
- Blueprint §2.2 `channel_account` (L312–313), §1.3 queue `send:<channel_account_id>`, §3.4 channels (L586–596), §4.4 channels, §4.6 WS `channel.zalo.qr` / `channel.status`, §6 (lease 30s / heartbeat 10s, Zalo cá nhân, chống khoá).
- `standards/channels/omnichannel-adapter.md`: core không import SDK kênh; manifest là nguồn UI / AI; gửi qua queue + limiter; lease; health chuẩn hoá; credential AES-256-GCM.
- FE (đã làm theo prototype ver2.1): `GET /settings/channels?filter=` (nhóm theo `type`, `accounts[]`), `GET /settings/channels/:accountId/stats?days=7`, wizard 3 bước, drawer 2 cấp.
- Q-003: chưa có tài khoản Zalo phụ → adapter zca-js viết theo type thật của `zca-js@2.2.0` (MIT), nghiệm thu bằng transport giả; **chưa nghiệm thu với Zalo thật**.

## TASK
1. **Schema** `channel_account` (type text theo registry, `status` enum, `credentials_enc`, `settings` jsonb, `paused_at`, `health` jsonb, `last_event_at`, unique `(type, external_id)`, partial index tài khoản đang dùng) + `channel_account_stat_daily` (hiệu suất 7 ngày — TIP-016 ghi khi có hội thoại).
2. **Adapter Zalo cá nhân** sau `ZaloTransport` (zca-js thật / giả): `beginLogin` (QR → credential), `start` (đăng nhập bằng credential, listener 1-1 + nhóm → `NormalizedInbound`), `send` (markdown → rich text, chia đoạn ≤ 2000, ảnh / file tải về Buffer), `probe`, `stop`.
3. **Worker channels:** login job (queue `channel-login`), lease `lease:channel:{id}` (SET NX PX 30000, gia hạn 10s bằng Lua, mất lease → dừng phiên), khởi động nhận tài khoản `connected` chưa có lease; phiên hết hạn → `expired` + thông báo `channel_down`; lệnh tức thời (dừng / đồng bộ lịch sử) qua Redis pub/sub.
4. **Gửi:** `ChannelSendQueue` (queue `chsend-<account>` — BullMQ cấm `:`), limiter `perMinute` + jitter + cap/ngày cho tin chủ động, lỗi bất thường ≥ 3 / 10 phút → tự tạm dừng + báo Owner; kết quả qua `SendResultSink` (TIP-016 đăng ký).
5. **Nhận:** tin vào đẩy queue `channel-inbound` (job id chống trùng `<account>-<external_msg_id>`); processor là inbound pipeline TIP-016.
6. **Action:** `channel.zalo.start_login` (hạn mức gói `max_channels`), `channel.test`, `channel.update_settings`, `channel.pause` / `resume`, `channel.sync_history`, `channel.reconnect`, `channel.disconnect` (tài khoản cuối → kênh "Chưa kết nối"); `tenant_channel_route` đồng bộ mỗi lần đổi trạng thái.
7. **Đọc:** `GET /v1/settings/channels`, `/v1/settings/channels/:id/stats`, `/v1/settings/channels/:id/login` (trạng thái QR — FE chưa có client WS).
8. **FE:** wizard Zalo gọi `start_login` rồi hiện QR thật + chờ quét → bước 3; drawer chọn AI Agent theo id.

## ACCEPTANCE CRITERIA
1. Migration 014: bảng + unique / partial index; `channel_account.type` không phải enum.
2. Unit channels: render (đậm / nghiêng → style, chia đoạn ≤ 2000 theo ranh giới chữ), normalize (text / ảnh / file / sticker / nhóm + mention, bỏ tin của chính mình), adapter + transport giả (login QR → credential, start bằng credential, send, probe, stop); registry: `zalo_personal` kết nối được, 16 kênh đúng thứ tự prototype.
3. `channel.zalo.start_login` → tài khoản `connecting` + route; worker phát QR (`channel.zalo.qr` qua emitter + `/login` trả `waiting` + ảnh); quét (giả) → `connected`, `credentials_enc` giải ra credential, không lộ trong API / action_log; tên = nhãn hoặc tên Zalo; outbox `channel.connected`; lease được giữ.
4. Hạn mức: gói 1 kênh, đã có 1 → 402 `PLAN_LIMIT_REACHED { resource: channels }`; sales → 403.
5. `/settings/channels` khớp schema FE: 16 loại, `zalo_personal.accounts[]` có tài khoản mới (connected, health good), loại khác rỗng; lọc `on` / `off`; `/stats` 7 ngày; id lạ / không phải uuid 404.
6. `update_settings` (tên, agent, chế độ, giờ, lời chào, cách chia, SLA, đồng bộ) phản ánh ở list; `pause` → `paused`, phiên dừng (route `paused`); `resume` → chạy lại; `sync_history` lưu số ngày + gửi lệnh đồng bộ; `channel.test` báo trạng thái thật (đang giữ phiên / không).
7. Tin vào (giả) → job `channel-inbound` có `NormalizedInbound` đúng; tin trùng không thêm job.
8. Gửi: `ChannelSendQueue.enqueue` → adapter gửi, sink nhận `externalMsgId`; cap/ngày tin chủ động → lỗi `daily_cap`; 3 lỗi bất thường → tài khoản tự tạm dừng + thông báo `channel_down`.
9. Phiên hết hạn (transport giả đóng `KickConnection`) → `expired`, route `expired`, thông báo `channel_down` cho người có `channels.manage`; `reconnect` → login job mới, quét lại → `connected`.
10. `disconnect` → `disconnected`, credential xoá, phiên dừng, biến khỏi list; tài khoản cuối → kênh `connected: false`.
11. Mock FE parse cùng schema; contract channels xanh mock + HTTP; E2E http Kênh (wizard Zalo QR giả → cấu hình → drawer → tạm dừng / tiếp tục → ngắt) xanh; E2E mock `settings` / `inbox` xanh.
12. Cổng D59 xanh (+ smoke bản build api + worker ROLE=channels).

## CONSTRAINTS
- Không đổi input / output action đã có. `channel.email.connect` + `channel.test` dạng form Email là TIP-018; `webchat.update_widget` TIP-017 (trả 501 kèm TIP).
- Core không import `zca-js` (chỉ `packages/channels/src/zalo-personal/zca-transport.ts`).
- Transport giả chỉ bật bằng `ZALO_TRANSPORT=fake`, cấm ở production (dừng boot).
- Không gửi chủ động cho người lạ chưa từng nhắn: luật ở tầng hội thoại / chiến dịch (TIP-016 / 037) — TIP-014 cung cấp cờ `proactive` + cap.
