# TIP-032c — Completion Report

**STATUS:** ĐANG LÀM — pha 1 / 2 (P1 DC-395: lõi server + UI sửa / xung đột + test native). Còn P2: AI-first / xuất thật đọc lại tệp (AC8), ai:live 8 ca (AC9), cổng chốt D59.

**MIGRATION:** tenant `20261108080000_commerce_edit_integrity` → sau merge chạy `pnpm --filter @appchat/db db:migrate-tenants` + build lại api / worker. (Tên theo thứ tự thời gian thật của chuỗi migration — manifest ghi `20261102003230_…` là tên lúc lập TIP, đã có migration mới hơn nên đổi để giữ thứ tự áp dụng — DV-069.)

---

## Pha 1 — người tạo bất biến + người phụ trách, CAS phiên bản dòng, hoàn tác theo trường, hoàn tác tạo giữ lịch sử (§1–§3, §4.1, §5; AC1–AC7)

**Rà trước khi làm (code thật)**
- `contract-write.handlers.ts` (update) đổi `owner_user_id` và hoàn tác khôi phục ảnh chụp cả hàng (kể cả owner); `order-edit.handlers.ts` như vậy — đúng như TIP mô tả.
- `restore()` của đơn dùng chung cho cọc / vận chuyển → hoàn tác cọc ghi đè ghi chú / vận chuyển / tuỳ biến / owner; hoàn tác vận chuyển không khoá dòng, không kiểm phiên bản / quyền hiện tại; xoá `order_event` gốc.
- Hoàn tác tạo đơn `DELETE` dòng đơn + gỡ `quote.order_id` (báo giá thành chuyển đổi lần hai được); hoàn tác tạo / xoá hợp đồng chỉ kiểm trạng thái.
- Bảng `contract` / `order` không có phiên bản dòng; scope own đi theo `owner_user_id` (người tạo = quyền ghi vĩnh viễn).
- Đồng bộ sàn đọc `shipping` TRƯỚC khoá rồi gộp; nhập đơn sàn mới chụp người phụ trách khách không khoá khách.
- Writer dòng cha: handler hợp đồng / đơn, seam 030b (thay tệp nguồn, đề xuất AI, gắn đề xuất soạn), sổ thu / hoàn tiền / điểm, đồng bộ sàn — tất cả ghi chính dòng `contract` / `order` → trigger phiên bản phủ hết; writer con duy nhất của đơn là `writeItems` (luôn đi kèm UPDATE dòng cha trong cùng transaction).

