# Domain — Bảng chuyển trạng thái

> Mọi entity có cột `status` (hoặc trục trạng thái khác) có **một** bảng chuyển trạng thái, dùng chung cho handler BE, mock FE, nút trên UI và Trợ lý. Không handler nào tự viết `if (status === …)` riêng.
> Luật commerce (báo giá, đơn, hợp đồng, đề nghị thanh toán, liệu trình) lấy nguyên từ `plans/COMMERCE-DECISIONS.md`; bảng ở §4 chỉ chép lại cho đủ một chỗ — mâu thuẫn thì COMMERCE thắng.

## 1. Quy tắc

1. **Một file mỗi domain:** `packages/shared/src/<domain>/state.ts` khai `defineFlow(...)`: trạng thái → `{ <action_id>: trạng_thái_đích }`. Hàm thuần, có test riêng.
2. **Handler kiểm trước khi ghi:** `assertTransition(flow, current, actionId)`; sai → `AppError('INVALID_TRANSITION', 409, { status: <from> })`. Ghi bằng `UPDATE … WHERE id = $1 AND status = $from` (xem `domain/concurrency.md` §2); 0 dòng → 409.
3. **FE dùng cùng bảng** để vô hiệu nút + tooltip lý do (`interaction-patterns.md` IP-1.5); mock FE gọi cùng `assertTransition`.
4. **Chuyển bởi hệ thống** (job hết hạn, webhook, event) cũng đi qua action với `source='system'`, cùng bảng. Job phải đọc lại trạng thái hiện tại trong transaction, không dựa vào lúc quét.
5. **Trạng thái suy ra** (derived) — như `order.pay_status`, `invoice.status` phần `partial|paid|overdue`, `channel` của loại kênh (REQ-B09) — **không** có action đặt trực tiếp; tính lại trong cùng transaction khi nguồn đổi, bằng hàm thuần trong `state.ts`.
6. **Trạng thái cuối** (terminal) khai rõ trong flow; không action nào đi ra, trừ action "mở lại" có tên riêng được liệt kê.
7. **Mỗi chuyển đổi có nghĩa với bên ngoài phát event** `<entity>.<past_tense>` (`events/outbox.md`) và ghi `timeline_event` nếu entity gắn khách.
8. **Thêm / bỏ trạng thái hoặc chuyển đổi** = escalation L2 (`domain/gap-filling.md` §2). Bảng §4 có ô *đề xuất* là phần Chủ thầu suy ra từ `docs/03-module-specs` / prototype; chốt khi duyệt PR này, sau đó cũng chỉ đổi qua L2.

## 2. Hợp đồng

```ts
// packages/shared/src/state/flow.ts
export type Flow<S extends string> = { [K in S]: Partial<Record<string /* action id */, S>> } & { terminal: readonly S[] };
export function defineFlow<S extends string>(f: Flow<S>): Flow<S>;
export function nextState<S extends string>(f: Flow<S>, from: S, actionId: string): S | null;
export function assertTransition<S extends string>(f: Flow<S>, from: S, actionId: string): S; // ném INVALID_TRANSITION
export function allowedActions<S extends string>(f: Flow<S>, from: S): string[];              // FE bật nút
```

## 3. Test bắt buộc

- Test bảng (`state.test.ts`): mọi cặp (trạng thái × action của domain) — cặp có trong flow ra đúng đích, cặp không có ném `INVALID_TRANSITION`.
- Mỗi action đổi trạng thái có ca "sai trạng thái → 409" trong `*.action.test.ts`.
- Job hệ thống: ca bản ghi đã đổi trạng thái giữa lúc quét và lúc xử lý → bỏ qua, không ghi.

## 4. Danh mục

Ký hiệu: `A —action→ B`. *(sys)* = chuyển bởi job / event. **[đề xuất]** = chưa có trong COMMERCE / Blueprint, chốt khi duyệt.

