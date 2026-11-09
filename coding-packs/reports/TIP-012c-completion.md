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

## Pha 4 — callback xác thực, biên nhận sự kiện, binding sau ngắt kết nối (§4.1–§4.5, §6; AC5) — DC-411, DV-085

**Rà trước khi làm (code thật)**
- webhook.service: route `disconnected` → 404 cho mọi port; adapter `verifyWebhook` + `integration_event` thô + outbox — không có biên nhận sự kiện mail / ghép.
- connections.service connect / disconnect thay / xoá `secret_enc` cùng transaction, route nền tảng upsert giữ dòng `disconnected`.
- Brevo không ký HMAC (P1) → token webhook riêng là vật liệu xác thực duy nhất giữ được mà không giữ khoá gửi.

**FILES CHANGED** (lệch manifest ở DV-085)
- core: `integrations/mail/{ingress,results,bindings,purge}.ts` (mới), `integrations/mail/dispatch.ts` (đối soát khi accepted), `integrations/services/{webhook.service,connections.service}.ts`, `integrations/jobs/bank-sync.scheduler.ts`, `integrations/public.ts`; `marketing/events/mail-events.ts` (mới), `marketing/marketing.providers.ts`.
- test: api `tenant-mail-callbacks.test.ts` (mới).

**Giả định đã chọn (gap-filling)**
- `account_ref` Brevo chưa có trong hợp đồng công khai → chuỗi rỗng (ghép theo kết nối + mã thư + digest — mã thư Brevo duy nhất toàn cục).
- Trần sự kiện chưa ghép 10.000 / kết nối; quá 30 ngày → ignored (không xoá — bằng chứng).
- Lỗi cứng / khiếu nại dùng chính sách huỷ nhận 037 (`marketing_opt_out`) vì 037 chưa có bảng chặn riêng theo kênh; huỷ nhận từ provider không áp (chỉ link ký).

**TEST (cổng khi làm — D59)**
- api integration `tenant-mail-callbacks.test.ts` **5/5** (401 sai token / api_key / không bearer, 404 route lạ, 400 thân hỏng; lô không thứ tự + lặp → cờ đúng, duplicate, read_at một lần; hard không bị soft hạ, khiếu nại → huỷ nhận đúng khách; callback trước phản hồi → ghép khi accepted, thư lạ unresolved; ngắt → binding (không api_key, đã mã hoá) xác thực callback muộn, token sai 404, hết hạn + purge → 404, bằng chứng còn).
- cùng lượt: tenant-mail / dispatch + marketing ×4 + integrations / detail + bank-connectors / convergence / ingress + payments — **100/100**.
- turbo lint / typecheck / test (CI) **36/36**; depcheck, lint:size sạch. Chưa nghiệm thu với provider thật (Q-004).

**ĐỐI CHIẾU STANDARDS (P4)**

| Standard | Kết quả |
|---|---|
| `integrations/provider-ports.md` §6 | route chung, xác thực trong adapter trên byte gốc, sai → từ chối đồng nhất; port khác giữ 404 khi ngắt |
| `events/outbox.md` / idempotency | sự kiện chỉ thêm, unique theo khoá provider; tiêu thụ + tác dụng miền cùng transaction |
| `domain/concurrency.md` | khoá sự kiện + biên nhận (FOR UPDATE); đối soát CAS `delivery_id`; purge SKIP LOCKED |
| `database/indexing.md` | event unique + unresolved partial + delivery idx; binding expiry INCLUDE + purge partial; lô 100 id trước |
| `ops/observability-security.md` | token đã mã hoá, không giữ khoá gửi; không địa chỉ trong sự kiện (digest) |

## Pha 5 — Cài đặt Email Marketing, chọn người gửi ở wizard, giao thư ở chi tiết (§5; AC7) — DC-412, DV-086

**Rà trước khi làm (code thật)**
- Prototype L7033 có mục `email_mkt` (thanh 6 nền tảng + form khoá API); app chưa có mục này, thẻ Brevo / SMTP ở Nền tảng kết nối chỉ mở modal kết nối.
- Wizard Email chỉ chọn tài khoản kênh (`account_id`); chi tiết người nhận chỉ có trạng thái chiến dịch, không có kết quả giao thư.
- Mock `settings-apps.ts` OPTIONAL lệch `integration-probe` (thiếu trường tuỳ chọn Brevo / SMTP) → kết nối SMTP mock 422.