**FILES CHANGED** (lệch manifest ghi ở DV-069)
- db: migration trên (cột `assigned_user_id` + `version`, backfill một lần, trigger `commerce_row_guard` chặn đổi owner kể cả về null + version = OLD + 1, trigger INSERT `commerce_assigned_default`, 4 index `*_live_assigned*`); `contracts.prisma`, `sales-orders.prisma`.
- actions: `commerce-edit-schemas.ts` (mới — `ifVersion`, `assignedUserId`, `ownerEcho`); `contracts.ts` / `orders.ts` (`if_version` ở update / delete / set_deposit / update_shipping, `assigned_user_id`, output `version`, mô tả hướng model); `list-exports.ts` (mô tả bộ lọc).
- core đơn: `editing/{order-version,order-assignment,order-edit,order-undo,order-create-undo}.ts` (mới); `order-edit.handlers.ts` thành facade; `order-create.handlers.ts` (`after` = id + `after_version`, hoàn tác = huỷ giữ lịch sử); `order-from-appointment.handler.ts`; `order-access.ts` (scope theo assigned); preview sửa (if_version + owner echo + người phụ trách); `order-import.ts` (khoá rồi mới đọc vận chuyển; khoá khách trước khi chụp người phụ trách); `order-write.ts` (`orderPayload` chuyển về — gỡ vòng import); `order-flow.handlers.ts`; `orders.repo.ts` (bộ lọc `assignedId`); `order-view.ts`, `orders-read.service.ts`.
- core hợp đồng: `editing/{contract-version,contract-assignment,contract-edit,contract-undo,contract-create-undo}.ts` (mới); `contract-write.handlers.ts` (update / delete gọi module mới); `contract-create.ts` (`createdAfter`, hoàn tác tạo mới); `contract-draft.handler.ts`, `contract-file.handlers.ts` (`after` có `after_version`); `contract-access.ts` (scope theo assigned); preview; `contracts.repo.ts`, `contract-view.ts`, `contracts-read.service.ts`.
- core khác: `sales/payments/*` (scope đề nghị / liệu trình / hoàn tiền theo người phụ trách đơn); `data-transfer/adapters/commerce.ts` (gắn đơn theo scope hiện tại); `insights/exports/sales-readers.ts` (cột Người tạo + Người phụ trách hiện tại, bộ lọc `assigned_user_id`).
- shared: `api/contracts.ts`, `api/orders.ts` (`assigned_user_id`, `assigned_name`, `version`); `api/list-exports.ts`; `i18n/server/{vi,en}/insights.ts`.
- api: `contracts.controller.ts`, `orders.controller.ts` (`?assigned_user_id=`).
- web: `OrderEditModal.tsx` (mới, mount ở `CrmFormsHost`), `OrderEditConflict.tsx`, `ContractEditConflict.tsx`, `shared/actions/useEditVersion.ts` + `useOrderEditVersion.ts` / `useContractEditVersion.ts` (mới); `orders-store.ts` (`form = create | edit`, `editId`), `ui-commands.ts` (prefill tạo xoá `editId`), `OrderDrawer.tsx` (nút Sửa + dòng người phụ trách), `ShippingCard.tsx` (if_version + xung đột), `ContractFormModal.tsx` (sửa = người phụ trách + if_version + xung đột; tạo giữ ô người tạo), `useContractForm.ts` (`patch` không gửi owner), `ContractDrawer.tsx` (nút Sửa nháp + người phụ trách), toolbar 2 màn (bộ lọc Phụ trách), types / api; mock `commerce-edit.ts` (mới) + 4 domain mock; i18n `orders` / `contracts` vi + en.
- test mới: actions `commerce-edit-integrity.test.ts` (3); core `commerce-attribution.test.ts` (4), `commerce-edit-version.test.ts` (2), `commerce-edit-undo.test.ts` (2); api `commerce-attribution.test.ts` (6), `commerce-edit-undo.test.ts` (6), `commerce-edit-concurrency.test.ts` (5); web `useOrderEditVersion.test.tsx` (3), `useContractEditVersion.test.tsx` (3); e2e mock `commerce-edit-integrity.spec.ts` (3). Sửa theo hợp đồng mới: `orders.test.ts`, ma trận `order.create` / `create_from_quote` / `create_from_appointment` (hoàn tác = huỷ, giữ liên kết), `package.search` (fixture người phụ trách), `assistant-coverage` (alias `assigned_user_id`).

**Giả định đã chọn (gap-filling)**
- Người phụ trách mặc định lúc tạo = người tạo đã xác định (trigger INSERT, mọi đường tạo) — không thêm luật phân bổ mới.
- Biên nhận hoàn tác so `after_version` (không so giá trị) — mọi bản ghi sau, kể cả không liên quan, làm hoàn tác 409 (spec §3.2 bảo thủ).
- Hoàn tác tạo đơn = `cancelOrder` chuẩn với lý do `undo_create`; liên kết báo giá / lịch hẹn giữ (đơn huỷ vẫn chiếm báo giá như mọi đơn huỷ — không mở lại chuyển đổi âm thầm).
- Sự kiện bù hoàn tác sửa đơn `edit_undone` (lý do = action gốc); không xoá sự kiện `deposit_set` / `shipping` gốc.
- FE chốt `version` lúc mở form; refetch nền không mở lại form; chỉ "Tải lại" mới nạp bản mới (không thử lại mù).

