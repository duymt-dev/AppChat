# TIP-006: Realtime + thông báo

## HEADER
- TIP-ID: TIP-006
- Project: AppChat V2
- Module: `packages/core/src/notify` · `packages/core/src/kernel/events` · `apps/api/src/http/notify` (+ Socket.IO `/ws`) · `packages/shared/src/{notify,events.ts,i18n/server,api/notify.ts}` · `packages/integrations/src/connectors/smtp`
- Depends on: TIP-003 (outbox, executor), TIP-005 (AuthzResolver, scope) — nhánh xếp chồng từ `tip/005-authz`
- Priority: P0 · REQ: N04 (realtime Socket.IO, room workspace / hội thoại, presence, typing), M02 (thông báo in-app + email)
- Estimated effort: 8 giờ
- **Files touched:**
  - Schema: `packages/db/prisma/tenant/kernel.prisma` (+ `event_consumption`, index `notification` — DC-027) + migration `tenant/migrations/<ts>_006_notify`; `packages/db/prisma/platform/notify.prisma` (mới: `notification_pref`) + migration `platform/migrations/<ts>_006_notify`.
  - Shared: `packages/shared/src/notify/catalog.ts` (9 loại thông báo = 9 dòng tuỳ chọn của Cài đặt › Thông báo: nhóm, icon, tone, kênh mặc định), `packages/shared/src/i18n/server/{vi,en}/notify.ts` + `server/index.ts` (chữ thông báo / email theo locale người nhận — i18n §8), `packages/shared/src/events.ts` (zod payload event dùng trong TIP), `packages/shared/src/api/notify.ts` (shape đọc FE ↔ BE).
  - Kernel: `packages/core/src/kernel/events/{consumer.ts, dispatcher.ts, events.runner.ts}` (consumer queue `events`, khoá `(event_id, consumer)`), `outbox/outbox.jobs.module.ts` (gắn runner), `outbox/outbox.jobs.module.ts` publisher `attempts`.
  - Notify: `packages/core/src/notify/{notify.module.ts, public.ts, rules.ts, services/{notifications,prefs,notifier,recipients}.service.ts, realtime/{envelope,emitter,filter}.ts, events/{notify,realtime}.consumer.ts, actions/notification-update-prefs.handler.ts, jobs/{notify-mail.processor.ts, notify.jobs.module.ts}, mail.ts}`.
  - Integrations: `connectors/smtp/mail.ts` (SmtpMailProvider, nodemailer — DC-018) + `identity.env.ts` / `identity.module.ts` (`MAIL_PROVIDER=smtp`).
  - API: `apps/api/src/http/notify/{notify.controller.ts, notify.http.module.ts, realtime/{ws.gateway.ts, ws.auth.ts}}`, `app.module.ts` (1 dòng `register()`).
  - FE: `apps/web/src/shared/shell/useShellData.ts` (`useNotifications` gửi `unread: true` — khớp hành vi mock "đọc hết → danh sách rỗng").
  - Test: `packages/shared/src/notify/catalog.test.ts`, `packages/core/test/notify-unit.test.ts`, `packages/integrations/test/smtp.test.ts`, `apps/api/test/integration/{notify,realtime}.test.ts`, `apps/web/src/shared/api/mock/notify-shape.test.ts`, `tools/contract/src/cases.ts` (+ `notification.update_prefs`).
- **Parallel-safe with:** sequential (013, 016, 025 dùng realtime + notify)

