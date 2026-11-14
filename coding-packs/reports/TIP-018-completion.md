### COMPLETION REPORT — TIP-018

**STATUS:** DONE
**COMMIT:** `8bbb7a4` (code) + `1b6b3ea` (api / worker khai báo thư viện mail) trên nhánh `tip/018-email-channel` (xếp chồng trên `tip/017-web-widget`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Channels: `email/{transport.ts (port MailboxTransport + MailAuthError / MailConnectError), imap-transport.ts (imapflow + mailparser + nodemailer — chỗ duy nhất import thư viện mail), fake-transport.ts, normalize.ts (thread + text), adapter.ts (EmailAdapter: start / stop / poll / send / probe / verify)}`.
  - Schema: `tenant/channels-email.prisma` (`email_thread`) + migration `20261031400000_018_email` (+ FK nội DB).
  - Core: `channels/email/{credentials.ts, email.handlers.ts (channel.email.connect), threads.ts}`, `channels/jobs/poller.ts` (ChannelPollers), `channels/tokens.ts` (CHANNEL_REGISTRY / WIDGET_URLS tách khỏi module — tránh vòng import), `inbox/actions/email-send.handlers.ts` (contact.send_email thật).
  - FE: `features/settings/components/EmailConnectStep.tsx`.
  - Test: `packages/channels/test/email-adapter.test.ts` (6), `apps/api/test/integration/email.test.ts` (8), `apps/web/e2e/http/email.spec.ts`.
  - TIP: `coding-packs/tips/TIP-018-email-channel.md`.
- Modified: `packages/channels/src/{types.ts (OutboundMessage.externalThreadTo / meta, ChannelAdapter.poll), registry.ts (deps.mail), index.ts, email/manifest.ts}`, `package.json` (imapflow 2.9.1, mailparser 3.12.4, nodemailer 10.2.1); `packages/actions/src/{settings-apps.ts (channel.email.connect + fields, db platform), crm.ts (contact.send_email output + conversation_id)}`; `packages/shared/src/{api/channels.ts (EMAIL_FIELDS, emailFormSchema, smtpOf), i18n/server/*/channels.ts}`; `packages/core/src/channels/{channels.module.ts, channels.env.ts (MAIL_TRANSPORT, MAIL_FAKE_GREETING), public.ts, actions/channel-manage.handlers.ts (channel.test form Email đăng nhập thật), jobs/{channels.jobs.module.ts, sessions.ts (chỉ kênh lease), stateless.ts (chỉ kênh webhook)}}`, `inbox/{inbox.module.ts, services/outbound.ts (header email), actions/message.handlers.ts}`, `crm/{crm.module.ts, actions/contact-io.handlers.ts}` (bỏ stub 409); `apps/{api,worker}/package.json`; FE `ConnectChannelModal.tsx`, mock `settings-apps.ts`, i18n `settings.json` (vi / en), `e2e/settings.spec.ts`; `tools/contract/src/cases.ts`, `tools/scripts/e2e-http.mjs`; test `setup.ts` (MAIL_TRANSPORT=fake), `channels.test.ts`, `crm-settings.test.ts`, `prisma-stubs.test.ts`; `coding-packs/{02-TASK-GRAPH.md (bản đồ sở hữu), DECISIONS.md, QUESTIONS.md}`.

**TEST RESULTS:**
- Acceptance criteria: 7/7 pass
  1. Unit (channels 6 ca): thread References[0] → In-Reply-To → chính thư; html → text, bỏ trích dẫn (tiếng Anh / tiếng Việt / dòng ">"); thư mới mang tiêu đề, người gửi chữ thường, thư của chính hộp thư bỏ qua; adapter + transport giả: verify sai mật khẩu / máy chủ, poll lần đầu theo ngày → theo UID → UIDVALIDITY đổi theo ngày lại, gửi "Re:" + In-Reply-To / References, Message-ID đặt trước, sai đăng nhập → ChannelAuthError — **pass**
  2. `channel.test` form: đúng ok; sai mật khẩu / sai máy chủ `ok: false` + lý do; form thiếu 422; sales 403. `channel.email.connect`: sai 422 `{fields: imap_auth}` (không tạo); đúng → `connected` + route + credential mã hoá (không có mật khẩu trong DB thô / action_log); trùng địa chỉ 409; sales 403; hạn mức dùng chung khoá workspace (402 đã kiểm ở channels / webchat) — **pass**
  3. Thư giả → khách (tên, email, nguồn `email`) + hội thoại + tin; thư trả lời cùng chuỗi → cùng hội thoại, bỏ trích dẫn; mốc UID = 3, poll lại 0 thư; bỏ mốc → lấy lại 2 thư nhưng không thêm tin (unique Message-ID) — **pass**
  4. `message.send` ở hội thoại email → SMTP giả nhận `to` khách, "Re: Hỏi lịch HIFU", In-Reply-To = thư khách mới nhất, References chứa thư gốc → tin `sent`, `external_msg_id` = Message-ID gửi đi; `contact.send_email` → hội thoại email mới, thư mở chuỗi Message-ID = thread id, khách trả lời → về đúng hội thoại; tài khoản `from` lạ 409 — **pass**
  5. Tạm dừng → ngừng poll, tiếp tục → poll lại; credential hết hiệu lực → `expired` + thông báo `channel_down`, ngừng poll; ngắt → không mở lại — **pass**
  6. FE wizard Email đủ trường (Máy chủ IMAP · Cổng · Email · Mật khẩu ứng dụng + SMTP tuỳ chọn), kiểm tra gửi đủ trường, sai → lý do + khoá Tiếp tục; E2E mock `settings` 12 passed; E2E http `email.spec.ts`: kiểm tra sai → đúng → kết nối → worker poll → thư vào Hộp thư → trả lời → giữ sau tải lại — **pass**
  7. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (9 package đổi) xanh; `pnpm depcheck` xanh (1214 module); `lint:size` 1237 file; `i18n:check` 100% (4493 key); `lint:tokens` xanh.
- **Cổng "chốt TIP":** `pnpm turbo run build lint typecheck test` **46/46** task · `api test:integration` **170 passed** (19 file) · `db test:integration` 7 passed · contract mock + HTTP 18/18 · smoke worker `ROLE=channels` bản build (`MAIL_TRANSPORT=imap` thật) — 0 log error · **E2E http 14 passed · 8 skipped** (toàn bộ) · full E2E hồi quy mock **222 passed · 0 failed · 196 skipped** · parity `settings:channels` **4.19%**.

**INDEX / EXPLAIN:** `email_thread` tra theo PK `(channel_account_id, external_thread_id)` (một dòng / lượt gửi); hội thoại email theo unique `(channel_account_id, external_thread_id)`; tài khoản email theo `channel_account` (ít dòng / workspace); chống trùng thư bằng unique `message (channel_account_id, external_msg_id)`. Không có danh sách LIMIT mới.

**ISSUES DISCOVERED:**
- Bundle tsup của api / worker để gói ngoài external → bản build cần `imapflow` / `mailparser` khai ở `apps/{api,worker}/package.json` (như `zca-js`) — sửa ở `1b6b3ea`.
- Smoke bản build trên DB dev: cảnh báo `channel poll failed` (ENOTFOUND `imap.fake.test`) của các tài khoản email do test để lại khi worker chạy `MAIL_TRANSPORT=imap` thật — dữ liệu test, không phải lỗi; mức `warn`, không lặp quá một lần / phút / tài khoản (khoá poll).
- Parity `inbox:connect-channel` 6.20% — đã đỏ từ P0 ver2.1 (ghi ở `00-PROJECT-CONTEXT.md` L732, "lệch thật do tính năng đổi": 12 kênh theo registry, nhãn "Sẵn sàng / Sắp có"); TIP-018 không đổi modal này.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-091 … DC-095. **Câu hỏi mới:** Q-016 (Gmail / Outlook OAuth).

**DEVIATIONS FROM SPEC:** không có (thêm hai ô SMTP tuỳ chọn ngoài prototype — DC-095; để trống thì giống prototype).

**Chưa nghiệm thu với provider thật:** IMAP / SMTP thật (Gmail mật khẩu ứng dụng, Zoho, máy chủ riêng) — chưa có hộp thư thử của Chủ nhà; luồng chạy qua transport giả cùng adapter, bản thật chỉ khác ở `imap-transport.ts`.

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-044 (hạ tầng): worker `ROLE=channels` cần ra cổng 993 / 465 / 587; không đặt `MAIL_TRANSPORT` (mặc định `imap`).
- TIP-022 (AI copilot): nội dung thư đã bỏ trích dẫn — agent đọc `message.body`; tiêu đề ở `email_thread.subject`.
- Q-016: khi có app OAuth Google / Microsoft → thêm `connect.kind: 'oauth'` cho email, transport dùng XOAUTH2.

## Supplemental marketing plan (2026-11-02)

See [TIP-037](../tips/TIP-037-marketing.md) and [marketing audit](marketing-planning-audit-2026-11-02.md): campaign dispatch must share account throttling/caps, persist delivery attempts beyond Redis retention, and distinguish unknown provider outcomes from definite failures. D35c default quota and cap override UI remain pending; this plan does not certify real-provider delivery.

## Bổ sung — TIP-018b (2026-11-02)

Nghĩa vụ chưa đạt của TIP này chuyển sang [TIP-018b](../tips/TIP-018b-email-oauth.md): REQ-B06b. File TIP gốc không sửa (DC-233).
