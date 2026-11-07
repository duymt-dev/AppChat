# TIP-018: Kênh Email — IMAP (imapflow) nhận + SMTP (nodemailer) gửi, gom thread, kết nối bằng form + kiểm tra đăng nhập thật

## HEADER
- TIP-ID: TIP-018
- Project: AppChat V2
- Module: `packages/channels/src/email/*` · `packages/core/src/channels/email/**` · `packages/shared/src/api/channels.ts` (form email)
- Depends on: TIP-014 (channel_account, route, worker channels, hàng đợi gửi), TIP-016 (inbound pipeline, outbox gửi), TIP-017 (kênh không lease — `StatelessChannels`) — nhánh xếp chồng từ `tip/017-web-widget`
- Priority: P1 · REQ: B06 (+ B09 / B10 form Email, F11 `contact.send_email`)
- Estimated effort: 10 giờ
- **Files touched:**
  - Channels: `email/{transport.ts (port MailboxTransport), imap-transport.ts (imapflow + mailparser + nodemailer), fake-transport.ts, normalize.ts (thread + text), adapter.ts}`, `registry.ts` (deps `mail`), manifest (form fields).
  - Actions: `channel.email.connect` (+ `fields` IMAP / SMTP, `db: 'platform'` hạn mức), `channel.test` form email (đăng nhập thật).
  - Core: `channels/email/{email.handlers.ts, credentials.ts}`, `channels/jobs/poller.ts` (poll 60 giây cho kênh `session: 'poll'`), `channels.env.ts` (`MAIL_TRANSPORT=imap|fake`), `crm` `contact.send_email` thật (tạo / dùng hội thoại email → outbox gửi).
  - Shared: `api/channels.ts` (`EMAIL_FIELDS`), i18n server.
  - FE: wizard Email đủ trường (máy chủ IMAP / cổng / email / mật khẩu ứng dụng + SMTP tuỳ chọn), `channel.test` gửi đủ trường.
  - Test: `packages/channels/test/email-*.test.ts`, `apps/api/test/integration/email.test.ts`, contract, E2E http (`channels.spec.ts` thêm luồng Email giả).

## CONTEXT
- Blueprint §6 "Email: kết nối IMAP (imapflow, poll 60 giây, IDLE nếu được) và SMTP (nodemailer). Gom thread theo Message-ID / In-Reply-To / References. Kiểm tra credential bằng cách login thật trước khi lưu." · §3.4 `channel.email.connect`, `channel.test` (form trước khi lưu) · §2.2 `channel_account.credentials_enc` (AES-256-GCM).
- Prototype L11254: form Email = Máy chủ IMAP · Cổng (993) · Email · Mật khẩu ứng dụng; L8678 tài khoản hiển thị "IMAP · imap.gmail.com".
- `standards/channels/omnichannel-adapter.md`: adapter sau port, core không import SDK; tin vào `NormalizedInbound`.

## TASK
1. **Port `MailboxTransport`** (verify / fetchSince(uid) / send) — bản thật imapflow + mailparser + nodemailer, bản giả (test / E2E, cấm production).
2. **Gom thread:** thread id = Message-ID gốc của chuỗi (References[0] → In-Reply-To → chính nó); tin tiếp theo của chuỗi đã biết đi vào đúng hội thoại; `external_msg_id` = Message-ID. Nội dung = text (html → text khi không có text), bỏ phần trích dẫn cũ; tiêu đề lưu ở `raw`.
3. **Kết nối:** `channel.test` form (`type: 'email'`, fields) đăng nhập IMAP + SMTP thật; `channel.email.connect` nhận `fields`, kiểm lại đăng nhập, mã hoá credential, tạo tài khoản `connected` + route, hạn mức `max_channels`.
4. **Nhận:** worker ROLE=channels poll mỗi tài khoản email `connected` mỗi 60 giây (lock Redis theo tài khoản — một worker poll), mốc UID trong `settings` (`imap_uid_next`, `imap_uid_validity`); lần đầu lấy `history_days`; lỗi đăng nhập → `expired` + thông báo.
5. **Gửi:** adapter gửi SMTP với `In-Reply-To` / `References` của tin cuối cùng phía khách, tiêu đề "Re: …"; `contact.send_email` thật (hội thoại email theo tài khoản `from` + địa chỉ khách).
6. **FE:** wizard Email đủ trường như prototype + SMTP (mặc định suy từ IMAP), kiểm tra gửi đủ trường.

## ACCEPTANCE CRITERIA
1. Unit: gom thread (References / In-Reply-To / mới), html → text + bỏ trích dẫn, suy SMTP từ IMAP; adapter + transport giả (verify / fetch / send giữ header thread).
2. `channel.test` form: đúng → ok; sai mật khẩu → `ok: false` + lý do; `channel.email.connect` đúng → tài khoản email `connected` + route + credential mã hoá (không lộ ở API / action_log); sai → 422; trùng địa chỉ đang dùng → 409; hạn mức 402; sales 403.
3. Thư vào (giả) → khách (email, nguồn `email`) + hội thoại email + tin; thư trả lời cùng chuỗi → cùng hội thoại; thư trùng Message-ID không thêm; mốc UID tăng, poll lại không lấy lại.
4. Trả lời ở Hộp thư → SMTP gửi với `In-Reply-To` / `References` + "Re: tiêu đề" → tin `sent`; `contact.send_email` → hội thoại email mới + thư gửi tới khách.
5. Đăng nhập IMAP hỏng khi poll → `expired` + thông báo `channel_down`; `pause` → ngừng poll; `disconnect` → ngừng.
6. FE: wizard Email (mock + http) đủ trường, kiểm tra → bước 3; E2E http: kết nối Email giả → thư vào → Hộp thư → trả lời → thư gửi đi.
7. Cổng D59 xanh.

## CONSTRAINTS
- Core không import imapflow / mailparser / nodemailer (chỉ `packages/channels/src/email/imap-transport.ts`).
- Gmail OAuth (REQ-B06 "hoặc") ngoài phạm vi — nhánh OAuth hiện "Sắp có" (D04).
- Mật khẩu chỉ ở `credentials_enc`; action_log input đã redact khoá `password`.
