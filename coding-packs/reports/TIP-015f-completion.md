# TIP-015f — Completion Report

**STATUS:** ĐANG LÀM — 1 / 4 pha. P1 DC-397 (lõi server xoá mềm / khôi phục / thùng rác, 7 port phụ thuộc). Còn: P2 ingress + danh tính + đơn sàn bị chặn + hàng rào gửi AI; P3 UI thùng rác; P4 xác minh native + ai:live 8 ca.

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
