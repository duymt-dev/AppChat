### COMPLETION REPORT — TIP-023

**STATUS:** DONE (model giả — chưa nghiệm thu với LLM thật, Q-001)
**COMMIT:** `9a0f378` (code) + commit sửa hiển thị lỗi / dọn DB test trên nhánh `tip/023-assistant` (xếp chồng trên `tip/022-agent-reply`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Schema: tenant `ai-assistant.prisma` (`assistant_session`, `assistant_message`), migration `20261031900000_023_assistant` (FK tin → phiên CASCADE; viết tay `assistant_session_user_recent_idx (user_id, last_message_at DESC) INCLUDE (title, mode) WHERE archived_at IS NULL`, `assistant_session_title_trgm_idx` GIN `f_unaccent(lower(title))`, `ai_run_assistant_session_idx`).
  - AI: `prompts/assistant.{vi,en}.md` (prompt `assistant` v2).
  - Core `ai/assistant/`: `catalog.ts` (find_actions), `card.ts` (thẻ xác nhận từ ActionDef), `assistant-prompt.ts`, `meta-tools.ts`, `delegate.ts`, `types.ts`, `sessions.ts`, `turn.service.ts` (lượt + xác nhận + spec chạy tiếp), `action-logs.read.ts`, `home.read.ts`, `assistant.service.ts`.
  - API: `http/ai/assistant.controller.ts` (`POST /assistant/messages`, `POST /assistant/confirm`, `GET /assistant/home`, `/assistant/sessions`, `/assistant/sessions/:id/messages`, `/action-logs`).
  - Shared: `api/assistant.ts` (zod `assistantTurnSchema`, `confirmEventSchema`, `turnEventSchema`, `assistantConfirmSchema`, `assistantHomeSchema`, `assistantSessionSchema`, `assistantMessageSchema`, `actionLogRowSchema`, `actionLogsPageSchema`, `uiCommandSchema`).
  - DB: `scripts/cleanup-test-workspaces.ts` (`db:cleanup-test`).
  - Test: `core/test/assistant-unit.test.ts` (9), `api/test/integration/assistant.test.ts` (14), `web/src/shared/api/mock/assistant-shape.test.ts` (2), `web/e2e/http/assistant.spec.ts`.
- Modified: kernel `actions/executor.ts` (handler thiếu preview → preview tối thiểu, vẫn bắt xác nhận — DC-128); core `ai/{ai.module.ts, public.ts, jobs/ai.jobs.module.ts (resume spec `assistant`), runs/runs.service.ts (tên agent)}`; `packages/ai/src/{index.ts, prompts/index.ts, testing/mock-model.ts (lượt Trợ lý: "tạo khách hàng …" → call_action, đọc kết quả tool)}` + `test/reply.test.ts` (khớp mọi prompt); `packages/shared/src/{api/index.ts, i18n/server/{vi,en}/ai.ts}`; `packages/db/{src/tenant-resolver.ts (chu kỳ quét theo idleMs), package.json}`; API `ai.http.module.ts`, test `ai-runtime.test.ts`; FE `features/assistant/{api.ts, types.ts, assistant-store.ts, hooks/useAssistantChat.ts, screens/AssistantScreen.tsx, components/RunsOrchestrationBar.tsx}`, `shared/assistant/AssistantDock.tsx`, `shared/api/mock/domains/assistant.ts`, `app/(app)/assistant/page.tsx`; `tools/scripts/e2e-http.mjs` (chuyển cờ Playwright, pool tenant nhỏ); `coding-packs/{DECISIONS.md, DEVIATIONS.md, QUESTIONS.md, goals/GOAL-BACKEND.md}`.

**TEST RESULTS:**
- Acceptance criteria: 5/5 pass
  1. Migration 023: bảng + index viết tay, FK; EXPLAIN phiên của người dùng → `assistant_session_user_recent_idx`, tin theo phiên → `assistant_message_session_id_created_at_idx`, nhật ký → `action_log_created_at_cover_idx` — **pass**
  2. Unit: find_actions không dấu ("bao gia" → chỉ quote.*, "Khách Hàng" → contact.*), Chat chỉ `read`, quyền sales / ẩn admin · approval · billing · workspace.switch, lọc module + giới hạn, input schema rút gọn; thẻ xác nhận (route / màu / icon theo đối tượng, động từ, nơi lưu, mô tả từ preview hoặc câu mặc định không lộ id); UiCommand zod; system prompt (version, quyền, màn + bản ghi, chế độ, quy tắc không nêu mã lỗi, en theo locale); nhóm nhật ký — **pass** (9)
  3. Integration (model giả theo kịch bản, engine + CreditMeter thật): Chat trả lời + lưu phiên / tin + nối phiên; find_actions ở Chat chỉ read, `call_action` ghi ở Chat → FORBIDDEN không ghi; read qua call_action chạy ngay; ghi → thẻ + `waiting_approval` → người khác 404 (thẻ không mất) → confirm → action đúng một lần (`action_log` source assistant, actor assistant, `on_behalf_of_user_id`, `run_id`) + run completed + câu chốt + `ui_target`; token dùng lại / lạ → 409; cancel → không ghi; sales không thấy / không gọi action ngoài quyền; `ui` → `ui_command` (sai bị chặn); plan / update_step → `ai_run.plan`; query_data → NOT_IMPLEMENTED; delegate → run con depth 1 (agent đích, người ra lệnh) + `GET /runs?root_run_id=` có tên agent; hết credit → `error` CREDIT_EXHAUSTED; lỗi model → `error` có mã ở `code`, câu cho người dùng không kèm mã — **pass** (14)
  4. HTTP + schema FE: `POST /assistant/messages` (model giả mặc định) → thẻ → `/assistant/confirm`; `GET /assistant/sessions?q=` (không dấu, của người gọi), `/messages` (người khác 404), `/home` (agent thật cho Cowork), `/action-logs` (lọc kind / day / q / status, người thường chỉ thấy việc của mình) khớp zod; mock shape (home, lượt, xác nhận / huỷ, nhật ký, runs live / theo gốc) — **pass**
  5. E2E http `assistant.spec.ts`: hỏi chữ → trả lời; Cowork "tạo khách hàng …" → thẻ → Xác nhận → "Đã lưu vào Khách hàng" + câu chốt → mở Khách hàng thấy khách mới; Nhật ký hành động có "Tạo khách hàng \"Lan Trợ Lý\""; Trợ lý thu nhỏ ở màn Đề nghị thanh toán gửi câu hỏi → màn Trợ lý trả lời — **pass**
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (6 package đổi) **18/18**; `pnpm depcheck` xanh (đã gỡ vòng `delegate ↔ meta-tools` bằng `types.ts`); `i18n:check` 100% (4497 key); `lint:size` / `lint:tokens` xanh; integration ảnh hưởng (assistant, actions, ai-runtime, agents, agent-reply, contract, crm-contacts, inbox, crm-settings) **114/114**.
- **Cổng "chốt TIP":** `pnpm turbo run build lint typecheck test` **46/46** · `api test:integration` **236/237** lần đầu (1 ca `email.test.ts` hết giờ khi chạy chung — chạy lại riêng 8/8) · **E2E http 20 passed · 14 skipped · 0 failed** (toàn bộ, sau khi dọn 429 DB test — Q-017) · integration ảnh hưởng sau sửa DC-133 **89/89** · full E2E hồi quy mock **222 passed · 0 failed · 196 skipped** · parity `assistant:chat-welcome` 2.65% · `cowork-welcome` 2.20% · `thread` 0.30% · `cowork-new` 1.76% · `cowork-drawer` 0.49%.

**INDEX / EXPLAIN:** phiên của người dùng `WHERE user_id = $1 AND archived_at IS NULL ORDER BY last_message_at DESC LIMIT 50` → partial `assistant_session_user_recent_idx` INCLUDE (title, mode) — index only; tìm phiên không dấu → GIN trigram `f_unaccent(lower(title))`; tin theo phiên (≤ 30 cho model, ≤ 200 cho FE) → `(session_id, created_at)`; nhật ký `risk <> 'read' ORDER BY created_at DESC LIMIT 200` → `action_log_created_at_cover_idx` + deferred join lấy `input` / `result`; run theo phiên → `ai_run_assistant_session_idx`.

**ISSUES DISCOVERED:**
- 39/44 handler chưa có `preview` → executor cũ ném `PREVIEW_REQUIRED` khi nguồn assistant gọi ghi; nay dựng thẻ tối thiểu (DC-128).
- Tin cùng mili-giây đảo thứ tự khi đọc lại → `appendMessage` giữ `created_at` tăng dần trong phiên.
- E2E http đỏ ngẫu nhiên khi chạy toàn bộ: 400+ DB test tồn + tiến trình ngoài dự án giữ 20 kết nối → cạn `max_connections` (Q-017); thêm `db:cleanup-test`, pool tenant E2E nhỏ hơn, sweeper theo `idleMs`.
- Chủ nhà góp ý trong phiên: Trợ lý không được lộ mã lỗi / id kỹ thuật lên UI → sửa trước khi chốt (DC-133).

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-128 … DC-133. **Lệch spec:** DV-006 (JSON một lần thay SSE). **Câu hỏi mới:** Q-017.

**Chưa nghiệm thu với provider thật:** chất lượng chọn action / điền input / tóm tắt của LLM thật (9router — Q-001); find_actions bằng embedding (DC-129) khi có model thật; Zalo / SePay / Brevo thật không liên quan TIP này.

**SUGGESTIONS FOR CHỦ THẦU:**
- SSE cho lượt Trợ lý + `run.step` WS khi FE thêm `transport.stream` (DV-006) — `AiRunner.onEvent` đã có chỗ móc.
- Màn lịch sử phiên (prototype chưa có) dùng `GET /assistant/sessions` + `/messages` sẵn có.
- TIP-038 (`insight.query`) thay `query_data` NOT_IMPLEMENTED; TIP-035 (Cowork tác vụ) dùng lại `delegate` + resume spec `assistant`.
- Mỗi domain dần thêm `preview` cho handler ghi để thẻ xác nhận có tóm tắt cụ thể (thay câu mặc định — DC-128).
- `e2e-http.mjs` tự dọn workspace của lượt (Q-017).

**Bổ sung 2026-11-01 (sau chạy 9router thật):** REQ-E06 chưa đạt — 7 drawer "Trợ lý AI · [module]" và hộp lệnh Hộp thư vẫn là bản giả của goal FE (không gọi Trợ lý), FE chỉ gửi `context.route`; Trợ lý thiếu action đọc từng bản ghi, khuôn ô lồng nhau, preview. Báo DONE khi chỉ nghiệm thu bằng model giả là thiếu sót. Làm bù: TIP-023b (phủ action), TIP-023c (genui + Trợ lý theo màn + kết nối qua Trợ lý) — DC-224…228.

## Bổ sung2026-11-02 — runtime integrity, chưa triển khai

TIP-019b-runtime-integrity.md nhận shared-root usage, utility/query-embedding lineage, crash-safe original-price settlement, durable resume/transfer/stop states và scoped detail/events. Rà lại cho thấy test hiện hữu không chứng minh các cửa sổ crash/cây run; xem runtime-integrity-planning-audit-2026-11-02.md. Không sửa TIP đã DONE hoặc coi kế hoạch là runtime PASS.
