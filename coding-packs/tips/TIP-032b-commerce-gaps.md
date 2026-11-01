# TIP-032b: Commerce — vá luật đã chốt còn hở: ngưỡng duyệt cấu hình được, báo giá → HĐ hoặc đơn, VietQR ảnh thật, gửi chứng từ qua webchat, gửi xác nhận đơn / phiếu thu, liệu trình khi cọc, catalog còn thiếu

## HEADER
- TIP-ID: TIP-032b (bổ sung TIP-027 / 029 / 031 / 032 — chèn trước TIP-036, DC-229)
- Project: AppChat V2
- Module: `packages/shared/src/commerce/quote-math.ts` · `packages/core/src/sales/{quotes,orders,payments}/**` · `packages/core/src/contracts/actions/contract-write.handlers.ts` · `packages/core/src/catalog/**` · `packages/actions/src/{quotes,contracts,invoices,orders,catalog}.ts` · `packages/core/src/ai/governance/governance.ts` · route `GET /v1/invoices/:id/qr`
- Depends on: TIP-027, 029, 030, 031, 032, 021 (governance)
- Priority: P0 · REQ: F03–F08 (commerce), M01 · Decision: COMMERCE §2, §3, §5, §6, Q2, Q5 · DC-229
- Estimated effort: 12 giờ

## CONTEXT
Rà code 2026-11-01 đối chiếu `plans/COMMERCE-DECISIONS.md` (luật đã chốt — không được đổi): luồng lõi báo giá → hợp đồng ký điện tử → đơn → đề nghị thanh toán chạy thật, gửi PDF vào Zalo / email được. Còn hở:
- **Ngưỡng duyệt** 20M / 5% là hằng số (`shared/src/commerce/quote-math.ts:23`), COMMERCE Q5 đòi "cấu hình được"; agent tối đa 5% theo AI Governance chưa áp (`quote-write.ts:98` không nhận `agentMaxPct`; `FORCE_APPROVAL` ở `governance.ts:34` không ai đọc).
- **Báo giá sinh tối đa một HĐ hoặc một đơn** (COMMERCE §3): mỗi phía chỉ chặn trùng loại mình → một báo giá ra được cả HĐ lẫn đơn. (Đơn từ HĐ đã ký vẫn được — COMMERCE §4.)
- **VietQR**: PDF đề nghị thanh toán chỉ có dòng chữ, tin gửi khách lại nói "quét VietQR trong tệp đính kèm" (`invoice-doc.ts:44`, `i18n/server/vi/sales.ts:115`); thiếu `GET /invoices/:id/qr`.
- **Webchat**: ô `channel` của `quote.send`, `contract.send_for_signature`, `invoice.send_payment_qr` chỉ nhận `zalo_personal | email` dù adapter webchat nhận tệp.
- **Xác nhận đơn / phiếu thu** không gửi được cho khách (chỉ tải PDF).
- **Liệu trình**: chỉ sinh khi đơn `paid` (`packages.ts:20`), COMMERCE §6 cho phép từ khi cọc nếu sản phẩm bật; thiếu nhắc còn 1 buổi / còn 7 ngày hết hạn.
- **Catalog** (Blueprint §3.4): thiếu `category.update / delete`, `product.import`, `product_variant.*` (biến thể đang đi trong `product.update`).
- **Hồ sơ 360°** quy đổi điểm sai: `pointsBalance * 10n` (`crm/services/contact360.ts:40`) — COMMERCE §7: 1 điểm = 100đ (sửa ở TIP-036, ghi ở đây để không sót).

## TASK
1. **Ngưỡng duyệt cấu hình được:** cột `approval_total_vnd`, `approval_discount_pct` trong cài đặt bán hàng của workspace (mặc định 20.000.000 / 5 — seed, không đổi luật); action `sales_settings.update` (Owner); `approvalReasons` đọc cấu hình; nguồn `agent` / `task` áp thêm `agent_max_discount_pct` từ AI Governance (vượt → bắt duyệt), Owner trên UI không bị chặn bởi trần agent.
2. **Một báo giá → một HĐ hoặc một đơn:** chặn chéo trong cùng transaction (`FOR UPDATE` báo giá); lỗi `QUOTE_ALREADY_CONVERTED` kèm mã chứng từ đã sinh. Đơn từ HĐ đã ký giữ nguyên.
3. **VietQR ảnh thật:** sinh ảnh QR từ payload VietQR đã có (`invoice-view.ts`) — thư viện `qrcode` (Blueprint §8 — đã trong thiết kế); chèn ảnh vào PDF đề nghị thanh toán; `GET /v1/invoices/:id/qr` (PNG, quyền xem đề nghị); gửi Zalo kèm ảnh QR riêng ngoài PDF (khách quét từ điện thoại).
4. **Webchat** cho 3 action gửi chứng từ: thêm `webchat` vào enum; webchat gửi link xem + tải PDF (trang công khai có token như trang ký).
5. **`order.send_confirmation`** (risk send, Idempotency-Key): gửi xác nhận đơn (PDF đơn + trạng thái thanh toán) qua kênh của hội thoại khách; **`receipt.send`**: gửi phiếu thu PDF. Cả hai ghi tin vào hội thoại (Inbox thấy), preview có người nhận + kênh.
6. **Liệu trình khi cọc:** cờ `grant_on_deposit` trên sản phẩm liệu trình; `grantPackages` chạy khi cọc nếu bật; job nhắc còn 1 buổi / còn 7 ngày hết hạn (thông báo người phụ trách + gợi ý gửi khách, không tự gửi).
7. **Catalog:** `category.update`, `category.delete` (chặn khi còn sản phẩm), `product.import` (CSV / XLSX — `exceljs` đã có, chạy job khi > 500 dòng), `product_variant.create / update / delete` tách khỏi `product.update` (giữ tương thích FE: `product.update` vẫn nhận biến thể).
8. Preview cho mọi action ghi mới (chuẩn 023b); action đọc tương ứng nếu thiếu.

## ACCEPTANCE CRITERIA
1. Integration: đổi ngưỡng → báo giá 25M không cần duyệt khi ngưỡng 30M; agent giảm 6% → duyệt dù Owner giảm 6% không bị chặn bởi trần agent; báo giá đã sinh HĐ → `order.create` từ báo giá trả `QUOTE_ALREADY_CONVERTED` (và ngược lại); đơn từ HĐ vẫn tạo được.
2. Integration: PDF đề nghị thanh toán có ảnh QR (kiểm byte PNG trong PDF); `GET /invoices/:id/qr` 200 / 403 theo scope; `invoice.send_payment_qr` qua webchat ghi tin có link; `order.send_confirmation` + `receipt.send` ghi tin hội thoại + đẩy hàng gửi kênh (fake transport).
3. Integration: cọc đơn có sản phẩm `grant_on_deposit` → liệu trình sinh ngay; job nhắc chạy đúng mốc.
4. Integration catalog: import 3 dòng CSV + 1 dòng lỗi → báo dòng lỗi; xoá danh mục còn sản phẩm → 409.
5. Unit `quote-math` với ngưỡng tham số; mock FE cập nhật shape; E2E http Báo giá / Đơn xanh.
6. Cổng D59.

## CONSTRAINTS
- `COMMERCE-DECISIONS.md` không đổi: chỉ làm cho code khớp luật; mặc định ngưỡng giữ 20M / 5%.
- Gửi Zalo / email thật chưa nghiệm thu (Q-003, Q-004) — fake transport; ghi rõ trong report.
- `qrcode` đã nằm trong Blueprint §8 (VietQR render) — không phải lệch.
