# TIP-035: Tác vụ tự chủ & chủ động — `ai-tasks.prisma`, Coworks (ngay / lịch / sự kiện), mẫu follow-up / báo giá treo / nhắc hẹn / sau mua / bản tin sáng, nối màn Coworks

## HEADER
- TIP-ID: TIP-035
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/ai-tasks.prisma` + migration 035 · `packages/core/src/ai/tasks/**` · `packages/core/src/kernel/actions/{policy, executor, action-context}.ts` · `packages/core/src/ai/{agents/agent.runtime, approvals/resume, jobs/ai.jobs.module}.ts` · `apps/api/src/http/ai/tasks.controller.ts` · `packages/actions/src/ai.ts` · `packages/shared/src/{time/cron, ai-tasks/task-catalog, api/ai-tasks}.ts` · FE `apps/web/src/features/assistant/{components/Task*, hooks/useTaskForm}` · mock `domains/ai-tasks.ts`
- Depends on: TIP-022 (agent runtime, duyệt + chạy tiếp), TIP-023 (Trợ lý / phiên Cowork), TIP-015 / 027 / 031 / 033 / 034 (nguồn đối tượng của mẫu) — nhánh xếp chồng từ `tip/034-tickets`
- Priority: P1 · REQ: D12, E08, E13 · Decision: D51, D52, DC-133
- Estimated effort: 12 giờ

## CONTEXT
Khảo sát đầu TIP: `ai-tasks.prisma` chỉ có khung `ai_task` (chưa migration); action `ai_task.create / update / pause` trả 501, không có xoá / chạy ngay; `GET /v1/ai-tasks` chưa có (FE đọc mock 6 tác vụ cứng, drawer dùng một mẫu chung). Bảng chính sách đã có dòng `source: 'task'` (đọc / ghi chạy, gửi / tiền / xoá cần duyệt) nhưng chưa có cách tắt "hỏi trước khi gửi". `resume.ts` đã đăng ký spec kind `task`. Chưa có bộ phân tích cron.

## TASK
1. **Schema + migration 035**: enum `ai_task_trigger` / `ai_task_status`; `ai_task` (mục tiêu, prompt, phòng ban, agent, mẫu + tham số, cách chạy manual / schedule / event, cron, topic, nhóm dữ liệu, công cụ, trần credit, hỏi trước khi gửi, hạng model, người tạo, mốc chạy, đếm lượt, version, xoá mềm); CHECK cách chạy, agent bắt buộc (trừ bản tin sáng), credit, hạng; index thẻ, job lịch (partial), sự kiện (partial), `ai_run (task_id, started_at DESC) INCLUDE`, báo giá treo / đơn hoàn tất (partial).
2. **Shared**: `cron.ts` (5 trường, giờ tường theo múi workspace); `task-catalog.ts` (6 nhóm dữ liệu chip prototype → tiền tố action + module scope, 5 công cụ, 14 topic sự kiện, 5 mẫu + cron / tham số mặc định, trần 50 đối tượng, im lặng 24 giờ); shape `api/ai-tasks.ts`; notify `ai_briefing`, `ai_task_failed`; chuỗi server `tasks`.
3. **Actions**: `ai_task.create` thêm `template / params / cron / event_type`, output `run_id`; thêm `ai_task.delete`, `ai_task.run_now`; hoàn tác cho create / update / pause / delete.
4. **Kernel**: `ActionContext.autoSend` — tác vụ tắt "hỏi trước khi gửi" thì `task × send` chạy luôn (không áp hàng loạt).
5. **Core `ai/tasks/`**: lưu / sửa / tạm dừng / xoá / chạy ngay (409 khi đang có lượt); job `ai-task.sweep` mỗi 60 giây (dời `next_run_at` có điều kiện rồi đẩy hàng); consumer `ai-tasks` (topic khớp → đẩy hàng `ai-task`); worker ROLE=ai chạy lượt: bản tin sáng không gọi model, còn lại dựng khung mục tiêu + danh sách đối tượng theo mẫu (scope người tạo ∩ nhóm dữ liệu), tool = agent ∩ người tạo ∩ nhóm dữ liệu / công cụ; kết quả vào phiên Cowork + thông báo; lỗi có lý do đọc được.
6. **API**: `GET /v1/ai-tasks` (thẻ + chỉ số + mẫu + agent chọn được + drawer theo tác vụ có nhật ký thật).
7. **FE**: form tạo theo mẫu (chip dữ liệu / công cụ thật, agent, lịch, sự kiện); drawer: chạy ngay, xoá, lần chạy tới, nhật ký thật; mock tách `domains/ai-tasks.ts`.

## ACCEPTANCE CRITERIA
1. Integration `ai-tasks.test.ts` (13 ca): schema + CHECK + EXPLAIN; tạo / sửa / tạm dừng / xoá / chạy ngay + hoàn tác + 409 + 422; sales chỉ thấy tác vụ mình tạo; job lịch + consumer sự kiện; quyền tool ∩; follow-up → hàng chờ duyệt / gửi luôn; im lặng 24 giờ; lỗi có lý do + `ai_task_failed`; 3 mẫu đúng đối tượng; bản tin sáng 0 credit; `GET /v1/ai-tasks` khớp schema FE.
2. Unit shared `cron.test.ts`, `task-catalog.test.ts`, notify catalog; core policy `autoSend`; mock shape `ai-tasks-shape.test.ts`.
3. E2E http `ai-tasks.spec.ts`: tạo "Bản tin sáng" → thẻ → drawer → Chạy ngay → nhật ký "Chạy xong" → xoá.
4. E2E mock `assistant` xanh + parity `assistant:cowork-*` < 5%.

## CONSTRAINTS
- D51: quyền tác vụ = quyền agent ∩ người tạo (kiểm mỗi lần gọi tool); connector không cấp cho agent.
- Xoá / tiền / cấu hình luôn cần duyệt hoặc cấm — chỉ "gửi tin" được tắt hỏi.
- Gửi tin qua kênh giả (chưa nghiệm thu Zalo thật); model giả `AI_ENGINE=mock` (Q-001).
