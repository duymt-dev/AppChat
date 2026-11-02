### COMPLETION REPORT — TIP-021

**STATUS:** DONE (model giả — chưa nghiệm thu với LLM thật, Q-001)
**COMMIT:** `f3243e3` (code) trên nhánh `tip/021-agents` (xếp chồng trên `tip/020-rag-kb`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Schema: migration `tenant/migrations/20261031700000_021_ai_agents` (enum + `ai_agent` / `ai_agent_version` / `approval_request` / `ai_governance`; viết tay: FK cascade phiên bản, partial `ai_agent_live_created_idx`, `approval_request_pending_expires_idx`, `approval_request_run_idx`, `ai_run_agent_idx … INCLUDE (conversation_id)`, CHECK ngưỡng 50–95 / phiên bản / singleton / TTL 1–720); `platform/migrations/20261031700000_021_agent_template` (`agent_template`).
  - Core `ai/agents/{catalog.ts, agent.store.ts, agent-tools.ts, agent-authz.ts, agent.runtime.ts, agent-draft.ts, agent.handlers.ts, agent-llm.handlers.ts, agents.read.ts, templates.seed.ts, agent-names.ts}`, `ai/approvals/{approval-permission.ts, approval.gateway.ts, approval.handlers.ts, approvals.read.ts, approvals.installer.ts, resume.queue.ts, resume.ts}`, `ai/governance/governance.ts`, `ai/events/agents.rules.ts`, `ai/jobs/ai-resume.processor.ts`.
  - Shared i18n server `{vi,en}/ai.ts`.
  - API `http/ai/agents.controller.ts`; test `integration/agents.test.ts` (17).
  - FE `features/inbox/components/AgentToolsMenu.tsx`, mock `domains/agent-tools.ts`, `mock/agents-shape.test.ts` (2); E2E `e2e/http/agents.spec.ts` (2).
  - TIP: `coding-packs/tips/TIP-021-agents.md`.
- Modified: `tenant/ai-agents.prisma`, `platform/templates.prisma`; kernel `actions/{action-context.ts (approvalId), handler.ts (prepare), executor.ts (prepare ngoài transaction, ApprovalGateway.consume, setApprovals)}`; `packages/actions/src/ai.ts` (`agent.create*` `db: 'platform'`); `packages/shared/src/{api/ai.ts (agent / version / template / tools / approval / governance schema), events.ts (agent.* / approval.*), i18n/server/index.ts}`; core `ai/{ai.module.ts, public.ts, jobs/ai.jobs.module.ts (worker ai-resume), runs/{run.store.ts, runner.ts} (approval_id trong state)}`, `channels/{channels.module.ts (AgentNames thật), actions/channel-manage.handlers.ts, webchat/webchat.handlers.ts}` (gán agent phải tồn tại), `inbox/public.ts`, `notify/events/domain.rules.ts`, `test/kb-unit.test.ts` (timeout lần nạp xlsx đầu); API `ai.http.module.ts`, `integration/channels.test.ts` (AC6 dùng agent thật); FE `features/inbox/{api.ts, components/ComposerPopovers.tsx}` (menu ＋ đọc quyền agent thật), `features/agents/hooks/useAgentBuilder.ts` (tool mặc định `conversation.set_status`), mock `domains/agents.ts` (402 kèm fields), `mock-transport.ts`; `tools/contract/src/cases.ts`; `coding-packs/{DECISIONS.md, DEVIATIONS.md, goals/GOAL-BACKEND.md}`.

**TEST RESULTS:**
- Acceptance criteria: 6/6 pass
  1. Migration 021: index viết tay + CHECK + FK; EXPLAIN danh sách agent sống → `ai_agent_live_created_idx`, duyệt chờ → `approval_request_status_requested_at_idx` / quá hạn → `approval_request_pending_expires_idx` — **pass**
  2. Vòng đời: tạo → nháp v0; xuất bản → v1 `active`; sửa → `dirty`, bản chạy giữ nguyên; v2; quay lại v1 → v3 = cấu hình v1 (`↩ v1`); sửa + hoàn tác; tạm dừng / chạy; nháp không tạm dừng được (409); xoá khi đang gán kênh → 409 `HAS_DEPENDENCIES`; bỏ gán → xoá + hoàn tác; tool ngoài `agentGrantable` → 422; sales → 403; gói Miễn phí agent thứ hai → 402; `create_and_publish` + hoàn tác — **pass**
  3. `agent.test` (bản nháp, `ai_run.dry_run`, trừ credit, không ghi nghiệp vụ); `draft_from_description` (tool ⊆ quyền người gọi); `optimize_prompt` (thêm khối định dạng một lần) — **pass** (model giả)
  4. Duyệt: 202 `approval_required` + `approval_request` + event + `GET /approvals`; approve → action chạy đúng một lần (job chạy lại không chạy lần hai), quyết lại 409; run chờ duyệt → approve → `completed`; reject → `{ rejected }`; thiếu quyền gốc → 403; hết hạn → `expired` + run `handoff`; worker ROLE=ai + queue thật tự chạy job `ai-resume` — **pass**
  5. `GET /agents`, `/agents/meta`, `/agent-templates` (lọc nhóm / ngành / tìm không dấu), `/agents/:id/tools`, `/conversations/:id/agent-tools`, `/settings/governance` khớp zod FE; mock shape test; contract `agent.create` (idempotent) + `governance.update` mock + HTTP — **pass**
  6. E2E http `agents.spec.ts`: Builder (mẫu prompt → tối ưu → chat thử → xuất bản) → thẻ v1 → v2 → quay lại v3 → tạm dừng → tải lại vẫn giữ; Governance PII + từ khoá cấm lưu qua tải lại — **pass** (2 passed)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (7 package đổi) **21/21**; `pnpm depcheck` xanh; `lint:size`, `i18n:check` (100%), `lint:tokens` xanh.
- **Cổng "chốt TIP":** `pnpm turbo run build lint typecheck test` **46/46** task · `api test:integration` **210 passed** (22 file, gồm contract HTTP) · contract mock (web test) xanh · `pnpm depcheck` xanh · `i18n:check` 100% (4497 key) · `lint:size` / `lint:tokens` xanh · smoke worker `ROLE=ai` bản build — 0 log error (nạp AiJobsModule + module domain cho `ai-resume`) · **E2E http 18 passed · 12 skipped** (toàn bộ, gồm `agents.spec.ts` mới) · full E2E hồi quy mock **222 passed · 0 failed · 196 skipped** · parity `agents:list` 0.46% · `agents:builder` 1.16% · `agents:test-chat` 0.08% · `inbox:default` 4.54% · `inbox:ai-panel` 3.76% (baseline goal FE 4.06% / 4.80%).

**INDEX / EXPLAIN:** danh sách agent `WHERE deleted_at IS NULL ORDER BY created_at DESC` → partial `ai_agent_live_created_idx`; hàng chờ `WHERE status = $1 ORDER BY requested_at DESC` → `(status, requested_at DESC)`; quét hết hạn `WHERE status='pending' AND expires_at < now` → partial `(expires_at)`; run theo duyệt → partial `(run_id)`; thống kê thẻ agent `ai_run (agent_id, status) INCLUDE (conversation_id)` (index only); phiên bản `(agent_id, version DESC)` unique.

**ISSUES DISCOVERED:**
- Kernel cần móc `prepare` (gọi model ngoài transaction) và cổng duyệt cài từ module ai — DV-004, DC-111, DC-112.
- Handler `agent.*` dùng model phải để `TENANT_RESOLVER` tuỳ chọn: `AppModule` khởi động không DB (test health) không resolve được.
- Thêm cột `approval_request.result` + `ai_run_agent_idx` sau khi migration 021 đã chạy trên DB dev → vá tay template dev; file migration đã gồm, môi trường mới không ảnh hưởng.
- Worker `ROLE=ai` chỉ có handler của các domain đã nạp (billing, authz, channels, crm, inbox); action duyệt thuộc domain khác trả `NOT_IMPLEMENTED` cho run — bổ sung module khi TIP domain xong (DC-115).
- FE Builder mặc định có tool `conversation.close` không tồn tại → đổi `conversation.set_status` (DC-119).

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-111 … DC-119. **Lệch spec:** DV-004.

**Chưa nghiệm thu với provider thật:** chất lượng trả lời chat thử, soạn agent từ mô tả, tối ưu prompt với LLM thật (9router — Q-001); hiện kiểm luồng + định dạng + credit bằng model giả, đầu ra không đúng JSON → bản tất định.

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-022 (agent trực kênh): `agentSystem(cfg)` + `agentToolSpecs(executor, runToolIds(cfg.tools, connected), { agent, commander })` + `runOnce` đã sẵn; cấu hình chạy đọc từ `ai_agent_version` của `published_version_id`; `kb_scope` truyền vào `searchKb`.
- TIP-023 (Trợ lý): `delegate` dùng `agentAuthz(agent, commander)` (quyền agent ∩ người ra lệnh); spec chạy tiếp sau duyệt đăng ký bằng `registerResumeSpec` cho kind `assistant`.
- TIP-024 (UI): hàng chờ duyệt đọc `GET /v1/approvals?status=pending|approved|rejected|expired`, quyết bằng `approval.approve` / `approval.reject`; realtime `approval.changed`, `agent.changed`.
- TIP-040: CRUD `agent_template` (nền tảng) — seed hiện tại idempotent theo `key`.

## Supplemental agent-channel behavior (2026-11-02)

[TIP022b](../tips/TIP-022b-agent-channel-behavior.md) owns structured schedules, real keyword routing, intent/handoff/complaint behavior and versioned template defaults, preserving current grants and native services. Prior DONE does not prove these deferred behaviors or live model success; completed TIP file unchanged.

## Bổ sung2026-11-02 — runtime integrity, chưa triển khai

TIP-019b-runtime-integrity.md nhận shared-root usage, utility/query-embedding lineage, crash-safe original-price settlement, durable resume/transfer/stop states và scoped detail/events. Rà lại cho thấy test hiện hữu không chứng minh các cửa sổ crash/cây run; xem runtime-integrity-planning-audit-2026-11-02.md. Không sửa TIP đã DONE hoặc coi kế hoạch là runtime PASS.
