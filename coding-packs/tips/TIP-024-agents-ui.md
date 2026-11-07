# TIP-024: Agents UI + hàng chờ duyệt + nhật ký hành động — nối http đủ hành vi (Builder, mẫu, tạo bằng Trợ lý, phiên bản, chat thử; Chờ duyệt Duyệt / Sửa / Từ chối; Nhật ký lọc + hoàn tác)

## HEADER
- TIP-ID: TIP-024
- Project: AppChat V2
- Module: `packages/actions/src/ai.ts` · `packages/core/src/ai/{agents,approvals,assistant}/**` · `apps/api/src/http/ai/agents.controller.ts` · FE `features/agents/**`, `features/assistant/screens/{ApprovalsScreen,ActionLogScreen}.tsx` · `apps/web/messages/{vi,en}/{errors,agents,assistant}.json`
- Depends on: TIP-021 (agent, approval, resume), TIP-023 (action-logs, Trợ lý) — nhánh xếp chồng từ `tip/023-assistant`
- Priority: P0 · REQ: D07, D08, D09, D09b, D15, E09 · Decision: D29, D51, D52
- Estimated effort: 16 giờ

## CONTEXT
- FE các màn đã dựng theo prototype bằng mock (D38). Khảo sát đầu TIP: mọi endpoint / action đã có ở backend (TIP-021 / 023), envelope khớp — khoảng trống là **dữ liệu rơi khi lưu**, **tính năng Blueprint chưa có backend** và **E2E http mỏng**:
  1. `role_label` / `persona` không có trong input `agentConfig` (zod bỏ) → thẻ agent http mất dòng vai trò; FE builder bỏ `role` / `template_id` (CONFIG_KEYS lấy từ `blankConfig` FE) → mẫu không ghi `created_via=template`.
  2. "Từ mẫu" chỉ điền tên — `agent_template.defaults` (tool / ý định / prompt theo vai trò — D15) không ra FE.
  3. Từ khoá ưu tiên + khung giờ hoạt động chỉ là ô UI (không lưu); tab "Mô phỏng kênh" không làm gì.
  4. Tool builder không lọc quyền người tạo (§3.3b) → lưu mới 403.
  5. `ai_suggests` của `/agents/meta` là chữ prototype có số giả.
  6. Chờ duyệt: không có `approval.edit_and_approve` (Blueprint §3.4, REQ-D07 "Duyệt / Sửa / Từ chối"); từ chối không có lý do; dòng `expired` / `edited` không vào tab nào.
  7. Nhật ký: "Đang chờ" luôn rỗng (http); `total` bỏ qua bộ lọc; nút Hoàn tác hiện cả với việc người khác làm (undo → 403); lỗi hoàn tác không báo.
  8. `errors.json` thiếu `HAS_DEPENDENCIES`, `INVALID_TRANSITION`, `UNDO_EXPIRED`, `UNDO_NOT_SUPPORTED`, `NOT_IMPLEMENTED`.

