# TIP-029: Báo giá — `sales-quotes.prisma`, version n+1, ngưỡng duyệt, gửi qua hội thoại, link xem công khai, hết hạn 15 ngày, AI soạn từ nội dung, nối trang Báo giá

## HEADER
- TIP-ID: TIP-029
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/sales-quotes.prisma` + migration 029 · `packages/core/src/sales/**` · `packages/core/src/crm/services/stage-rules.ts` · `apps/api/src/http/sales/{quotes,public-quotes}.controller.ts` · `packages/shared/src/{sales/quote-state,time/deadline,api/quotes,i18n/server/*/sales}.ts` · FE `apps/web/src/features/quotes/**` + `app/(public)/q/[token]` · mock `domains/quotes*.ts`
- Depends on: TIP-027 (catalog), TIP-028 (mẫu chứng từ + `DocRenderer`), TIP-015 / 016 (khách hàng, giai đoạn), TIP-012 / 018 (hội thoại Zalo / email), TIP-006 (thông báo) — nhánh xếp chồng từ `tip/028-doc-templates`
- Priority: P0 · REQ: F06, F06b, F10 · Decision: D30, D42, D46, COMMERCE §3 / §8 / §8b
- Estimated effort: 18 giờ

## CONTEXT
Khảo sát đầu TIP: `sales-quotes.prisma` là stub; 14 action `quote.*` trả 501; `QUOTE_FLOW` có ở shared nhưng cho phép `pending_approval → quote.update` và `expired → quote.request_revision` (COMMERCE §3 không có). Màn Báo giá chạy mock đầy đủ (danh sách D42 + kanban, editor, drawer chi tiết, trao đổi nội bộ, bản sửa n+1, AI soạn). Không có trang xem công khai, không có Tải PDF thật, không có job hết hạn / nhắc.

## TASK
1. **Schema + migration 029**: `quote` (mã `BG-{n}` dùng chung giữa các lần, `root_quote_id` + `version`, trạng thái, tổng tiền tính sẵn, `valid_days`, `sent_at`, `valid_until`, `viewed_at`, `reminded_at`, PDF đóng băng `file_id` + `file_sha256` + `template_id` / `template_version`, kênh gửi `sent_channel` + `conversation_id`, `off_catalog`), `quote_item`, `quote_comment`; index partial theo trạng thái / phụ trách / gần đây / khách / hết hạn / mã, GIN `custom`, index biểu thức `action_log` cho lịch sử; unique `(code, version)`.
2. **Shared**: siết `QUOTE_FLOW` (DC-171); `dayEndAfter` / `daysLeft` theo múi giờ workspace; shape `quoteRowSchema`, `quotesPageSchema`, `quotesMetaSchema`, `publicQuoteSchema`; event `quote.*`; i18n server `sales`; loại thông báo `quote_approval`, `quote_expiring`; khoá timeline CRM `quote_*`.
3. **Core `sales/`**: handler create / update / delete (+ hoàn tác) / comment, submit_for_approval (thông báo người có `quote.approve`) / approve / reject_internal, send (render + đóng băng PDF trong `prepare`, gửi vào hội thoại), extend_validity, mark_accepted / mark_rejected (+ hoàn tác), request_revision (lần n+1), draft_from_content (model trong `prepare` + bộ luật); `QuotesReadService` (D42 deferred join, chi tiết, các lần, meta KPI, PDF, xem công khai); job quét 15 phút trên queue riêng `sales-scheduler` (hết hạn, nhắc T-2); consumer `contact.owner_changed` (chuyển báo giá đang mở).
4. **CRM**: `applyStageRule` (nâng lên Báo giá khi gửi; lùi về Đang tư vấn khi từ chối / hết hạn mà không còn báo giá mở; không hạ Đã chốt; bỏ qua nếu vừa đổi tay < 24h).
5. **API**: `GET /v1/quotes` (D42), `/quotes/meta?quote_id=`, `/quotes/:id`, `/quotes/:id/versions`, `/quotes/:id/pdf`; công khai `GET /v1/public/quotes/:token`, `/:token/pdf`.
6. **FE**: drawer meta theo báo giá, nút Tải PDF, lỗi gửi theo lý do (khách chưa nhắn Zalo / chưa có email / chưa kết nối email), trang công khai `/q/[token]`; mock cùng schema + cùng `QUOTE_FLOW`.

## ACCEPTANCE CRITERIA
1. Integration `quotes.test.ts` (17 ca): bảng + index + EXPLAIN; tổng tiền; ngưỡng 20tr / 5% buộc duyệt + thông báo + quyền duyệt; gửi Zalo (PDF đóng băng LibreOffice, tin + tệp, `valid_until` cuối ngày giờ VN, timeline + giai đoạn), Zalo chưa có hội thoại 409, gửi email mở chuỗi mới; link xem → viewed, token sai 404, PDF công khai; xin sửa → lần 2, superseded; chốt / từ chối + hoàn tác + lùi giai đoạn; nhắc T-2 một lần, hết hạn, gia hạn; data scope sales / cs / kế toán; D42 lọc; xoá + hoàn tác; AI soạn (bộ luật); chuyển phụ trách.
2. Unit core `sales-unit.test.ts` (token, bộ luật, parse JSON model, gợi ý AI) + shared `quote-state.test.ts` (ma trận trạng thái × action) + `deadline.test.ts` + mock shape `quotes-shape.test.ts`.
3. E2E http `quotes.spec.ts`: kết nối email → dịch vụ + khách → tạo → Zalo báo lý do → gửi Email → Tải PDF → khách mở link (không đăng nhập) → Khách đã xem → xin sửa → Lần 2.
4. E2E mock `quotes` xanh (thêm ca Tải PDF + trang công khai) + parity `quotes:*` < 5%.

## CONSTRAINTS
- Luật COMMERCE không đổi: hiệu lực 15 ngày, ngưỡng 20tr / 5%, ngoài danh mục buộc duyệt, hết hạn → xin báo giá mới (không sửa bản hết hạn).
- PDF gửi khách là bản đóng băng (sha256) — Tải PDF sau khi gửi trả đúng bản đó.
- Zalo cá nhân không nhắn chủ động: chỉ gửi vào hội thoại khách đã nhắn.
- Báo giá → đơn hàng (`converted`) ở TIP-031; hợp đồng từ báo giá ở TIP-030.
