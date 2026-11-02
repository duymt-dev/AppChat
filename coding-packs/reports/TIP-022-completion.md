### COMPLETION REPORT — TIP-022

**STATUS:** DONE (model giả — chưa nghiệm thu với LLM thật, Q-001)
**COMMIT:** `c432625` (code) trên nhánh `tip/022-agent-reply` (xếp chồng trên `tip/021-agents`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Schema: migration `tenant/migrations/20261031800000_022_agent_reply` (`conversation.ai_draft`, `conversation.ai_suggestion`; viết tay: `ai_run_conversation_idx (conversation_id, started_at DESC) INCLUDE (kind, status)` partial).
  - AI: `prompts/{agent-reply.vi.md, agent-reply.en.md, index.ts}` (kho prompt có version), `reply/{pii.ts, output.ts, handoff.ts}`; test `test/reply.test.ts` (7).
  - Core: `ai/reply/{reply.queue.ts, reply-context.ts, reply-tools.ts, reply.service.ts}`, `ai/jobs/agent-reply.processor.ts`, `ai/events/reply.rules.ts`.
  - API test: `integration/agent-reply.test.ts` (14). E2E: `e2e/http/agent-reply.spec.ts`.
  - TIP: `coding-packs/tips/TIP-022-agent-reply.md`.
- Modified: `tenant/inbox.prisma`; `packages/ai/src/{index.ts, testing/mock-model.ts}` (model giả nhận system, trả JSON cho lượt agent); `packages/shared/src/{events.ts (ai.handoff), api/webchat.ts (agent_ids), i18n/server/{vi,en}/ai.ts (lý do chuyển người)}`; kernel `actions/{action-context.ts (servedConversationId), policy.ts, executor.ts}` + `test/actions-unit.test.ts`; core `ai/{public.ts, agents/agent.runtime.ts (servedConversationId, mapInput), approvals/resume.ts (registerResumeFinish), jobs/ai.jobs.module.ts}`, `inbox/{public.ts, services/{pipeline.ts (wantsAgent), view.ts (ai_draft), read.service.ts (suggestion), outbound.ts (xoá gợi ý)}, jobs/{inbound.processor.ts, inbox.jobs.module.ts}, actions/message.handlers.ts (tên agent)}`, `channels/webchat/widget.service.ts` (agent thật + id), `notify/events/domain.rules.ts`; FE `features/settings/{types.ts, components/WidgetAiBox.tsx}`, `features/inbox/components/MessageBubble.tsx` (testid `msg-agent`); `coding-packs/{DECISIONS.md, DEVIATIONS.md, goals/GOAL-BACKEND.md}`.

**TEST RESULTS:**
- Acceptance criteria: 5/5 pass
  1. Migration 022: cột mới + `ai_run_conversation_idx`; EXPLAIN run theo hội thoại dùng index — **pass**
  2. Unit: PII (CCCD 12 / CMND 9 số, thẻ Luhn có cách, STK; giữ SĐT, tiền, mã đơn), cùng giá trị cùng mã, khôi phục lồng nhau, bảng nạp lại đánh số tiếp; output (```json + chữ, % → 0–1, JSON lỗi → độ tin cậy 0, giá trị lạ → mặc định); luật chuyển người (ngưỡng biên, đòi gặp người, khiếu nại / tiêu cực, từ cấm ở câu khách / câu trả lời, lặp 3, needs_human, sai định dạng); prompt TS khớp `.md` + version; policy `agent × send` trong hội thoại đang phục vụ — **pass** (7 + 1)
  3. Integration (model giả theo kịch bản, engine + CreditMeter thật): tự trả lời qua `message.send` (tin agent, run `completed`, độ tin cậy, trừ credit; ngữ cảnh có đoạn kho tri thức + bộ nhớ khách; lượt sau bỏ qua); độ tin cậy thấp → nháp + `handoff` + lý do + thông báo `ai_escalate` + DTO `ai_draft`, đang handoff không kích lại; đòi gặp người / từ cấm / khiếu nại / model gọi `handoff` / lặp 3 lần → đúng lý do, không gửi; sai định dạng / lỗi model → chuyển người; copilot → `suggestion` ở GET luồng tin, tool ghi chỉ xem trước, người gửi tin → mất gợi ý; PII không tới model, gửi khách số thật; `transfer_to_agent` → đổi agent + agent mới trả lời (tóm tắt trong system, bước `handoff`); A → B → A → người; `consult` → run con depth 1, tool ghi FORBIDDEN; tool send ngoài hội thoại → `waiting_approval` → approve → `ai-resume` chạy action + chạy tiếp + gửi câu trả lời, `ai_state` về `idle` — **pass** (14)
  4. Queue: 3 tin → 1 job trễ; pipeline thật (Zalo giả, worker ROLE=channels) → job `agent-reply` → worker ROLE=ai (model giả mặc định) → trả lời + gán agent; nhóm `mention` không nhắc → không chạy — **pass**
  5. E2E http `agent-reply.spec.ts`: tạo + xuất bản agent → gán cho widget → khách nhắn từ website → agent tự trả lời (khách thấy trên widget, Hộp thư hiện tin agent có tên) → khách đòi gặp nhân viên → banner "AI cần người xử lý…", không gửi thêm — **pass**
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (7 package đổi) **21/21**; `pnpm depcheck` xanh; `lint:size`, `i18n:check` (100%), `lint:tokens` xanh; integration các bộ ảnh hưởng (inbox, agents, webchat, email, channels, ai-runtime, notify, contract, actions) **106/106**.
- **Cổng "chốt TIP":** `pnpm turbo run build lint typecheck test` **46/46** task · `api test:integration` **224 passed** (23 file, gồm contract HTTP) · contract mock (web test) xanh · `pnpm depcheck` xanh · `i18n:check` 100% (4497 key) · `lint:size` / `lint:tokens` xanh · smoke worker `ROLE=ai` bản build — 0 log error (processor `agent-reply`) · **E2E http 19 passed · 13 skipped** (toàn bộ, gồm `agent-reply.spec.ts` mới) · full E2E hồi quy mock **222 passed · 0 failed · 196 skipped** · parity `settings:web-widget` 2.57% · `inbox:default` 4.54% · `inbox:ai-panel` 3.76% · `inbox:handoff` 0.64%.

**INDEX / EXPLAIN:** run theo hội thoại `WHERE conversation_id = $1 ORDER BY started_at DESC` → partial `ai_run_conversation_idx` (INCLUDE kind, status); lịch sử 20 tin dùng `message (conversation_id, created_at DESC, id DESC)` có sẵn; bộ nhớ khách `(contact_id, created_at DESC)` có sẵn.

**ISSUES DISCOVERED:**
- Tool `contact.send_email` cần tài khoản email có `external_id` = địa chỉ gửi (fixture test thiếu → 409).
- Chip agent ở Cài đặt › Widget hiện id thô từ TIP-017 (DC-076 tạm) → DTO `agent_ids` (DC-127).
- Tin agent chưa có tên người gửi → `message.send` của agent ghi tên agent.
- Lời chào widget là một bubble "out" phía khách (E2E đếm 2).

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-120 … DC-127. **Lệch spec:** DV-005.

**Chưa nghiệm thu với provider thật:** chất lượng câu trả lời / độ tin cậy / tuân thủ định dạng JSON với LLM thật (9router — Q-001); ngưỡng và luật từ khoá (đòi gặp người, khiếu nại) cần chỉnh lại bằng eval khi có model thật. Zalo thật (Q-003).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-023 (Trợ lý): `delegate` dùng lại `replyTools` / `consult` (run con, depth, ngân sách); đăng ký `registerResumeSpec('assistant', …)`; `run.step` WS cho khung điều phối.
- TIP-026 (support): CSAT theo agent cho thẻ agent (DC-118); `ai_escalate` → ticket khi khiếu nại.
- Ghi `contact_memory` tự động từ lượt agent (hiện chỉ đọc) — đề xuất TIP riêng sau TIP-023.
- Eval suite `agent-reply` (standards/ai/eval.md) khi có key.

## Supplemental agent-channel behavior (2026-11-02)

[TIP022b](../tips/TIP-022b-agent-channel-behavior.md) owns structured schedules, real keyword routing, intent/handoff/complaint behavior and versioned template defaults, preserving current grants and native services. Prior DONE does not prove these deferred behaviors or live model success; completed TIP file unchanged.

## Bổ sung2026-11-02 — runtime integrity, chưa triển khai

TIP-019b-runtime-integrity.md nhận shared-root usage, utility/query-embedding lineage, crash-safe original-price settlement, durable resume/transfer/stop states và scoped detail/events. Rà lại cho thấy test hiện hữu không chứng minh các cửa sổ crash/cây run; xem runtime-integrity-planning-audit-2026-11-02.md. Không sửa TIP đã DONE hoặc coi kế hoạch là runtime PASS.
