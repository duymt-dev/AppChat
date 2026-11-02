### COMPLETION REPORT — TIP-034

**STATUS:** DONE (trả lời khách / khảo sát CSAT qua kênh giả — chưa nghiệm thu Zalo / email thật; nhiều chính sách SLA + leo thang 4 cấp là P3 — ngoài phạm vi)
**COMMIT:** `59fd1b3` (code) + commit report / tiến độ trên nhánh `tip/034-tickets` (xếp chồng trên `tip/033-calendar`)

**KHẢO SÁT ĐẦU TIP:** `support.prisma`, `SupportModule`, `SupportJobsModule`, `SupportHttpModule` là stub; 8 action `ticket.*` + `sla.update_default` trả 501; `ticket.update` chưa khai. `GET /v1/settings/sla` (TIP-013) trả chính sách cứng, rủi ro 0. Chưa có hàm `businessTime`. Mock Ticket: SLA khác spec (FRT 30′, TTR 8 / 16 / 24 giờ theo ưu tiên), sai bước trả `INVALID_STATE`, form + drawer cài cứng id nhóm mock (`t_sp1`, `t_ai`).

**FILES CHANGED:**
- Created: migration tenant `20261102000000_034_support`; shared `support/ticket-state.ts` (+ test), `time/business-time.ts` (+ test), `api/tickets.ts`, `i18n/server/{vi,en}/support.ts`; core `support/{ticket-access, seeds, public}.ts`, `support/services/{sla-clock, ticket-write, tickets-read.service, support-system}.ts`, `support/actions/{ticket-create.handler, ticket-flow.handlers, ticket-edit.handlers, sla-config.handlers}.ts`, `support/events/support.rules.ts`; API `http/support/tickets.controller.ts`, `test/integration/support.test.ts`; FE mock `domains/tickets-actions.ts`, `mock/tickets-shape.test.ts`, `e2e/http/tickets.spec.ts`; `coding-packs/tips/TIP-034-tickets.md`.
- Modified: `tenant/support.prisma`; shared `events.ts`, `index.ts`, `api/index.ts`, `notify/catalog.ts` (+ test), `i18n/server/{index, vi/{crm, notify}, en/{crm, notify}}.ts`; actions `support.ts`; core `support/{support.module, jobs/support.jobs.module}.ts`, `crm/services/timeline.service.ts`, `identity/{public, settings/settings-read.service}.ts`, `index.ts`; API `app.module.ts`, `http/support/support.http.module.ts`, `http/identity/settings.controller.ts` (bỏ `/settings/sla` cứng); FE `features/tickets/{types, screens/TicketsScreen, components/{TicketDrawer, TicketFormModal, BulkBar, TicketsHeader}}`, `features/inbox/components/MessageMenu.tsx`, mock `domains/tickets.ts`, `messages/{vi,en}/{actions, tickets, settings}.json`, `e2e/tickets.spec.ts`; `coding-packs/{DECISIONS, DEVIATIONS}.md`, `goals/GOAL-BACKEND.md`.

**TEST RESULTS:**
- Acceptance criteria: 4/4 pass
  1. Integration `support.test.ts` **10/10**: bảng + CHECK + index + EXPLAIN (`ticket_recent_idx`, `ticket_status_due_idx`); chính sách mặc định seed; tạo `TKT-` hạn TTR 4 giờ làm việc (giờ hành chính workspace), agent → 30′ tuyệt đối, từ tin nhắn gắn hội thoại + khách, phụ trách hai bên 422; chống trùng 24 giờ → CONFLICT `duplicate_of` / gộp (ghi chú vào ticket cũ) / tạo mới + hoàn tác; `sla.update_default` chỉ áp ticket mới + cs 403 + `/settings/sla` đọc chính sách thật; chờ dừng TTR, rời chờ cộng thời gian dừng, sai bước INVALID_TRANSITION; ghi chú / trả lời gửi vào hội thoại + chốt phản hồi đầu + hoàn tác; đóng (lý do, `sla_result`) + tin CSAT → khách trả "5" ghi điểm không mở lại → khách nhắn khác trong 7 ngày tự mở lại; giao + sửa hàng loạt + hoàn tác; job SLA cảnh báo 80% / quá hạn FRT / TTR mỗi mốc một lần, agent quá hạn → trả hàng chờ người, outbox + thông báo; `/tickets` D42 + lọc + `/tickets/meta` + scope cs own / kế toán 403 — **pass**
  2. Unit shared `ticket-state.test.ts` 4 + `business-time.test.ts` 5 + notify catalog + mock shape `tickets-shape.test.ts` 2 — **pass**
  3. E2E http `tickets.spec.ts`: tạo → ghi chú + trả lời → lịch sử → tab SLA → đóng (lý do bắt buộc) → mở lại → KPI tổng / mở = 1 → Cài đặt › SLA chính sách "Mặc định" + leo thang — **pass**
  4. E2E mock `tickets` + `inbox` + `settings-ops` **21 passed** + parity `tickets:list` **4,21%** · `tickets:kanban` **3,53%** · `tickets:detail` **4,91%** (bằng trước TIP — đo lại trên git stash) · `settings:sla` **3,82%**.
