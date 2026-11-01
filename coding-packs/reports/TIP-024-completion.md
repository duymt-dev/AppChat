### COMPLETION REPORT — TIP-024

**STATUS:** DONE (model giả — chưa nghiệm thu với LLM thật, Q-001)
**COMMIT:** `f386ed2` (code) + commit report / tiến độ trên nhánh `tip/024-agents-ui` (xếp chồng trên `tip/023-assistant`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**KHẢO SÁT ĐẦU TIP:** mọi endpoint / action các màn Agents · Chờ duyệt · Nhật ký gọi đã có ở backend (TIP-021 / 023), envelope khớp. Khoảng trống: dữ liệu rơi khi lưu (`role_label` / `persona` không có trong input; FE bỏ `role` / `template_id`), ô UI không lưu (từ khoá, khung giờ, tab Mô phỏng kênh), mẫu chỉ điền tên, tool ngoài quyền chỉ lỗi khi lưu, gợi ý drawer là số giả, thiếu "Sửa & duyệt", "Đang chờ" luôn rỗng, `total` sai lọc, nút Hoàn tác với việc người khác, 5 mã lỗi chưa có chữ.

**FILES CHANGED:**
- Created: migration tenant `20261101000000_024_agent_routing` (`ai_agent.keywords text[]`); core `ai/agents/agent-suggests.ts`; FE `features/agents/hooks/useToolAllowed.ts`, `features/assistant/components/ApprovalCard.tsx`; test `core/test/agents-ui-unit.test.ts` (5), `api/test/integration/agents-ui.test.ts` (10), `web/e2e/http/agents-ui.spec.ts` (2).
- Modified: `packages/actions/src/ai.ts` (`agentConfig` + `role_label` / `persona` / `keywords` / `working_hours`; `agent.test.channel`; action `approval.edit_and_approve`); core `ai/agents/{agent.store, agent.runtime (withinHours + prompt), agents.read (mẫu role + defaults, meta), agent-llm.handlers (mô phỏng kênh), catalog}`, `ai/approvals/{approval.handlers, approvals.read}`, `ai/assistant/{action-logs.read, card}`, `ai/reply/reply.service.ts` (ngoài giờ bỏ qua), `ai/ai.module.ts`, `ai/public.ts`; `packages/shared/src/{api/ai.ts, i18n/server/{vi,en}/ai.ts}`; `packages/ai/src/testing/mock-model.ts` (khách xin QR → tool gửi QR); `packages/db/prisma/tenant/ai-agents.prisma`; API `agents.controller.ts`; FE `features/agents/{api, types, hooks/useAgentBuilder, components/{AgentAiDrawer, builder/{Basics,Routing,Actions}Section, builder/TestPanel}, screens/AgentBuilderScreen, styles/{builder,test}.styles}`, `features/assistant/{types, screens/{ApprovalsScreen, ActionLogScreen}, styles/approval.styles}`, mock `domains/{agents, assistant}.ts` + `agents-shape.test.ts`, `messages/{vi,en}/{actions,agents,assistant,errors}.json`, `e2e/assistant.spec.ts`; `fixtures/prototype-parity/agents.json` (mẫu + role / defaults, agent + keywords / working_hours); `coding-packs/{DECISIONS.md, goals/GOAL-BACKEND.md}`.

**TEST RESULTS:**
- Acceptance criteria: 5/5 pass
  1. Migration 024 + unit: từ khoá bỏ trùng / trống, khung giờ jsonb `{ mode }` (lạ → luôn hoạt động), giờ hành chính biên 8:00 / 17:30 VN, prompt có từ khoá + tính cách, trường sửa được của yêu cầu duyệt, tiêu đề nhật ký "Sửa & duyệt yêu cầu" — **pass** (5)
  2. Integration: tạo từ mẫu đủ trường → GET + phiên bản giữ, `created_via=template`, sửa nháp / giá trị lạ 422; `/agent-templates?role=cs` + defaults; gợi ý từ dữ liệu thật (không còn "4.4★"); Sửa & duyệt (sai schema 422 → sửa → `edited` → job xoá đúng bản ghi đã sửa, đúng một lần; tab Đã duyệt có ghi chú); từ chối có lý do; quá hạn → tab Hết hạn; Nhật ký "Đang chờ" có yêu cầu duyệt, `total` theo lọc, lọc loại trong SQL; `undoable` chỉ việc của mình / Owner (Quản lý thấy nhưng không hoàn tác; Sales chỉ thấy việc mình); agent `office` lúc 22:00 VN → `skipped`, không gửi — **pass** (10)
  3. Mock shape + FE: mẫu theo vai trò có defaults; sửa & duyệt → Đã duyệt (`edited`, input mới) khớp zod; FE unit agents / assistant / mock **99/99** + 3 shape — **pass**
  4. E2E http `agents-ui.spec.ts`: mẫu CSKH → builder có vai trò + tool mặc định + prompt → đặt vai trò hiển thị / từ khoá / giờ → Mô phỏng kênh trả lời → xuất bản (thẻ hiện vai trò) → mở lại giữ từ khoá / giờ; drawer "1 agent đang chạy" → Trợ lý soạn → Tạo & xuất bản; xoá agent (tải lại vẫn mất). Agent "Thu Ngân Web" (tool gửi QR) trực website → khách xin QR → Nhật ký "Chờ duyệt" có dòng → Chờ duyệt: Sửa & duyệt (đổi số chứng từ) → tab Đã duyệt "Đã sửa & duyệt"; khách thứ hai xin QR → Từ chối có lý do → tab Đã từ chối hiện lý do; Nhật ký có "Sửa & duyệt yêu cầu", Hoàn tác sửa agent → "Đã hoàn tác" — **pass** (2)
  5. E2E mock `agents` + `assistant` (sửa ca Chờ duyệt: từ chối hỏi lý do, thêm Sửa & duyệt) **17 passed** · parity `agents:list` 0.46% · `agents:builder` 1.16% · `agents:builder-templates` 3.82% · `agents:template-gallery` 2.13% · `agents:test-chat` 0.08% · `agents:ai-create` 0.74% · `assistant:chat-welcome` 2.65% · `cowork-welcome` 2.20% · `thread` 0.30% — **pass**
- **Cổng "trước commit":** turbo lint / typecheck / test (7 package đổi) **21/21**; `pnpm depcheck` xanh; `i18n:check` 100% (4521 key); `lint:size` / `lint:tokens` xanh; integration ảnh hưởng (agents, agents-ui, assistant, agent-reply, ai-runtime, contract, actions, kb) **109/109**.
- **Cổng "chốt TIP":** `pnpm turbo run build lint typecheck test` **46/46** · `api test:integration` **248/248** (25 file) · **E2E http 22 passed · 16 skipped · 0 failed** (toàn bộ) · full E2E mock hồi quy **221 passed · 1 failed** (`mobile-sweep /agents/new` — nút "Hiển thị mô tả" < 44px ở 390) → sửa vùng chạm → `mobile-sweep` + `agents` **50 passed**, parity `agents:builder` 1.16% không đổi.

**INDEX / EXPLAIN:** "Đang chờ" của nhật ký: `approval_request WHERE status='pending' AND expires_at > now ORDER BY requested_at DESC LIMIT 200` → `approval_request_status_requested_at_idx (status, requested_at DESC)`; `action_log` giữ deferred join trên `action_log_created_at_cover_idx` (lọc loại bằng regex trên `action_id` nằm trong cột INCLUDE — index only cho bước chọn id). Gợi ý drawer: `ai_run` theo `agent_id = ANY(...)` → `ai_run_agent_idx`; lượt hôm nay `kind + started_at` → `ai_run_status_started_at_idx`/seq trên bảng nhỏ (một workspace). Không thêm index mới (cột `keywords` không lọc ở SQL).

**ISSUES DISCOVERED:**
- `ai_run` không có `created_at` (là `started_at`) — lỗi 500 `/agents/meta` bắt được ở integration, đã sửa.
- E2E tải lại trang dồn dập (≥ 10 lần / 10 giây) làm phiên đăng xuất: hai tab cùng xoay refresh token → token cũ bị dùng lại → thu hồi cả family (đúng Blueprint §4.2 — chống đánh cắp). Spec đổi sang đổi bộ lọc / tab thay vì reload. Người dùng thật mở nhiều tab cùng lúc có thể gặp — ghi Q-018.
- Fixture sinh bởi `gen-assistant.py` đã lệch với `agents.json` đang commit (tool id cũ) — không chạy lại generator, chỉ thêm trường mới vào fixture (Q-018 ghi chung).

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-134 … DC-139 (DC-131 cập nhật: "Đang chờ" = yêu cầu duyệt còn hạn). **Lệch spec:** không có mới. **Câu hỏi mới:** Q-018.

**Chưa nghiệm thu với provider thật:** chất lượng soạn agent / chat thử / trả lời có từ khoá của LLM thật (Q-001).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-025: socket client ở chế độ http (`approval.changed`, `agent.changed` đã phát) thay làm mới 30 giây ở Chờ duyệt; định tuyến nhiều agent theo từ khoá ưu tiên.
- Lịch hoạt động tuỳ chỉnh (theo ngày / ca) khi có màn — hiện `custom` = 24/7.
- `GET /agents/:id/stats` + CSAT agent khi ticket có CSAT (TIP-038 hiệu suất agent).
