# TIP-015f — Completion Report

**STATUS:** ĐANG LÀM — 2 / 5 pha. P1 DC-397 (lõi server xoá mềm / khôi phục / thùng rác, 7 port phụ thuộc, PR #137); P2 DC-398 (danh tính khách đã xoá, tin vào không làm giàu CRM / không kích agent, hàng rào AI, dấu Hộp thư). Còn: P3 biên nhận đơn sàn bị chặn + khoá gốc tài chính + cổng sống writer + hoàn tác tạo không xoá cứng; P4 UI thùng rác + DeletedContactPanel; P5 xác minh native + ai:live 8 ca.

**MIGRATION:** tenant `20261108090000_contact_lifecycle` → sau merge chạy `pnpm --filter @appchat/db db:migrate-tenants` + build lại api / worker. (Manifest ghi `20261102001560_…` — đổi tên theo thứ tự chuỗi migration, DV-071.)

---

## Pha 1 — xoá mềm có biên nhận thế hệ, phụ thuộc qua 7 port, khôi phục 30 ngày, thùng rác theo scope (§1–§2, §5.3; AC1 lõi, AC6) — DC-397, DV-071

**Rà trước khi làm (code thật)**
- `ContactDeleteHandler` cũ (trong `contact-write.handlers.ts`, file quá trần) chỉ đặt `deleted_at`, không kiểm phụ thuộc, không biên nhận / hạn; undo đặt lại `deleted_at = null` không kiểm quyền hiện tại / trùng SĐT.
- Không có thế hệ vòng đời: xoá → khôi phục → xoá lại thì undo log đầu khôi phục nhầm lần xoá sau.
- Không có thùng rác / action khôi phục; hội thoại của khách đã xoá vẫn để lượt AI chạy tiếp.
- Khách gộp (`merged_into_id`) là họ khách — xoá gốc phải khoá cả nguồn.

**FILES CHANGED** (lệch manifest ghi ở DV-071)
- db: migration trên (`lifecycle_revision` + trigger `contact_lifecycle_guard`, enum `contact_lifecycle_state`, bảng `contact_lifecycle_receipt`, index một phần thùng rác + index phụ thuộc, backfill legacy); `crm.prisma`, `contact-lifecycle.prisma` (mới).
- core kernel / composition: `kernel/contact-lifecycle/{ports,registry,sql}.ts`, `composition/contact-lifecycle.module.ts` (mới); 7 port domain (sales, contracts, inbox, booking, support, loyalty, marketing).
- core CRM: `crm/lifecycle/*` (10 file mới); `contact-write.handlers.ts` → facade; preview cũ gỡ; `crm.module.ts`, `crm/public.ts`, `index.ts`.
- actions: `contact-lifecycle.ts` (mới — `contact.restore`, `contact.deleted_list`); `crm.ts` (`contact.delete` nhận `if_version`, output biên nhận); `index.ts`.
- shared: `api/contact-lifecycle.ts` (mới), `api/index.ts`, `events.ts` (`contact.deleted`, `contact.restored`).
- api: `contacts.controller.ts` (`GET /contacts/deleted` trước `contacts/:id`), `app.module.ts`; worker: `worker.module.ts`.
- web: i18n `actions.json` vi / en (tiêu đề 2 action); mock `contact.delete` cùng hình kết quả.
- test mới / sửa: api ma trận `contact.delete` (4, viết lại), `contact.restore` (5), `contact.deleted_list` (6, gồm EXPLAIN); core `contact-lifecycle.test.ts` (6).

**Giả định đã chọn (gap-filling)**
- Mức chặn: đơn mở, công nợ còn lại (sent / partial / overdue và còn phải thu), hoá đơn nháp, đề nghị thanh toán / hoàn tiền đang chờ, hợp đồng chưa đóng → `block`; còn lại (đơn đã đóng, báo giá, liệu trình, hội thoại, lịch hẹn, ticket, điểm, người nhận chiến dịch) → `warn`.
- 409 HAS_DEPENDENCIES chỉ trả số đếm theo loại (không id / tiền / tên) — không phụ thuộc người xem thấy được gì.
- Undo log `contact.delete` = khôi phục với quyền HIỆN TẠI (crm.delete + scope ghi), không hồi sinh quyền đã mất; log trước 015f → 409.
- Khôi phục bị chặn khi có khách sống trùng `phone_norm` — trả `phone: taken`, không lộ khách kia.
- Mã thao tác biên nhận = `contact.delete:<Idempotency-Key>` (gọi lặp cùng khoá → cùng biên nhận).

**TEST (cổng khi làm — D59)**
- `db:test-reset` → integration native: `contact.delete` 4/4, `contact.restore` 5/5, `contact.deleted_list` 6/6 (EXPLAIN `contact_deleted_recent_idx` / `contact_deleted_owner_idx`, không Seq Scan); hồi quy `crm-contacts`, `watcher-write-denial`, `genui` 21/21.
- `assistant-vertical` mục lục ma trận: đỏ có sẵn — 11 action của TIP 027 / 032 / 013 / 038b chưa có file ma trận (không có action nào của 015f; 3 action 015f đều có file).
- core unit 126 file 767/767 (gồm `contact-lifecycle.test.ts` 6/6); actions 18/18; shared 146/146; api 11/11; worker 7/7; ai 70/70; web 442/442.
- turbo lint / typecheck core / api / worker / actions / shared / db 12/12; build api + worker, `pnpm check:bundle` OK; `pnpm depcheck` 0 lỗi mới.
- E2E mock customers 8/8. i18n 100% (6575).

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `domain/concurrency.md` | khoá họ khách id tăng dần FOR UPDATE, đọc lại sau khoá, thử lại có giới hạn → 409; `if_version` sau khoá |
| `domain/state-machine.md` | sống ↔ đã xoá chỉ qua dịch vụ vòng đời; thế hệ +1 mỗi lần lật (trigger chặn nhảy / lùi); biên nhận deleted → restored / expired |
| `authz/rbac-permissions.md` | crm.delete + scope GHI qua người phụ trách / nhóm; collaborator / watcher không đủ; không thấy → 404, thấy mà không đủ → 403; action không cấp agent |
| `database/indexing.md` | index một phần `(deleted_at DESC, id DESC) INCLUDE …` và `(owner_user_id, deleted_at DESC, id DESC)`; seek cursor; deferred join; EXPLAIN native |
| `database/tenant-db.md` | DB tenant qua resolver; không `workspace_id`; scope áp trước phân trang |
| `actions/action-registry.md` | action mới có zod input / output, quyền, risk, invalidates; ma trận một file mỗi action |
| `api/response-envelope.md` | `{ data, next_cursor }`; 409 HAS_DEPENDENCIES / STALE_VERSION / INVALID_STATE / CONFLICT; 503 thiếu port; 400 cursor hỏng |
| `events/outbox.md` | `contact.deleted` / `contact.restored` cùng transaction (undo ghi outbox trong tx) |
| `i18n/i18n.md` | vi + en, không tuần tự lại JSON |
| `code/file-size-module-layout.md` | file mới ≤ 120 dòng; file quá trần chỉ còn facade; test file riêng |

---

## Pha 2 — danh tính khách đã xoá, tin vào giữ nhưng không làm giàu CRM, hàng rào AI, dấu Hộp thư (§3.1–§3.3, §4.1–§4.3; AC3, AC5 lõi) — DC-398, DV-072

**Rà trước khi làm (code thật)**
- `matchIdentity` coi khách gốc đã xoá như không có identity → rơi sang SĐT → `resolve` TẠO khách mới và `upsert` gắn lại identity sang khách mới (mất liên kết cũ, khách đã xoá "tái sinh").
- Pipeline đọc khách không xét `deleted_at`: hội thoại mới gán người phụ trách / nhóm / agent mặc định theo hồ sơ CRM; VIP + tiêu đề lấy tên CRM; `agentReply` vẫn bật.
- `buildReplyContext` nạp hồ sơ + ghi nhớ không xét xoá; `finishResumedTurn` lấy epoch mới (không so epoch lượt gốc).
- `importExternal` dùng cùng `resolve` → đơn sàn của người mua đã xoá tạo khách + đơn mới.
- DTO hội thoại không có dấu vòng đời khách.

**FILES CHANGED** (lệch manifest ở DV-072)
- core: `crm/lifecycle/identity-state.ts` (mới); `crm/services/identity-match.ts`, `identity.service.ts`; `inbox/services/pipeline.ts`, `read.service.ts`, `view.ts`; `ai/reply/reply-context.ts`, `reply.service.ts`; `sales/orders/services/order-import.ts`.
- shared: `api/inbox.ts` (`contact_deleted`), `events.ts` (`message.received.contact_deleted`).
- test mới: core `contact-lifecycle-identity.test.ts` (3); api `contact-lifecycle-inbound.test.ts` (5).

**Giả định đã chọn (gap-filling)**
- Hội thoại MỚI của khách đã xoá vẫn gắn id khách cũ (giữ liên kết lịch sử) nhưng vào hàng chung: không người phụ trách / nhóm / agent.
- Tiêu đề hội thoại của khách đã xoá = tên người gửi theo kênh / "Khách" (tên người gửi trong tin là lịch sử tin, không phải hồ sơ CRM).
- Đơn sàn mới của người mua đã xoá: chưa có bảng biên nhận chặn → fail closed 409 cho lô (nguồn giữ để thử lại, không mất đơn) — biên nhận bền làm ở P3.

**TEST (cổng khi làm — D59)**
- Integration native: `contact-lifecycle-inbound` 5/5; ma trận `contact.delete` / `contact.restore` 9/9; hồi quy channel-sync-policy, hardening-takeover, inbox-ui, lead-routing (+ contract), inbox, inbox-vertical-context, inbox-assignees, orders, webchat — xanh; `agent-reply` 13/14 — ca A→B→A đỏ có sẵn (đã kiểm khi gỡ thay đổi `ai/reply` vẫn đỏ) → Q-059.
- core unit `contact-lifecycle-identity` 3/3 + `channel-sync-identity` 2/2; turbo lint / typecheck / test core / shared / api / worker / web xanh; build api + worker, `check:bundle` OK; depcheck 0 lỗi.
- E2E mock inbox 11/11.

**ĐỐI CHIẾU STANDARDS (P2)**

| Standard | Kết quả |
|---|---|
| `channels/omnichannel-adapter.md` | tin vào luôn lưu đúng một lần (chống trùng sẵn có); không tạo khách / gắn lại identity cho khách đã xoá |
| `domain/concurrency.md` | đọc trạng thái khách SAU `lockContactRow` (xoá / khôi phục tuần tự với tin vào) |
| `ai/agent-gateway.md` | không kích agent / không nạp ngữ cảnh CRM của khách đã xoá; chạy tiếp sau duyệt bỏ qua; rào epoch giữ nguyên ở ghi tin + đặt chỗ gửi |
| `authz/rbac-permissions.md` | không đổi quyền; Hộp thư giữ lịch sử theo quyền Hộp thư |
| `api/response-envelope.md` | DTO thêm trường tuỳ chọn; đơn sàn 409 CONFLICT `contact: deleted / unavailable` |
| `events/outbox.md` | `message.received` thêm cờ tuỳ chọn, không đổi topic |
| `code/file-size-module-layout.md` | file mới 35 dòng; pipeline 230, reply.service 325 dòng |
