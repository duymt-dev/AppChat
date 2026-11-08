# TIP-015d — Completion Report

**STATUS:** ĐANG LÀM — pha 2 / 4 (P1 DC-391, P2 DC-392). P1 lõi server · P2 UI + đọc trạng thái · P3 thông báo hai bên + bulk + duyệt theo domain · P4 khoá gốc writer khác + ai:live + cổng chốt D59.

**MIGRATION:** tenant `20261108070000_contact_transfer` → sau merge chạy `pnpm --filter @appchat/db db:migrate-tenants` + build lại api / worker.

---

## Pha 1 — chuyển phụ trách một transaction + duyệt bắt buộc theo nguồn (§1–§4.1; AC1, AC3, AC4, AC6, AC7)

**Rà trước khi làm (code thật)**
- `contact-owner.handlers.ts` cũ đổi khách + hội thoại ngay, trả `quotes: 0, appointments: 0`; báo giá đổi sau commit qua consumer `sales.quote-owner` (đổi cả `owner_user_id` — người tạo tính doanh số); lịch hẹn không ai chuyển. Đúng như TIP mô tả.
- `owner-move.ts` gán người nhưng không bỏ agent, không tăng epoch; hoàn tác so giá trị (ABA lọt).
- `policy.ts`: agent / task write = `run`, Trợ lý = `preview` → thẻ xác nhận chạy được chuyển phụ trách (không phải duyệt D32).
- `quote.update` ghi đè `owner_user_id`; bản sửa (`request_revision`) chép owner. Vòng module Sales / Booking → Crm có thật → port phải đi qua registry kernel.

**FILES CHANGED**
- db: migration trên; `contact-transfer.prisma` (mới); `crm.prisma` (`transferGeneration`), `inbox.prisma` (`assignmentRevision`), `sales-quotes.prisma` (`assignedUserId`, `assignmentRevision`).
- actions: `define.ts` (`requiredApprovalSources`), `crm.ts` (`contact.transfer_owner`: `if_version`, output phân biệt, invalidates quotes / calendar).
- core kernel: `actions/required-approval.ts` (mới), `actions/executor.ts` (gộp luật + `noUndo`), `actions/handler.ts` (`noUndo`), `ownership/ports.ts` + `ownership/registry.ts` (mới), `index.ts` (export port).
- core crm: `ownership/{transfer.handler,transfer.service,transfer-undo,contact-lock,receipts.repo}.ts` (mới); `actions/contact-owner.handlers.ts` (facade 1 dòng, bỏ handler cũ); preview chuyển phụ trách (đếm 3 domain theo quyền module); `activities/opportunities.handlers.ts` (guard theo assigned).
- core domain: `inbox/services/ownership-port.ts`, `sales/quotes/services/ownership-port.ts`, `booking/services/ownership-port.ts` (mới) + đăng ký ở `inbox.module.ts` / `sales.module.ts` / `booking.module.ts`; `inbox/services/owner-move.ts` xoá.
- core sales: `quote-write.handlers.ts` (tạo gán `assigned`, update owner khác → 422), `quote-decide.handlers.ts` (bản sửa chép assigned), `quote-access.ts` (scope own theo assigned), `quote-system.ts` (nhắc T-2 theo assigned, bỏ `moveOpenQuotes`), `jobs/sales.jobs.module.ts` (consumer không ghi), `public.ts`.
- shared: `events.ts` (`transfer_id`, `undo` tuỳ chọn ở `contact.owner_changed`).
- web: mock `customers.ts` (kết quả phân biệt).
- test mới: `packages/actions/test/contact-transfer-policy.test.ts` (3), `packages/core/test/contact-transfer-policy.test.ts` (5), `apps/api/test/integration/contact-transfer.test.ts` (6). Sửa theo hợp đồng mới: ma trận `contact.transfer_owner`, `crm-contacts`, `quotes` (consumer cũ không ghi), fixture `record-scope` / `list-exports` / `quote.export` (thêm `assignedUserId`).

**Giả định đã chọn (gap-filling)**
- Hội thoại "ẩn" (`hidden_at`) không chuyển theo — coi như không hoạt động như lưu trữ.
- Chuyển hội thoại cho người: `auto → copilot` (như người tiếp quản 045b) — agent không còn trả lời tự động hội thoại người đã nhận; hoàn tác trả agent cũ nhưng giữ chế độ hiện tại (không bật lại auto ngầm).
- Hoàn tác về "chưa có người phụ trách" không phát `contact.owner_changed` (lược đồ cần `to`); làm mới qua event hội thoại + invalidates.
- Log `contact.transfer_owner` trước TIP (không biên nhận) → hoàn tác 409 `UNDO_NOT_SUPPORTED` (`transfer: legacy`) thay vì khôi phục theo luật cũ.

