# TIP-034: Ticket & SLA — `support.prisma`, chính sách SLA mặc định, đồng hồ SLA theo giờ làm việc, leo thang, agent tạo ticket, chống trùng, CSAT, nối trang Ticket

## HEADER
- TIP-ID: TIP-034
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/support.prisma` + migration 034 · `packages/core/src/support/**` · `apps/api/src/http/support/*` · `packages/actions/src/support.ts` · `packages/shared/src/{support/ticket-state, time/business-time, api/tickets}.ts` · FE `apps/web/src/features/tickets/**` · mock `domains/tickets*.ts`
- Depends on: TIP-015 (CRM — khách, timeline), TIP-016 (hội thoại / tin nhắn, event `message.*`), TIP-013 (giờ làm việc `working_hours`), TIP-021 (agent) — nhánh xếp chồng từ `tip/033-calendar`
- Priority: P1 · REQ: H01–H04 · Decision: D42, D52, DC-049
- Estimated effort: 14 giờ

## CONTEXT
Khảo sát đầu TIP: `support.prisma`, `SupportModule`, `SupportJobsModule`, `SupportHttpModule` là stub; 8 action `ticket.*` + `sla.update_default` trả 501; `ticket.update` chưa khai (Blueprint có). `GET /v1/settings/sla` (TIP-013) trả chính sách cứng `SLA_DEFAULT`, rủi ro 0. Chưa có hàm `businessTime` (money-time-numbering §2). Màn Ticket chạy mock với SLA khác spec (FRT 30′, TTR theo ưu tiên 8 / 16 / 24 giờ), sai bước trả `INVALID_STATE`, form + drawer cài cứng id nhóm mock (`t_sp1`, `t_ai`).

## TASK
1. **Schema + migration 034**: enum `ticket_status` / `ticket_priority`; `sla_policy` (unique partial một dòng mặc định), `ticket` (mã `TKT-`, khách / hội thoại / tin nguồn, kênh / công ty / email, người HOẶC agent phụ trách, mục tiêu + hạn FRT / TTR chụp lúc tạo, `ttr_start_at`, dừng khi chờ, mốc leo thang, `sla_result`, lý do đóng, CSAT, số lần mở lại, `custom`), `ticket_comment` (tin khách chép một lần — unique partial `message_id`), `ticket_event` (lịch sử); CHECK đóng phải có lý do + kết quả SLA, chờ ⇔ `paused_since`; index D42 / Blueprint `(status, ttr_due_at) INCLUDE` / scope own / partial job SLA / khách / hội thoại / mã / trigram tiêu đề / GIN `custom`.
2. **Shared**: `TICKET_FLOW` (khoá `ticket.set_status:<đích>`), `slaStateOf` (quá hạn · sắp đến hạn ≥ 80% hoặc ≤ 60′ · trong hạn), hằng số chống trùng 24 giờ / mở lại 7 ngày; `addBusinessMinutes` / `businessMinutesBetween` (giờ làm việc theo múi workspace); shape `api/tickets.ts`; event `ticket.*`; notify `sla_breach`, `ticket_assigned`; chuỗi server `support`; timeline 3 loại.
3. **Actions**: thêm `ticket.update`; `ticket.create` thêm `on_duplicate` (`ask` / `merge` / `create`) + `merged`.
4. **Core `support/`**: seed + tự bù chính sách mặc định; tạo (giao người tạo mặc định, agent → hạn AI, tạo từ tin nhắn / hội thoại agent đang phục vụ gắn khách + hội thoại, chống trùng); đổi trạng thái (chờ dừng TTR, rời chờ cộng phút làm việc đã dừng); bình luận nội bộ / trả lời (gửi vào hội thoại gắn ticket, chốt phản hồi đầu); đóng (lý do, `sla_result`, CSAT qua hội thoại); mở lại; giao / sửa / sửa hàng loạt; `sla.update_default` (chỉ áp việc mới) + `ticket.search`; job `support.sla-sweep` mỗi phút (sắp đến hạn / quá hạn FRT + TTR → leo thang mỗi mốc một lần, agent quá hạn → giao lại người); consumer `support` (tin khách → bình luận, chờ → xử lý, tự mở lại trong 7 ngày, CSAT 1–5; trả lời qua hộp thư → phản hồi đầu); luật thông báo + WS; `TicketsReadService` (D42, chi tiết, meta KPI + gợi ý theo luật, Cài đặt › SLA thật + dự báo rủi ro).
5. **API**: `GET /v1/tickets` (D42), `/tickets/meta`, `/tickets/:id`, `/settings/sla` (chuyển từ identity sang support).
6. **FE**: mock theo `TICKET_FLOW` + chính sách mặc định + chống trùng (tách `tickets-actions.ts`); form hỏi gộp khi trùng; tạo từ tin nhắn mang `source_message_id`; bỏ id nhóm cứng; "tôi" theo id người dùng; ẩn nút giao AI khi chưa có agent.

## ACCEPTANCE CRITERIA
1. Integration `support.test.ts` (10 ca): bảng + index + EXPLAIN; chính sách seed; tạo (TKT-, hạn 4 giờ làm việc, agent → 30′ tuyệt đối, từ tin nhắn gắn hội thoại + khách, phụ trách hai bên 422); chống trùng hỏi / gộp / tạo + hoàn tác; `sla.update_default` chỉ áp việc mới + cs 403 + `/settings/sla` thật; chờ dừng TTR + cộng thời gian dừng + INVALID_TRANSITION; bình luận / trả lời gửi hội thoại + phản hồi đầu + hoàn tác; đóng + CSAT + tự mở lại 7 ngày + phản hồi đầu qua hộp thư + hoàn tác đóng + mở lại; giao + bulk + hoàn tác; job SLA (cảnh báo, quá hạn FRT / TTR mỗi mốc một lần, agent → người, outbox); đọc D42 + lọc + meta + scope cs own / kế toán 403.
2. Unit shared `ticket-state.test.ts`, `business-time.test.ts`, notify catalog + mock shape `tickets-shape.test.ts`.
3. E2E http `tickets.spec.ts`: tạo → ghi chú + trả lời → lịch sử → SLA → đóng (lý do) → mở lại → KPI → Cài đặt › SLA.
4. E2E mock `tickets` / `inbox` / `settings-ops` xanh + parity `tickets:*`, `settings:sla` < 5%.

## CONSTRAINTS
- REQ-H03: chính sách mặc định không xoá được; đổi chỉ áp việc mới. Nhiều chính sách + leo thang 4 cấp là P3 (H05) — ngoài phạm vi.
- Gửi CSAT / trả lời qua kênh thật: adapter giả (chưa nghiệm thu Zalo / email thật).
