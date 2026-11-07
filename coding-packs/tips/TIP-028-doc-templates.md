# TIP-028: Mẫu chứng từ — `documents.prisma` (`doc_template`), biến chuẩn, render PDF (LibreOffice), wizard DOCX + AI nhận diện biến, bảng kiểm pháp lý, nối trang Mẫu chứng từ

## HEADER
- TIP-ID: TIP-028
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/documents.prisma` + migration 028 · `packages/core/src/documents/**` · `apps/api/src/http/documents/**` · `packages/actions/src/documents.ts` · `packages/shared/src/{documents,api/documents.ts,i18n/server/*/documents.ts}` · FE `apps/web/src/features/settings/{components/Doc*,RichTemplateModal,hooks/useDocPreview}` · mock `domains/doc-templates.ts` · transport `blob`
- Depends on: TIP-003 (action kernel), TIP-019 (AI runtime — `runOnce`), TIP-020 (tệp tải lên `POST /v1/files`) — nhánh xếp chồng từ `tip/027-catalog`
- Priority: P0 · REQ: F06b · Decision: D30, COMMERCE §5 (đề nghị thanh toán ≠ hoá đơn GTGT), templates.md, Blueprint K8
- Estimated effort: 18 giờ

## CONTEXT
Khảo sát đầu TIP: `documents.prisma` là stub, `DocumentsModule` / `DocumentsJobsModule` / `DocumentsHttpModule` rỗng; 4 action `doc_template.*` trả 501 (chủ 028), nhưng test tích hợp kernel (TIP-003 / 021 / 024) đang mượn id `doc_template.create` / `delete` làm handler giả (DC-085). Registry biến (`variables.ts`), bảng kiểm theo loại đã có ở shared. Màn Cài đặt › Mẫu chứng từ chạy mock: danh sách theo loại, trình soạn rich (regex biến riêng ở FE), wizard DOCX chỉ gửi **tên tệp** cho `detect_fields` (không tải tệp), không có xem trước. LibreOffice 26.8 có trên máy dev (`soffice.com` headless — spike K8: HTML → PDF 4,8s, DOCX → PDF 2,0s, tiếng Việt đúng). Chưa cài `docxtemplater` / `pizzip` / `@react-pdf/renderer`.

## TASK
1. **Dời handler test**: fake của executor sang `campaign.create` / `contract.delete` (chưa cài) — DC-167.
2. **Schema + migration 028**: `doc_template(kind, contract_kind?, name, source rich|docx, body_html?, docx_file_id? FK file, field_map, checklist_result, is_default, version, updated_by, created_at, updated_at, deleted_at)`; CHECK nguồn ↔ nội dung; index partial `(kind, is_default DESC, updated_at DESC, id) WHERE deleted_at IS NULL`; unique partial một mặc định mỗi loại; seed 4 mẫu rich mặc định (DC-161).
3. **Shared**: `templateVars` (biến + vòng `items` + cột dòng hàng), `legalChecklist` / `hasNotVatLine`, `vndWords` (số tiền bằng chữ vi / en), `renderRich` + `htmlPage` + `sanitizeTemplateHtml`, shape `docTemplateRowSchema` / `docTemplatesListSchema`, i18n server `documents` (dòng không thay thế HĐ GTGT, dữ liệu minh hoạ).
4. **Core**: `docx.ts` (mở / kiểm macro ≤ 10MB, đọc đoạn, gắn thẻ theo vị trí đã xác nhận, điền bằng docxtemplater, chèn dòng pháp lý), `soffice.ts` (LibreOffice headless, hồ sơ + thư mục tạm riêng, timeout 60s), `DocRenderer` (rich / docx → PDF, ≤ 2 lượt cùng lúc), `doc-data.ts` (hồ sơ DN + dữ liệu minh hoạ), `detect.ts` (prompt + parse JSON model + bộ luật), handler `doc_template.create / update (if_version, mặc định, undo) / delete (xoá mềm, không xoá mặc định, undo) / detect_fields (model trong prepare)`, `DocumentsReadService`.
5. **API**: `GET /v1/doc-templates?kind=` (D42 không áp — bảng nhỏ, `{ data, next_cursor: null }`), `GET /v1/doc-templates/:id/preview` (application/pdf).
6. **FE**: wizard DOCX tải tệp thật (`purpose: document`) → `detect_fields { file_id }`, lỗi tệp theo mã (macro / không phải docx / quá lớn); trình soạn rich dùng `templateVars` / `legalChecklist` chung; sửa gửi `if_version`; dòng mẫu hiện cảnh báo bảng kiểm; menu "Xem trước" (tab mới); `transport.blob`; mock cùng schema.

## ACCEPTANCE CRITERIA
1. Integration `documents.test.ts`: 4 mẫu mặc định, index + unique partial; quyền (sales đọc danh sách, kế toán 403, sales không tạo); rich biến lạ / vòng sai / không biến 422, làm sạch script, bảng kiểm, đặt mặc định chuyển cờ; update `if_version` 409 + version + 1 + hoàn tác trả nội dung + mặc định cũ; xoá mặc định 409, xoá + hoàn tác; DOCX: tải → `detect_fields` (run AI ghi nhận, model giả → bộ luật) → vị trí bịa / biến sai loại / thiếu vị trí 422 → lưu (field_map, tệp `confirmed`), tệp macro / không phải docx 422; xem trước rich + DOCX ra `%PDF-` qua LibreOffice; sales xem trước 403; id lạ 404. Test executor / approvals cũ vẫn xanh với handler giả mới.
2. Unit core `documents-unit.test.ts` (đọc / gắn thẻ / điền DOCX thật, macro, bộ luật + parse JSON, renderRich, dữ liệu minh hoạ, làm sạch HTML) + unit shared (biến, bảng kiểm, số tiền bằng chữ) + mock shape `doc-templates-shape.test.ts`.
3. E2E http `documents.spec.ts`: workspace mới có 4 mẫu → tải DOCX → nhận diện → bỏ dòng → bảng kiểm (tranh chấp đạt) → lưu → Xem trước trả PDF → rich biến lạ báo lỗi → lưu → xoá + hoàn tác.
4. E2E mock `settings-docs` xanh (thêm ca cảnh báo bảng kiểm + Xem trước).

## CONSTRAINTS
- Mẫu chỉ trình bày: số liệu từ bản ghi có cấu trúc; bảng hàng luôn từ vòng `items`.
- Không lưu mẫu DOCX khi chưa qua bước người xác nhận; dòng "không thay thế hoá đơn GTGT" luôn có trên đề nghị thanh toán / phiếu thu.
- Đóng băng PDF chứng từ phát hành (`file_id` + `sha256`), queue `doc-render`, AI soạn báo giá / hợp đồng từ nội dung: TIP-029 / 030 / 032 (dùng `DocRenderer` + `DocData`).
- LibreOffice chạy dưới user riêng, không mạng: cấu hình systemd ở TIP hạ tầng (Blueprint §11).
