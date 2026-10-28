# AI — Agent Gateway (Vercel AI SDK v7)

> Chốt V3 / V4 / D17. Trợ lý AI = orchestrator + copilot. Agent trực kênh trả lời khách. Không swarm, không Mastra, không WorkflowAgent.

## Quy tắc

1. **Mọi lời gọi LLM đi qua `packages/ai`** (`AgentEngine`, `LlmRouter`, `CreditMeter`).
   - Cấm import `@ai-sdk/*` hay SDK của provider ở ngoài `packages/ai`.
   - Engine nằm sau interface để thay được.
2. **Tool = action.**
   - Tool của agent sinh từ `ActionDef` (JSON Schema) và `execute` gọi `ActionExecutor`.
   - Ngoại lệ: meta-tool (`find_actions`, `call_action`, `ui`, `plan`, `query_data`) và tool phối hợp (`delegate`, `transfer_to_agent`, `consult`, `reply`, `handoff`).
   - Không viết logic nghiệp vụ trong tool.
3. **Quyền:**
   - Trợ lý: `onBehalfOfUserId` (quyền + scope của user).
   - Agent trực kênh: `tool_ids` do Owner cấp ∩ `agentGrantable`, giới hạn trong hội thoại đang phục vụ.
   - `find_actions` lọc theo quyền.
4. **Không giữ trạng thái trong RAM.**
   - Run dừng (`needs_confirmation` / `needs_approval`) thì ghi `ai_run.state` (messages, pendingToolCall, stepIdx) cùng `approval_request` trong một transaction.
   - Chạy tiếp bằng job `ai-resume:{runId}`; job idempotent.
5. **Rào chắn bắt buộc:**
   - `maxSteps` (agent 8, Trợ lý 16).
   - Ngân sách credit chung cho cả cây run.
   - Lặp cùng tool + cùng input 3 lần thì dừng.
   - Độ sâu delegate / consult ≤ 2; ≤ 3 transfer mỗi lượt khách; A → B → A thì handoff sang người.
6. **Credit:** mỗi bước LLM gọi `CreditMeter.charge` (DB nền tảng, idempotent `(ws,'ai_step',runId:stepIdx)`) **trước** khi ghi `ai_run_step.credits`. Kiểm `balance > 0` trước mỗi bước.
7. **Output agent trực kênh có cấu trúc** (zod): `{ reply?, confidence, intent, sentiment, needs_human? }`.
   - `confidence` thấp, khiếu nại, đòi gặp người, lặp câu 3 lần hoặc chạm từ cấm thì handoff.
8. **Prompt nằm trong kho** `packages/ai/prompts/<name>.<locale>.md`, có version. Cấm nối prompt rải trong service.
9. **PII:** che CCCD, số thẻ, số tài khoản trước khi gửi LLM; khôi phục khi gửi ra ngoài.
10. **Trả lời theo ngôn ngữ:** Trợ lý theo `user.locale`; agent theo `contact.locale` (phát hiện từ tin khách).
11. **Quan sát:** mỗi bước ghi `ai_run_step` + phát `run.step` qua WS; có metric latency / token / lỗi theo provider + model. Owner xem trực tiếp và bấm dừng được (`run.cancel` huỷ cả cây).
12. **Provider:** key đặt trong env của nền tảng; chỉ bật provider có key. Fallback khi gặp 5xx / 429 / timeout 30s, theo `model_route`.
