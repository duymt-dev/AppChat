# TIP-022: Agent trực kênh — queue `agent-reply` (debounce 3 giây), lắp ngữ cảnh, output có cấu trúc, handoff, copilot, lọc PII, `transfer_to_agent` / `consult`

## HEADER
- TIP-ID: TIP-022
- Project: AppChat V2
- Module: `packages/core/src/ai/reply/**` · `packages/core/src/ai/jobs/agent-reply.processor.ts` · `packages/core/src/inbox/{services/pipeline.ts, jobs/inbound.processor.ts, services/view.ts, services/read.service.ts}` · `packages/core/src/kernel/actions/{executor,action-context}.ts` (trả lời trong hội thoại đang phục vụ) · `packages/ai/src/{prompts,testing}/**`
- Depends on: TIP-016 (inbox pipeline), TIP-020 (kb search), TIP-021 (agent, approval, resume), TIP-015 (contact, contact_memory) — nhánh xếp chồng từ `tip/021-agents`
- Priority: P0 · REQ: D05, D06, D10, D11, D13, C02 · Decision: D51, D52, D54
- Estimated effort: 16 giờ
- **Files touched:**
  - Schema: tenant `conversation.ai_draft`, `conversation.ai_suggestion` + index run theo hội thoại (migration `<ts>_022_agent_reply`).
  - Core: `ai/reply/{reply.queue.ts, pii.ts, reply-output.ts, reply-context.ts, reply-tools.ts, reply.service.ts}`, processor `agent-reply` (worker ROLE=ai), chạy tiếp run `agent_reply` sau duyệt (`registerResumeFinish`), event `ai.handoff` → thông báo `ai_escalate`.
  - Inbox: pipeline quyết có kích agent không (chế độ AI, agent, nhóm theo `group_ai_policy`), worker `channel-inbound` đẩy job sau commit; DTO `ai_draft` + gợi ý copilot ở luồng tin; người trả lời → xoá gợi ý.
  - Kernel: `ActionContext.servedConversationId` — agent gửi trong hội thoại đang phục vụ chạy luôn (Blueprint §3.3 dòng `agent`), gửi nơi khác vẫn duyệt.
  - AI: prompt `agent-reply` (có version), model giả trả JSON đúng định dạng khi prompt yêu cầu.

## CONTEXT
- Blueprint §5.1 (phối hợp agent: `transfer_to_agent`, `consult`, rào chắn), §5.3 (pipeline 6 bước), §3.3 (policy `agent`: chỉ trả lời trong hội thoại đang phục vụ), §1.3 (queue `agent-reply` ở ROLE=ai, job id theo hội thoại, debounce 3 giây).
- `standards/ai/agent-gateway.md` §2, §5, §7, §9, §10, §10b · `standards/ai/rag.md` (agent trả lời khách chỉ `public`, dưới ngưỡng căn cứ không bịa) · `standards/events/outbox.md`.
- FE đã dựng: `features/inbox/components/ChatPanel.tsx` (banner handoff + `ai_draft`, thẻ gợi ý `suggestion`), tin agent (`agent: true`).

