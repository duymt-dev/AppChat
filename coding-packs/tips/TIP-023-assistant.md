# TIP-023: Trợ lý AI — ai-assistant.prisma (phiên, tin), meta-tools (`find_actions`, `call_action`, `ui`, `plan`, `query_data`, `delegate`), lượt hội thoại + xác nhận, Chat / Cowork, khung "Trợ lý AI đang điều phối", nhật ký hành động

## HEADER
- TIP-ID: TIP-023
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/ai-assistant.prisma` · `packages/core/src/ai/assistant/**` · `packages/core/src/kernel/actions/action-logs.read.ts` · `apps/api/src/http/ai/assistant.controller.ts` · `packages/shared/src/api/assistant.ts` · FE `features/assistant/{api.ts, hooks/useAssistantChat.ts}`, `shared/assistant/AssistantDock.tsx` (gửi thật)
- Depends on: TIP-021 (agent, approval, resume), TIP-019 (runner), TIP-022 (`consult` / tool phối hợp) — nhánh xếp chồng từ `tip/022-agent-reply`
- Priority: P0 · REQ: E02, E04, E05, E06, E07, E10, E11, E12, E14 · Decision: D17, D29, D51, D55 (FE genui = Q-005, ngoài goal)
- Estimated effort: 20 giờ
- **Files touched:**
  - Schema: tenant `assistant_session`, `assistant_message` (migration `<ts>_023_assistant`), index phiên của người dùng + tin theo phiên.
  - Core: `ai/assistant/{meta-tools.ts, find-actions.ts, assistant-prompt.ts, turn.service.ts, sessions.read.ts, confirm.ts, intent-card.ts}`; `kernel/actions/action-logs.read.ts` (`GET /action-logs`); resume spec `assistant` / `delegate`.
  - API: `POST /v1/assistant/messages`, `POST /v1/assistant/confirm`, `GET /v1/assistant/home`, `GET /v1/assistant/sessions?q=`, `GET /v1/assistant/sessions/:id/messages`, `GET /v1/action-logs?kind=&status=&day=&q=`; `GET /v1/runs` trả tên agent.
  - Shared: zod `assistantTurnSchema`, `confirmEventSchema`, `assistantSessionSchema`, `assistantMessageSchema`, `actionLogRowSchema`.

## CONTEXT
- Blueprint §5.2 (meta-tools, Chat chỉ đọc / Cowork đầy đủ, system prompt), §5.1 (`delegate` = tool của agent ∩ quyền người ra lệnh, độ sâu ≤ 2, ngân sách chung), §4.5 (lượt + xác nhận), §4.4 (sessions, runs), §3.3 (policy `assistant`: read chạy, còn lại preview → xác nhận), §3.3b.
- `standards/ai/agent-gateway.md` §2–§5, §10, §11 · `standards/actions/action-registry.md` §7 (confirm token) · `standards/ai/generative-ui.md` (tool `render` + FE genui là goal riêng — Q-005).
- FE đã dựng (D38): `features/assistant/**` gọi `POST /assistant/messages` → `{ session_id, events: TurnEvent[] }` (JSON một lần, chưa đọc SSE), `POST /assistant/confirm` `{ confirm_token, decision }`, thẻ xác nhận phẳng `{ key, icon, color, action_id, route, title, desc, dest }`, `GET /action-logs`, `GET /runs?root_run_id=`.

## TASK
1. **Schema** phiên (người dùng, tiêu đề, chế độ, `last_message_at`, lưu trữ) + tin (vai trò, `content.parts[]`: text / card / ui_command, `run_id`). Lịch sử nhiều lượt nạp lại từ tin đã lưu (≤ 30 tin gần nhất).
2. **Lượt hội thoại** `POST /assistant/messages {session_id?, mode, text, context?, tier?}`: tạo / nối phiên (của chính người gọi), run `assistant` (`assistant_session_id`, `initiated_by_user_id`), tool theo chế độ, chạy tới khi xong hoặc cần xác nhận; trả `{ session_id, run_id, events }` (`delta`, `confirm`, `ui_command`, `result`, `error`). Credit trừ như mọi run; hết ví → `error` CREDIT_EXHAUSTED.
3. **Meta-tools:** `find_actions(query, module?)` — tìm theo từ khoá không dấu trên id / mô tả / tiêu đề (vi) của action, lọc theo quyền + chế độ, trả id + mô tả + input schema rút gọn; `call_action(action_id, input)` — `source='assistant'`, `onBehalfOfUserId`: read chạy ngay (kết quả vào run), còn lại `needs_confirmation` → run dừng, lưu thẻ xác nhận; `ui(command)` — kiểm `UiCommand` (zod) → sự kiện `ui_command`; `plan(steps)` / `update_step(id, status)` — lưu `ai_run.plan`; `query_data(metric, params)` — `NOT_IMPLEMENTED` rõ ràng tới TIP-038 (`insight.query`); `delegate(role|agent_id, task, context)` — run con `delegate` chạy agent đích, tool = quyền agent ∩ quyền người ra lệnh (`agentAuthz`), depth ≤ 2, ngân sách trừ vào run gốc, trả tóm tắt.
4. **Xác nhận** `POST /assistant/confirm {confirm_token, decision, edited_input?}`: chỉ người tạo; `confirm` → chạy action với token (executor tiêu thụ), lưu `action_log`, chạy tiếp run với kết quả, trả `{ status: 'done', action_log_id, ui_target?, events }`; `cancel` → kết quả tool `{ cancelled: true }`, run chạy tiếp; token lạ / hết hạn → 409 `CONFIRM_EXPIRED`. Handler thiếu `preview` → thẻ xác nhận dựng từ ActionDef (tiêu đề + input), vẫn bắt xác nhận (DC).
5. **Chat / Cowork:** Chat chỉ `find_actions` (read) + `query_data` + `ui`; Cowork mở đủ. System prompt: vai trò, quyền người dùng, màn hiện tại + bản ghi đang xem (`context`), danh sách agent đang chạy, quy tắc xác nhận / hoàn tác; tiếng Việt (hoặc `user.locale`).
6. **Đọc:** `GET /assistant/home` (thẻ gợi ý theo prototype + agent thật cho Cowork), `GET /assistant/sessions?q=` (của người gọi, tìm không dấu), `GET /assistant/sessions/:id/messages`, `GET /action-logs` (lọc kind / status / day / q, theo quyền: người thường thấy của mình, Owner thấy hết), `GET /runs` trả tên agent.
7. **FE nối http:** `useAssistantChat` dùng `ui_target` của confirm, gửi `context` (route) + `tier`; AssistantDock gửi lượt thật tới màn Trợ lý; `RunsOrchestrationBar` lấy `root_run_id` từ run của lượt cuối (không hard-code).

## ACCEPTANCE CRITERIA
1. Migration 023: bảng + index `assistant_session (user_id, last_message_at DESC) WHERE archived_at IS NULL`, `assistant_message (session_id, created_at)`; EXPLAIN dùng index.
2. Unit: `find_actions` lọc quyền + chế độ, tìm không dấu ("bao gia" → quote.*); thẻ xác nhận từ ActionDef (route theo module, màu / icon theo module); kiểm `UiCommand`; system prompt có quyền + màn hiện tại.
3. Integration (model giả theo kịch bản): Chat trả lời chữ + lưu phiên / tin; read qua `call_action` chạy ngay; ghi → thẻ `confirm` + run `waiting_approval` (state) → `confirm` → action chạy đúng một lần (action_log `source=assistant`, `on_behalf_of_user_id`) + run `completed` + câu chốt; `cancel` → không ghi; token lạ / người khác → 409 / 404; Chat không gọi được ghi (`find_actions` không trả, `call_action` ghi → FORBIDDEN); quyền: sales không thấy / không gọi được action ngoài quyền; `delegate` → run con `delegate` (depth 1, agent đích, tool ∩ quyền người ra lệnh) + `GET /runs?root_run_id=` thấy run con có tên agent; hết credit → `error`.
4. `GET /assistant/sessions`, `/messages`, `/home`, `/action-logs` khớp schema FE (zod) — mock + HTTP; contract `run.cancel`.
5. E2E http: Trợ lý — hỏi chữ → trả lời; "tạo ticket …" → thẻ xác nhận → Xác nhận → "Đã lưu" + mở đúng màn; nhật ký hành động có dòng vừa tạo; tải lại vẫn có phiên.

## CONSTRAINTS
- Không SSE ở TIP này: FE chưa đọc stream (Transport không có `stream`) — trả JSON một lần đúng hợp đồng FE hiện có; SSE + `run.step` WS khi FE thêm `transport.stream` (DV).
- `query_data` thật = TIP-038; `render` (genui D55) + FE genui = goal riêng (Q-005) — không làm.
- Đính kèm tệp / giọng nói (E12) — nhận `attachments: file_id[]` và đưa tên tệp vào ngữ cảnh; đọc nội dung tệp = sau.
- `ai_task.*` / màn Cowork tác vụ = TIP-035.
