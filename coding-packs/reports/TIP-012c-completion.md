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

## Pha 2 — người gửi chiến dịch chọn tường minh, chốt cùng bản duyệt, schema biên nhận (§2.1–§2.3, §6; AC3) — DC-409, DV-083

**Rà trước khi làm (code thật)**
- `campaigns.repo.ts senderAccount` vắng id → tài khoản kênh kết nối đầu tiên; `IntegrationResolver.get(ws, port)` = kết nối mới nhất (không được dùng để gửi).
- `contentHash` (campaign-policy) chưa có người gửi mail; approve chỉ kiểm channel_account; dispatch / send_test chỉ đi `ChannelSendQueue`.
- Thăm dò bền (`connection.probe`) chỉ có nhánh ngân hàng; chưa nơi nào lưu người gửi của kết nối mail.

**FILES CHANGED** (lệch manifest ở DV-083)
- db: `tenant-mail.prisma` (mới: TenantMailDelivery / TenantMailEvent / TenantMailCallbackBinding), `marketing.prisma` (Campaign sender_*), `integrations.prisma` (mail_senders), migration `20261108130000_tenant_mail` + `20261108140000_tenant_mail_senders`, `test/prisma-stubs.test.ts`.
- shared: `api/tenant-mail.ts` (mới: MailSenderDto, CampaignSender, campaignSenderInputSchema), `api/marketing.ts` (DTO `sender`), `api/index.ts`.
- actions: `tenant-mail.ts` (mới: campaign.mail_senders), `marketing.ts` (`sender` ở create / update), `index.ts`.
- core: `marketing/services/mail-sender.ts` (mới), `marketing/actions/mail-senders.handler.ts` (mới), `campaign-write` / `campaign-approval` / `campaign-system` / `campaign-extras` handlers, `campaign-policy.ts`, `campaign-read.service.ts`, `recipient-snapshot.ts`, `marketing.providers.ts`; `integrations/operations/probe.ts` (nhánh mail), `call-runner.ts` (`mail` transports), `jobs/integrations.jobs.module.ts`.
- api: `http/marketing/marketing.controller.ts` (GET /campaigns/mail-senders); web: mock marketing / marketing-extras, i18n actions vi / en.
- test: api `tenant-mail.test.ts` (mới); core `tenant-mail.test.ts` (+ thăm dò bền).

**Giả định đã chọn (gap-filling)**
- `sender_rev` = `credential_rev` của kết nối (tăng mỗi lần kết nối lại / ngắt) — đủ làm phiên bản cấu hình + khoá; sửa người gửi đi qua kết nối lại nên cũng tăng rev.
- Người gửi SMTP chỉ dùng được khi tích hợp viên xác nhận (`sender_confirmed`) — mặc định chưa xác nhận → `sender_unconfirmed`.
- Brevo chỉ báo `events` khi kết nối có token webhook (không có token thì không hứa sự kiện giao thư).
- Bản chờ duyệt kênh trước migration giữ công thức băm cũ (phần người gửi chỉ thêm khi tenant_mail) — không làm hỏng bản duyệt đang chờ.

**TEST (cổng khi làm — D59)**
- api integration `tenant-mail.test.ts` **7/7** (quyền campaign.manage không cần integrations.manage + canary khoá / host, probe_pending, 422 người gửi lạ / SMTP chưa xác nhận / Brevo chưa kích hoạt / Zalo, chọn → gửi duyệt → duyệt + DTO, kết nối lại giữa hai bước → 409 → từ chối → chọn lại → duyệt, ngắt → 409 `disconnected` không lùi sang SMTP, email kênh cũ giữ channel_account, dispatch giữ `mail_dispatch_unavailable`).
- hồi quy marketing + integrations (marketing / contract / concurrency / analytics / integrations / integration-detail) **55/55** cùng lượt.
- core `tenant-mail` **7/7**; prisma stubs 3/3. turbo lint / typecheck / test (CI) **36/36**; E2E mock marketing **9/9** (9 bỏ qua theo dự án như trước); depcheck sạch; i18n 100% (6621); lint:size sạch. Chưa nghiệm thu với provider thật (Q-004).