**FILES CHANGED** (lệch manifest ở DV-086)
- core: `marketing/services/mail-sender.ts` (`deliveryOf`), `marketing/services/campaign-read.service.ts` (người nhận `delivery`), `integrations/services/read.service.ts` (`opens` theo port mail).
- shared: `api/marketing.ts` (recipient `delivery`).
- web settings: `components/EmailMarketingSection.tsx`, `components/email-marketing/MailSenderStatus.tsx`, `hooks/useTenantMail.ts`, `styles/email-marketing.styles.ts` (mới), `registry.ts`, `screens/SettingsScreen.tsx`.
- web marketing: `components/MailSenderPicker.tsx` (mới), `api.ts`, `hooks/useWizard.ts`, `components/WizardSteps.tsx`, `components/DetailTabs.tsx`.
- mock: `domains/tenant-mail.ts` (mới), `marketing.ts`, `marketing-extras.ts`, `settings-apps.ts`; fixture `prototype-parity/settings.json`.
- i18n vi / en `settings.json`, `marketing.json`; parity `tools/parity/modules/tenant-mail.ts` (mới) + manifest; e2e `tenant-mail.spec.ts` (mới); test api `tenant-mail.test.ts`, `tenant-mail-callbacks.test.ts`.

**Giả định đã chọn (gap-filling)**
- Mục Email Marketing ẩn khỏi nav (chỉ mở từ thẻ connector) — prototype đặt trong nhóm Ứng dụng nhưng V2 đã gom kết nối vào Nền tảng kết nối; một điểm vào duy nhất.
- Thanh nhà cung cấp chỉ Brevo / SMTP (D28); nền tảng khác của prototype không hiện.
- `delivery` của người nhận lấy biên nhận mới nhất (theo lượt gửi) và cờ sự kiện cao nhất; chưa gọi provider → `queued`, provider không nhận → `failed`, không biết → `unknown`.

**TEST (cổng khi làm — D59)**
- api integration `tenant-mail.test.ts` + `tenant-mail-dispatch.test.ts` + `tenant-mail-callbacks.test.ts` **22/22** (thêm: thẻ Brevo / SMTP `opens: email_mkt`; người nhận `delivery` bounced / complained sau callback).
- E2E mock `tenant-mail` + `marketing` + `settings` + `integration-runtime`: **27 passed, 23 skipped** (skip = luồng desktop trên mobile-390 và ngược lại).
- parity `settings:email-mkt` **3,25 %** (≤ 4,2 %), `settings:integrations` 0,07 %.
- turbo lint / typecheck / test (CI) **39/39**; depcheck, lint:size, lint:tokens, i18n-check 100 % (6707). Chưa nghiệm thu với provider thật (Q-004).

**ĐỐI CHIẾU STANDARDS (P5)**

| Standard | Kết quả |
|---|---|
| `ui/frontend-structure.md` | màn Cài đặt chỉ map mục; component / hook / style tách file, đều ≤ 250 dòng |
| `ui/prototype-parity.md` | khung L7033 so ≤ 5 % (3,25 %); lệch D28 ghi trong module parity, không thêm vào sổ nợ |
| `ui/interaction-patterns.md` | kết nối dùng lại modal tích hợp; người gửi chưa dùng được khoá kèm lý do; mobile 390 không tràn, vùng chạm ≥ 44px |
| `i18n/i18n.md` | mọi chuỗi qua vi + en, i18n-check 100 % |
| `actions/action-registry.md` | ghi chỉ qua `useAction` (campaign.create / update mang `sender`, integration.connect); đọc người gửi qua `campaign.mail_senders` / GET |
| `authz/rbac-permissions.md` | mục và danh sách người gửi theo `campaign.manage`; không lộ khoá / host |
| `integrations/provider-ports.md` | SMTP không bao giờ hiện là đã xác minh tên miền; trạng thái từ bằng chứng thăm dò hiện tại |

## Pha 6 — ghép gốc thật, Trợ lý / tệp xuất trung thực, ai:live 8 ca, chốt TIP (§2.5, §5.2–§5.4; AC6, AC7, AC8) — DC-413, DV-087

**Rà trước khi làm (code thật)**
- Registry op `mail.send` / bộ xử lý miền / sink sự kiện là biến theo tiến trình; chưa có test chứng minh ROLE nào giữ cái nào. Áp sự kiện khi thiếu sink chỉ bỏ qua tác dụng miền rồi đánh dấu `applied` (mất tác dụng âm thầm).
- Trợ lý không có action đọc chiến dịch → không thấy bằng chứng giao thư; `find_actions` không có từ "chiến dịch". Xuất người nhận chưa có kết quả giao thư.
- Stack ai:live / E2E http không có Brevo — cần transport giả không mạng (không gửi thư thật).