### Báo giá `quote` (COMMERCE §3)
- `draft —quote.submit_for_approval→ pending_approval` (khi chạm ngưỡng; `approvalReasons()` trong `commerce/quote-math.ts`)
- `draft —quote.send→ sent` (chỉ khi không chạm ngưỡng) · `approved —quote.send→ sent`
- `pending_approval —quote.approve→ approved` · `pending_approval —quote.reject_internal→ draft`
- `sent —(sys) mở link→ viewed`
- `sent|viewed —quote.mark_accepted→ accepted` · `—quote.mark_rejected→ rejected` · `—quote.request_revision→ revision_requested` (sinh version n+1 `draft`; bản này → `superseded` khi bản mới được gửi)
- `sent|viewed —(sys) quá valid_until→ expired`
- `sent|viewed —quote.extend_validity→` giữ trạng thái, dời `valid_until` · **[đề xuất]** `expired —quote.extend_validity→ sent` nếu chưa có version mới hơn
- `draft —quote.update→ draft`; trạng thái khác sửa = `quote.request_revision` (D46)
- Terminal: `accepted`, `rejected`, `superseded` (`expired` chỉ ra bằng extend).

### Đơn hàng `order` (COMMERCE §4) — hai trục
- `status`: `new —order.confirm→ processing` (trừ kho, sinh gói nếu đủ điều kiện) · `processing —order.complete→ completed` · `new|processing —order.cancel→ cancelled` (bắt buộc lý do; đã thu → sinh yêu cầu hoàn tiền). Terminal: `completed`, `cancelled`.
- `order.update`: tự do ở `new`; ở `processing` chỉ khi chưa có khoản thu.
- `pay_status`: **suy ra** từ `customer_payment` đã `confirmed` + `deposit_required` (§1.5).

### Hợp đồng `contract` (COMMERCE §9)
- `draft —contract.submit→ pending_approval` · `pending_approval —contract.request_changes|contract.reject_internal→ draft`
- `pending_approval —contract.approve_and_sign→ pending_signature` (Owner, OTP + ký tay) · `pending_signature —contract.sign→ signed` (khách, trang công khai)
- `pending_signature —(khách từ chối | link hết hạn)→ declined` · `pending_signature —contract.extend_sign_link→` giữ trạng thái
- `signed —(sys) qua end_date→ expired` · `signed —contract.terminate→ terminated` (Owner, lý do)
- Phụ lục `contract_appendix`: cùng flow `draft → pending_approval → pending_signature → signed | declined`.
- Terminal: `declined`, `expired`, `terminated` (gia hạn = hợp đồng mới `renewal_of_id`).

### Đề nghị thanh toán `invoice` (COMMERCE §5)
- `draft —invoice.create (gửi)→ sent` · `draft|sent —invoice.void→ void` (chỉ khi chưa có khoản thu `confirmed`)
- `partial`, `paid`, `overdue` **suy ra**: tổng thu ≥ số tiền → `paid`; > 0 → `partial`; quá `due_at` mà chưa `paid` → `overdue` *(sys)*.
- Terminal: `paid`, `void`.

### Khoản thu `customer_payment`
- `pending —(webhook khớp chắc) | invoice.record_payment→ confirmed` · `pending —(khớp không chắc)→ needs_review` · `needs_review —invoice.resolve_bank_match→ confirmed | failed`
- Refund: tạo bản ghi `kind=refund` `pending` → `payment.refund_approve` → `confirmed`. Terminal: `confirmed`, `failed`.

### Liệu trình `customer_package` (COMMERCE §6)
- `active —(sys) used = total→ exhausted` · `active —(sys) quá expires_at→ expired` · `active —payment.refund_approve→ refunded`
- `expired|exhausted —package.extend | package.adjust_sessions→ active` (Owner, ghi log).

