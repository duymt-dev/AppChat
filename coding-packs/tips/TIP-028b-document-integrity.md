# TIP-028b — Chứng từ: queue doc-render, template_version ở đề nghị thanh toán/phiếu thu, bảng kiểm trong preview gửi/duyệt, undo tạo mẫu

## HEADER
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`; integrate 028b before026c.
- TIP-ID: TIP-028b; Project: AppChat V2; Module: documents; Priority: P0; Estimated: M. TIP bổ sung cho TIP-028 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 030b, 032b, 032d, 015c (doc lineage) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-028b-files.md) — 13 paths (4 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `packages/db/prisma/tenant/sales-payments.prisma`; integrate 012b before028b.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `packages/core/src/contracts/actions/contract-send.handlers.ts`; integrate 014b before028b.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `packages/core/src/contracts/actions/contract-send.handlers.ts`; integrate 015f before028b.
- **Parallel-safe with TIP-015g (coverage-closure manifest):** sequential, shares `packages/core/src/contracts/actions/contract-send.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`; integrate 015g before028b.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `packages/core/src/documents/actions/doc-template.handlers.ts`; integrate 019b before028b.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/contracts/actions/contract-send.handlers.ts`, `packages/core/src/documents/actions/doc-template.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`; integrate 023b before028b.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/contracts/actions/contract-send.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`, `packages/db/prisma/tenant/sales-payments.prisma`; integrate 042c before028b.
- **Dòng COVERAGE nhận:** DEF-028-1; STD-documents-templates-2b; STD-documents-templates-6b; ACT-doc_template.create.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - PDF đóng băng render trong `prepare` của API (DV-008/009); `documents/jobs/documents.jobs.module.ts:2` chỉ comment, không có queue `doc-render`.
  - `template_id`+`template_version` có ở `sales-quotes.prisma:32`, `contracts.prisma:46`; thiếu ở đề nghị thanh toán / phiếu thu (`sales-payments.prisma`).
  - `legalChecklist` chỉ gọi ở doc-template handlers/template-store; preview `quote.send`/`contract.submit` không hiện.
  - `doc_template.create` (`packages/actions/src/documents.ts:11–33`) không khai undo; update/delete có (`doc-template.handlers.ts:99/129`).

## APPLICABLE STANDARDS
- documents/templates.md §2, §6; Blueprint §124, §1327; actions/action-registry.md (undo).
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 028b` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc DV-007/008/009 để giữ quyết định đã chốt (LibreOffice native) — chỉ chuyển render sang job, không đổi engine.

## TASK
Chuyển render PDF phát hành sang job ROLE=jobs, ghi phiên bản mẫu cho mọi chứng từ, hiện bảng kiểm pháp lý trong preview gửi/duyệt, thêm undo cho tạo mẫu.

## SPECIFICATIONS
### 1. Render
1. Phát hành chứng từ → bản ghi `pending_render` + outbox; job `doc-render` render (soffice), lưu file, đánh `rendered`; FE hiện "Đang tạo PDF" và tự cập nhật; lỗi → retry 3 lần rồi `render_failed` có nút thử lại.
### 2. Phiên bản + bảng kiểm
1. Migration thêm `template_id`, `template_version` cho payment request/receipt; ghi khi tạo.
2. Preview `quote.send`, `contract.submit`, `invoice.send` kèm `checklist[{code, ok, hint}]` từ `legalChecklist`; lỗi bắt buộc chặn xác nhận.
### 3. Undo
1. `doc_template.create` undo 24h = xoá mẫu nếu chưa có chứng từ dùng.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Phát hành báo giá|API trả ngay; PDF xuất hiện sau job — integration + E2E http|
|2|Kill worker giữa render|job chạy lại, một file|
|3|Đề nghị thanh toán mới|có template_version|
|4|Gửi báo giá thiếu MST bên mua|preview chặn, hiện mục bảng kiểm|
|5|Undo tạo mẫu đã dùng|từ chối rõ lý do|

### Commands / evidence gate
- `pnpm --filter @appchat/api test:integration -- test/integration/documents.test.ts test/integration/doc-render.test.ts`
- `pnpm e2e:http documents`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không đổi engine render; không đổi luật COMMERCE.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 13 path, header khai hai phía, 5 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
