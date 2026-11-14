# TIP-010: Billing payments — hoá đơn gói AppChat, VietQR, webhook SePay nền tảng, đối soát, xác nhận tay

## HEADER
- TIP-ID: TIP-010
- Project: AppChat V2
- Module: `packages/db/prisma/platform/billing-payments.prisma` · `packages/core/src/billing/{payments,actions}` · `packages/integrations/src/connectors/sepay` · `apps/api/src/http/billing` · `packages/shared/src/{api/billing.ts,billing/*}`
- Depends on: TIP-009 (plan, subscription, ví, `SubscriptionsService.activate`, `WalletService.topup`), TIP-012 (port `BankFeedProvider`, adapter mock, `/hooks` + rawBody) — nhánh xếp chồng từ `tip/013-settings-api`
- Priority: P0 · REQ: L04 (VietQR động 15 phút, webhook tự đối soát idempotent, kích hoạt gói / cộng credit, chuyển khoản thủ công → pending_review → admin xác nhận)
- Estimated effort: 10 giờ
- **Files touched:**
  - Schema: `platform/billing-payments.prisma` (`billing_invoice`, `bank_transaction`) + migration platform `<ts>_010_billing_payments` (partial index `status IN (pending, pending_review)`, unique `transfer_code`, unique `(provider, provider_tx_id)`).
  - Integrations: `connectors/sepay/{adapter.ts (SepayBankFeed: verifyWebhook `Authorization: Apikey <key>`, parseTransactions), manifest.ts}`, `registry.ts`, `index.ts`.
  - Shared: `src/billing/payments.ts` (`invoiceItem` — giá / credit / nhãn theo kind + item, `INVOICE_QR_TTL_MS`, `platformTransferCode`, `matchTransferCode`), `src/api/billing.ts` (`billInvoiceSchema`, `billInvoicesPageSchema`), `src/codes.ts` (`billing_invoice` → `INV-{yyyy}-{n:4}`), `src/i18n/server/{vi,en}/billing.ts` (`topup` qua hoá đơn), `src/events.ts` (`billing.invoice_paid`).
  - Core: `billing/payments/{payments.env.ts, invoices.service.ts, matcher.service.ts, fulfil.ts, expiry.ts}`, `billing/actions/{billing-create-invoice,billing-cancel-invoice,billing-report-transfer,admin-confirm-transfer}.handler.ts`, `billing/billing.module.ts`, `billing/jobs/billing.jobs.module.ts` (job `billing.invoice-expiry`), `billing/public.ts`.
  - Actions: `packages/actions/src/platform-admin.ts` (`admin.invoice.confirm_transfer` — Blueprint §3.4 platform) + `index.ts`.
  - API: `apps/api/src/http/billing/{billing.controller.ts (GET /v1/billing/invoices), payments-hook.controller.ts (POST /hooks/payments/:provider), admin-transfers.controller.ts (GET /v1/admin/transfers?status=pending_review)}`, `billing.http.module.ts`.
  - Web: mock `domains/settings-billing.ts` (report_transfer → `pending_review` như backend thật), `features/settings/components/CheckoutModal.tsx` (trạng thái chờ xác nhận), i18n `settings.billing.checkout.review*`.
  - Test: `apps/api/test/integration/billing-payments.test.ts`, `packages/integrations/test/sepay.test.ts`, `packages/shared/src/billing/payments.test.ts`, `apps/web/src/shared/api/mock/billing-shape.test.ts`, contract cases, `apps/web/e2e/http/billing.spec.ts`.
- **Parallel-safe with:** —

## CONTEXT
- Blueprint §2.2 `billing_invoice` / `bank_transaction`, §3.4 billing + platform (`admin.invoice.confirm_transfer` money), §4.4 `GET /v1/admin/transfers?status=pending_review`, §4.7 `POST /hooks/payments/:provider` (chỉ DB nền tảng, 200 nhanh, idempotent), §8 VietQR tự sinh payload (`vietQrPayload` — `packages/shared/src/commerce/vietqr.ts`).
- COMMERCE §10: VietQR + chuyển khoản; thông tin VAT (MST, tên đơn vị, địa chỉ, email) trên hoá đơn; credit mua thêm không hết hạn.
- provider-ports §1: SePay chính (thu phí AppChat); kết nối nền tảng cấu hình ở env, không qua bảng tenant. Q-004: chưa có tài khoản SePay → adapter `mock` mặc định.
- FE mock: `GET /billing/invoices?status=&q=` → `{ data: BillInvoice[] }` (`id, code, desc, date, amount, method, status, kind, item, qr? { payload, amount, content, expires_at, bank, account_no, account_name }`); `billing.create_invoice` → `{ invoice_id, amount, transfer_code, qr }`.

