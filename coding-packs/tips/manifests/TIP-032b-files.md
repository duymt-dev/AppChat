# TIP-032b — exact file manifest

M modify, C create. Danh sách gốc ở `tips/TIP-032b-commerce-gaps.md` → "Files touched (exact manifest)". File này ghi thêm các dòng "Amend (P1…P4)" phát sinh khi thi công (lý do ở cột Trách nhiệm). Tests ở file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| Amend (P1) | `packages/core/src/sales/settings/policy.ts` | Đọc ngưỡng duyệt workspace + trần giảm giá agent (AI Governance) — tách khỏi handler để quote-write / preview / view dùng chung |
| Amend (P1) | `packages/core/src/kernel/actions/policy.ts` | FORCE_APPROVAL ở `decidePolicy` cho nguồn agent / task (DC-329) |
| Amend (P1) | `packages/core/src/kernel/actions/action-context.ts` | `ActionPolicyInput.actionId` cho FORCE_APPROVAL |
| Amend (P1) | `packages/core/src/kernel/actions/executor.ts` | Truyền `actionId` vào `decidePolicy` |
| Amend (P1) | `packages/core/src/kernel/actions/tip-owners.ts` | Tiền tố `sales_settings` → TIP 032 |
| Amend (P1) | `packages/shared/src/commerce/quote-math.ts` | `approvalReasons` nhận `policy` + `agentMaxPct` (mặc định giữ 20M / 5%) |
| Amend (P1) | `packages/shared/src/api/envelope.ts` · `packages/shared/src/errors.ts` | Mã lỗi `QUOTE_ALREADY_CONVERTED` (409) |
| Amend (P1) | `packages/core/src/sales/public.ts` · `packages/core/src/sales/sales.module.ts` | Export `lockConversion`, `CommerceSettingsService`; import `SalesSettingsModule` |
| Amend (P1) | `packages/core/src/sales/quotes/services/quote-write.ts` · `quote-view.ts` · `quotes-read.service.ts` | Lý do duyệt theo cấu hình + trần agent; `converted: 'contract'` từ HĐ đã sinh |
| Amend (P1) | `packages/core/src/sales/quotes/actions/quote-send.handlers.ts` · `previews/quote-send.handlers.preview.ts` · `previews/quote-write.handlers.preview.ts` · `previews/quote-draft.handler.preview.ts` | Truyền ctx / chính sách vào kiểm ngưỡng |
| Amend (P1) | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | `order.create_from_quote` qua `lockConversion` |
| Amend (P1) | `apps/web/messages/{vi,en}/errors.json` | i18n `QUOTE_ALREADY_CONVERTED` |
| Amend (P1) | `apps/web/src/features/settings/api.ts` · `index.ts` · `screens/SettingsScreen.tsx` · `styles/sales-policy.styles.ts` | Query + mục "Chính sách bán hàng" |
| Amend (P1) | `apps/web/src/features/quotes/hooks/useApprovalPolicy.ts` · `hooks/useQuoteDraft.ts` · `components/QuoteFormModal.tsx` · `components/OverviewTab.tsx` · `components/QuoteDrawer.tsx` · `types.ts` | Lý do duyệt + nhãn theo ngưỡng cấu hình; tắt nút chuyển loại kia khi đã sinh chứng từ |
| Amend (P1) | `apps/web/src/shared/api/mock/domains/sales-policy.ts` · `quotes.ts` · `quotes-actions.ts` · `contracts-actions.ts` · `orders-actions.ts` | Mock đọc ngưỡng cấu hình + khoá chuyển đổi |
| Amend (P1) | `apps/web/e2e/quotes.spec.ts` | Nhãn lý do theo cấu hình ("tổng > 20.000.000₫") |
| Amend (P1) | `packages/db/test/prisma-stubs.test.ts` · `coding-packs/02-TASK-GRAPH.md` | Bản đồ sở hữu `tenant/commerce-settings.prisma` (032b) |
| Amend (P1) | `packages/core/test/commerce-policy.test.ts` · `apps/api/test/integration/actions/sales_settings.update.action.test.ts` · `apps/web/src/shared/api/mock/commerce-gaps-shape.test.ts` | Test ngưỡng / FORCE_APPROVAL / ma trận action / shape mock |
| Amend (P2) | `packages/actions/src/commerce-delivery.ts` · `sales-schemas.ts` · `contract-appendix.ts` | Action `order.send_confirmation` / `receipt.send` (tách file, `index.ts` gần trần); `docChannel` dùng chung (Zalo / email / webchat) cho mọi action gửi chứng từ |
| Amend (P2) | `packages/core/src/sales/documents/{public-token,document-link,public-document,documents.module,order-confirmation-doc}.ts` · `apps/api/src/http/sales/public-document.controller.ts` · `sales.http.module.ts` | Link công khai chỉ đọc (DC-332) + PDF xác nhận đơn (DC-334) |
| Amend (P2) | `packages/core/src/sales/payments/services/{invoice-qr,invoice-delivery,receipt-file}.ts` · `invoices-read.service.ts` · `invoice-doc.ts` · `actions/invoice-write.handlers.ts` · `actions/receipt-send.handler.ts` | Ảnh VietQR thật trong PDF + `GET /invoices/:id/qr` + ảnh QR đính kèm Zalo / webchat; phiếu thu đóng băng dùng chung cho tải / gửi |
| Amend (P2) | `packages/core/src/sales/orders/actions/order-confirmation.handler.ts` · `sales/quotes/services/{quote-image,quote-deps}.ts` · `previews/quote-send.handlers.preview.ts` · `sales/public.ts` | Gửi xác nhận đơn; báo giá dạng ảnh từng trang (DC-333) |
| Amend (P2) | `packages/core/src/documents/services/{soffice,doc-renderer}.ts` | `pageToPng` (LibreOffice raster trang PDF) + `pdfPages` (pdf-lib tách trang) |
| Amend (P2) | `packages/core/src/crm/services/timeline.service.ts` · `packages/shared/src/i18n/server/{vi,en}/crm.ts` · `{vi,en}/sales-delivery.ts` · `packages/shared/src/documents/render.ts` · `packages/core/src/kernel/actions/tip-owners.ts` | Timeline `order_confirmation_sent` / `receipt_sent`; chữ server tách file (sales.ts gần trần); ảnh QR trong mẫu rich; tiền tố `receipt` → 032 |
| Amend (P2) | `packages/db/test/prisma-stubs.test.ts` · `coding-packs/02-TASK-GRAPH.md` | Bản đồ sở hữu `platform/commerce-links.prisma` (032b) |
| Amend (P2) | `apps/api/package.json` · `packages/core/package.json` | `qrcode`; devDeps `jsqr` + `pngjs` chỉ cho test decode QR (DV-025) |
| Amend (P2) | `apps/web/src/shared/forms/ChannelSelect.tsx` · `features/quotes/styles/delivery.styles.ts` · `features/orders/components/{SendConfirmation,DetailTabs}.tsx` · `features/invoices/components/{DetailTabs,PaySection}.tsx` · `features/invoices/styles/pay.styles.ts` | Chọn kênh gửi chung; nút Gửi xác nhận đơn / Gửi phiếu thu |
| Amend (P2) | `apps/web/messages/{vi,en}/{common,invoices,orders}.json` | i18n chọn kênh, gửi phiếu thu, gửi xác nhận đơn |
| Amend (P2) | `apps/web/src/shared/api/mock/domains/{commerce-delivery,orders-actions,invoices-actions}.ts` | Mock gửi chứng từ (hàm thuần, không vòng phụ thuộc) |
| Amend (P2) | `apps/api/test/integration/commerce-delivery.test.ts` · `actions/{order.send_confirmation,receipt.send}.action.test.ts` · `packages/core/test/commerce-delivery.test.ts` | Test QR decode / link / xác nhận đơn / phiếu thu / báo giá ảnh / ma trận action |