**TEST (cổng khi làm — D59)**
- `db:test-reset` → integration native: commerce-attribution 6/6, commerce-edit-undo 6/6, commerce-edit-concurrency 5/5 (barrier khoá đơn, ghi nền thắng → 409, chờ khoá khách, hợp đồng song song, EXPLAIN `order_live_assigned_idx` / `contract_live_assigned_recent_idx` không Seq Scan); hồi quy liên quan — xem mục cổng dưới.
- turbo lint / typecheck / test `...[origin/dev]` 36/36; core unit 124 file 758/758; build api + worker, `pnpm check:bundle` OK; `pnpm depcheck` 0 lỗi (đã gỡ vòng `order-create ↔ order-flow`).
- E2E mock commerce-edit-integrity + orders + contracts + commerce-gaps + contract-files + customers **41/41**.
- Integration hồi quy liên quan (sau `db:test-reset`): 80 file **420/421** — gồm contracts, contract, contract-files, contract-appendix, orders, payments, commerce-packages, loyalty*, insights*, list-exports, data-transfer-commerce, record-scope, watcher-write-denial, appointment-update + ma trận `order.*` / `contract.*` / `invoice.*` / `package.*` / `refund.*`. Ca đỏ duy nhất: `contract.create_from_attachment` bước "sales ngoài scope hội thoại → 403" nhận 404 từ `writableConversation` (Hộp thư — TIP này không sửa file Hộp thư nào; hội thoại không thấy được → 404 theo rbac §9). Ghi là ngoài phạm vi, chưa đối chiếu trên `origin/dev`.
- Parity (mock 1440×900): contracts:list 3,31% · contracts:detail 1,53% · contracts:create 3,04% · orders:list 3,26% · orders:detail 3,52% · orders:create 2,93% — đều ≤ 4,2%.
- i18n 100% (6570); lint:size / lint:tokens pass.

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `domain/concurrency.md` | phiên bản dòng do trigger (không cộng ở app); khoá khách gốc → dòng → quyền → `if_version` trước khi dựng patch / đụng kho; barrier native; 409 STALE_VERSION không ghi dở |
| `domain/state-machine.md` | sửa / cọc theo ORDER_FLOW, vận chuyển SHIPPING_EDITABLE, hợp đồng CONTRACT_FLOW; hoàn tác kiểm lại trạng thái hiện tại; hoàn tác tạo đơn = huỷ chuẩn |
| `authz/rbac-permissions.md` | scope own theo người phụ trách hiện tại (list / chi tiết / đếm / xuất / thanh toán / nhập); người tạo không phải quyền ghi vĩnh viễn; hoàn tác cần quyền action gốc + scope GHI hiện tại (+ `order.cancel` cho hoàn tác tạo đơn) |
| `database/indexing.md` | `(assigned_user_id, status, created_at DESC, id DESC)` + bản không trạng thái, partial chưa xoá; giữ index owner cho KPI; EXPLAIN native |
| `actions/action-registry.md` | `if_version` tuỳ chọn, output `version`; không thêm action / quyền mới; mô tả hướng model dùng `assigned_user_id` |
| `api/response-envelope.md` | 422 immutable / not_member · 409 STALE_VERSION / CONFLICT (legacy, version, has_dependencies) · 404 ẩn |
| `events/outbox.md` | hoàn tác tạo đơn ghi event huỷ cùng transaction; hoàn tác sửa thêm sự kiện bù, không xoá lịch sử |
| `ui/frontend-structure.md` | OrderEditModal tách khỏi form tạo, mount một lần ở host toàn cục; màn chỉ điều phối; hook version dùng chung ở `shared/actions` |
| `ui/prototype-parity.md` | 6 màn ≤ 3,6% |
| `i18n/i18n.md` | vi + en đủ, không tuần tự lại JSON |
| `code/file-size-module-layout.md` | file mới ≤ 150 dòng; file cũ quá trần chỉ thêm facade; test riêng |
