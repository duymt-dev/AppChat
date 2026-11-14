### COMPLETION REPORT — TIP-021b

**STATUS:** DONE — nhánh `tip/021b-agent-drafting` (xếp chồng #182), một pha; SHA ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 42.

**TÓM TẮT:** Soạn agent tìm action được phép trước khi sinh, sinh theo schema, công bố có hàng rào; bản soạn không bao giờ tự thành agent.
- **Hợp đồng action:** schema cấu hình agent tách ra `packages/actions/src/agent-config.ts`; `agent.draft_from_description` ở `agent-drafting.ts`.
  - Input `{ description 4–2000, request_id uuid }`; output `{ draft, generation_info }`.
  - Quyền `agents.manage`, risk read, không agentGrantable.
- **Định danh lần soạn** (`drafting/admission.ts`):
  - Định danh = actor + sha256(action + request_id). Binding `agent_draft_publication` được cấp trước mọi việc.
  - Gửi lại cùng request_id → cùng operation, không tạo run mới. Cùng khoá nhưng mô tả khác → 409 `description_changed`.
- **Thứ tự xử lý** (`drafting/providers.ts`):
  1. Tạo run 019b, dưới cha tin cậy nếu có.
  2. Discovery 023e đo dưới run đó (`drafting/discovery.ts`), với bộ lọc `admit = agentGrantable` áp TRƯỚC rank / limit. Mô tả chia ≤ 3 đoạn × 1000 UTF-16, 8 kết quả mỗi truy vấn, ≤ 24 ứng viên, vân tay tất định.
  3. Sinh `Output.object` không tool (`drafting/generation.ts`): `tools` là enum đúng các id ứng viên; đầu ra protected.
  4. Kiểm lại theo quyền hiện tại (`drafting/validation.ts`).
  5. CAS công bố trên phase + validation_generation (`drafting/publication.ts`).
- **Nói thật nguồn** (`drafting/result.ts`):
  - Dừng cứng (credit / ngân sách / huỷ / usage không rõ / quyền) → lỗi, không thành bản soạn.
  - Mẫu tất định chỉ dùng cho `no_model_route` / `structured_unsupported` / `malformed_output`, luôn giao với tập ứng viên.
- **Engine structured** (`packages/ai/src/gateway/structured.ts` + `engine.ts`):
  - `RunRequest.responseSchema`; trộn tool với schema → `STRUCTURED_MIXED_MODE`.
  - Usage được ghi trước khi kiểm schema (`STRUCTURED_MALFORMED`).
  - Router chỉ chọn provider có `capabilities.json_schema` (`STRUCTURED_UNSUPPORTED` khi không có).
  - Provider openai_compatible đã khai `json_schema` sẽ gửi `response_format: json_schema` thật.
- **Che dữ liệu riêng tư:**
  - Run detail ẩn `result_text` khi output protected.
  - History ẩn mô tả trong bước `call_action`.
  - `run-events` chỉ nhận tín hiệu.
  - Quên khách vô hiệu binding (inventory + cleanup AI).
  - Hồi phục gộp vào `AiUtilityRecoveryInstaller`: quá lease 120 s → USAGE_UNKNOWN; rảnh > 24 h → invalidated.
- **FE:**
  - Hook `useAgentDrafting` giữ request_id khi thử lại cùng mô tả, đổi khi mô tả đổi hoặc bấm "Soạn lại".
  - Thẻ `AgentDraftProposal` nói thật nguồn (AI hay mẫu có lý do), kèm cảnh báo và tool có mức rủi ro.
  - Giữ hai đường xác nhận (xuất bản / mở Builder). Lỗi giữ nguyên mô tả, có nút thử lại và nút làm tay.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-021b-files.md`; lệch DV-104. Chính:
- `packages/actions/src/{agent-config,agent-drafting,ai,index}.ts`.
- `packages/ai/src/gateway/{types,structured,engine}.ts`, `router/{router,providers}.ts`, `testing/{mock-agent-draft,mock-model}.ts`.
- `packages/core/src/ai/agents/{agent-draft,agent-llm.handlers}.ts`, `agents/drafting/{admission,discovery,generation,validation,publication,result,providers}.ts`.
- `assistant/discovery/{service,authority}.ts`, `runs/{runner,run-detail,run-events,runtime.providers}.ts`, `privacy/{inventory,cleanup,adapter}.ts`, `authz/fields/history-provenance.ts`, `ai.module.ts`, `public.ts`.
- `packages/db/prisma/tenant/agent-drafting.prisma` + migration `20261111080000_agent_drafting_publication`.
- `apps/web/src/features/agents/{types.ts,hooks/useAgentDrafting.ts,components/AgentDraftProposal.tsx,components/AgentAiDrawer.tsx}`, `shared/api/mock/domains/agents.ts`, `messages/{vi,en}/agents.json`.
- Test:
  - `packages/actions/test/agent-drafting.test.ts`, `packages/ai/test/structured-generation.test.ts`.
  - `packages/core/test/agent-draft-{discovery,authority,metering,publish}.test.ts` + `fixtures/agent-draft-harness.ts`.
  - `apps/api/test/integration/{agent-drafting,agents}.test.ts`, `apps/worker/test/integration/agent-drafting-composition.test.ts`.
  - `apps/web/src/features/agents/agent-drafting.test.tsx`, `apps/web/e2e/{agents,http/agents-ui}.spec.ts`.
- ai:live: `fixtures/ai-eval/agent-drafting{.json,-seed.mjs}`, `tools/ai-live/src/{agent-draft-judge,cases,runner,cli}.ts`.

**TEST RESULTS** (phạm vi TIP, D59 + luật goal: không full integration / full E2E):

| Phạm vi | Kết quả |
|---|---|
| Unit actions | 31 (gồm agent-drafting 5) |
| Unit ai | 91 (gồm structured-generation 14) |
| Unit core | 1003 (+1 skip) — agent-draft-* 39, assistant-discovery 65 |
| Unit web (agents + mock) | 226 (gồm agent-drafting.test.tsx 4) |
| Unit ai-live | 87/87 |
| Integration API (Postgres 16 + Memurai thật) | agent-drafting 5 + agents 17 + assistant-discovery 4 = 26 — gồm EXPLAIN 100k dòng (Index Scan khôi phục) |
| Worker (agent-drafting-composition + assistant-discovery-composition) | 2/2 |
| E2E mock agents (`E2E_PORT=3537`) | 6 passed (6 skipped = dự án mobile) |
| E2E http agents-ui (`E2E_HTTP_PORT=3538`) | 2 passed (2 skipped mobile) |
| Parity `agents:ai-create` | PASS 0.0074 |
| ai:live agent-drafting (6 ca × 3 lượt, model thật qua 9router) | **6/6, 18/18 lượt, an toàn 0, ĐẠT** — `reports/ai-live-agent-drafting-2026-11-11.md` |
| Build api / worker | sạch |
| Typecheck actions / ai / core / web / ai-live · lint gói đổi | sạch |
| depcheck | 116 = baseline |
| lint:size / lint:tokens / lint:masks / i18n:check | sạch / 100% |

Đỏ có sẵn, ngoài phạm vi: `packages/db/test/prisma-stubs.test.ts` có 2 ca đỏ. Đã chứng minh trên base `286fb06d`: 5 file tenant (`assistant-input`, `contract-signing`, `event-delivery`, `event-protocol`, `system-action`) đã có mà không nằm trong OWNERS, và dòng đầu `contracts.prisma` lệch header. Test không thuộc manifest 021b nên không sửa; `agent-drafting.prisma` ghi đúng header sở hữu TIP-021b.

**ISSUES DISCOVERED:**
1. Registry trải `Object.values(ai)` → re-export schema không phải ActionDef từ `ai.ts` làm sập `tiersOf`. Sửa: schema chỉ xuất qua `index.ts`.
2. `findActions` cần mọi từ khớp → mô tả dài không ra ứng viên. Sửa: xếp hạng từ khoá IDF riêng khi có `admit`. Đường Trợ lý không đổi.
3. ai:live lần 1: 402 CREDIT_EXHAUSTED vì ví workspace fixture `[ai-live]` (DB test) đã cạn sau các suite trước. Đã nạp 5000 credit test qua `WalletService.topup` (refType `test`).
4. ai:live lần 2: `malformed_output` vì SDK openai-compatible bỏ `responseFormat` khi thiếu `supportsStructuredOutputs`. Sửa: bật theo `capabilities.json_schema`.
5. ai:live lần 3: model thiếu khoá `emoji` vì router không ép `strict`. Sửa: chỉ dẫn nêu đủ 11 khoá; core vẫn kiểm schema đủ.
6. ai:live lần 4: 2/6 vì kho vector lạnh (DB test không có route embed) → từ khoá khớp chuỗi con xếp sai ("cu" khớp "cuoc"). Sửa: khớp nguyên từ + cụm hai từ (trọng số ×2), bỏ ví dụ JSON khỏi văn bản đếm, không chuẩn hoá độ dài → 6/6.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `ai/agent-gateway.md` | Structured qua engine sẵn có (cùng hook attempt / usage / lỗi), core không import SDK; router fail closed theo `json_schema`; không tool trong lượt sinh | — |
| `ai/eval.md` | ai:live 6 ca × 3, chấm theo API thật (mode model, tool ⊆ cấp được, want / forbid, replay cùng operation, không tạo agent, Sales 403) | — |
| `actions/action-registry.md` | `agent.draft_from_description` giữ ID / quyền / risk / không grantable; schema một nguồn (`agent-config.ts`), không vòng import | — |
| `authz/rbac-permissions.md` | Discovery ∩ quyền hiện tại ∩ agentGrantable trước rank; kiểm lại quyền lúc công bố + reproject khi gửi lại (`tools_revoked`); Sales 403 trước model | — |
| `ops/observability-security.md` | Mô tả bao khối dữ liệu (chống tiêm lệnh); PII che trước embed; run detail / history không lộ mô tả hay đầu ra protected | — |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không `workspace_id`; unique `(actor_id, request_key_hash)`; index hồi phục partial `(phase, updated_at, id) INCLUDE (...)`; EXPLAIN 100k | Tên migration (DV-104 mục 1) |
| `api/response-envelope.md` | `{ data }` / `{ error: { code } }`; 402 / 403 / 409 / 502 phân loại rõ | — |
| `ui/frontend-structure.md` · `i18n/i18n.md` | Drawer là orchestrator (185 dòng), hook + component riêng; chuỗi vi + en | — |
| `code/testing.md` | Test ở file riêng theo manifest; integration / E2E chỉ phạm vi TIP | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/021b-*`, PR vào dev, xếp chồng #182 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Không có ứng viên là kết quả hợp lệ: `tools` rỗng + cảnh báo `no_candidate_tools`, không phải lỗi.
- Discovery soạn không dùng cache 023e (`cache: null`) — mỗi lần soạn là một gốc riêng.
- Mock FE sinh tất định `no_model_route`, không giả mode model.

**SAU MERGE:** `db:migrate-tenants` cho migration `20261111080000_agent_drafting_publication` + `db:setup` (template) + build api / worker.

**CHƯA NGHIỆM THU:** không có (ai:live chạy model thật qua 9router; embed discovery ở DB test chạy nhánh từ khoá trung thực).
