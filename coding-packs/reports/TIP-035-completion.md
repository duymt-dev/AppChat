### COMPLETION REPORT — TIP-035

**STATUS:** DONE (model giả `AI_ENGINE=mock` — Q-001; gửi tin cho khách qua kênh giả — chưa nghiệm thu Zalo / email thật)
**COMMIT:** `0d1b86b` (code) + commit report / tiến độ trên nhánh `tip/035-ai-tasks` (xếp chồng trên `tip/034-tickets`)

**KHẢO SÁT ĐẦU TIP:** `ai-tasks.prisma` chỉ có khung `ai_task` (chưa migration); action `ai_task.create / update / pause` trả 501, không có xoá / chạy ngay; `GET /v1/ai-tasks` chưa có (FE đọc mock 6 tác vụ cứng, drawer một mẫu chung). Chính sách đã có dòng `source: 'task'` nhưng chưa có cách tắt "hỏi trước khi gửi". `resume.ts` đã đăng ký spec kind `task`. Chưa có bộ phân tích cron.

**FILES CHANGED:**
- Created: migration tenant `20261102100000_035_ai_tasks`; shared `time/cron.ts` (+ test), `ai-tasks/task-catalog.ts` (+ test), `api/ai-tasks.ts`, `i18n/server/{vi,en}/tasks.ts`; core `ai/tasks/{task.store, task.queue, task-place, task.handlers, task-targets, task-briefing, task.runner, task-scheduler, task.jobs, tasks.read, tasks.providers}.ts`; API `http/ai/tasks.controller.ts`, `test/integration/ai-tasks.test.ts`; FE `assistant/components/TaskTriggerFields.tsx`, `assistant/hooks/useTaskForm.ts`, mock `domains/ai-tasks.ts`, `mock/ai-tasks-shape.test.ts`, `e2e/http/ai-tasks.spec.ts`; `coding-packs/tips/TIP-035-ai-tasks.md`.
- Modified: `tenant/ai-tasks.prisma`; shared `index.ts`, `api/index.ts`, `notify/catalog.ts` (+ test), `i18n/server/{index, vi/notify, en/notify}.ts`; actions `ai.ts`; core `kernel/actions/{action-context, policy, executor}.ts` (+ `test/actions-unit.test.ts`), `ai/{ai.module, public}.ts`, `ai/agents/agent.runtime.ts`, `ai/approvals/resume.ts`, `ai/jobs/ai.jobs.module.ts`; API `http/ai/ai.http.module.ts`; FE `assistant/{types, components/{TaskCreateModal, TaskDrawer}}`, mock `domains/assistant.ts`, `handlers.ts`, `routes.ts`, `messages/{vi,en}/{actions, assistant, settings}.json`; `coding-packs/{DECISIONS, DEVIATIONS}.md`, `docs/06-prototype/DEVIATIONS.md`, `goals/GOAL-BACKEND.md`.

**TEST RESULTS:**
- Acceptance criteria: 4/4 pass
  1. Integration `ai-tasks.test.ts` **13/13**: bảng + CHECK (cách chạy, agent bắt buộc trừ bản tin sáng) + EXPLAIN (`ai_task_due_idx`, `ai_run_task_idx`); tạo theo lịch → `next_run_at` theo giờ workspace, cron sai / thiếu topic / chưa có agent chạy → 422 + hoàn tác; sửa / tạm dừng / xoá + hoàn tác; chạy ngay → run `queued` + job, đang có lượt → 409; sales chỉ thấy tác vụ mình tạo; job lịch dời mốc + không đẩy trùng + chỉ mở DB workspace "armed" (gỡ khi hết tác vụ lịch); consumer sự kiện `order.completed` kèm payload; tool = agent ∩ người tạo ∩ nhóm dữ liệu / công cụ (scope ngoài nhóm = none); follow-up khách im lặng → hàng chờ duyệt / tắt hỏi → gửi luôn, khách có tin ra trong 24 giờ bị bỏ qua lần sau; người tạo mất quyền / agent tạm dừng → lỗi có lý do + `ai_task_failed`; báo giá treo > 3 ngày / hẹn trong 24 giờ / đơn hoàn tất 3 ngày đúng đối tượng; bản tin sáng 0 credit vào phiên Cowork + `ai_briefing`; `GET /v1/ai-tasks` khớp schema FE — **pass**
  2. Unit shared `cron.test.ts` 4 + `task-catalog.test.ts` 3 + notify catalog; core policy `autoSend` (124/124); mock shape `ai-tasks-shape.test.ts` — **pass**
  3. E2E http `ai-tasks.spec.ts`: tạo "Bản tin sáng" từ mẫu → thẻ → drawer → Chạy ngay → worker ROLE=ai chạy → nhật ký "Chạy xong" → xoá (xác nhận) → hết thẻ — **pass**
  4. E2E mock `assistant` **6 passed** + parity `assistant:cowork-welcome` **2,20%** · `cowork-new` **3,52%** · `cowork-drawer` **1,05%**.
