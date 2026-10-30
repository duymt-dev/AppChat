### COMPLETION REPORT — TIP-010

**STATUS:** DONE
**COMMIT:** `ea28cbc` + `7026270` (code) trên nhánh `tip/010-billing-payments` (xếp chồng trên `tip/013-settings-api`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Schema: `packages/db/prisma/platform/billing-payments.prisma` (`billing_invoice`, `bank_transaction` + enum kind / status / method), migration `platform/migrations/20261030160000_010_billing_payments` (sequence `billing_invoice_seq` từ 1001 + GRANT cho `appchat_platform_app`, partial index `billing_invoice_open_idx (status, expires_at) WHERE status IN (pending, pending_review)`, CHECK `amount > 0`).
  - Core: `packages/core/src/billing/payments/{payments.env.ts, invoices.service.ts, fulfil.ts (InvoiceFulfiller: markPaid / fulfil / fulfilPending / expire), bank-hook.service.ts}`, `billing/actions/{billing-create-invoice, billing-cancel-invoice, billing-report-transfer, admin-confirm-transfer}.handler.ts`.
  - Integrations: `packages/integrations/src/connectors/sepay/adapter.ts` (`SepayBankFeed`: `Authorization: Apikey <key>`, `parseTransactions`, `sepayTime` giờ VN → UTC).
  - Actions: `packages/actions/src/platform-admin.ts` (`admin.invoice.confirm_transfer` — platform_admin, money, db platform).
  - API: `apps/api/src/http/billing/{payments-hook.controller.ts (POST /hooks/payments/:provider, rawBody ≤ 64 KB), admin-transfers.controller.ts (GET /v1/admin/transfers)}`.
  - Shared: `packages/shared/src/billing/payments.ts` (`INVOICE_QR_TTL_MS`, `invoiceCode`, `platformTransferCode`, `contentMatches`, `findInvoiceRef`, `catalogItem`).
  - Test: `apps/api/test/integration/billing-payments.test.ts` (8), `packages/integrations/test/sepay.test.ts`, `packages/shared/src/billing/payments.test.ts`, `apps/web/e2e/http/billing.spec.ts`.
- Modified: `packages/core/src/kernel/actions/{handler.ts (HandlerOutcome.afterCommit), executor.ts, tip-owners.ts}`, `packages/core/src/billing/{billing.module.ts, jobs/billing.jobs.module.ts (job billing.invoice-sweep mỗi phút), public.ts}`, `packages/actions/src/index.ts`, `packages/integrations/src/index.ts`, `packages/shared/src/{api/billing.ts (billInvoiceSchema, billInvoicesPageSchema), events.ts (billing.invoice_paid), i18n/server/{vi,en}/billing.ts}`, `apps/api/src/http/billing/{billing.controller.ts (GET /v1/billing/invoices, /invoices/:id), billing.http.module.ts}`, `apps/api/test/integration/setup.ts`, `apps/web/src/features/settings/{components/CheckoutModal.tsx (poll 5 s, trạng thái chờ xác nhận), styles/billing-modals.styles.ts}`, `apps/web/src/shared/api/mock/{domains/settings-billing.ts, billing-shape.test.ts}`, `apps/web/messages/{vi,en}/{settings,actions}.json`, `tools/contract/src/cases.ts`, `tools/scripts/e2e-http.mjs`, `.env.example`, `coding-packs/{DECISIONS.md, plans/BLUEPRINT.md §4.4 / §4.7}`.

**TEST RESULTS:**
- Acceptance criteria: 11/11 pass
  1. Migration 010: bảng, unique `code` / `transfer_code` / `(provider, provider_tx_id)`, partial index chờ, sequence — **pass**
  2. `create_invoice` credit_1000: `1000000`, `INV-2026-…`, `transfer_code` ≤ 25 ký tự, QR VietQR (CRC đúng, trường 54 số tiền, nội dung, số TK), hết hạn +15 phút, `vat_info` từ khai báo; gọi lại → cùng hoá đơn; thiếu Idempotency-Key → 422; enterprise / free / gói đang dùng / mặt hàng lạ → 422 `not_purchasable`; sales → 403 — **pass**
  3. Webhook mock: chữ ký sai 401, provider khác 404; thiếu tiền / sai mã / chiều ra / TK khác → không khớp; khớp (nội dung có tiền tố ngân hàng, bỏ dấu cách) → `paid`, ví +1050 topup, ledger `invoice`, outbox `billing.invoice_paid`; gửi lại → không cộng lần 2 — **pass**
  4. Hoá đơn Team / tháng qua webhook → subscription `active` Team, credit gói cấp lại, outbox `subscription.changed`; kỳ năm khi `price_year` null → 422 — **pass**
  5. `report_transfer` → `pending_review` (idempotent); `cancel` → `cancelled`; cancel lần 2 / hoá đơn đã trả → 409; id lạ → 404 — **pass**
  6. `admin.invoice.confirm_transfer`: user thường 403; thiếu Idempotency-Key 422; platform admin → `paid` (`bank_transfer`, `confirmed_by`) + topup 2200; lần 2 → 409; `GET /v1/admin/transfers` chỉ admin — **pass**
  7. Quét: `pending` quá 15 phút → `expired`, `pending_review` giữ; tiền về muộn vẫn khớp → `paid`; hoá đơn `paid` chưa ghi nhận → `fulfilPending` ghi nhận — **pass**
  8. Adapter SePay: Apikey đúng / sai; payload mẫu → giao dịch (id, TK, tiền, chiều, nội dung, thời điểm UTC) — **pass**
  9. `GET /v1/billing/invoices` (+ `/:id`) khớp `billInvoicesPageSchema`, `qr` chỉ khi `pending`, lọc status / q, sales 403; mock FE parse cùng schema; contract 9/9 ở mock + HTTP — **pass**
  10. E2E http Gói & thanh toán (nạp credit → QR → giả webhook → "Thanh toán thành công" + số dư tăng; "Tôi đã chuyển khoản" → chờ xác nhận) — **pass**; E2E mock `settings-billing` xanh trong full hồi quy — **pass**
  11. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (package đổi) 24/24 task; `pnpm depcheck` xanh; `lint:size` 1109 file; `i18n:check` 100% (4474 key). Sửa sau (`/invoices/:id`): billing-payments integration 8/8, lint + typecheck core / api 4/4.
- **Cổng "chốt TIP":** `pnpm lint` 13/13 · `pnpm typecheck` 13/13 · `pnpm test` 13/13 task, 0 failed · `pnpm build` 3/3 · `pnpm i18n:check` 100% · `api test:integration` **110 passed** (13 file, chạy lại trên `7026270`) · `db test:integration` 7 passed · smoke bản build (`API_PORT=4119`): `/v1/health` 200; `/v1/billing/invoices`, `/invoices/:id`, `/v1/admin/transfers` không token 401; `/hooks/payments/mock` chữ ký sai 401; `/hooks/payments/sepay` (feed = mock) 404; 0 log error · worker `ROLE=jobs` khởi động sạch (0 error; cảnh báo `tenant.provision` là job cũ của workspace test đã xoá) · **E2E http 9 passed · 3 skipped** · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (3.0m). Parity: N/A — chỉ thêm trạng thái "Đang chờ xác nhận" trong hộp thanh toán (dùng token sẵn có).
- **Chưa nghiệm thu với provider thật:** SePay (Q-004) — adapter + payload mẫu theo tài liệu SePay.

**ISSUES DISCOVERED:**
- Ghi nhận hoá đơn gọi `WalletService` / `SubscriptionsService` mở transaction riêng, không chạy được trong tx của executor → thêm `HandlerOutcome.afterCommit` (chạy sau cả hai commit, lỗi bị nuốt; scheduler `fulfilPending` vớt lại) — DC-055.
- `admin.invoice.confirm_transfer` chạm hoá đơn của workspace khác workspace admin đang đứng → DC-054.
- E2E http: số dư ví không làm mới sau webhook → hộp thanh toán invalidate query `['billing']` khi hoá đơn đã trả.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-054 (admin action nền tảng), DC-055 (afterCommit + quét ghi nhận), DC-056 (addon chỉ ghi nhận paid, hạn mức → TIP-039), DC-057 (mã `INV-<năm>-<n>` sequence nền tảng, nội dung `APPCHAT INV<năm><n>`), DC-058 (tài khoản nhận + nguồn đối soát ở env, mặc định mock), DC-059 (mock "Tôi đã chuyển khoản" trả `pending_review` rồi coi như webhook về ngay).

**DEVIATIONS FROM SPEC:** không có. Thêm `GET /v1/billing/invoices/:id` (Blueprint §4.4 có liệt kê).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-039: áp hạn mức mua thêm (addon user / kênh) vào `QuotaService`; nâng gói giữa kỳ tính chênh.
- TIP-040 (admin): màn đối soát giao dịch không khớp (`bank_transaction.matched_invoice_id` null) cạnh `GET /v1/admin/transfers`.
- Khi có SePay (Q-004): đặt `PLATFORM_BANK_FEED=sepay`, `SEPAY_WEBHOOK_KEY`, chạy lại AC3 với giao dịch thật.
