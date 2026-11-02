# TIP-043 — Học hỏi–đáp từ hội thoại, người duyệt trước khi vào RAG

## HEADER
- **Parallel-safe with TIP-019c (AI utilities manifest):** sequential, shares `apps/api/src/http/ai/ai.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before019c.
- **Parallel-safe with TIP-033b (Booking operations manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before033b.
- **Parallel-safe with TIP-012c (Tenant mail manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before012c.
- **Parallel-safe with TIP-015e (Contact merge manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before015e.
- **Parallel-safe with TIP-015f (Contact lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before015f.
- **Parallel-safe with TIP-032c (Commerce edit manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before032c.
- **Parallel-safe with TIP-015d (CRM ownership manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before015d.
- **Parallel-safe with TIP-026b (CRM activity manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before026b.
- **Parallel-safe with TIP-012b (Bank integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before012b.
- **Parallel-safe with TIP-019b (Runtime integration manifest):** sequential, shares `apps/api/src/http/ai/ai.http.module.ts`, `packages/ai/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before019b.
- **Parallel-safe with TIP-025b (Inbox integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before025b.
- **Parallel-safe with TIP-022b (agent behavior manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before022b.
- **Parallel-safe with TIP-014b (Zalo lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before014b.
- **Parallel-safe with TIP-032b (accepted foundation manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before043.
- **Parallel-safe with TIP-045b (hardening manifest):** sequential, shares `apps/api/src/http/ai/ai.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before045b. Recompute for later TIPs.
- **Parallel-safe with TIP-030b (contract files manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/ai/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before043. Recompute when incomplete manifests expand.
- **Parallel-safe with TIP-023c (genui revised manifest):** sequential, shares `apps/api/src/http/ai/ai.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/ai/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before043. Recompute when remaining manifests expand.
- **Parallel-safe with TIP-023c (genui exact manifest):** sequential, shares `apps/api/src/http/ai/ai.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/ai/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023c before TIP-043. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/ai-live/cases.yaml`, `tools/parity/parity.manifest.ts`; integrate TIP-023b before TIP-043.
- **Parallel-safe with TIP-023b (public API wiring):** sequential, shares `packages/shared/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/ai/src/prompts/index.ts`; integrate TIP-023b before TIP-043.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `tools/ai-live/cases.yaml`, `tools/parity/parity.manifest.ts`; integrate TIP-023b before TIP-043. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-032b before TIP-043. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-015b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-043. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate this TIP before 041. Recheck incomplete manifests.
- **Parallel-safe with TIP-038b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 038b. Recheck incomplete manifests.
- **Parallel-safe with TIP-040:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 040. Recheck incomplete manifests.
- **Parallel-safe with TIP-039:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 039. Recheck incomplete manifests.
- **Parallel-safe with TIP-038 (expanded manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 038; recheck after remaining manifests expand.
- **Parallel-safe with TIP-038:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `tools/parity/parity.manifest.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 038. Recheck after incomplete manifests expand.
- **Additional overlap with TIP-037 caps UI:** sequential, shares `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`; integrate this TIP before 037.
- **Parallel-safe with TIP-037:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `tools/parity/parity.manifest.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 037. Recheck when incomplete manifests expand.
- **Parallel-safe with TIP-042c:** sequential, shares `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 042c. Recheck after incomplete manifests expand.
- **Parallel-safe with TIP-042b:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `tools/parity/parity.manifest.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 042b; recheck after incomplete manifests are expanded.
- **Parallel-safe with TIP-042:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `tools/parity/parity.manifest.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 042. Recheck intersections when incomplete manifests are expanded.
- **Parallel-safe with TIP-020b:** sequential, shares `packages/actions/src/index.ts`; integrate 020b after 036, before 043/045b. For 043 also shares `packages/db/prisma/tenant/ai-kb.prisma`, `packages/core/src/ai/ai.module.ts`, `apps/api/src/http/ai/ai.http.module.ts`, `apps/web/src/features/settings/components/RagSection.tsx`, `apps/web/src/shared/api/mock/domains/settings-ai.ts`, settings/action locale files.
- TIP-ID: TIP-043; Project: AppChat V2; Module: AI/KB suggestions; Priority: P1; Estimated: L.
- Depends on: 016, 020, 022, 023b (catalog/coverage/live harness); tích hợp sau 036 và các TIP 023c/030b/032b/015b có file chung; trước 044/045b/046.
- **Dòng COVERAGE nhận:** REQ-D04b, D29b, STD-ai-rag-9, ACT-kb.suggestion.approve, ACT-kb.suggestion.reject, BP-4.4-ai-e.
- **Parallel-safe with:** sequential, shares `packages/actions/src/index.ts` với 015b/023b/023c/030b/032b/036/045b; `packages/core/src/ai/jobs/ai.jobs.module.ts` với 023b/036/045b; `tools/ai-live/cases.yaml` với 023b/036. 043 sau các TIP trước và trước 045b; chưa mở song song với TIP chưa có manifest.
- **Files touched:** C=create, M=modify, bảng dưới. Phần này chỉ là tài liệu, chưa cho phép code khi câu A chưa hoàn tất.

| Op | File |
|---|---|
| M | `packages/db/prisma/tenant/ai-kb.prisma` |
| C | `packages/db/prisma/tenant/migrations/20261102004300_kb_suggestions/migration.sql` |
| C | `packages/actions/src/kb-suggestions.ts` |
| M | `packages/actions/src/index.ts` |
| C | `packages/shared/src/api/kb-suggestions.ts` |
| M | `packages/shared/src/api/index.ts` |
| C | `packages/shared/src/kb/suggestion-events.ts` |
| M | `packages/shared/src/index.ts` |
| C | `packages/ai/src/kb/suggestion-redaction.ts` |
| C | `packages/ai/src/prompts/kb-suggestion.vi.md` |
| C | `packages/ai/src/prompts/kb-suggestion.en.md` |
| M | `packages/ai/src/prompts/index.ts` |
| M | `packages/ai/src/index.ts` |
| C | `packages/core/src/ai/kb/suggestions/suggestions.providers.ts` |
| C | `packages/core/src/ai/kb/suggestions/suggestion.repo.ts` |
| C | `packages/core/src/ai/kb/suggestions/suggestion.service.ts` |
| C | `packages/core/src/ai/kb/suggestions/suggestion.handlers.ts` |
| C | `packages/core/src/ai/kb/suggestions/source-publisher.ts` |
| C | `packages/core/src/ai/kb/suggestions/suggestion.consumer.ts` |
| C | `packages/core/src/ai/kb/suggestions/suggestion.jobs.ts` |
| C | `packages/core/src/ai/kb/suggestions/suggestion.rules.ts` |
| M | `packages/core/src/ai/ai.module.ts` |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` |
| M | `apps/api/src/http/ai/ai.http.module.ts` |
| C | `apps/api/src/http/ai/kb-suggestions.controller.ts` |
| C | `apps/web/src/features/settings/api/kb-suggestions.ts` |
| M | `apps/web/src/features/settings/components/RagSection.tsx` |
| C | `apps/web/src/features/settings/components/KbSuggestionsPanel.tsx` |
| C | `apps/web/src/features/settings/components/KbSuggestionReview.tsx` |
| C | `apps/web/src/features/settings/hooks/useKbSuggestions.ts` |
| M | `apps/web/messages/vi/settings.json` |
| M | `apps/web/messages/en/settings.json` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| M | `apps/web/src/shared/api/mock/domains/settings-ai.ts` |
| C | `packages/ai/test/kb-suggestion-redaction.test.ts` |
| C | `packages/core/test/kb-suggestions.test.ts` |
| C | `apps/api/test/integration/kb-suggestions.test.ts` |
| C | `apps/api/test/integration/kb-suggestions.contract.test.ts` |
| C | `apps/web/e2e/kb-suggestions.spec.ts` |
| C | `apps/web/e2e/http/kb-suggestions.spec.ts` |
| M | `tools/ai-live/cases.yaml` (do 023b tạo trước) |
| M | `tools/parity/parity.manifest.ts` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| C | `coding-packs/reports/TIP-043-completion.md` |

## CONTEXT
- Working dir: repo AppChat_Ver2; stack theo BUILDER-HANDOFF: Nest/Prisma/Postgres native, BullMQ, AI SDK qua AgentEngine, Next/Ant Design, zod.
- Mốc khảo sát `c55298b`: `ai-kb.prisma` có origin conversation nhưng không có KbSuggestion; `ai.controller.ts:48` chỉ có `/settings/kb`, chưa có `/kb/suggestions`; không ActionDef approve/reject.
- `kb.read.ts:49-58` coi nav learned = mọi source ready có chunk. Không được trộn pending suggestions vào source ready rồi để agent tìm được trước duyệt.
- `RagSection.tsx:23-30` có nav learned/conv, chưa review UI. Dùng primitive panel/drawer có sẵn, không dựng lại Settings shell.
- `PiiMasker` ở `packages/ai/src/reply/pii.ts:1-3` cố ý không che điện thoại; có map khôi phục. Không dùng nguyên trạng để xuất tri thức dùng chung hoặc lưu raw mapping vào suggestion.
- `conversation-state.handlers.ts:41-51` đặt status rồi phát conversation.updated; enum hiện hành có `closed`, không có `resolved`. Đọc yêu cầu “đã giải quyết” theo trạng thái đóng hiện có, không tự thêm trạng thái. Archive/hide không đồng nghĩa đã giải quyết.
- Đọc trước: REQ-D04b, D29/D54; Blueprint §2.2 kb_suggestion, §2.3 kb.suggestion_created, §3.4 kb.suggestion.*, §4.4; `standards/ai/rag.md` §9; report TIP-020/022 và prototype vùng RAG.

## APPLICABLE STANDARDS
- `ai/rag.md`, `ai/agent-gateway.md`, `ai/eval.md`: human review, che PII, public/internal, gateway/credit/log, suite cố định.
- `actions/action-registry.md`, `events/outbox.md`, `api/response-envelope.md`: mọi ghi qua Executor, commit+outbox, idempotency, zod DTO.
- `authz/rbac-permissions.md`, `database/tenant-db.md`, `database/indexing.md`: tenant riêng, quyền và scope, truy vấn ID trước payload, covering index.
- `domain/concurrency.md`, `domain/validation-defaults.md`, `domain/gap-filling.md`, `ops/observability-security.md`: CAS/retry, validate, không nới quyền, redaction log.
- `ui/frontend-structure.md`, `ui/interaction-patterns.md`, `ui/prototype-parity.md`, `i18n/i18n.md`, `code/file-size-module-layout.md`, `code/testing.md`; D59 ở GOAL-BACKEND.

## Rà trước khi làm
1. Đọc code/report dependency sau rebase; rà manifest M/C và đường tích hợp, không lấy số dòng trong CONTEXT làm bằng chứng hiện tại.
2. Kiểm event conversation.updated và luồng bulk/undo cũng tới consumer. Đọc role/scope kb.manage và inbox; không tự cấp inbox cho người duyệt KB. Không hiển thị nguyên hội thoại cho người chỉ có kb.manage.
3. Kiểm fixture mock đăng ký ở đâu và API test include thật. Cases live chỉ thêm sau khi 023b tạo harness; tuyệt đối không đưa secret/PII khách thật vào fixture.
4. Đo file length: module chỉ import/providers facade 1–2 dòng; logic nằm trong suggestions/. Rà overlap với 037–046 mới viết; mọi shared file tích hợp tuần tự.

## TASK
Tự đề xuất hỏi–đáp từ hội thoại đã đóng, đưa vào hàng chờ có nguồn gốc đã che PII. Chỉ người có kb.manage sửa/duyệt mới sinh nguồn RAG; retry, chạy lại hay lỗi model không được tự xuất bản.

### 1. Schema và đọc
- Tạo KbSuggestion trong ai-kb.prisma theo Blueprint: conversation_id, question, answer, source_message_ids, status pending/approved/rejected, edited, reviewed_by/at, kb_source_id. Thêm version và source fingerprint cho CAS/dedupe; source IDs scalar, không Prisma relation xuyên domain.
- Question/answer đã che PII; không copy raw transcript hay bảng unmask. IDs gốc phục vụ truy vết server, không trả cho người không có quyền inbox tương ứng.
- Unique fingerprint theo conversation + message IDs + nội dung normalized; duplicate delivery không thêm cùng cặp. Unique kb_source_id khi non-null. Index `(status,created_at DESC,id DESC) INCLUDE (conversation_id,version,kb_source_id)`; index conversation để cleanup/trace; không INCLUDE answer dài.
- GET `/v1/kb/suggestions?status=&cursor=&limit=` và `/:id`: kb.manage, DB qua resolver, scope theo quyền KB; raw conversation/source message cần thêm inbox access riêng. Dùng deferred join IDs rồi payload, stable cursor, limit<=100. Không count/raw text xuyên tenant.

### 2. Đề xuất từ hội thoại
- Consumer outbox conversation.updated chỉ xét khi status hiện là closed; lấy tối đa 100 tin gần mốc đóng, bỏ tin nội bộ/note, tin bị xoá, attachment binary. Archive/hide/open/pending/snoozed không sinh suggestion. Chụp cutoff message ID, job id dựa trên conversation+cutoff, kiểm lại trước ghi.
- Cặp đủ điều kiện: câu hỏi khách + câu trả lời nhân viên, hoặc câu trả lời agent có lời khen/xác nhận tích cực **từ tin khách**, không tin agent tự đánh giá. Model phải trả source IDs thuộc tập input; schema và kiểm server loại ID bịa. Chọn 0–5 cặp kiến thức tái sử dụng; không chuyển nguyên chat thành KB.
- Làm redaction riêng cho xuất tri thức: tái dùng masker CCCD/thẻ/STK, thêm email/điện thoại và tên/địa chỉ khách lấy từ context để thay bằng nhãn chung. Không unmask; lọc trước gửi model, sau output và sau người edit. Không khẳng định regex che được mọi PII: ca không thể khái quát an toàn thì bỏ đề xuất.
- Prompt có version vi/en; nội dung hội thoại là dữ liệu không đáng tin, không lệnh hệ thống. Không đưa giá/tồn/lịch trống/công nợ vào đáp án cố định; hướng dẫn dùng read action, loại câu chỉ chứa dữ liệu biến động.
- AgentEngine/AiRunner kind suggestion, schema output, budget/timeout/credit; model call ngoài transaction. Thiếu credit/model lỗi/schema sai: run failed có lý do đã redacted, không source/suggestion nửa vời; retry không charge trùng step.
- Job gọi action system-only `kb.suggestion.propose` qua Executor để ghi pending + outbox kb.suggestion_created. Người dùng không được giả source system; action không agentGrantable. Event chỉ chứa ID, thông báo/WS cho kb.manage không kèm raw PII; dùng notify kind `ai_review` hiện có, link hàng chờ, không tự tạo email gửi khách.

### 3. Người duyệt và xuất bản
- `kb.suggestion.approve`: `{suggestion_id,if_version,question?,answer?,folder_id?,visibility?}`; output `{suggestion_id,status,kb_source_id}`. `kb.suggestion.reject`: `{suggestion_id,if_version,reason?}`; output `{suggestion_id,status}`. Risk write, permission kb.manage, agentGrantable=false; mô tả/example/i18n, invalidates suggestions/kb. Preview hiển thị diff đã che PII; chưa xác nhận không mutate.
- Approve chỉ pending, CAS version, chỉnh sửa qua input trước khi duyệt; folder hiện hữu, visibility theo D54/kế thừa thư mục, không mở quyền vì model chọn public. Từ chối field/ID ngoài schema, câu hỏi/đáp rỗng sau trim, vượt 200/5000 ký tự, còn dữ liệu nhạy cảm.
- Cùng transaction: ghi trạng thái reviewed, edited, reviewer/time, tạo đúng một source origin conversation (body đã chỉnh, question+answer), liên kết source và outbox yêu cầu ingest. Không gọi Executor lồng trong transaction; dùng source-publisher dùng chung quy tắc ingest, không controller/service tự bypass action.
- Consumer enqueue kb-ingest từ outbox sau commit, idempotent source/ingest_seq; Redis down vẫn có event để retry. Pending/rejected tuyệt đối không có kb_chunk. Approved nhưng ingest failed vẫn hiện failed, không giả đã học.
- Hai người approve/reject cùng lúc: một thành công, bên kia CONFLICT/STALE_VERSION; cùng Idempotency-Key trả lại kết quả đã có. Đã approved muốn thay đổi thì dùng lifecycle source hiện có, không approve lần nữa tạo bản trùng.

### 4. UI và vận hành
- Trong Dữ liệu RAG giữ nav learned hiện có; thêm hàng/tab “Chờ duyệt” với số pending, drawer so sánh hỏi–đáp, edit, chọn thư mục/visibility, approve/reject. UI ngoài prototype ghi PD theo chuẩn, không sửa baseline để che sai khác.
- Ghi chỉ useAction, read TanStack Query; lỗi 403/409/mạng có xử lý, pending không dán nhãn “đã học”. Người không kb.manage không nhìn hàng chờ, server vẫn chặn.
- Không tự dẫn người duyệt tới transcript ngoài scope; link nguồn chỉ hiện khi API xác nhận có inbox access. Hiển thị vi/en, keyboard/focus, loading/empty/error; mobile 390.
- API và worker nạp cùng handler; shutdown dừng worker, retry/restart không mất pending. Không scheduler quét toàn DB vô hạn hay giữ state workflow trong RAM.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then |
|---|---|
| AC1 | Given hội thoại closed có trả lời nhân viên, When event lặp 10 lần, Then <=5 cặp khác nhau, mỗi fingerprint một pending, không source/chunk trước duyệt. |
| AC2 | Given open/archived/hidden hoặc agent trả lời không được khách khen, When consumer chạy, Then không học; câu khen do agent tự viết không đủ điều kiện. |
| AC3 | Given email/phone/tên/CCCD/thẻ/STK và prompt injection trong tin, When model call/ghi/log/review, Then không lộ raw PII, không theo lệnh publish; IDs bịa bị loại. |
| AC4 | Given pending, When người có kb.manage sửa đáp án rồi approve, Then đúng một source chứa bản đã sửa, origin conversation và visibility đúng; ingest hoàn thành mới có chunk truy vấn được. |
| AC5 | Given pending, When reject hoặc worker/model/Redis lỗi, Then không nguồn tự xuất bản; restart/duplicate consume không double source/charge. |
| AC6 | Given hai reviewer và 2 tenant, When approve/reject đồng thời hoặc đổi workspace/ngoài scope, Then CAS chỉ một thắng, tenant khác 403/404; kb.manage không tự cấp inbox; agent không được approve/reject. |
| AC7 | Given 10k suggestions, When pending list cursor, Then không trùng/mất tại cùng timestamp, ID-first/deferred join đúng index; EXPLAIN ANALYZE ghi report. |
| AC8 | Given UI mock và HTTP, When edit→preview→approve/reject→reload, Then trạng thái DB đồng nhất zod, không toast giả; empty/error/409/keyboard/mobile và vi/en đạt. |
| AC9 | Given 9router fixture riêng, When 5 ca (nhân viên, agent được khen, không được khen, PII, injection), Then ca an toàn/quyền 100%; rubric hỏi–đáp theo ai/eval ≥90%, chấm tay và ghi model/prompt/run/cost, không key. |

### Lệnh test builder (chưa chạy ở phiên viết tài liệu)
- `pnpm --filter @appchat/ai test -- kb-suggestion-redaction`; `pnpm --filter @appchat/core test -- kb-suggestions`.
- `pnpm --filter @appchat/api test:integration -- kb-suggestions` collect cả integration và contract; PG/Redis native test riêng, không đụng demo.
- `pnpm e2e kb-suggestions`; `pnpm e2e:http kb-suggestions`; `pnpm parity settings:rag`; thêm state review vào manifest theo PD, `pnpm i18n:check`; `pnpm ai:live` sau 023b.
- D59: test targeted khi làm; trước commit lint/typecheck/unit package đổi + depcheck; chốt full lint/typecheck/unit/integration/depcheck/build, mock/http E2E flow + full hồi quy một lần, parity liên quan (shared → --done). Không có provider thật thì AC9 chưa đạt, không giả live bằng mock.

## CONSTRAINTS
- DO NOT: tự học ngầm, lấy internal trả khách, thay quyền KB/inbox, SDK trực tiếp trong core, ghi secret/raw transcript vào fixture/log/suggestion.
- REUSE: AgentEngine/AiRunner, Clock, Executor, outbox, KbIngestQueue, query service/scope, primitive/token UI. No Docker, no vector DB mới, tests file riêng.
- SKIP: privacy.erase/ẩn danh khách là domain khác; không dùng `contact.forget` cho xoá fact. Rerank/re-embed toàn kho thuộc 046; 044 eval tổng thể không thay AC của TIP này.

## BUILDER-CHECKLIST
- [ ] Manifest/dependencies/overlap đã rà; module façade, backend <600/FE <400, không inline tests.
- [ ] AC1–AC9 có bằng chứng thật từng dòng, không coi regex hoặc test mock là kiểm chứng hết PII.
- [ ] Chỉ human kb.manage duyệt; pending/rejected không vào RAG; tenant/scope/source access chặn server.
- [ ] Action/outbox/ingest idempotency, CAS, retry crash và credit đúng.
- [ ] D59 + live/parity/EXPLAIN/i18n, report chỗ chưa chạy; update parts + merge, commit SHA sạch và PR chỉ dev.