- **Cổng "khi làm":** CHECK agent với `template` NULL vẫn qua (NULL) → `COALESCE(template,'')`; gửi tin từ tác vụ lỗi `idempotency_key required` → khoá `task:<run>:<bước>`; EXPLAIN chọn nhầm index partial khác → truy vấn có `ORDER BY` + `LIMIT`; `narrowScope(['customers'])` vẫn thấy báo giá → lọc scope sales / booking trong bộ thu đối tượng; depcheck 4 vòng mới do mock ai-tasks import kiểu store / handlers → kiểu cấu trúc cục bộ.
- **Cổng "trước commit":** `turbo lint typecheck test` shared / actions / core / db / api / web xanh (web 4 cảnh báo có sẵn ở `doc-templates.ts` / `quotes.ts`); `pnpm depcheck` không vòng mới; `i18n:check` 100% (4717 key); `lint:size` (1616 file) / `lint:tokens` xanh; build **4/4**.
- **Cổng "chốt TIP":** `db:cleanup-test` → `api test:integration` **387 passed** (36 file). Lần chạy đầu lộ **race** ở `agents.test.ts` AC4 (job `ai-resume` và lệnh gọi trực tiếp cùng chạy một duyệt → bên thua ghi đè kết quả bằng CONFLICT) → vá `resumeApproval` dùng lại kết quả bên thắng (DC-223), chạy lại xanh. E2E http toàn bộ lần đầu **2 đỏ** (`quotes`, `rag`: cạn `max_connections` vì job lịch tác vụ mở mọi DB tenant mỗi phút) → chỉ quét workspace trong tập `ai-task:armed` (DC-221), chạy lại **33 passed · 0 failed · 27 skipped**. Full E2E hồi quy mock **226 passed · 1 failed · 201 skipped** — ca đỏ `settings.spec.ts` "kênh: thêm tài khoản email qua wizard 3 bước" (drawer Quản lý Email không mở được bước chi tiết tài khoản) **đỏ cả trên base trước TIP-035** (đối chứng `git stash`, cùng 1 failed) — ngoài vùng TIP, không sửa trong TIP này. Parity như trên (dev server mock cổng 3117).

**INDEX / EXPLAIN:** thẻ `ai_task_live_created_idx (created_at DESC) WHERE deleted_at IS NULL`; job lịch `ai_task_due_idx (next_run_at)` partial `trigger='schedule' AND status='active' AND deleted_at IS NULL`; sự kiện `ai_task_event_idx (event_type)` partial; thống kê / nhật ký theo tác vụ `ai_run_task_idx (task_id, started_at DESC) INCLUDE (status, credits_used)`; báo giá treo `quote_open_sent_idx (sent_at) INCLUDE (contact_id)` partial trạng thái đã gửi / đã xem; sau mua `order_completed_at_idx (completed_at) INCLUDE (contact_id)` partial.

**ISSUES DISCOVERED:**
- E2E mock `settings` "kênh: thêm tài khoản email qua wizard 3 bước" đỏ sẵn trên base (TIP-034 lúc chốt còn xanh — có thể phụ thuộc ngày giờ chạy); cần xem lại ở TIP kênh / fix riêng.
- Race chạy tiếp duyệt hai lần có từ TIP-021 (lộ khi bộ integration chạy song song nhiều worker) — đã vá trong TIP này.
- Job quét toàn bộ tenant mỗi phút của các domain khác (`support.sla-sweep`, booking, sales, contracts) vẫn mở mọi DB tenant — với nhiều workspace nên áp cùng kiểu tập "armed" (đề xuất cho TIP hạ tầng / W9).
- Tab "Kiến thức" của drawer tác vụ hiện thư mục kho tri thức thật, bật theo phạm vi tri thức của agent (chỉ xem — tác vụ chưa có phạm vi riêng, Blueprint không có cột).

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-216 … DC-223. **Lệch spec:** DV-017. **Lệch prototype:** PD-007. **Câu hỏi:** không có mới. **Chưa nghiệm thu với provider thật:** LLM thật (Q-001), gửi tin Zalo / email thật.

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-036 (loyalty): thêm topic `loyalty.*` vào `AI_TASK_EVENTS` nếu muốn tác vụ chăm sóc theo hạng.
- TIP hạ tầng: tổng quát hoá tập "armed" cho mọi job quét tenant.

## Bổ sung2026-11-02 — tenant bank/runtime integration

TIP-012b-bank-connectors.md nhận adapter tenant thật, strict money/account normalization, canonical durable hook/pull/reconnect receipts và payment-event→AI task dispatch dedupe. Existing tests/DONE do not establish these missing/crash seams. Tenant Brevo/SMTP separate012c; no runtime/provider acceptance claimed. See bank-connectors-planning-audit-2026-11-02.md.

## Bổ sung — TIP-035b (2026-11-02)

Nghĩa vụ chưa đạt của TIP này chuyển sang [TIP-035b](../tips/TIP-035b-task-sparkline.md): PRO-assistant-taskspark. File TIP gốc không sửa (DC-233).

## Bổ sung — TIP-035c (2026-11-02)

Nghĩa vụ chưa đạt của TIP này chuyển sang [TIP-035c](../tips/TIP-035c-test-ops-hygiene.md): DEF-031-4, DEF-031-5, DEF-035-1, DEF-035-2, Q-010. File TIP gốc không sửa (DC-233).
