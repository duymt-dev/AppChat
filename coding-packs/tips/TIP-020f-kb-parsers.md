# TIP-020f — Kho tri thức: đọc pptx và ảnh (OCR qua model vision) để AI học

## HEADER
- TIP-ID: TIP-020f; Project: AppChat V2; Module: KB parsing; Priority: P1; Estimated: M. TIP bổ sung cho TIP-020 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 020b, 020c, 019b (metering), 023f (input ảnh) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-020f-files.md) — 8 paths (6 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/kb/ingest.ts`; integrate 003b before020f.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/kb/ingest.ts`; integrate 003c before020f.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/kb/ingest.ts`; integrate 015c before020f.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `packages/core/src/ai/kb/ingest.ts`; integrate 020e before020f.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/kb/ingest.ts`; integrate 045b before020f.
- **Dòng COVERAGE nhận:** DC-110.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - DC-110: tệp pptx / ảnh / mp4 lưu với `learn=false` (P1). `packages/core/src/ai/kb/parse.ts` đọc pdf (`pdf-parse`), docx (`mammoth`), csv/xlsx; không pptx, không ảnh.
  - `pizzip@3.3.0` đã cài (pptx = zip XML) — không cần thư viện mới. OCR: không có tesseract; dùng model vision qua AI SDK (route chat có capability `vision`) — tính Credit theo pricebook hiện có (019b), không giá mới.

## APPLICABLE STANDARDS
- ai/rag.md §5 (parse/chunk), §10; ai/agent-gateway.md (metering); ops/observability-security.md.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 020f` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Kiểm route chat có `vision=true` trong cấu hình 040; không có → ảnh giữ `learn=false` với lý do `no_vision_route` (trung thực).

## TASK
Parser pptx (text slide + ghi chú) và OCR ảnh qua model vision để tài liệu thuộc hai loại này học được.

## SPECIFICATIONS
### 1. pptx
1. Đọc `ppt/slides/slideN.xml` + `notesSlides` theo thứ tự, mỗi slide một block có `meta.page = N`; giới hạn 300 slide.
### 2. Ảnh
1. png/jpg/webp ≤ 10 MB: gọi model vision (prompt cố định "chép nguyên văn chữ trong ảnh, không suy diễn"), qua 019b metered; kết quả là block text `meta.ocr=true`.
2. Người thêm tài liệu thấy **ước tính** Credit trước khi bật "Cho AI học" ảnh (preview action kb.add_source/kb.update_source); số trừ thật là usage thực tế qua 019b metering, không phải số ước tính.
3. mp4 vẫn `learn=false` (ngoài phạm vi).

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|pptx 10 slide|10 block đúng thứ tự — unit fixture|
|2|Ảnh hoá đơn mẫu|text OCR vào kho, trích nguồn ghi page/ocr|
|3|Không route vision|learn=false + lý do|
|4|Model vision thật|`pnpm ai:live --cases fixtures/ai-eval/kb-ocr.json` 4 ca ×3; thiếu key → chưa nghiệm thu|

### Commands / evidence gate
- `pnpm --filter @appchat/core test -- test/kb-parse-pptx.test.ts test/kb-ocr.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/kb.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không thêm thư viện; không giá mới; không đọc video.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 8 path, header khai hai phía, 4 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
