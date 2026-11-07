# TIP-032: Đề nghị thanh toán + thu tiền — `sales-payments.prisma`, cọc / đợt / toàn bộ, VietQR của DN, bank feed SePay / Casso của DN, xác nhận tay, hoàn tiền có duyệt, phiếu thu, nhắc công nợ, liệu trình, nối trang Đề nghị thanh toán

## HEADER
- TIP-ID: TIP-032
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/sales-payments.prisma` + migration 032 · `packages/core/src/sales/payments/**`, `sales/jobs/payment.jobs.ts` · `apps/api/src/http/sales/{invoices, tenant-payments-hook}.controller.ts` · `packages/actions/src/payments.ts` · `packages/shared/src/{sales/invoice-state, api/invoices}.ts` · FE `apps/web/src/features/invoices/**` · mock `domains/invoices*.ts`
- Depends on: TIP-031 (đơn, `payCols`, chờ hoàn tiền), TIP-028 (DocRenderer — mẫu `payment_request` / `receipt`), TIP-010 (kết nối + webhook ký), TIP-012 (connector SePay / Casso `mock`), TIP-020 (tệp), TIP-018 / 025 (gửi vào hội thoại) — nhánh xếp chồng từ `tip/031-orders`
- Priority: P0 · REQ: F08, G07 · Decision: D42, D46, COMMERCE §4, §5, §6
- Estimated effort: 16 giờ

## CONTEXT
Khảo sát đầu TIP: `sales-payments.prisma` là stub; 5 action `invoice.*` trả 501; chưa có action hoàn tiền / liệu trình / tài khoản nhận / bank feed. Màn Đề nghị thanh toán chạy mock (D42, drawer 5 tab, VietQR, ghi nhận, Cần đối soát) với trạng thái tự tính trong mock. Đơn huỷ đã thu chỉ đánh dấu `refund_pending` (TIP-031), chưa sinh yêu cầu hoàn. Platform đã có `tenant_bank_feed_route` (TIP-002) cho webhook ngân hàng của DN.

## TASK
1. **Schema + migration 032**: enum + bảng `payment_account` (một dòng, BIN 6 số), `tenant_bank_feed`, `bank_tx` (unique theo feed + mã ngoài), `invoice` (mã `TT-`, 3 loại, 6 trạng thái, đã thu ≤ số tiền, huỷ phải có lý do, mốc nhắc), `customer_payment` (hoàn tiền số âm + lý do bắt buộc, phiếu thu `PT-` khi xác nhận, gắn đề nghị hoặc đơn), `customer_package` + `package_usage`; index D42 / partial đề nghị còn mở theo hạn / hàng đối soát / hoàn chờ duyệt / liệu trình còn hạn + biểu thức `action_log`.
2. **Shared**: `INVOICE_FLOW`, `invoiceStatusOf`, `INVOICE_REMINDERS` T-1 / T+1 / T+7, `findInvoiceCode` / `matchBankTx` (khớp chắc chắn = có mã TT + đúng số còn phải thu), `packageRefundOf`; shape `invoiceRowSchema` / `invoicesMetaSchema` / `customerPackageSchema` / `paymentSettingsSchema`; event `invoice.*`, `payment.*`, `bank_tx.received`, `package.*`; notify `payment_received` / `refund_approval` / `bank_review`.
3. **Actions mới** (`packages/actions/src/payments.ts`): `payment.refund` / `refund_approve` / `refund_reject`, `package.extend` / `adjust_sessions`, `payment_account.update`, `bank_feed.connect` / `disconnect`.
4. **Core `sales/payments/`**: tạo / gửi (PDF đóng băng lần đầu, gửi vào hội thoại; lần sau là nhắc) / huỷ (chỉ khi chưa thu); ghi nhận tay + khớp đối soát (phiếu thu, cộng đơn → `payCols`, liệu trình khi đơn đã thu đủ) + hoàn tác; hoàn tiền theo đề nghị / liệu trình → chờ duyệt → duyệt (đơn `refunded_total`, liệu trình `refunded`) / từ chối; huỷ đơn đã thu → yêu cầu hoàn tự động; đơn sàn đã thu → khoản thu `marketplace`; webhook ngân hàng của DN (ký, đúng tài khoản, idempotent) → khớp tự động hoặc hàng "Cần đối soát"; job 30 phút: quá hạn, nhắc T-1 / T+1 / T+7, liệu trình hết hạn; `InvoicesReadService` (D42, meta, PDF đề nghị / phiếu thu, cài đặt nhận tiền, liệu trình của khách).
5. **API**: `GET /v1/invoices` (D42), `/invoices/meta`, `/invoices/:id`, `/invoices/:id/pdf`, `/invoices/receipts/:paymentId/pdf`, `/contacts/:id/packages`, `/settings/payments`; `POST /hooks/tenant-payments/:provider/:feedId`.
6. **FE**: mock cùng schema + `INVOICE_FLOW`; drawer có "Yêu cầu hoàn tiền" (đã thu) thay "Huỷ"; hàng "Cần đối soát" thêm "Hoàn tiền chờ duyệt" (duyệt / từ chối có lý do); nhãn lịch sử hoàn tiền; ngày hôm nay của form theo chế độ (mock cố định parity, http ngày thật).

## ACCEPTANCE CRITERIA
1. Integration `payments.test.ts` (16 ca): bảng + CHECK + index + EXPLAIN; tạo / gửi / nhắc / huỷ; ghi nhận một phần → đủ + phiếu thu + đơn; vượt số còn lại 422; hoàn tác; webhook khớp / thiếu mã / sai số tiền / sai chữ ký / trùng; đối soát tay; hoàn tiền theo đề nghị + duyệt / từ chối / tự duyệt 403; huỷ đơn đã thu → yêu cầu hoàn; liệu trình sinh / gia hạn / chỉnh buổi / hoàn; job quá hạn + nhắc + hết hạn; D42 + scope.
2. Unit shared `invoice-state.test.ts` + mock shape `invoices-shape.test.ts`.
3. E2E http `invoices.spec.ts`: khách → đề nghị (TT-, Nháp) → thu một phần → đủ (2 phiếu thu PT-) → yêu cầu hoàn → duyệt ở hàng chờ → "Đã hoàn".
4. E2E mock `invoices` (thêm ca hoàn tiền Kế toán → Chủ sở hữu duyệt) xanh + parity `invoices:*`, `orders:create`, `contracts:create` < 5%.

## CONSTRAINTS
- COMMERCE §5 / §6 không đổi: đề nghị thanh toán ≠ hoá đơn GTGT (dòng ghi chú luôn có); hoàn tiền luôn qua duyệt; đã có khoản thu thì không huỷ thẳng; hạn mặc định 7 ngày; nhắc T-1 / T+1 / T+7.
- Hoá đơn GTGT điện tử: ngoài phạm vi. Sổ điểm (`points` / `redeem_points`): TIP-036. Trừ buổi liệu trình theo lịch hẹn: TIP-033 (bảng `package_usage` sẵn).