## TASK
1. **Cấu hình agent:** `agentConfig` thêm `role_label`, `persona`, `keywords: string[] (≤ 20)`, `working_hours: 'always'|'office'|'custom'` (`working_hours` vào cột jsonb sẵn có `{mode}`; `keywords` = cột mới `text[]`, migration 024). Store / DTO / phiên bản mang đủ. FE `AgentConfig` + `CONFIG_KEYS` gồm `role`, `role_label`, `persona`, `keywords`, `working_hours`, `template_id`.
2. **Runtime:** system prompt agent có dòng từ khoá ưu tiên; agent `working_hours='office'` ngoài 8:00–17:30 (giờ VN) → lượt trực kênh bỏ qua (không trả lời, để người — không gửi gì cho khách); `custom` = như `always` tới khi có lịch tuỳ chỉnh (DC).
3. **Mẫu (D15):** `GET /agent-templates` trả thêm `role` + `defaults` (tools / intents / model_tier / threshold / prompt) và nhận `?role=`; builder "Từ mẫu" dựng cấu hình từ `defaults` (tên, vai trò, tool, ý định, prompt, `template_id`); tool mặc định ngoài quyền người tạo bị bỏ.
4. **Tool theo quyền:** builder khoá tool mà người tạo không có permission (nhãn "Bạn chưa có quyền này"), không gửi lên.
5. **Gợi ý Trợ lý (`ai_suggests`)** tính từ dữ liệu thật: agent tỉ lệ tự xử lý thấp nhất, số agent đang chạy, run agent hôm nay + tỉ lệ chuyển người; chưa có agent → câu hướng dẫn.
6. **Chờ duyệt:** action `approval.edit_and_approve {approval_id, edited_input, note?}` (write, `approvals.decide` + quyền gốc): kiểm `edited_input` bằng input schema của action gốc, lưu input mới + hash, `status='edited'` → job `ai-resume` chạy input đã sửa đúng một lần. Tab Đã duyệt gồm `approved` + `edited` (nhãn "Đã sửa & duyệt"); tab mới **Hết hạn**. FE: nút Sửa mở form các trường cấp 1 của input (chuỗi / số / boolean), Từ chối hỏi lý do (tuỳ chọn) → `note`.
7. **Nhật ký:** "Đang chờ" = yêu cầu duyệt `pending` còn hạn (của mình / người có `audit.view` thấy hết); lọc loại + trạng thái + ngày trong SQL, `total` theo cùng bộ lọc; `undoable` chỉ khi người gọi là người làm (actor / người ra lệnh) hoặc Owner; FE hoàn tác bắt lỗi → toast theo mã, làm mới query của action gốc.
8. **Lỗi i18n:** thêm 5 mã vào `errors.json` (vi + en).
9. **Chat thử "Mô phỏng kênh":** chọn kênh trong các kênh của agent → `agent.test {channel}` → system prompt mang kênh đang mô phỏng.

## ACCEPTANCE CRITERIA
1. Migration 024 (`ai_agent.keywords`); unit: cấu hình mới qua store / phiên bản; giờ hành chính đúng biên 8:00 / 17:30 VN; defaults mẫu ∩ quyền; nhóm trạng thái duyệt.
2. Integration: tạo agent có `role_label` / `persona` / `keywords` / `working_hours` / `template_id` → `GET /agents/:id` trả đủ, `created_via=template`; `/agent-templates?role=cs` + `defaults`; `ai_suggests` theo dữ liệu thật; `approval.edit_and_approve` → `edited` + job chạy input đã sửa đúng một lần (input sai schema 422; quyết lại 409); `/approvals?status=expired`; `/action-logs?status=pending` có yêu cầu duyệt; `total` theo lọc; `undoable` false với việc người khác; agent ngoài giờ không trả lời.
3. Mock shape + FE unit cập nhật theo field mới.
4. E2E http mới: mẫu CSKH → builder có vai trò + tool mặc định → xuất bản (thẻ hiện vai trò); Trợ lý mô tả → "Tạo & xuất bản"; xoá agent; khách nhắn widget xin mã QR → agent xin duyệt → Chờ duyệt: Sửa & duyệt / Từ chối có lý do → nhật ký "Đang chờ" đổi theo; Nhật ký lọc + hoàn tác (sửa agent → hoàn tác).
5. Parity `agents:*` liên quan + `assistant:*` không hồi quy; E2E mock agents / assistant xanh.

## CONSTRAINTS
- Realtime `approval.changed` / `agent.changed` ở FE http (socket client) = TIP-025 (Inbox realtime dựng client) — tới đó Chờ duyệt làm mới định kỳ 30 giây + khi quay lại tab.
- `GET /agents/:id/stats`, `GET /runs/:id` (bước) — màn chưa dùng; làm khi có màn (TIP-038 hiệu suất agent).
- CSAT agent: chưa có nguồn (ticket chưa có CSAT) → 0, FE hiện "—" (giữ).
- Định tuyến theo từ khoá giữa nhiều agent cùng kênh = TIP-025 (routing Hộp thư); TIP này lưu + đưa vào prompt.
