# TIP-030b: Hợp đồng từ file — tải PDF / DOCX hợp đồng có sẵn, từ tệp khách gửi trong hội thoại, chọn mẫu theo loại, phụ lục, AI soạn nháp

## HEADER
- TIP-ID: TIP-030b (bổ sung TIP-030 — chèn trước TIP-036, đóng Q-022 theo đề xuất, DC-230)
- Project: AppChat V2
- Module: `packages/actions/src/contracts.ts` · `packages/core/src/contracts/{actions,services}/**` · `packages/core/src/documents/services/{detect,render}.ts` · FE `features/contracts/components/{DetailTabs, ContractCreate*}` · `features/inbox` (menu tệp đính kèm → "Tạo hợp đồng")
- Depends on: TIP-028 (mẫu + detect + render), TIP-030 (hợp đồng + ký), TIP-025 (Inbox tệp đính kèm)
- Priority: P0 · REQ: F09, M01, M02 · Decision: D25, D30, COMMERCE §9, §12 · DC-230
- Estimated effort: 12 giờ

## CONTEXT
- COMMERCE §9 cho 2 nguồn nội dung hợp đồng: (a) từ mẫu theo loại (Dịch vụ / Mua bán / Nguyên tắc), (b) **tải lên file hợp đồng có sẵn**. Code chỉ có (a) với mẫu mặc định `kind: 'contract'` (`contract-write.handlers.ts:32`, `contract-doc.ts:46`) — cột `contractKind` có nhưng không dùng chọn mẫu; action chỉ nhận `file_name` (`contracts.ts:21`), nút tải lên FE chỉ `message.info` (`DetailTabs.tsx:237`).
- Không có đường từ tệp khách gửi trong hội thoại sang hợp đồng.
- Phụ lục (`contract.create_appendix`) + AI soạn (`contract.draft_from_content`) — Blueprint §3.4, D30; TIP-030 dựng bảng `contract_appendix` nhưng chưa mở action (Q-022, DV-010). Prototype không có màn → giao diện tối thiểu theo pattern sẵn có (gap-filling §2: được tự quyết bố cục dùng primitive có sẵn).

## TASK
1. **Chọn mẫu theo loại:** `contract.create` nhận `contract_kind` → mẫu mặc định của loại đó (`doc_template.kind='contract'` + `contract_kind`), rơi về mẫu mặc định chung nếu loại chưa có mẫu.
2. **Tải lên file có sẵn (b):** `contract.create` nhận `source: 'template' | 'file'`, `file_id` (PDF / DOCX, kiểm mime + magic bytes theo ops §3.1 — dùng `safeUpload` của TIP-045b nếu đã có, chưa có thì kiểm tại chỗ). PDF → dùng nguyên bản làm nội dung ký (trang chứng nhận ghép cuối như luồng mẫu); DOCX → LibreOffice ra PDF. `detect_fields` đọc giá trị (tên bên B, giá trị, thời hạn) để điền ô hợp đồng (người dùng xác nhận). Luật ký giữ nguyên: Owner ký trước, OTP, SHA-256.
3. **Từ tệp trong hội thoại:** action `contract.create_from_attachment { message_id, attachment_idx, contact_id? }` → như (2) với file của tin; khách = khách của hội thoại. Menu tệp đính kèm trong Inbox thêm "Tạo hợp đồng" (Can `contracts.create`).
4. **Phụ lục:** `contract.create_appendix { contract_id, title, content | file_id, value_delta? }` → bảng `contract_appendix`, luồng ký như hợp đồng (Owner trước), hiện ở tab Phụ lục của chi tiết hợp đồng; chỉ HĐ `signed`.
5. **AI soạn nháp:** `contract.draft_from_content { contact_id, quote_id?, brief }` (risk write) → model soạn nội dung theo mẫu loại, các đoạn AI viết đánh dấu `ai_suggested` (templates §5) để người duyệt; tạo HĐ `draft`, không tự gửi. Eval suite `doc-draft` (TIP-044) thêm ca hợp đồng.
6. FE: wizard tạo hợp đồng có bước chọn "Từ mẫu / Tải file lên"; tab Phụ lục; nút AI soạn trong drawer tạo. i18n vi + en, token theme.

## ACCEPTANCE CRITERIA
1. Integration: tạo HĐ từ PDF tải lên → ký Owner → ký khách → PDF cuối = file gốc + trang chứng nhận, hash khớp; DOCX → PDF qua LibreOffice; file đổi đuôi `.exe → .pdf` bị từ chối.
2. Integration: tạo HĐ từ tệp trong hội thoại → đúng khách; không có quyền xem hội thoại → 403.
3. Integration: chọn loại "Mua bán" dùng đúng mẫu loại; phụ lục chỉ với HĐ đã ký, ký đủ 2 bên; AI soạn (model giả) đánh dấu `ai_suggested`.
4. E2E http hợp đồng: tải file → gửi ký → ký.
5. Cổng D59; parity màn hợp đồng < 5% ở trạng thái prototype có.

## CONSTRAINTS
- Luật ký D25 / COMMERCE §9 không đổi.
- Không chỉnh sửa nội dung PDF tải lên (chỉ ghép trang chứng nhận).
- AI soạn = model giả tới khi nghiệm thu 9router (đã có — chạy thêm với model thật trong report).
