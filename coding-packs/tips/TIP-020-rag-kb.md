# TIP-020: Kho tri thức (RAG) — kb_folder / kb_source / kb_chunk, nạp tài liệu (parse → cắt đoạn → embed), tìm kết hợp + ngưỡng căn cứ, action `kb.*`, nối trang Dữ liệu RAG

## HEADER
- TIP-ID: TIP-020
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/ai-kb.prisma` · `packages/ai/src/{embed,kb}/**` · `packages/core/src/ai/kb/**` · `packages/core/src/kernel/files/**` (Storage) · `apps/api/src/http/{ai,files}/**`
- Depends on: TIP-019 (LlmRouter purpose `embed`, AiSdkEngine, CreditMeter qua `model_price`) — nhánh xếp chồng từ `tip/019-ai-runtime`
- Priority: P0 · REQ: D04, D17 (phần kho — scope agent dùng ở TIP-021 / 022)
- Estimated effort: 16 giờ (+ Storage / `POST /v1/files` — chưa TIP nào sở hữu, xem DC)
- **Files touched:**
  - Schema: `tenant/ai-kb.prisma` (`kb_folder`, `kb_source`, `kb_chunk` — `embedding vector(1536)` qua `Unsupported`, `kb_setting` một dòng `min_score`) + migration tenant `<ts>_020_ai_kb` (HNSW cosine, GIN trgm trên `content_norm`, partial index nguồn, unique sha256 partial).
  - AI (`packages/ai` — chỗ duy nhất gọi AI SDK): `embed/embedder.ts` (`embedMany` theo lô qua router purpose `embed`, usage token), `kb/{chunker.ts (cắt theo đề mục / bảng / dòng Excel, 400–800 token, chồng 10–15%), rrf.ts (gộp RRF k=60)}`, `testing/mock-embed.ts` (embedding giả tất định theo từ — chạy hybrid search thật khi chưa có key).
  - Core: `kernel/files/{storage.ts (port Storage: local ./.data/files | s3 để sau), files.service.ts}` ; `ai/kb/{parse.ts (pdf-parse / mammoth / exceljs / csv / txt-md / URL html → text), ingest.ts (pipeline idempotent theo sha256), search.ts (hybrid: top-20 vector + top-20 từ khoá không dấu → RRF → top-6, lọc visibility / folder / tag, `min_score`), kb.store.ts, kb.read.ts (GET cho FE), kb.handlers.ts (`kb.add_source` / `remove_source` (+undo) / `refresh_source` / `folder.create`)}`, `ai/jobs/kb-ingest.processor.ts` (queue `kb-ingest`, worker ROLE=ai).
  - Actions: thêm `kb.search` (read, agentGrantable), `kb.update_source` (thư mục / thẻ / visibility, undo 24h) — Blueprint §3.4; `kb.add_source` nhận `file_id` / `text`.
  - API: `POST /v1/files` (multipart ≤ 25MB) · `GET /v1/settings/kb?nav&folder&q` (shape FE `KbData`) · `GET /v1/kb/folders` · `GET /v1/kb/sources`.
  - FE: `RagUploadModal` tải tệp thật qua `transport.upload` (http) rồi `kb.add_source { file_id }`; mock giữ metadata.
  - Test: `packages/ai/test/{chunker,rrf}.test.ts`, `packages/core/test/kb-unit.test.ts` (parse), `apps/api/test/integration/kb.test.ts`, contract `kb.folder.create` / `kb.add_source` (text), E2E http `rag.spec.ts`.

## CONTEXT
- `standards/ai/rag.md` (12 quy tắc — nguồn chính), Blueprint §2.2 ai-kb (L400–403), §3.4 `kb.*` (L788–794), §4.4 GET kb, §5.3 (agent dùng `kb.search`), §11 Storage (L1325, L1402), thư viện parse L1328 (`pdf-parse`, `mammoth`, `exceljs`, readability).
- D04, D29 (một kho / workspace), D54 (visibility `public | internal`, `kb_scope`), D33 (embed qua router).
- Q-001 (chưa key): embed chạy bằng model giả tất định (`AI_ENGINE=mock` hoặc test) — hybrid search, ngưỡng, trích nguồn nghiệm thu được; chất lượng ngữ nghĩa thật chờ key.

## TASK
1. **Schema** theo Blueprint §2.2: `kb_folder(name, parent_id?, visibility, sort)`, `kb_source(folder_id?, origin, kind, name, tags[], visibility, file_id?, url?, product_id?, sha256?, status, error?, chunk_count, size_bytes, created_by, refreshed_at, starred, learn, deleted_at?)`, `kb_chunk(source_id, ord, content, content_norm (cột sinh `f_unaccent(lower(content))`), embedding vector(1536), embed_model, token_count, meta)`, `kb_setting(id=1, min_score)`. Index: HNSW `vector_cosine_ops`, GIN trgm `content_norm`, `(source_id, ord)`, `kb_source(folder_id, status) WHERE deleted_at IS NULL`, GIN `tags`, unique `sha256 WHERE deleted_at IS NULL`.
2. **Storage + `POST /v1/files`**: port `Storage { put, get, delete }`, bản `local` (`FILES_DIR`, mặc định `./.data/files`), ghi bảng `file` (sha256, mime, size, purpose); 25MB; chỉ thành viên workspace.
3. **Nạp tài liệu** (queue `kb-ingest`, ROLE=ai): parse theo `kind` → chuẩn hoá → cắt đoạn → embed theo lô (router purpose `embed`, trừ credit theo `model_price`, nguồn ví `kb`) → ghi `kb_chunk` thay đoạn cũ trong một transaction → `status=ready`, `chunk_count`; lỗi → `failed` + `error` + event `kb.source_failed`; thành công → `kb.source_ready`. Idempotent: cùng `sha256` đã `ready` → không embed lại; `learn=false` → chỉ lưu (`status=ready`, 0 đoạn).
4. **Tìm kết hợp** `searchKb(db, {query, folderIds?, tags?, visibility: ['public'] | ['public','internal'], limit 6})`: top-20 vector (cosine, `hnsw.iterative_scan` khi có lọc) + top-20 từ khoá (`content_norm % f_unaccent(lower(q))` / similarity) → RRF → top-6 kèm `score` (cosine cao nhất), `citations {source_id, chunk_id}`; dưới `min_score` → `grounded=false`, `chunks=[]`. Đoạn `meta.volatile` (có giá) loại khỏi kết quả.
5. **Action**: `kb.add_source` (tạo nguồn từ `file_id` | `url` | `text`; trùng sha256 còn sống → 409 kèm `source_id`), `kb.update_source`, `kb.remove_source` (xoá mềm, undo 30 ngày), `kb.refresh_source` (`all` → mọi nguồn chưa xoá), `kb.folder.create` (trùng tên không dấu → 409), `kb.search` (read; Trợ lý / agent — lọc visibility theo quyền: người có `kb.manage` hoặc source `assistant` của người có quyền đọc → được `internal`).
6. **Đọc** `GET /v1/settings/kb` đúng shape FE `KbData` (types, folders, nav đếm, learned_total, size, data) — `kb.manage`.
7. **FE**: upload tệp thật trong chế độ http.

## ACCEPTANCE CRITERIA
1. Migration 020: bảng + index (HNSW, GIN trgm, partial, unique sha256); EXPLAIN tìm từ khoá dùng GIN trgm, danh sách nguồn theo thư mục dùng partial index; tìm vector dùng HNSW.
2. Chunker (unit): đề mục giữ `meta.path`; bảng giữ hàng tiêu đề; Excel/CSV mỗi dòng một đoạn kèm tên cột; đoạn ≤ ~800 token, chồng nhau; RRF gộp đúng thứ tự.
3. Parse (unit): pdf / docx / xlsx / csv / md / txt / html → text.
4. Integration (Postgres + Memurai, embed giả): tải tệp → `kb.add_source` → worker ingest → `ready`, `chunk_count` > 0, ví bị trừ theo `model_price` embed; tải lại cùng tệp → 409 + id cũ; `learn=false` → 0 đoạn; tệp hỏng → `failed` + event.
5. Search: câu hỏi không dấu khớp đoạn có dấu; tài liệu `internal` không ra khi visibility chỉ `public`; lọc thư mục / thẻ; câu không liên quan → `grounded=false`; đoạn có giá không ra; trích nguồn đủ.
6. `GET /v1/settings/kb` khớp schema FE; `kb.remove_source` + undo; `kb.folder.create` trùng → 409; sales (không `kb.manage`) → 403; contract mock + HTTP.
7. E2E http: tải tệp `.md` thật → thấy trong danh sách, "Đã học" sau khi worker xong; cổng D59 xanh.

## CONSTRAINTS
- Không lấy giá / tồn / lịch từ RAG (đoạn có giá gắn `volatile`).
- `kb_scope` của agent + đề xuất học từ hội thoại (`kb_suggestion`, P1) để TIP-021 / sau — TIP này chỉ chừa tham số lọc trong `searchKb`.
- Drive / catalog sản phẩm: `origin=catalog` re-ingest theo event sản phẩm làm ở TIP-027 (catalog) — TIP này chỉ nhận `text`.