**FILES CHANGED** (lệch manifest ở DV-087)
- core: `integrations/mail/{results,module}.ts`, `integrations/public.ts`, `marketing/actions/campaign-get.handler.ts` (mới), `marketing/marketing.providers.ts`, `marketing/services/recipient-export.ts`, `marketing/public.ts`, `ai/assistant/{catalog,turn.service}.ts`.
- actions: `tenant-mail.ts` (`campaign.get`), `marketing-extras.ts` (mô tả recipient_export). ai: prompts `index.ts` + `assistant.*.md` (v5) + `genui.*.md` (v4).
- web: mock `marketing-extras.ts` (`campaign.get`), i18n actions vi / en; e2e http `tenant-mail.spec.ts` (mới).
- test: worker `tenant-mail-composition.test.ts` (mới), core `tenant-mail-fake.test.ts` (mới) + `assistant-unit` / `genui-context`, api `tenant-mail-callbacks.test.ts`, ai prompt tests.
- ai:live: `fixtures/ai-eval/tenant-mail/{cases.json,seed.mjs}`, `tools/ai-live/src/{tenant-mail-judge,cases,runner,cli}.ts`; `tools/scripts/{ai-live-stack,e2e-http}.mjs` bật `TENANT_MAIL_TRANSPORT=fake`.

**Giả định đã chọn (gap-filling)**
- Thiếu sink miền → 503 (provider gửi lại) thay vì lưu sự kiện chờ: đúng luật "missing port fails 503, not accepted 0" của TIP; không có tiến trình API nào thiếu sink trong cấu hình chuẩn.
- `campaign.get` nhận id / mã / đúng tên (không tìm mờ) — chiến dịch không có action search; trùng tên → bản mới nhất.
- Số mở chỉ đếm từ sự kiện Brevo; SMTP → `null` (không phải 0).

**TEST (cổng chốt — D59)**
- `db:test-reset` đầu cổng.
- api integration phạm vi TIP: tenant-mail ×3 + marketing ×4 + integrations + integration-detail **67/67**; actions campaign.* / integration.* **39/39**.
- worker integration `tenant-mail-composition` + `ai-runtime-domain-handlers` **5/5** (jobs có op + miền + sink, gỡ khi đóng; channels / ai không op gọi provider).
- turbo lint / typecheck / test / build `...[nhánh nền]` **27/27**; lint / typecheck / test lần cuối **24/24**; depcheck, lint:size, lint:tokens, lint:masks, i18n 100 % (6709).
- E2E mock assistant + tenant-mail + marketing + settings **32 passed, 28 skipped**; (lượt trước) + integration-runtime 27/23.
- E2E http tenant-mail + integrations + marketing **3 passed** (mobile skip) — Brevo giả, thăm dò bền ở worker jobs, nháp giữ người gửi sau tải lại.
- parity `settings:email-mkt` 3,25 % (P5, UI không đổi ở P6).
- **ai:live tenant-mail 8/8, an toàn 0, ĐẠT** (3 lượt mỗi ca, 9router `ag/gemini-3-flash`) — `reports/ai-live-tenant-mail-2026-11-08.md`. Lượt trước 4/8 → 5/8 → 6/8 lộ lỗi hệ thống thật (không action đọc chiến dịch, không từ khoá "chiến dịch", prompt kiểm tra kết nối / khoá dán chat, kết quả huỷ thẻ mơ hồ) — đã sửa, không hạ ngưỡng.
- Chưa nghiệm thu với provider thật (Brevo / SMTP — Q-004).

**ĐỐI CHIẾU STANDARDS (P6)**

| Standard | Kết quả |
|---|---|
| `integrations/provider-ports.md` | op gọi provider chỉ ở ROLE=jobs; thiếu cổng miền → 503, không thành công giả; transport giả cấm production |
| `ai/agent-gateway.md` | Trợ lý đọc qua action có quyền (campaign.view); ghi chỉ qua thẻ xác nhận; huỷ thẻ trả `executed:false` |
| `ai/eval.md` | ai:live 8 ca × 3 lượt, chấm theo DB / API / tệp thật; an toàn tuyệt đối 0; không hạ ngưỡng |
| `actions/action-registry.md` | `campaign.get` read, agentGrantable, handler thật; i18n title + desc |
| `authz/rbac-permissions.md` | người nhận / số liệu trong scope CRM người hỏi; người gửi không lộ khoá |
| `ops/observability-security.md` | khoá dán chat không lặp ở trả lời / thẻ / đầu vào tool (judge kiểm); tệp xuất không khoá / token |
| `code/testing.md` | composition test dựng module production; transport giả theo hợp đồng Brevo, không mạng |

## Kết luận TIP-012c — DONE (P1–P6, PR #148–#153)

AC1–AC8 có test chạy thật và xanh (AC1–2 P1, AC3 P2, AC4 P3, AC5 P4, AC6 P6, AC7 P5–P6, AC8 P6). Chưa nghiệm thu với provider thật (Brevo / SMTP — Q-004).

