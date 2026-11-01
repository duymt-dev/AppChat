### COMPLETION REPORT — TIP-006

**STATUS:** DONE
**COMMIT:** `1d95c09` (code) · `202da08` (fix build + test cũ) trên nhánh `tip/006-realtime-notify` (xếp chồng trên `tip/005-authz`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Schema: `packages/db/prisma/platform/notify.prisma` (`notification_pref` — DC-028, DV-002) + `platform/migrations/20261030120000_006_notify`; `tenant/migrations/20261030120000_006_notify` (`event_consumption`, index `notification(user_id, created_at DESC, id DESC)` + partial `notification_user_unread_idx … WHERE read_at IS NULL` viết tay).
  - Shared: `packages/shared/src/notify/{catalog,index}.ts` (9 loại, kênh mặc định, `channelsFor`, `inQuietHours`), `i18n/server/{index,vi/notify,en/notify}.ts` (chữ thông báo / email theo locale, `interpolate`), `events.ts` (`notify.requested`, `member.role_changed`, `member.removed`), `api/notify.ts` (shape đọc FE ↔ BE).
  - Kernel: `packages/core/src/kernel/events/{consumer,dispatcher,events.runner}.ts`.
  - Notify: `packages/core/src/notify/{rules,mail,public}.ts`, `services/{prefs.service,notifications.service,notifier,recipients}.ts`, `realtime/{envelope,emitter,filter,conv-guard}.ts`, `events/{kernel.rules,notify.consumers}.ts`, `actions/notification-update-prefs.handler.ts`, `jobs/notify-mail.processor.ts`.
  - Integrations: `connectors/smtp/mail.ts` (`SmtpMailProvider`, nodemailer).
  - API: `apps/api/src/http/notify/{notify.controller.ts, realtime/{ws.gateway,ws.auth}.ts}`.
  - Test: `packages/shared/src/notify/catalog.test.ts` (5), `packages/core/test/notify-unit.test.ts` (8), `packages/integrations/test/smtp.test.ts` (2), `apps/api/test/integration/{notify.test.ts (6), realtime.test.ts (5), worker.harness.ts}`, `apps/web/src/shared/api/mock/notify-shape.test.ts` (2).
- Modified: `packages/db/prisma/tenant/kernel.prisma` (+ `event_consumption`, index notification), `packages/db/test/prisma-stubs.test.ts` (31 file), `packages/core/src/{index.ts (1 dòng facade), kernel/{index.ts, outbox/outbox.jobs.module.ts (EventsRunner, publisher attempts 8 + back-off)}, notify/{notify.module.ts, jobs/notify.jobs.module.ts}, identity/{identity.env.ts, identity.module.ts} (MAIL_PROVIDER=smtp)}`, `packages/integrations/src/index.ts`, `packages/shared/src/{index.ts, api/index.ts, i18n/index.ts}`, `apps/api/src/app.module.ts` (`NotifyHttpModule.register()`), `apps/web/src/shared/shell/useShellData.ts` (`unread: true`), `tools/contract/src/cases.ts` (+ `notification.update_prefs`), `apps/api/test/integration/{setup.ts (dọn notification_pref), authz.test.ts, actions.test.ts}`, `apps/{api,worker}/package.json`, `packages/{core,integrations}/package.json`, `pnpm-lock.yaml`, `.env.example` (SMTP_*), `coding-packs/{02-TASK-GRAPH.md (bản đồ sở hữu), plans/BLUEPRINT.md (§2.2, §2.3, §3.4), DECISIONS.md, DEVIATIONS.md}`.

**TEST RESULTS:**
- Acceptance criteria: 12/12 pass (Postgres 16 native + Memurai thật, socket.io-client thật)
  1. Migration 006 tenant + nền tảng áp lên template (db:setup) + DB tenant mới; `EXPLAIN` danh sách chưa đọc (`WHERE user_id = $1 AND read_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 21`) dùng `notification_user_unread_idx` — **pass**
  2. `GET /v1/notifications`: chỉ của mình; 25 dòng phân trang 10/10/5 theo cursor không trùng / sót; `unread=true` lọc; loại lạ → chuông info; `ago` vi "5 phút trước" / en "2 minutes ago"; cursor sai → 400; không token → 401; shape qua `notificationListSchema` — **pass**
  3. `GET /v1/settings/notifications` mặc định đủ 9 loại; `notification.update_prefs` lưu `notification_pref` theo user (thành viên khác vẫn mặc định); key lạ → 400 `VALIDATION_FAILED` `fields.events.hack`; contract case mock ↔ HTTP xanh — **pass**
  4. Event consumer: cùng event hai lần → consumer chạy một lần; consumer lỗi → `EventDispatchError`, lần sau chỉ chạy consumer lỗi; qua relay + queue `events` thật, job lỗi lần đầu được BullMQ thử lại — **pass**
  5. `notify.requested` (outbox → relay → events → notify): theo `permission: inbox.view` → Owner + Sales nhận, Kế toán không; Owner vi / Sales en nhận đúng ngôn ngữ; email chỉ tới người bật email (Owner tắt `msg_vip` → không thư), subject / link tuyệt đối / escape HTML đúng; chạy lại event → không nhân đôi — **pass**
  6. Toast: DND 14:00–16:00 lúc 15:00 giờ VN → `toast:false`; tắt DND → `toast:true`; loại có desktop tắt mặc định → `toast:false`; `sound` theo tuỳ chọn — **pass**
  7. WS: không token / token sai / hết hạn → `UNAUTHENTICATED`; workspace không phải thành viên / sai định dạng → `FORBIDDEN`; `notification.new` chỉ tới đúng user; `presence.list` + `presence` online / offline; `conv.join` → `NOT_IMPLEMENTED` khi chưa có guard (TIP-016), kế toán `FORBIDDEN`, ngoài guard `SCOPE_FORBIDDEN`; `typing` tới người khác trong phòng, không về người gửi, ngoài phòng `FORBIDDEN` — **pass**
  8. Lọc quyền: `require.permission inbox.view` → kế toán không nhận; `require.scope crm` bản ghi của sales A → A + Owner + Kế toán (`crm: all`) nhận, sales B không; `booking` kế toán `none` → không nhận; envelope workspace khác → không ai nhận — **pass**
  9. `member.role_changed` → `authz.changed` + socket lọc theo vai trò mới (kế toán → sales nhận sự kiện inbox); `member.removed` → socket bị ngắt (`io server disconnect`), kết nối lại `FORBIDDEN` — **pass**
  10. Emitter (`RedisRealtimeEmitter` trong tiến trình test riêng / worker) → socket của API nhận qua Redis adapter — **pass**
  11. `SmtpMailProvider` (nodemailer jsonTransport) dựng đúng from / to / subject / html / text / header tag; SMTP không tới được → `MailSendError` không lộ mật khẩu; `MAIL_PROVIDER=smtp` thiếu `SMTP_HOST` → boot lỗi — **pass**
  12. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (shared · core · db · integrations · api · worker · web · contract) 24/24 task — shared 53 · core 74 · db 17 · integrations 13 · api 5 · worker 6 · web 75 · contract 4; `pnpm depcheck` xanh; `lint:size` 1025 file; `lint:tokens` xanh; `i18n:check` 100%.
- **Cổng "chốt TIP":** `pnpm lint` 13/13 · `pnpm typecheck` 13/13 · `pnpm test` 13/13 task, 0 failed · `db test:integration` 7 passed · `api test:integration` **59 passed** (notify 6 · realtime 5 · authz 9 · auth 11 · workspaces 10 · actions 13 · relay-sequence 3 · contract 2) · `pnpm depcheck` xanh (99 known) · `pnpm i18n:check` 100% · `pnpm build` 3/3 · smoke bản build (Q-009): api `node dist/main.js` → health 200, `/v1/notifications` + `/v1/settings/notifications` không token 401, `/ws` token sai → `connect_error UNAUTHENTICATED`; worker `ROLE=jobs` khởi động sạch (NotifyJobsModule) · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (2.8m, lượt 2; lượt 1: 221 passed · 1 failed chập chờn `settings.spec.ts:124` — mask drawer chặn click; chạy riêng `settings.spec.ts` × 3 lần 30/30 xanh — Q-010). E2E http + parity: N/A — TIP không có màn UI (nối trang Thông báo ở TIP-013; client socket FE ở TIP-011).

**ISSUES DISCOVERED:**
- Smoke bản build lần đầu đỏ: bundle api để ngoài `nodemailer` (phụ thuộc bắc cầu của `@appchat/integrations`) nhưng app chưa khai → khai `nodemailer` + `@socket.io/redis-emitter` ở `apps/{api,worker}` (`202da08`). Cổng smoke Q-009 bắt đúng loại lỗi này lần thứ hai.
- `nodemailer@10.3.1` (mới nhất) chưa qua `minimumReleaseAge` của pnpm → dùng `10.2.1`, không nới chính sách.
- Hai test cũ gắn cứng trạng thái thay đổi theo TIP (version migration mới nhất ở authz AC1; `notification.update_prefs` làm ví dụ action chưa cài ở actions AC8) → đổi sang `readMigrations(...).at(-1)` và `wallet.update_alerts` (TIP-039).

**GIẢ ĐỊNH ĐÃ CHỌN:**
- DC-027 — `event_consumption(event_id, consumer)` ở `tenant/kernel.prisma`; ghi sau khi consumer xong, consumer tự idempotent ở đích.
- DC-028 — tuỳ chọn thông báo ở DB nền tảng `notification_pref` theo user (một bộ mọi workspace).
- DC-029 — kênh `mobile` chỉ lưu; DND chỉ tắt toast / âm thanh, thông báo in-app luôn ghi.
- DC-030 — digest: lưu tuỳ chọn; job gửi ở TIP-038.
- DC-031 — WS phát qua `serverSideEmit` + lọc quyền ở từng node API; registry luật `registerNotificationRule` / `registerRealtimeRule` cho TIP domain; client socket FE ở TIP-011.
- Chữ thông báo render theo locale người nhận **lúc ghi** (`notification.title`); `ago` theo locale người xem lúc đọc.
- Id thông báo tất định `sha256(event, luật, user, loại)` (dạng uuid v8) → consumer chạy lại không nhân đôi; email jobId = `mail-<id>` → không gửi trùng.

**DEVIATIONS FROM SPEC:** DV-002 (file schema `platform/notify.prisma` mới + bảng `event_consumption` trong kernel.prisma; thư viện socket.io / redis-adapter / redis-emitter / nodemailer — đều đã có tên trong Blueprint §4.6, §8).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-016 đăng ký `registerConversationGuard` (hội thoại trong scope inbox) + luật realtime `message.*` / `conversation.*` với `require.scope`.
- TIP-013 phát `member.role_changed` / `member.removed` trong action `member.set_role` / `member.remove`; nối trang Cài đặt › Thông báo sang http.
- TIP-011 nối client Socket.IO phía FE (`auth: { token, workspace_id }`) và chuyển `useEventInvalidation` sang socket khi `apiMode() === 'http'`.
