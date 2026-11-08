# TIP-012c — Completion Report (Tenant Brevo / SMTP và Email Marketing)

> Nhánh theo pha, mỗi pha một PR vào `dev` (xếp chồng). Pha: P1 port + adapter + an toàn SMTP · P2 người gửi chiến dịch + biên nhận · P3 gửi / thử lại / kết quả · P4 callback + ngắt kết nối · P5 Cài đặt Email Marketing + chọn người gửi · P6 ai:live + chốt TIP.

## Pha 1 — port mail của DN, adapter Brevo / SMTP, an toàn đích SMTP (§1; AC1, AC2) — DC-408, DV-082

**Rà trước khi làm (code thật)**
- `registry.ts`: brevo / smtp chỉ có manifest, không adapter; `ports/mail.ts` là thư hệ thống nền tảng (env), không ConnectionCtx, không accepted / unknown.
- `brevo/mail.ts` trả `messageId ?? ''` (mã rỗng = thành công); `smtp/mail.ts` STARTTLS cơ hội, không ghim DNS, nhận cổng bất kỳ.
- safeFetch chỉ GET; `provider-http.ts` chỉ GET cho bank. Chưa có `network/smtp-target.ts`, chưa có hợp đồng Brevo.
- Ba đường mail tách: thư hệ thống (identity / notify / insights / contracts qua MailProvider env), kênh Email Hộp thư (packages/channels/email + channel_account), mail DN (mới — kết nối tenant).

**Hợp đồng provider (Rà trước khi làm 1)** — chép từ tài liệu công khai Brevo (nguồn trong JSON), không bịa chữ ký: Brevo webhook không có HMAC; dùng bearer token riêng. Chưa có tài khoản Brevo / máy chủ SMTP của DN → **chưa nghiệm thu với provider thật** (Q-004).

**FILES CHANGED** (lệch manifest ở DV-082)
- integrations: `ports/tenant-mail.ts`, `tenant-mail-validation.ts`, `network/smtp-target.ts`, `connectors/brevo/{tenant-client,tenant-adapter,callback}.ts`, `connectors/smtp/{tenant-adapter,tenant-transport}.ts` (mới); `connectors/{brevo,smtp}/manifest.ts`, `registry.ts`, `index.ts`.
- core: `integrations/mail/module.ts` (mới), `integrations/services/form-schema.ts`, `kernel/http/safe-fetch.ts`.
- web: mock `integration-probe.ts`, i18n settings vi / en; fixture `prototype-parity/settings.json`.
- test: integrations `tenant-mail.test.ts`, `tenant-smtp-security.test.ts`, fixtures brevo / smtp; core `tenant-mail.test.ts`; api `integrations.test.ts` (trường thẻ smtp); `bank-live-selection.test.ts` (brevo có adapter live).

**Giả định đã chọn (gap-filling)**
- Brevo `active` = người gửi đã kích hoạt sau xác minh → sender_verified; người gửi không có trong tài khoản → unverified.
- SMTP thẻ cũ (host / username / password) vẫn hợp lệ: cổng mặc định 587, người gửi = tài khoản đăng nhập.
- 5xx của API Brevo sau khi gửi → unknown (có thể đã nhận), không thử lại tự động.

**TEST (cổng khi làm — D59)**
- integrations unit **81/81** (adapter theo hợp đồng, ma trận an toàn SMTP 14 ca); core `tenant-mail` + `safe-fetch` **14/14**.
- api integration (integrations / detail / integration.test / connect / form_schema / email / campaign.send_test) **38/39** — đỏ duy nhất `integration.form_schema` happy (đỏ sẵn trên HEAD sạch — Q-063).
- i18n 100% (6620). turbo lint / typecheck / test `...[origin/dev]` **36/36** (sửa kỳ vọng `integration-runtime`: Brevo nay có webhook + thăm dò); lint:size OK; E2E mock settings + integrations **12/12**.

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `integrations/provider-ports.md` | port riêng `tenant-mail` mở rộng ConnectorAdapter; adapter theo chế độ live, không lùi mock; lỗi ProviderError đã làm sạch |
| `ops/observability-security.md` | khoá chỉ trong ConnectionCtx; lỗi không mang thông điệp / khoá provider (test canary); SMTP không auth trước TLS |
| `kernel` safeFetch (045b) | tái dùng safeFetch (ghim IP / DNS / trần / timeout), POST chỉ khi không redirect — không HTTP an toàn thứ hai |
| `domain/validation-defaults.md` | chặn CRLF / ký tự điều khiển, địa chỉ / cổng / tiêu đề ≤ 200 / MIME ≤ 1 MiB |
| `code/testing.md` | test riêng, transport / resolver giả, không mạng thật |