**TEST (P1)**
- `db:test-reset` → integration 14 file **120/120**: contact-transfer (6 — đếm 3 domain + biên nhận, quote owner bất biến (trigger + 422), skip / STALE_VERSION, ABA → undo 409 không khôi phục phần nào, chuyển mới hơn → undo cũ 409, port lỗi giữa chừng → rollback cả khách + hội thoại, hai lần chuyển đồng thời → 1 biên nhận), ma trận transfer_owner (Trợ lý → approval_required, UI chạy, skip không undo_until), crm-contacts, quotes, booking, crm-ui, hardening-audit, inbox, record-scope, watcher-write-denial, list-exports, insights, contact-insights, inbox-approval-cards, contact-activities, quote.export.
- core unit 734/734; actions 3/3 mới; web mock 211/211; typecheck core / actions / web; lint core sạch.
- Chưa chạy ở P1 (để cổng chốt P4): EXPLAIN 10k, E2E, parity, ai:live.

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | ActionDef mở rộng bằng metadata khai báo (`requiredApprovalSources`); quyền crm.reassign / agentGrantable / undo 24h giữ nguyên; output zod phân biệt |
| `authz/rbac-permissions.md` | không quyền / vai trò mới; nguồn AI luôn duyệt; scope ghi khách kiểm SAU khoá; người nhận không được thêm quan hệ; báo giá scope own theo người phụ trách vận hành |
| `domain/concurrency.md` | khoá gốc khách trước, con theo id tăng dần; if_version; revision do trigger (chống ABA); hoàn tác tất cả hoặc 409; đồng thời kiểm native |
| `domain/state-machine.md` | không đổi trạng thái báo giá / lịch hẹn / hội thoại; chỉ đổi người được gán |
| `events/outbox.md` | event ghi cùng transaction; `contact.owner_changed` chỉ là tín hiệu; consumer cũ không ghi, event cũ bỏ qua có log |
| `database/tenant-db.md` / `indexing.md` | không workspace_id; index `=` trước, range / sort sau (`quote(assigned_user_id, status, updated_at, id)`, `quote(contact_id, status, id) INCLUDE`, `appointment(contact_id, status, start_at, id)`, `conversation(contact_id, status, id)` partial); EXPLAIN 10k ở P4 |
| `api/response-envelope.md` | 409 STALE_VERSION / CONFLICT, 422 immutable, 503 port thiếu |
| `code/file-size-module-layout.md` | file mới ≤ 110 dòng; handler cũ thành facade 2 dòng; test riêng |
| COMMERCE §8b | doanh số theo người tạo — `owner_user_id` bất biến; lịch hẹn sắp tới tuỳ chọn; không đổi luật tiền |

---

## Pha 2 — đọc trạng thái + UI kết quả thật + báo giá hai người (§2.8, §3.2, §3.4, §4.4–4.5; DC-392)

**MIGRATION:** không.

**FILES CHANGED** (lệch ghi ở DV-066)
- actions: `contact-transfer.ts` (mới — `contact.transfer_status`), `index.ts`.
- shared: `api/contact-transfer.ts` (mới — DTO trạng thái), `api/index.ts`, `api/quotes.ts` (`assigned_user_id`, `assigned_name`).
- core: `crm/ownership/read.ts` + `status.handler.ts` (mới), `crm/crm.module.ts`, `crm/services/crm-read.service.ts` (`transfer()`), `kernel/actions/tip-owners.ts`; báo giá: `quote-view.ts`, `quotes-read.service.ts` (tên người phụ trách), `repos/quotes.repo.ts` (lọc `assignedId`).
- api: `http/crm/contact-activities.controller.ts` (GET transfers), `http/sales/quotes.controller.ts` (`assigned_user_id`).
- web: `customers/hooks/useContactTransfer.ts` + `components/TransferResult.tsx` + `styles/transfer-result.styles.ts` (mới); `TransferOwnerModal.tsx`, `BulkTransferModal.tsx` (kết quả thật, Dừng); `_crm-forms/ContactFormHost.tsx` (version); báo giá: `types.ts`, `api.ts`, `QuotesToolbar.tsx` (lọc Phụ trách hiện tại), `QuoteFormModal.tsx` (Người báo giá khoá khi sửa), `OverviewTab.tsx` (Phụ trách hiện tại); mock `quotes.ts` / `quotes-actions.ts` (assigned, owner bất biến); i18n vi + en (`customers`, `quotes`, `actions`).
- test mới: `useContactTransfer.test.tsx` (3), `e2e/contact-transfer.spec.ts` (2), ma trận `contact.transfer_status` (3), `contact-transfer.test.ts` +1 (trạng thái HTTP / action, phân trang, 403 / 404 / 400, DTO + bộ lọc báo giá).

**Giả định đã chọn (gap-filling)**
- Danh sách báo giá giữ cột "Người BG" = người tạo (prototype); người phụ trách hiện tại chỉ hiện ở Tổng quan khi khác người tạo + bộ lọc riêng — không thêm cột mới vào bảng prototype.
- Hộp chuyển một khách: chuyển thật / bỏ qua → đóng (toast + Hoàn tác như cũ); chờ duyệt / lỗi → giữ hộp với kết quả (người dùng tự đóng).

**TEST (P2)**
- Integration: contact-transfer 7/7, ma trận transfer_status 3/3, quotes + list-exports + quote.export + quote.update 33/33.
- turbo lint / typecheck / test `...[origin/dev]` 36/36; web unit hook 3/3; i18n 100% (6552); lint:size, lint:tokens pass; depcheck không lỗi mới.
- E2E mock: contact-transfer 2/2; customers + quotes 15/15 (+15 skip bản thiết bị khác).