## CONTEXT
- Blueprint §4.6 (namespace `/ws`: auth JWT + workspace, room `ws:{id}` / `user:{id}` / `conv:{id}`, client → server `conv.join` / `conv.leave` / `typing`, Redis adapter, worker phát qua `@socket.io/redis-emitter`), §2.3 (consumer `notify`, `member.role_changed` → WS `authz.changed`), §2.2 kernel `notification`, §4.4 misc `GET /v1/notifications?unread=`, §8 (Brevo; SMTP nodemailer dự phòng).
- Standard `events/outbox.md` §4 (consumer idempotent theo `(event_id, consumer)`), §8 (WS là consumer, lọc quyền người nhận trước khi emit); `i18n/i18n.md` §8 (server render theo locale người nhận); `authz/rbac-permissions.md` (scope).
- FE mock: `GET /notifications` → `{ data: [{ id, icon, tone, title, ago }], next_cursor }`; `GET /settings/notifications` → `{ groups[{ key, events[{ key, desktop, email, mobile }] }], dnd, sound, digest }`; action `notification.update_prefs` (`db: 'platform'`, permission `self`).

## TASK
1. **Schema.** [T] `event_consumption(event_id uuid, consumer text, created_at)` PK `(event_id, consumer)`; `notification` index `(user_id, created_at DESC, id DESC)` + partial `WHERE read_at IS NULL` (danh sách chưa đọc). [P] `notification_pref(user_id PK, events jsonb, dnd jsonb, sound bool, digest text, updated_at)`.
2. **Event consumer (kernel).** `@EventConsumer(name, topics)` + Worker BullMQ queue `events` (ROLE=jobs): mỗi job chạy mọi consumer khớp topic; consumer đã ghi `event_consumption` → bỏ qua; lỗi → job retry (publisher `attempts 8`, back-off mũ), consumer đã xong không chạy lại.
3. **Notify.**
   - Danh mục 9 loại (`msg_assigned`, `msg_mention`, `msg_vip`, `sla_warn`, `ai_review`, `ai_escalate`, `ai_budget`, `channel_down`, `billing_invoice`) dùng chung FE (tuỳ chọn) và BE (icon / tone / kênh mặc định).
   - Registry luật `registerNotificationRule(topic, build)` — TIP domain đăng ký event → ý định thông báo `{ kind, to: { users?, permission? }, params, link? }`. TIP-006 cài luật `notify.requested` (handler bất kỳ phát event này để xin gửi thông báo).
   - Consumer `notify`: chọn người nhận (membership active ∩ permission), render chữ theo `user.locale`, ghi `notification` (id tất định theo `(event, user, kind)` → chạy lại không nhân đôi), sau commit: WS `notification.new` vào `user:{id}` (`toast` = tuỳ chọn desktop và ngoài giờ không làm phiền theo múi giờ workspace; `sound`), email khi tuỳ chọn `email` bật → queue `notify-mail` (jobId = id thông báo).
   - Đọc: `GET /v1/notifications?unread=&cursor=&limit=` (chỉ của mình, cursor `(created_at, id)`, `ago` theo locale); `GET /v1/settings/notifications`; action `notification.update_prefs` (DB nền tảng, key sự kiện lạ → `VALIDATION_FAILED`).