**ĐỐI CHIẾU STANDARDS (P2)**

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | campaign.mail_senders read, campaign.manage, agentGrantable false; ghi qua campaign.create / update (không đường ghi thứ hai) |
| `authz/rbac-permissions.md` | người tạo chiến dịch không cần integrations.manage; chỉ campaign.view → 403 (HTTP + action) |
| `database/tenant-db.md` | bảng tenant không workspace_id; migration mới không sửa migration đã áp |
| `database/indexing.md` | delivery unique(dispatch_ref), message partial INCLUDE, list (campaign_id, state, created_at DESC, id DESC) INCLUDE, recovery partial; event unique + unresolved partial; binding expiry INCLUDE / purge partial |
| `domain/state-machine.md` + `concurrency.md` | bản duyệt chốt người gửi (băm), kiểm lại ở gửi duyệt / duyệt dưới khoá dòng chiến dịch; 409 khi lệch |
| `ops/observability-security.md` | DTO / bằng chứng không khoá / host / cấu hình (test canary) |
| `api/response-envelope.md` | `{ data }` cho GET; lỗi `{ error: { code, message, fields } }` với thông điệp đọc được cho Trợ lý |

## Pha 3 — gửi qua biên nhận gọi integrations, kết quả trung thực, thử lại có giới hạn, gửi thử (§2.4–§2.5, §3.1–§3.4; AC4) — DC-410, DV-084

**Rà trước khi làm (code thật)**
- campaign.dispatch chỉ đẩy `ChannelSendQueue` (ROLE=channels); campaign-results ghi kết quả qua campaign.record_delivery; scheduler đẩy lại người nhận treo qua hàng gửi kênh.
- Runner biên nhận gọi (`executeCall`) đã huỷ khi khoá đổi + mutation lỗi → unknown; quét 60 giây khôi phục biên nhận đến hạn.
- `reserveRecipient` (kiểm lại chiến dịch đang chạy / khách huỷ / xoá + đặt chỗ) dùng được cho mọi kênh.

**FILES CHANGED** (lệch manifest ở DV-084)
- core: `integrations/mail/{receipts,dispatch}.ts` (mới), `integrations/jobs/integrations.jobs.module.ts`, `integrations/public.ts`; `marketing/jobs/campaign-mail.ts` (mới), `marketing/services/mail-test.ts` (mới), `marketing/actions/campaign-system.handlers.ts`, `campaign-extras.handlers.ts`, `marketing/services/mail-sender.ts`, `marketing/jobs/{campaign-scheduler,marketing.jobs.providers}.ts`, `marketing/public.ts`.
- actions: `marketing.ts` (campaign.send_test trả `delivery_ref`).
- test: api `tenant-mail-dispatch.test.ts` (mới), `tenant-mail.test.ts` (dispatch tạo biên nhận).

**Giả định đã chọn (gap-filling)**
- Trần thử lại 3 lượt (TIP ghi "bounded"); lùi theo `backoffAt` chung + Retry-After.
- HTML thư = văn bản đã duyệt được escape trong `white-space:pre-wrap` (renderer 037 chỉ có văn bản thuần) — không chèn HTML từ người dùng.
- Message-ID SMTP `<campaign-<recipient>@<tên miền người gửi>>` (gửi thử `<ct_…@…>`); Brevo trả mã riêng làm tham chiếu.

**TEST (cổng khi làm — D59)**
- api integration `tenant-mail-dispatch.test.ts` **6/6** (biên nhận digest + accepted + không gửi đôi + chiến dịch hoàn tất; mã rỗng / 502 / đứt → unknown không gửi lại; 429 ×3 → failed chắc chắn, mỗi lượt biên nhận gọi riêng, người nhận nhả đặt chỗ giữa các lượt; reserved → unknown không gọi provider; khoá đổi → cancelled; thiếu bộ xử lý miền → hoãn; khách huỷ nhận sau nhận lô → skipped; gửi thử biên nhận riêng không người nhận).
- cùng lượt: `tenant-mail` 7/7 + hồi quy marketing / integrations — tổng **61/61**.
- turbo lint / typecheck / test (CI) **36/36**; depcheck sạch; lint:size sạch. Không đổi UI / mock (E2E marketing giữ kết quả P2). Chưa nghiệm thu với provider thật (Q-004).

**ĐỐI CHIẾU STANDARDS (P3)**

| Standard | Kết quả |
|---|---|
| `integrations/provider-ports.md` | gửi qua runner biên nhận gọi chung (claim CAS / thế hệ / huỷ khi khoá đổi), không producer / worker mail thứ hai |
| `events/outbox.md` | kết quả qua campaign.record_delivery (Executor: audit + outbox), idempotent theo ref + kết quả |
| `domain/concurrency.md` | CAS trạng thái biên nhận; reserved trước provider; sập giữa chừng → unknown; không gửi lại unknown |
| `domain/state-machine.md` | queued → reserved → accepted / failed_before_accept / unknown; chỉ failed_before_accept được xếp lại |
| `ops/observability-security.md` | hàng đợi / biên nhận chỉ id + digest (test: không có địa chỉ trong biên nhận / lượt gọi); khoá đọc lúc gửi |
| `code/testing.md` | transport giả theo hợp đồng Brevo, không mạng thật |
