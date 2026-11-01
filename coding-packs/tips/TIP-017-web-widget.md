# TIP-017: Web widget — widget chat nhúng website, socket `/widget`, adapter webchat, Cài đặt › Trợ lý AI website

## HEADER
- TIP-ID: TIP-017
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/channels-webchat.prisma` · `packages/channels/src/webchat/*` · `packages/core/src/channels/webchat/**` · `apps/api/src/http/channels/{widget.controller.ts, widget.gateway.ts}` · `apps/widget/**` · `packages/shared/src/api/webchat.ts`
- Depends on: TIP-014 (channel_account, route, hàng đợi gửi), TIP-016 (inbound pipeline, outbox gửi) — nhánh xếp chồng từ `tip/016-inbox-backend`
- Priority: P0 · REQ: B05 (+ B09 một kênh nhiều tài khoản)
- Estimated effort: 12 giờ
- **Files touched:**
  - Schema: `tenant/channels-webchat.prisma` (`webchat_widget`, `webchat_visitor`) + migration tenant `<ts>_017_webchat`.
  - Channels: `webchat/adapter.ts` (`WebchatAdapter` sau `WidgetPublisher`), `registry.ts` (deps `webchat`).
  - Shared: `src/api/webchat.ts` (Cài đặt widget + giao thức `/widget`), `i18n/server/{vi,en}/channels.ts` (mặc định widget).
  - Actions: `webchat.update_widget` (+ `enabled`, `allowed_domains`, `color`; `db: 'platform'`; output + `channel_account_id`, `public_key`).
  - Core: `channels/webchat/{widget.service.ts, visitor-token.ts, webchat.handlers.ts}`, `channels/jobs/sessions.ts` (tài khoản không lease), `channel.test` theo manifest, env `WIDGET_SCRIPT_URL` / `WIDGET_API_URL`, `crm` identity nhận email.
  - API: `GET /v1/settings/widget`, Socket.IO namespace `/widget` (chung server với `/ws`).
  - Widget: `apps/widget` (TS → `dist/widget.js` IIFE, ≤ 40 KB gzip, Shadow DOM, vi + en).
  - Web: Cài đặt › Trợ lý AI website hiện nút bật khi chưa có widget; mã nhúng thật.
  - Test: `apps/api/test/integration/webchat.test.ts`, `apps/widget/test/*`, contract `webchat.update_widget`, `apps/web/e2e/http/webchat.spec.ts`.

## CONTEXT
- Blueprint §2.2 `webchat_widget` (L314), `tenant_widget_route` (L285), §3.4 `webchat.update_widget`, §4.6 namespace `/widget` (`public_key` + `visitor_token` JWT 30 ngày; `visitor.hello`, `message.send`; server → `message.new`, `typing`, `agent.status`), §6 "Webchat: JS ≤ 40KB gz, prechat form, chỉ chạy trên `allowed_domains`", §9 rate-limit widget.
- `standards/channels/omnichannel-adapter.md`: tin vào chuẩn hoá `NormalizedInbound` → `channel-inbound`; gửi qua hàng đợi tài khoản.
- FE (prototype L7184–7301): `GET /settings/widget` (tên, lời chào, chat AI, pre-chat, nút hành động, AI Agent, mã nhúng, KPI) + `webchat.update_widget`.

## TASK
1. **Schema:** `webchat_widget` (channel_account_id unique, public_key unique, name, greeting, theme, prechat_form, agent_id, allowed_domains, settings jsonb — chat AI / handoff / tone / mode / kiến thức / nghiệp vụ / nút hành động) + `webchat_visitor` (khách web: tên / SĐT / email / trang, lần cuối).
2. **Bật widget:** `webchat.update_widget` lần đầu (hoặc `enabled: true`) tạo `channel_account(webchat, connected)` + widget + `public_key` + `tenant_widget_route` / `tenant_channel_route`, kiểm hạn mức `max_channels` (như `start_login`); `enabled: false` = tạm dừng (widget "tạm ngoại tuyến").
3. **Socket `/widget`:** handshake `public_key` (+ `visitor_token`), kiểm Origin theo `allowed_domains`, tài khoản đang chạy; `visitor.hello` → cấp `visitor_token` + cấu hình + lịch sử; `message.send` → `NormalizedInbound` vào `channel-inbound` (chống trùng theo `client_id`), pre-chat bắt buộc khi bật; rate-limit.
4. **Gửi:** adapter webchat phát `message.new` tới phòng khách qua redis-emitter; worker ROLE=channels mở worker gửi cho tài khoản không giữ lease (`session != lease`).
5. **Đọc:** `GET /v1/settings/widget` khớp FE + KPI thật (lượt mở = khách web, hội thoại webchat, đang chạy / tổng).
6. **Widget JS** `apps/widget`: nút nổi + cửa sổ chat, pre-chat, lịch sử, gửi / nhận realtime, lưu `visitor_token` (localStorage), chữ vi / en.

## ACCEPTANCE CRITERIA
1. Migration 017: 2 bảng, unique `public_key`, unique `channel_account_id`, FK nội DB.
2. `GET /settings/widget` khi chưa bật: `enabled: false`, mặc định; `update_widget({ enabled: true })` → tài khoản webchat connected + route, `public_key`, mã nhúng có key; hạn mức gói 402 khi đã đủ kênh; sales 403; đổi tên / lời chào / pre-chat / nút / AI phản ánh ở GET.
3. Socket: key sai / Origin ngoài `allowed_domains` / tài khoản tạm dừng → `connect_error` (`NOT_FOUND` / `FORBIDDEN` / `CHANNEL_OFFLINE`); `visitor.hello` cấp token, kết nối lại bằng token giữ đúng khách.
4. `message.send` → khách + hội thoại webchat ở Hộp thư (nguồn `website`, tên / SĐT từ pre-chat); gửi trùng `client_id` một tin; pre-chat bật mà chưa khai → `PRECHAT_REQUIRED`; vượt rate-limit → `RATE_LIMITED`.
5. Trả lời ở Hộp thư (`message.send`) → khách nhận `message.new`, tin `sent`; kết nối lại → `visitor.hello` trả lịch sử cả hai chiều.
6. `channel.test` webchat đúng trạng thái; `pause` → khách mới bị từ chối, gửi ra 409; `disconnect` → widget ngoại tuyến.
7. Widget JS build một file ≤ 40 KB gzip; unit test giao diện (jsdom): pre-chat, gửi, nhận, i18n.
8. Mock FE parse cùng schema; contract `webchat.update_widget` mock + HTTP; E2E http (bật widget → mã nhúng → trang khách nhúng widget → khách nhắn → Hộp thư thấy → trả lời → khách thấy) xanh.
9. Cổng D59 xanh.

## CONSTRAINTS
- Widget không import gói backend (`depcheck`); chỉ `socket.io-client` + `@appchat/shared` (schema) nếu cần.
- Không đổi luồng Zalo; thay đổi `sessions.ts` chỉ thêm nhánh tài khoản không lease.
- `visitor_token` ký HMAC riêng (khoá dẫn xuất từ `JWT_SECRET`, `typ: visitor`) — không dùng thay access token.