- **Cổng "khi làm":** catalog notify test đỏ vì kiểu mới (thêm vào danh sách + kiểm mặc định); typecheck core: `ScopeFields` bắt buộc `owner`, khoá ghép `ticketId_messageId` không có (index partial → find-first), destructure có thể undefined; integration đỏ ở: tin "5" của khách mở lại ticket (kiểm CSAT trước nhánh mở lại), `meta.agent` rỗng vì agent nháp (chọn agent đang chạy, không có thì agent chưa xoá).
- **Cổng "trước commit":** `turbo lint typecheck test` shared / actions / core / db / api / web xanh (core 123/123 — lần chạy song song đầu timeout, chạy lại `--force` xanh); `pnpm depcheck` không vòng mới; `i18n:check` 100% (4674 key); `lint:size` (1591 file) / `lint:tokens` xanh; build **4/4**.
- **Cổng "chốt TIP":** `db:cleanup-test` → `api test:integration` **374 passed** (35 file). E2E http toàn bộ **32 passed · 0 failed · 26 skipped**. Full E2E hồi quy mock **227 passed · 0 failed · 201 skipped**. Parity như trên (dev server mock cổng 3117).

**INDEX / EXPLAIN:** danh sách D42 mặc định = `SELECT t.id FROM ticket t WHERE [scope] [lọc] ORDER BY created_at DESC, id DESC LIMIT/OFFSET` → `ticket_recent_idx (created_at DESC, id DESC)`, rồi `findMany` theo PK (deferred join); lọc trạng thái + hạn / Kanban `ticket_status_due_idx (status, ttr_due_at) INCLUDE (priority, assignee_user_id)`; scope own `ticket_assignee_idx`; job SLA `ticket_open_ttr_idx` / `ticket_open_frt_idx` partial ticket còn mở; khách `ticket_contact_idx INCLUDE`; hội thoại (consumer) `ticket_conversation_idx`; tìm mã `code text_pattern_ops`; tìm tiêu đề không dấu trigram `f_unaccent(title)`; trường tuỳ biến GIN `custom`; trao đổi `ticket_comment` unique partial `(ticket_id, message_id)`; lịch sử `ticket_event_ticket_idx`.

**ISSUES DISCOVERED:**
- Xu hướng KPI (`trend`) chưa có nguồn số liệu kỳ trước → API trả chuỗi rỗng, FE ẩn dòng xu hướng (sẽ có khi làm báo cáo).
- Danh mục ticket là text tự do (8 gợi ý prototype ∪ đang dùng) — chưa có màn cấu hình danh mục.
- Parity `tickets:detail` 4,91% sát ngưỡng từ trước TIP (không do TIP này) — nên rà lại khi chỉnh drawer lần sau.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-209 … DC-215. **Lệch spec:** DV-016. **Câu hỏi:** không có mới. **Lệch prototype:** không thêm (hộp hỏi gộp dùng `modal.confirm` chuẩn). **Chưa nghiệm thu với provider thật:** trả lời khách + khảo sát CSAT qua Zalo / email thật.

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-035 (tác vụ chủ động): agent mở ticket bằng `ticket.create` với hội thoại đang phục vụ; xử lý 409 `duplicate_of` bằng `on_duplicate: merge`.
- Báo cáo hỗ trợ: dùng `ticket.sla_result`, `first_response_at`, `csat`, `reopened_count` cho KPI + xu hướng kỳ trước.

## Bổ sung planning 2026-11-02 — TIP-034b

[TIP-034b](../tips/TIP-034b-support-categories.md) receives deferred category configuration DC215/DEF-034-2. It preserves free-text history while adding real settings, scoped used-label suggestions and AI-first/manual file transfer through canonical config confirmation. Independent local review and explicit event-wiring delta checked;68 exact paths/44 pairs/8 AC, runtime not tested. DEF-034-1 trend and ticket bulk result repair remain open; prior completion does not prove either. See support-categories-planning-audit-2026-11-02.md and support-remainder-source-audit-2026-11-02.md.

## Bổ sung planning 2026-11-02 — TIP-034c

[TIP-034c](../tips/TIP-034c-ticket-bulk.md) owns remaining ticket portion of STD-domain-concurrency-7a (Inbox already025b). Current whole-batch transaction/updated-only/unsafe snapshot undo are not accepted behavior.79 exact files/46 bilateral pairs/8 AC; independent review caught forward retry/in-flight racing undo, corrected with terminal/drained gate and immutable sealed receipts under parent CAS. New canonical bulk undo has actual toast/audit/Assistant wiring; no runtime/native acceptance. See ticket-bulk-planning-audit-2026-11-02.md.

## Bổ sung planning 2026-11-02 — TIP-034d

[TIP-034d](../tips/TIP-034d-ticket-stock-trends.md) receives DEF-034-1, retaining GIẢ until implementation evidence. Existing event history cannot reconstruct all prior ticket stock. The supplement defines real completed daily observations, current authorized surviving cohort, explicit unavailable state, privacy interlock and canonical AI/UI summary.57 exact paths/47 bilateral pairs/8 AC; independent frozen-cohort and actual rollover findings corrected/rechecked, no native/runtime acceptance. See ticket-stock-planning-audit-2026-11-02.md.
