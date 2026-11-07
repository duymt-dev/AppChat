# TIP-021: AI Agents backend — ai_agent (+ phiên bản), agent_template, approval_request + ApprovalGateway + chạy tiếp run, ai_governance, quyền agent D51

## HEADER
- TIP-ID: TIP-021
- Project: AppChat V2
- Module: `packages/db/prisma/{tenant/ai-agents.prisma, platform/templates.prisma}` · `packages/core/src/ai/{agents,approvals,governance}/**` · `packages/core/src/kernel/actions/{executor,handler,action-context}.ts` (cổng duyệt + pha `prepare`) · `apps/api/src/http/ai/**`
- Depends on: TIP-019 (AiRunner / RunStore / resume), TIP-005 (authz), TIP-020 (kb_scope) — nhánh xếp chồng từ `tip/020-rag-kb`
- Priority: P0 · REQ: D03, D05, D07, D09, D09b, D15, D16, C11 · Decision: D29, D51, D52, D54
- Estimated effort: 16 giờ
- **Files touched:**
  - Schema: tenant `ai_agent`, `ai_agent_version`, `approval_request`, `ai_governance` (migration `<ts>_021_ai_agents`); platform `agent_template` (migration `<ts>_021_agent_template`).
  - Kernel: `ActionContext.approvalId`, `ApprovalGateway.consume` (chạy action đã duyệt đúng một lần), `ActionHandler.prepare` (việc chậm — gọi LLM — chạy NGOÀI transaction), `ActionExecutor.setApprovals`.
  - Core: `ai/agents/**` (store, handler `agent.*`, đọc, công cụ agent D51, prompt, catalog mẫu + seed `agent_template`, `agentNames`), `ai/approvals/**` (gateway, `approval.*`, đọc, job `ai-resume`, quét hết hạn 72 giờ), `ai/governance/**` (đọc / `governance.update` / seed), `ai/events/agents.rules.ts`.
  - API: `GET /v1/agents`, `/agents/meta`, `/agents/:id`, `/agents/:id/versions`, `/agents/:id/tools`, `/agent-templates`, `/approvals?status=`, `/settings/governance` (+ `/governance`), `/conversations/:id/agent-tools`.
  - FE: menu ＋ Hộp thư đọc `GET /conversations/:id/agent-tools` (thay suy đoán agent theo kênh); mock thêm route tương ứng, `PLAN_LIMIT_REACHED` 402 như API.

## CONTEXT
- Blueprint §2.2 (L397–410), §3.3 / §3.3b (D51), §3.4 ai, §4.4 (L968, L979, L981), §5.1 (lưu / chạy tiếp run, 72 giờ), §5.3b (D29).
- `standards/ai/agent-gateway.md` §2–4, §10b · `standards/actions/action-registry.md` §3, §10b, §11, §13 · `standards/domain/state-machine.md` (ai_agent, approval_request).
- FE đã dựng (D38 — action là contract): `features/agents/**`, `features/assistant/screens/ApprovalsScreen.tsx`, `features/settings/components/GovSection.tsx`, `shared/ai/agent-tools.ts`.

## TASK
1. **Schema** đúng Blueprint + trường FE cần (`role_label`, `handoff_to`, `governance`, `channels` = loại kênh). Agent chạy theo bản đã xuất bản (`published_version`); cột cấu hình là bản nháp (`draft_dirty`).
2. **`agent.*`**: create / create_and_publish (+undo 24h = tạm dừng + xoá mềm) / update (+undo 24h) / publish / rollback (xuất bản lại snapshot thành phiên bản mới) / pause / delete (xoá mềm + undo 30 ngày, chặn khi đang phụ trách kênh / hội thoại mở → `HAS_DEPENDENCIES`) / test (chạy thật trên engine với bản nháp, `dry_run`, action không phải `read` chỉ trả xem trước, vẫn trừ credit) / draft_from_description / optimize_prompt (model, credit; output không hợp lệ → bản nháp tất định). Rào chắn: `tools` ⊆ `agentGrantable` ∩ quyền người tạo; `plan.max_agents` → 402; tool `money` / `delete` vào `approval_rules`.
3. **Duyệt**: `ApprovalGateway` tạo `approval_request` (tiêu đề / tóm tắt từ `preview` của handler nếu có, permission duyệt của action gốc, hết hạn theo governance 72 giờ, event `approval.requested`); `approval.approve` / `reject` (cần `approvals.decide` **và** permission duyệt của action gốc; đã quyết → 409); job `ai-resume` (worker ROLE=ai) chạy action đã duyệt qua `ActionExecutor` (`approvalId`, đúng một lần) rồi `AiRunner.resume`; từ chối → kết quả tool `{ rejected, note }`; quá hạn → `expired`, run → `handoff`, báo người duyệt.
4. **Quyền agent D51**: `GET /agents/:id/tools` (nhóm module + Kỹ năng AI, `granted`, badge `needs_connector` / `coming_soon`), `GET /conversations/:id/agent-tools` (agent phụ trách hội thoại: `assignee_agent_id` → agent của tài khoản kênh; chỉ đọc). Bộ tool của run = `tool_ids` ∩ connector đã kết nối.
5. **Governance** `ai_governance` một dòng + `governance.update`; đọc đúng shape FE (applied / total tính từ trạng thái khuyến nghị).
6. Nối `AgentNames` (kênh hiện tên agent; `channel.update_settings` kiểm agent tồn tại — DC-076).

## ACCEPTANCE CRITERIA
1. Migration 021 (tenant + platform): bảng, unique `(agent_id, version)`, partial index duyệt chờ, index danh sách agent sống; EXPLAIN list dùng index.
2. Integration: tạo → nháp; xuất bản → v1 `active`; sửa → `dirty`, bản chạy giữ nguyên; xuất bản → v2; quay lại v1 → v3 = cấu hình v1; tạm dừng / chạy; xoá khi đang gán kênh → 409; xoá + hoàn tác; vượt gói → 402; tool ngoài `agentGrantable` → 422; sales → 403.
3. `agent.test` / `draft_from_description` / `optimize_prompt` (model giả): có trả lời, ghi `ai_run(dry_run)`, trừ credit; agent.test không ghi dữ liệu nghiệp vụ.
4. Duyệt: tool `send` của agent → 202 `approval_required` + run `waiting_approval`; approve → action chạy đúng một lần, run chạy tiếp tới `completed`; reject → run nhận `{ rejected }`; quyết lại → 409; thiếu permission duyệt gốc → 403; quá hạn → `expired` + run `handoff`.
5. GET routes khớp schema FE (`packages/shared` zod) — mock + HTTP; contract `agent.create`, `governance.update`.
6. E2E http: tạo agent trong Builder → xuất bản → thẻ trong danh sách → phiên bản; Cài đặt › Governance lưu được; cổng D59 xanh.

## CONSTRAINTS
- Agent trực kênh (queue `agent-reply`, ngưỡng tin cậy, handoff) = TIP-022; meta-tool / `delegate` / Trợ lý = TIP-023; Cowork = TIP-035.
- `approval.edit_and_approve` chưa có trong registry (FE không dùng) — không thêm.
- Luật governance cứng theo số tiền (báo giá > 20M…) do handler domain ép (TIP 029–032), TIP này chỉ lưu cấu hình.