### Lịch hẹn `appointment` (theo `docs/03-module-specs/AppChat-Appointments-Spec` §2) **[đề xuất]**
- `pending —appointment.confirm→ confirmed` · `pending —(sys) quá hold_expires_at→ expired`
- `pending|confirmed —appointment.reschedule→ rescheduled` (sinh lịch mới `pending`, `reschedule_of_id`) · `pending|confirmed —appointment.cancel→ cancelled` (lý do)
- `confirmed —appointment.check_in→ in_progress` · `in_progress —appointment.complete→ done` (trừ buổi liệu trình; gợi ý tạo đơn)
- `confirmed —appointment.mark_no_show→ no_show` (sau ân hạn; mặc định không trừ buổi)
- `expired —appointment.confirm→ confirmed` nếu khung còn trống (kiểm lại EXCLUDE) · `expired —appointment.cancel→ cancelled`
- `done` có `undo` trong cửa sổ của action (trả buổi). Không có chuyển `pending → done` trực tiếp.
- Terminal: `done`, `no_show`, `rescheduled`, `cancelled`.

### Ticket `ticket` (Tickets-Spec, SLA-Spec) **[đề xuất]**
- `open —ticket.set_status→ in_progress | waiting` · `in_progress —ticket.set_status→ waiting` · `waiting —ticket.set_status→ in_progress`
- `waiting —(sys) khách trả lời→ in_progress` (SLA chạy tiếp)
- `open|in_progress|waiting —ticket.close→ closed` (bắt buộc `close_reason`; chốt `sla_result`)
- `closed —ticket.reopen | (sys) khách nhắn trong 7 ngày→ open` (giữ mã + lịch sử, `reopened_count + 1`)
- SLA: đồng hồ người dừng ở `waiting` và ngoài giờ làm việc; đồng hồ AI không dừng.

### Hội thoại `conversation`
- `status`: `open|pending —conversation.set_status→` bất kỳ trạng thái khác · `→ snoozed` bắt buộc `snoozed_until` (REQ-C10) · `snoozed —(sys) đến giờ | tin mới vào→ open` · `closed —(sys) tin mới vào→ open`.
- `hidden_at` (D50) không phải trạng thái: `conversation.hide` / `unhide`; tin mới vào → xoá `hidden_at`.
- `ai_state` *(sys)*: `idle → running → idle | waiting_approval | handoff`; `waiting_approval —approval.decided→ running | idle`; `handoff —conversation.assign (người nhận)→ idle`.

### Tài khoản kênh `channel_account`
- `pending → connecting` *(sys, bắt đầu xác thực)* · `connecting → connected | error` *(sys)*
- `connected → error | expired` *(sys)* · `connected —channel.disconnect→ disconnected`
- `error|expired|disconnected —channel.reconnect→ connecting`
- `channel.pause` / `resume` là cờ trong `settings`, không đổi `status`. Trạng thái của **loại kênh** suy ra từ các tài khoản (REQ-B09).

### Chiến dịch `campaign` (governance: gửi hàng loạt luôn cần duyệt)
- `draft —campaign.submit→ pending_approval` · `pending_approval —campaign.approve→ approved` · `—campaign.reject→ rejected`
- `rejected —campaign.update→ draft`
- `approved —(có scheduled_at)→ scheduled` · `approved|scheduled —(sys) đến giờ / gửi ngay→ running`
- `running —campaign.pause→ paused` · `paused —campaign.resume→ running` · `running —(sys) hết người nhận→ completed`
- `draft|pending_approval|approved|scheduled|paused —campaign.cancel→ cancelled` **[đề xuất]**
- Terminal: `completed`, `cancelled`.

### AI Agent `ai_agent` · tri thức · duyệt
- `ai_agent`: `draft —agent.publish→ active` (tạo `ai_agent_version`) · `active —agent.pause→ paused` · `paused —agent.publish→ active` · `active —agent.publish→ active` (version mới) · `agent.rollback` = publish lại snapshot cũ · `agent.delete` xoá mềm, chặn khi agent đang phụ trách kênh / hội thoại mở **[đề xuất]**.
- `kb_source`: `pending → processing → ready | failed` *(sys)* · `ready|failed —kb.refresh_source→ processing`.
- `approval_request`: `pending —approval.approve→ approved` · `—approval.edit_and_approve→ edited` · `—approval.reject→ rejected` · `—(sys) quá hạn→ expired` (**[đề xuất]** 72 giờ, cấu hình ở `ai_governance`). Terminal: cả bốn.
- `contact_access_request`, `kb_suggestion`: `pending → approved | rejected`, terminal.