4. **Realtime `/ws` (api).** Socket.IO gắn vào HTTP server + Redis adapter. Handshake `auth: { token, workspace_id }` → JWT + membership + AuthzContext; join `ws:{id}`, `user:{id}`. Client → server (ack): `conv.join` / `conv.leave` (cần `inbox.view` + guard hội thoại do TIP-016 đăng ký; chưa có guard → `NOT_IMPLEMENTED`), `typing` (phát cho phòng `conv:` trừ người gửi), `presence.list` (thành viên đang online — `fetchSockets` qua adapter). Server phát `presence` khi user online / offline.
5. **Phát có lọc quyền.** Worker gửi `RealtimeEnvelope { ws, rooms, event, data, require?: { permission?, scope? } }` qua redis-emitter `serverSideEmit` → mỗi node API lọc từng socket trong phòng theo AuthzContext của socket (`can` + `inScope`) rồi mới emit. Luật realtime `registerRealtimeRule(topic, build)`; TIP-006 cài `member.role_changed` → làm mới AuthzContext của socket + `authz.changed`, `member.removed` → ngắt socket của người đó.
6. **SMTP.** `SmtpMailProvider` (nodemailer) + `MAIL_PROVIDER=smtp` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`).

## SPECIFICATIONS
### Business Rules
- Thông báo in-app luôn được ghi ("tin vẫn được ghi nhận"); `desktop` + giờ không làm phiền chỉ quyết định toast / âm thanh; `email` quyết định gửi thư; `mobile` lưu tuỳ chọn (chưa có app mobile / web push — DC-029).
- Email tóm tắt (`digest`) lưu tuỳ chọn; job gửi thuộc TIP-038 (nội dung = Việc cần tôi / AI hôm nay) — DC-030.
- Người nhận chỉ là thành viên `active` của workspace; luật theo permission lọc qua AuthzContext (Owner luôn nhận).
- Không emit WS trực tiếp từ handler nghiệp vụ (outbox §1): handler phát event → consumer → WS.

### Validation & Error Handling
- Socket không token / token sai / không phải thành viên → `connect_error` (`UNAUTHENTICATED` / `FORBIDDEN`).
- Ack lỗi theo envelope `{ error: { code } }`.

## ACCEPTANCE CRITERIA
1. Migration 006 (tenant + nền tảng) áp lên template + DB tenant có sẵn; `EXPLAIN` danh sách chưa đọc dùng index partial.
2. `GET /v1/notifications`: chỉ thông báo của mình; `unread=true` lọc chưa đọc; cursor phân trang không trùng / sót; `title` + `ago` theo locale người nhận; shape khớp `packages/shared/src/api/notify.ts` (cùng zod kiểm route mock).
3. Tuỳ chọn: `GET /v1/settings/notifications` trả mặc định theo danh mục; `notification.update_prefs` lưu ở DB nền tảng (theo user, không lẫn người khác); key lạ → 400 `VALIDATION_FAILED`; contract case mock ↔ HTTP xanh.
4. Event consumer: job `events` chạy consumer theo topic; cùng event chạy hai lần → consumer xử lý một lần (`event_consumption`); consumer lỗi → retry, consumer đã xong không chạy lại.
5. Notify end-to-end (outbox → relay → events → notify): `notify.requested` gửi theo `users` và theo `permission` (Kế toán không nhận luật `inbox.view`); người vi nhận chữ tiếng Việt, người en nhận tiếng Anh; chạy lại event không nhân đôi; email chỉ gửi khi tuỳ chọn email bật, link tuyệt đối theo `APP_PUBLIC_URL`.
6. Không làm phiền theo múi giờ workspace → `toast=false`; `sound` theo tuỳ chọn.
7. WS: không token / token hết hạn / không phải thành viên → từ chối; vào được `ws:` + `user:`; `notification.new` chỉ tới đúng user; `presence.list` + sự kiện `presence`; `conv.join` cần `inbox.view` + guard; `typing` tới người khác trong phòng, không về người gửi.
8. Lọc quyền: envelope `require.permission` / `require.scope` chỉ tới socket đủ quyền (Kế toán không nhận sự kiện inbox; sales chỉ nhận bản ghi của mình ở scope `own`).
9. `member.role_changed` → socket nhận `authz.changed` và lọc theo vai trò mới; `member.removed` → socket bị ngắt.
10. Fan-out liên tiến trình: emitter trong context worker riêng → socket của API nhận (Redis adapter).
11. SMTP adapter gửi đúng from / to / subject / html / text (transport JSON của nodemailer); `MAIL_PROVIDER=smtp` thiếu `SMTP_HOST` → boot lỗi rõ.
12. Cổng D59 xanh (+ smoke bản build — Q-009).

## CONSTRAINTS
- Không thêm `@nestjs/websockets` (dùng `socket.io` trực tiếp — Blueprint đã chọn Socket.IO + Redis adapter + emitter).
- Không đổi schema action. FE chỉ đổi tham số `unread` của `useNotifications`; client socket phía FE nối ở TIP có access token phía FE (TIP-011) — DC-031.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 12 AC có test thật (Postgres + Memurai)
- [ ] Cổng D59 trước commit + chốt TIP
- [ ] Commit + SHA + report + ba sổ + tiến độ