## TASK
1. **Kích hoạt:** tin khách vào (pipeline, mọi kênh) → nếu hội thoại `ai_mode ≠ off`, không đang `handoff`, có agent (`assignee_agent_id` hoặc agent mặc định của tài khoản) và (1-1 hoặc nhóm `auto` / nhóm `mention` có nhắc tài khoản) → sau commit đẩy job `agent-reply` (dedup theo hội thoại, trễ 3 giây, tin mới thay job đang chờ — gom tin liên tiếp). Khoá theo hội thoại trong worker → không chạy song song.
2. **Lắp ngữ cảnh:** cấu hình theo phiên bản đã xuất bản; 20 tin gần nhất (bỏ tin đã xoá / thu hồi / trước mốc xoá lịch sử); khách rút gọn (tên, nhóm, thẻ) + `contact_memory`; top-6 đoạn kho tri thức `public` trong `kb_scope` (không căn cứ → ghi rõ "không có tài liệu", cấm bịa); giờ hoạt động + lời chào của tài khoản; từ cấm của governance.
3. **Chạy:** run `agent_reply` (copilot: `suggestion`), tool = quyền agent ∩ connector đã kết nối (bỏ `message.send` — trả lời đi qua output) + `handoff`, `transfer_to_agent`, `consult`. Output JSON `{ reply?, confidence 0–1, intent, sentiment, needs_human? }`; không đọc được → coi như độ tin cậy thấp.
4. **Quyết định:** handoff khi `confidence < threshold`, khách đòi gặp người, cùng câu hỏi 3 lần, sentiment tiêu cực / khiếu nại, chạm từ cấm (câu khách hoặc câu trả lời), `needs_human`, model gọi `handoff`, lỗi run / hết credit → không gửi, lưu `ai_draft`, `ai_state = handoff` + `handoff_reason`, event `ai.handoff` (thông báo `ai_escalate`). Ngược lại gửi qua `message.send` (source `agent`, hội thoại đang phục vụ).
5. **Copilot:** cùng pipeline, chỉ lưu gợi ý `{ text, confidence }` vào hội thoại (GET luồng tin trả `suggestion`), không gửi; người gửi tin → xoá gợi ý.
6. **PII:** che CCCD / CMND, số thẻ, số tài khoản trong tin khách / bộ nhớ trước khi gửi model (token `[PII_n]`); khôi phục trong câu trả lời và input tool. Bảng token lưu trong `ai_run.input` (DB tenant) để chạy tiếp sau duyệt.
7. **Phối hợp:** `transfer_to_agent(role, reason, summary)` đổi `assignee_agent_id` + bước `handoff`, agent mới trả lời ngay trong lượt (≤ 3 lần / lượt; A → B → A → sang người); `consult(role, question)` chạy agent đích chỉ với tool `read`, độ sâu ≤ 2, trả lời ngắn, không gửi khách.
8. **Duyệt giữa chừng:** tool của agent cần duyệt → `ai_state = waiting_approval`; duyệt / từ chối → job `ai-resume` chạy tiếp → câu trả lời cuối đi qua bước 4.

## ACCEPTANCE CRITERIA
1. Migration 022: cột mới + index `ai_run (conversation_id, started_at DESC) WHERE conversation_id IS NOT NULL`; EXPLAIN dùng index.
2. Unit: che / khôi phục PII (CCCD 9 / 12 số, thẻ 16 số có dấu cách, số tài khoản sau "STK"), không che số điện thoại / tiền; đọc output (JSON trong ```json, JSON lỗi → độ tin cậy 0); luật handoff (ngưỡng, đòi gặp người, lặp 3 lần, tiêu cực, từ cấm); prompt agent-reply có version.
3. Integration (model giả theo kịch bản, Postgres + Memurai thật): tự trả lời — tin agent `sent` + run `completed` + trừ credit; độ tin cậy thấp → handoff + `ai_draft` + thông báo `ai_escalate`; đòi gặp người / lặp 3 lần / từ cấm / tiêu cực → handoff; copilot → `suggestion` ở GET luồng tin, không gửi, người gửi tin → mất gợi ý; PII không tới model, câu trả lời có lại số thật; ngữ cảnh có đoạn kho tri thức + bộ nhớ khách; `transfer_to_agent` đổi agent + agent mới trả lời; A → B → A → handoff; `consult` chỉ thấy tool read; tool cần duyệt → `waiting_approval` → approve → trả lời được gửi; nhóm `mention` không kích khi không nhắc; queue: 3 tin trong 3 giây → 1 job.
4. Kích hoạt qua pipeline thật: tin vào (worker channels test harness) → job `agent-reply` → worker ROLE=ai → trả lời.
5. E2E http: widget website — khách nhắn → agent (đã gán cho widget) trả lời trong Hộp thư (nhãn AI) và khách nhận trên widget.

## CONSTRAINTS
- Không thêm action mới cho agent trả lời (dùng `message.send`); tool phối hợp là tool nội bộ (origin `meta`), không vào registry (Blueprint §5.1).
- Không đổi luật policy chung: chỉ ngoại lệ `send` trong hội thoại đang phục vụ.
- Trợ lý AI / `delegate` = TIP-023; ghi `contact_memory` tự động = để sau (chỉ đọc).
- Model thật chưa có (Q-001) — nghiệm thu bằng model giả.