## TASK
1. **Schema** theo Blueprint (+ `item`, `months`, `desc_key`, `reported_at`, `confirmed_by`); `bank_transaction.provider_tx_id` unique theo provider; partial index pending.
2. **Env nền tảng** (`payments.env.ts`): `PLATFORM_BANK_BIN`, `PLATFORM_BANK_NAME`, `PLATFORM_BANK_ACCOUNT_NO`, `PLATFORM_BANK_ACCOUNT_NAME`, `PLATFORM_BANK_FEED` (`mock` | `sepay`), `SEPAY_WEBHOOK_KEY` (bắt buộc khi `sepay`), `MOCK_BANK_FEED_KEY` (dev / test). Production cấm `mock`.
3. **`billing.create_invoice`** (money, `billing.manage`, platform): mặt hàng theo `kind` + `item` (+ `period` cho gói: month / year) từ bảng `plan` / `CREDIT_PACKS` / `ADDONS`; giá null / 0 → 422 `item: not_purchasable`; mã `INV-<năm>-<n>` (`sequence` nền tảng); `transfer_code` = `APPCHAT INV<năm><n>` (≤ 25 ký tự, chỉ A–Z 0–9); `qr_payload` = VietQR động (số tiền + nội dung); hết hạn 15 phút; `vat_info` chụp từ `business_profile` + `admin_email`; một hoá đơn `pending` cùng mặt hàng còn hạn → trả lại hoá đơn đó (không sinh trùng).
4. **`billing.cancel_invoice`**: chỉ `pending` / `pending_review` → `cancelled`; đã trả / hết hạn → 409.
5. **`billing.report_transfer`**: `pending` (kể cả QR vừa hết hạn) → `pending_review` + `reported_at`; `paid` → giữ `paid` (idempotent); khác → 409.
6. **Webhook `POST /hooks/payments/:provider`**: provider ≠ `PLATFORM_BANK_FEED` → 404; adapter `verifyWebhook` sai → 401; mỗi giao dịch `direction: in` vào tài khoản nền tảng → insert `bank_transaction` (trùng `provider_tx_id` → bỏ qua) rồi **khớp**: tìm `transfer_code` trong nội dung (bỏ dấu cách / gạch) + số tiền ≥ hoá đơn + trạng thái `pending` / `pending_review` / `expired` (tiền về muộn vẫn ghi nhận) → `paid` + `bank_tx_id`; không khớp → giữ `matched_invoice_id` null (admin đối soát tay). Trả 200 `{ ok, received, matched }`.
7. **Ghi nhận khi paid** (`fulfil`, idempotent theo invoice): `plan` → `SubscriptionsService.activate(ws, plan, months, invoiceId)`; `credit` → `WalletService.topup(ws, credits, { refType: 'invoice', refId })`; `addon` → ghi nhận paid (tăng hạn mức người / kênh mua thêm là TIP-039 — DC); event `billing.invoice_paid` (outbox tenant) + thông báo Owner.
8. **`admin.invoice.confirm_transfer`** (`platform_admin`, money): hoá đơn `pending_review` / `pending` / `expired` → `paid` (method `bank_transfer`, `confirmed_by`) + fulfil; `GET /v1/admin/transfers?status=pending_review` (platform_admin, không cần workspace).
9. **Hết hạn**: scheduler `billing.invoice-expiry` (mỗi phút) đặt `expired` cho `pending` quá `expires_at` (không đụng `pending_review`).
10. **Đọc** `GET /v1/billing/invoices?status=&q=` (`billing.manage`) đúng shape FE; `qr` chỉ có khi `pending`.
11. **FE**: mock `report_transfer` → `pending_review` (như thật), hộp thanh toán hiện "Đang chờ xác nhận" khi `pending_review`, tự làm mới (poll 5 s khi đang mở hoá đơn chưa trả).

## ACCEPTANCE CRITERIA
1. Migration 010: bảng, unique, partial index đúng.
2. `create_invoice` credit_1000: amount `1000000`, mã `INV-2026-…`, `transfer_code` ≤ 25 ký tự, QR payload VietQR hợp lệ (CRC đúng, chứa số tiền + nội dung), hết hạn +15 phút, `vat_info` từ khai báo; gọi lại cùng mặt hàng khi còn hạn → cùng hoá đơn; thiếu Idempotency-Key → 422; gói `enterprise` / `free` → 422; sales → 403.
3. Webhook mock: chữ ký sai → 401; provider khác → 404; giao dịch khớp → hoá đơn `paid`, ví +1050 credit (topup), ledger `invoice`; gửi lại cùng giao dịch → không cộng lần 2; giao dịch không khớp mã → `bank_transaction` không gắn hoá đơn; số tiền thiếu → không khớp.
4. Hoá đơn gói `team` / `month` trả qua webhook → subscription `active` gói Team, credit gói cấp lại; outbox `subscription.changed` + `billing.invoice_paid`.
5. `report_transfer` → `pending_review`; `cancel` → `cancelled`; cancel hoá đơn đã trả → 409.
6. `admin.invoice.confirm_transfer`: user thường → 403; platform admin → `paid` + fulfil; `GET /v1/admin/transfers` liệt kê hoá đơn `pending_review` (user thường 403).
7. Scheduler hết hạn: `pending` quá 15 phút → `expired`; `pending_review` giữ nguyên; tiền về sau khi hết hạn vẫn khớp → `paid`.
8. Adapter SePay: `Authorization: Apikey <key>` đúng / sai; payload SePay mẫu → `BankTransaction` (id, số TK, tiền, chiều `in` / `out`, nội dung, thời điểm).
9. `GET /v1/billing/invoices` khớp `billInvoicesPageSchema`; mock FE parse cùng schema; contract `billing.create_invoice` / `report_transfer` / `cancel_invoice` xanh ở mock + HTTP.
10. E2E http Gói & thanh toán (mua credit → QR thật, giả webhook ngân hàng → "Thanh toán thành công" + số dư ví tăng; "Tôi đã chuyển khoản" → chờ xác nhận) xanh; E2E mock `settings-billing` xanh.
11. Cổng D59 xanh (+ smoke bản build).

## CONSTRAINTS
- Không đổi schema input / output action đã có (`billing.*`); thêm action admin theo Blueprint §3.4.
- Hoá đơn VAT điện tử thật (Q2, P2) ngoài TIP; nâng gói giữa kỳ tính chênh (`upgrade_proration`) — ghi DC, TIP-039 làm UI; hạn mức mua thêm (addon) áp vào quota — TIP-039.
- Chưa nghiệm thu với SePay thật (Q-004).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 11 AC có test thật · file ≤ 400 dòng · test file riêng
- [ ] Cổng D59 (khi làm · trước commit · chốt TIP) có output
