### COMPLETION REPORT — TIP-023e

**STATUS:** DONE — một nhánh `tip/023e-action-discovery`, PR #172 (xếp chồng #171 — merge #171 trước). 12 pha; SHA từng pha ở bảng tiến độ `goals/GOAL-RELEASE.md`. SHA chốt: xem dòng 35 bảng tiến độ.

**TÓM TẮT:** `find_actions` của Trợ lý đi qua discovery service thật: corpus mô tả action xác định (`corpus_hash` gồm id/schema/nhãn v2/thuật toán) → generation dựng một lần theo (corpus, không gian embedding ghim provider/model/1536/config revision) chỉ sau xác nhận `assistant.discovery_prepare` (Cowork, agentGrantable=false) → lô ≤ 64 tuần tự ở worker ROLE=ai, có đo credit → truy vấn hybrid (vector cosine CHỈ trong tập được phép hiện hành + từ khoá, RRF k60, exact id lên đầu nếu còn hợp lệ) → keyword fallback trung thực có `reason` khi chưa sẵn sàng. Câu hỏi che PII trước embed, embed đo dưới run của lượt; lỗi dừng cứng (credit/budget/huỷ/usage không rõ) không bị nuốt. Cache riêng theo gốc run (HMAC theo workspace, TTL 5', ≤ 128/gốc, chỉ id). Câu hỏi tự do bị che trong `ai_run_step`.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-023e-files.md`; lệch ghi DV-094. Chính: `packages/core/src/ai/assistant/discovery/{corpus,generation,build.queue,build.processor,build-usage,pinned-embedder,embedding-space,prepare.handler,authority,vector-query,ranking,service,cache,find-tool,types}.ts`, `packages/core/src/ai/router/config-revision.ts`, `packages/core/src/authz/fields/history-provenance.ts`, `packages/db/prisma/tenant/action-discovery.prisma` + migration `20261110030000_action_discovery`, `packages/actions/src/assistant-discovery.ts`, `packages/shared/src/assistant/discovery.ts`, nối DI ở `assistant.service.ts`, `ai.jobs.module.ts`, `turn.service.ts`, `meta-tools.ts`, `run.store.ts`, `ai/public.ts`, `approvals/resume.ts` (`resumeSpecOf`).

**TEST RESULTS** (phạm vi TIP, D59):
- Core unit: 881 passed / 1 skipped (recall live, chạy tay). Lint + typecheck core/api/worker sạch.
- Integration API: `assistant-discovery.test.ts` 4/4 (pgvector thật: corpus_not_ready, build ready + hybrid theo quyền, EXPLAIN dùng `action_discovery_document_key` không Seq Scan, che câu hỏi qua RunStore); `actions/assistant.discovery_prepare.action.test.ts` 3/3 (gọi trực tiếp → 403 cowork_only, không generation; agentGrantable false; undo/bulk na); `assistant.test.ts` 16/16.
- Integration worker: `assistant-discovery-composition.test.ts` 1/1 (WorkerModule.forRole('ai') thật, spec `assistant` chạy tiếp có find_actions qua service).
- §5 xếp hạng: fixture 49 ca VI/EN 9 nhóm — keyword fallback 42/49 (sàn ≥ 85%); HYBRID recall@8 embedding thật `text-embedding-3-small` **48/49 = 98,0%** (≥ 95%).
- ai:live `fixtures/ai-eval/assistant-discovery.json` trên `cx/gpt-6-sol`: **8/8, 3 lần/ca, an toàn 0** (`reports/ai-live-assistant-discovery-2026-11-10.md`).
- E2E Trợ lý: mock `pnpm e2e assistant` 8 passed / 6 skipped (skip theo project sẵn có); http `pnpm e2e:http assistant` 3 passed / 3 skipped.
- depcheck: 116 cảnh báo bằng đúng baseline trước thay đổi, 0 lỗi; lint:size / lint:tokens / lint:masks sạch; i18n:check 100%.
- Parity: không đổi UI → không chạy.

**ISSUES DISCOVERED:**
1. ai:live với `cx/gpt-6-sol` lúc đầu 4/8: model truyền `module` không có thật ("contact", "") → kết quả rỗng câm. Sửa: `inputSchema.module` là enum module thật; module lạ → bỏ lọc; module thật mà rỗng → tìm lại không lọc (`find-tool.ts`, test mới).
2. 023d (pha 3, đã có trong nhánh): confirm của meta-tool alias `plan` / `query_data` không có `action_id` → thẻ không hiện / confirm bị huỷ; `update_step` ở lượt sau cùng phiên không thấy plan. Sửa trong `turn.service.ts` (`ALIAS_ACTION`) + `plans/repo.ts` (`planOfRoot` rơi về plan còn sống mới nhất của phiên). Test 023d trong `assistant.test.ts` dùng `lastTool` thay đếm lượt (confirm dựng deps mới).
3. Stack ai:live dùng DB nền tảng test riêng (DC-358) — route chat ở đó cũng phải đổi sang `cx/gpt-6-sol` (DC-424 cập nhật).
4. File tiền nhiệm trong manifest không tồn tại → DV-094.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `ai/agent-gateway.md` | Embed qua ModelSource ghim một candidate (`pinned-embedder.ts`), đo credit dưới run (`queryEmbedder`, `build-usage.ts`); lỗi dừng cứng ném (`assistant-discovery-find-tool.test.ts`) | — |
| `ai/rag.md` | Vector 1536 pgvector, không so vector khác không gian (`embedding_space` trong khoá generation); RRF k60 dùng lại `rrf()` | — |
| `ai/eval.md` | Fixture xếp hạng 49 ca + ai:live 8 ca ×3, model ghi trong report, an toàn 0 | — |
| `actions/action-registry.md` | `assistant.discovery_prepare` canonical, preview/confirm bắt buộc, agentGrantable=false, ma trận action | — |
| `authz/rbac-permissions.md` | Lọc quyền hiện hành TRƯỚC top-K và lại sau rank (`authority.ts`, `ranking.ts`); cache khoá theo dấu vân tay tập được phép | Giới hạn active-step 023d chưa áp (xem Giả định) |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không workspace_id; khoá `(generation_id, action_id)`; EXPLAIN không Seq Scan | — |
| `domain/concurrency.md` | Claim generation nguyên tử, reclaim sau failed, lô tuần tự ≤ 64 | — |
| `domain/validation-defaults.md` | Câu hỏi NFC, cắt 1000 ký tự, rỗng → none | — |
| `ops/observability-security.md` | Câu hỏi che PII trước embed, che trong `ai_run_step`; khoá cache HMAC không chứa câu thô | — |
| `code/file-size-module-layout.md` · `testing.md` | Mỗi file discovery < 200 dòng; test ở file riêng (unit/integration/worker/live) | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/023e-*`, PR vào `dev` (#172, xếp chồng #171) | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Privacy (§3.5 / 015c): không có bản lưu bền câu hỏi thô nào — bước run đã che, cache chỉ id ứng viên + TTL 5', receipt embed không giữ văn bản → không cần đăng ký erase mới trong adapter `ai` (DV-094 cập nhật).
- Giới hạn active-step của 023d trong tập được phép: 023d hiện chưa có cơ chế chặn ghi ngoài bước đang chạy → chưa có gì để giao; discovery lọc theo quyền / chế độ / implemented / module. Nối khi 023d thêm chặn (ghi HANDOFF-NEXT).
- Nhãn corpus v2 thêm cụm "động từ + đối tượng" khớp tiêu đề thẻ xác nhận → corpus_hash đổi, generation cũ phải dựng lại qua prepare.
- **Lệch spec:** DV-094. **Quyết định:** DC-424. Embed thật đã đo (OpenAI); build generation đầy đủ với provider thật qua UI chưa nghiệm thu trên VPS.
