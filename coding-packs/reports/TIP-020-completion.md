### COMPLETION REPORT — TIP-020

**Bổ sung 2026-11-02:** [TIP-020b](../tips/TIP-020b-kb-source-management.md) nhận folder update/delete, kế thừa visibility và nút tải nguồn; [TIP-043](../tips/TIP-043-kb-conversation-learning.md) nhận học từ hội thoại có người duyệt. Report cũ không chứng minh các phần này đã làm; AC cụ thể nằm trong hai TIP mới.

**STATUS:** DONE (embedding giả — chưa nghiệm thu với model embedding thật, Q-001)
**COMMIT:** `1b4ebf8` (code) trên nhánh `tip/020-rag-kb` (xếp chồng trên `tip/019-ai-runtime`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Schema: migration `tenant/migrations/20261031600000_020_ai_kb` (enum + 4 bảng; viết tay: cột sinh `content_norm`, HNSW cosine, GIN trgm, partial `(folder_id, status)`, GIN tags, unique sha256 còn sống, CHECK `kb_setting`).
  - AI: `embed/embedder.ts` (AiSdkEmbedder — embedMany theo lô 64, fallback provider, kiểm 1536 chiều), `kb/{chunker.ts, rrf.ts}`, `testing/mock-embed.ts`, `test/kb.test.ts` (7).
  - Core: `kernel/files/{storage.ts, files.service.ts}`, `ai/kb/{parse.ts, ingest.ts, search.ts, kb.read.ts, kb.handlers.ts, kb-search.handler.ts, kb.queue.ts}`, `ai/jobs/kb-ingest.processor.ts`, `ai/events/kb.rules.ts`, `test/kb-unit.test.ts` (7) + `test/fixtures/kb/*` (docx / pdf từ LibreOffice, xlsx, csv).
  - API: `http/files/{files.controller.ts, files.http.module.ts}`; test `integration/kb.test.ts` (10).
  - FE: `shared/api/mock/ai-shape.test.ts`; E2E `e2e/http/rag.spec.ts`.
  - TIP: `coding-packs/tips/TIP-020-rag-kb.md`.
- Modified: `tenant/ai-kb.prisma`; `packages/actions/src/settings-ai.ts` (`kb.add_source` + file_id / url / text, `kb.update_source`, `kb.search`); `packages/shared/src/{api/ai.ts (kbDataSchema), events.ts (kb.source_ready / failed)}`; core `kernel/{kernel.module.ts (STORAGE + FilesService, FILES_DIR), index.ts}`, `ai/{ai.module.ts (KB_EMBEDDER, KbIngestQueue, handler kb.*, seed đơn giá model giả), public.ts, router/provider.store.ts, jobs/ai.jobs.module.ts}`, `notify/events/domain.rules.ts`, `package.json` (pdf-parse 1.1.4, mammoth 1.13.0, exceljs 4.4.0 — Blueprint L1328); `apps/{api,worker}/package.json` (cùng ba gói — bundle để ngoài); api `app.module.ts`, `http/ai/ai.controller.ts` (`GET /v1/settings/kb`), test `setup.ts` (AI_ENGINE=mock, FILES_DIR); FE `shared/api/{transport.ts, http-transport.ts, mock/mock-transport.ts}` (`upload`), `features/settings/{api.ts, types.ts, components/RagUploadModal.tsx}`, i18n `actions.json` / `settings.json`; `tools/contract/src/cases.ts`, `tools/scripts/e2e-http.mjs` (worker ROLE=ai + FILES_DIR); `.gitignore` (`.data/`); `coding-packs/{02-TASK-GRAPH.md, DECISIONS.md, DEVIATIONS.md}`.

**TEST RESULTS:**
- Acceptance criteria: 7/7 pass
  1. Migration 020: đủ index viết tay + CHECK; EXPLAIN từ khoá → `kb_chunk_content_norm_trgm_idx`, nguồn theo thư mục → `kb_source_folder_status_idx`, vector → `kb_chunk_embedding_hnsw_idx` — **pass**
  2. Chunker: đường dẫn đề mục (không chừa chỗ trống khi thiếu cấp), ≤ 800 token + chồng phần cuối, bảng kèm tiêu đề mỗi đoạn, dòng Excel kèm tên cột, đoạn có giá tách riêng `volatile`; RRF đúng 1/(60+hạng); embedder lô 64 + fallback 503 + sai chiều → lỗi — **pass** (7)
  3. Parse: docx (đề mục / đoạn / bảng), pdf tiếng Việt, xlsx / csv (; + ngoặc kép), md (đề mục / bảng), html bỏ script / nav; định dạng lạ / hỏng / rỗng → ParseError đúng lý do — **pass** (7)
  4. Integration: tải .md qua `POST /v1/files` → `kb.add_source` → worker ROLE=ai nạp → `ready`, đoạn có `meta.path`, đoạn giá `volatile`, ví trừ credit embed (1 dòng sổ nguồn `kb`); cùng tệp lần hai → 409 + id cũ; `learn=false` → 0 đoạn; docx hỏng → `failed` + lý do; văn bản nhập tay + internal + thư mục — **pass**
  5. Tìm: câu không dấu khớp đoạn có dấu + trích nguồn; câu không liên quan → `grounded=false`; internal không ra cho khách, ra khi được xem; lọc thư mục / thẻ; đoạn có giá không ra; action `kb.search` Owner thấy internal, sales chỉ public — **pass**
  6. `GET /v1/settings/kb` khớp `kbDataSchema` (nav đếm, lọc thư mục, tìm tên không dấu); update + undo; remove → thùng rác + tìm không còn + undo; refresh nạp lại; trùng tên thư mục 409; sales 403 (đọc, ghi, tải tệp kb); contract mock + HTTP — **pass**
  7. E2E http `rag.spec.ts`: tạo thư mục → tải .md thật → hàng hiện "Đã học" khi worker xong (không tải lại) → tải lại vẫn đúng → thùng rác; cổng D59 — **pass**
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (9 package đổi) xanh; `pnpm depcheck` xanh; `lint:size`, `i18n:check`, `lint:tokens` xanh.
- **Cổng "chốt TIP":** `pnpm turbo run build lint typecheck test` **46/46** task · `api test:integration` **191 passed** (21 file) · contract mock + HTTP **21/21** · `pnpm depcheck` xanh · `i18n:check` 100% (4497 key) · `lint:size` / `lint:tokens` xanh · smoke worker `ROLE=ai` bản build — 0 log error · **E2E http 16 passed · 10 skipped** (toàn bộ, gồm `rag.spec.ts` mới) · full E2E hồi quy mock **222 passed · 0 failed · 196 skipped** · parity `settings:rag` **2.36%**.

**INDEX / EXPLAIN:** tìm vector `ORDER BY embedding <=> q LIMIT 20` → HNSW (`hnsw.iterative_scan = relaxed_order` khi có lọc); từ khoá `q <% content_norm` → GIN trgm; trang Dữ liệu RAG đọc ≤ 500 nguồn / workspace (kho DN nhỏ), lọc thư mục dùng partial index; đoạn theo nguồn `(source_id, ord)`.

**ISSUES DISCOVERED:**
- Không TIP nào sở hữu Storage / `POST /v1/files` → dựng ở kernel (DV-003).
- `AiJobsModule` cần import `BillingModule` (CreditMeter) — AiModule không re-export.
- Thêm cột `ingest_seq` sau khi migration 020 đã chạy trên DB dev → vá tay template dev (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`); file migration đã gồm cột, môi trường mới không bị ảnh hưởng.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-104 … DC-110. **Lệch spec:** DV-003 (Storage + files ở kernel).

**Chưa nghiệm thu với provider thật:** model embedding thật (text-embedding-3-small qua 9router — Q-001); chất lượng ngữ nghĩa + ngưỡng `min_score` cần chỉnh lại bằng eval `rag` khi có key. Tải URL thật (fetch trang ngoài) chưa chạy trong test (dùng văn bản / tệp).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-021 (Builder): khối "Nguồn kiến thức" → `ai_agent.kb_scope {folder_ids, tags}`; danh sách thư mục đọc từ `GET /v1/settings/kb` (folders) hoặc thêm route nhẹ `GET /v1/kb/folders`.
- TIP-022 (agent trực kênh): `searchKb(db, embedder, { query, visibility: ['public'], folderIds, tags })` + `grounded=false` → handoff / hỏi lại; ghi `citations` vào `ai_run_step.output`.
- TIP-027 (catalog): re-ingest mô tả sản phẩm `origin=catalog` theo event `product.*` (bỏ giá — DC-105).
- TIP 024 / 028 / 030: dùng `POST /v1/files` + `FilesService` cho đính kèm / chứng từ.

## Bổ sung2026-11-02 — runtime integrity, chưa triển khai

TIP-019b-runtime-integrity.md nhận shared-root usage, utility/query-embedding lineage, crash-safe original-price settlement, durable resume/transfer/stop states và scoped detail/events. Rà lại cho thấy test hiện hữu không chứng minh các cửa sổ crash/cây run; xem runtime-integrity-planning-audit-2026-11-02.md. Không sửa TIP đã DONE hoặc coi kế hoạch là runtime PASS.
