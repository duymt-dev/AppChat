# Nhập/xuất CRM và commerce AI-first — ghi phạm vi 2026-11-02

Theo yêu cầu trực tiếp của Chủ nhà, đã viết [TIP-038b](../tips/TIP-038b-ai-first-data-transfer.md), **64 file manifest,10 AC**, ma trận6domain: khách hàng, catalog/biếnthể, báo giá, đơn, hợp đồng, đềnghịthanhtoán. Có cảAI vàmanual, nhưng AI là luồng nghiệmthu chính.

-11dòng IO-* trong part-req-fn/COVERAGE nhận rõdomain vàcross-cutting. Không đánh ĐẠT: chưacode, chưa chạymodel/file thật.
- AI upload→nhận diện/mapping→sửa bằng hội thoại→deterministicvalidation→preview→humanconfirm→job/result; xuất bằngngônngữtựnhiên→typedfilter→fileauthenticated thật.
- XLSX/CSV cho dữliệu, header/items vàCSVZIP khi nhiều bảng; PDF/DOCX chứngtừ theo nănglực renderer/source. PDFđãký giữbytes; khôngđổiđuôi giả. Unsupportedformat/OCR thiếu phải nói rõ.
- Luồngmanual cùngbackend khôngLLM bắtbuộc; quyềnCRMimport/export existing giữ nguyên, không tựgrantagent; importcommerce mặcđịnhdraft, khôngghi paid/signed/payment/stock/loyaltyledger.
- Preview/hash/version, duplicate/ownedprivacy, reimporterrorfile, rowreceipts, retry/partial, outputerrorfile vàfiledownload đều cótask/AC; liveít nhất12cases cho6domain×import/export làbắtbuộc.
- Boundary với032b product.import,038 exporters,023c attachment/GenUI,030b documents,045b filejobs và042c scopes; taskgraph/bilateralmetadata đãnối. Khôngtuyênbốmanifests pendingkhác đãhoànthiện.

Currentcoverage:1477unique rows/211orphan gaps,11IOrows đều có038b nhận. GoalA vẫn chưađủTIP/toàncoverage/independentreview. Partialreview038/039 vàTIP040 đượcgiữ cùngcheckpoint;Q032 đãduyệt half-up/DC243, DC244 ghiAI-firstscope. ChỉMarkdown thayđổi.
