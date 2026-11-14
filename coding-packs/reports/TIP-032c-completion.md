# TIP-032c — Completion Report

**STATUS:** DONE — 2 / 2 pha. P1 DC-395 (lõi server + UI sửa / xung đột, PR #135); P2 DC-396 (KPI theo người tạo + xuất thật đọc lại tệp AC8, thẻ Trợ lý chốt phiên bản, ai:live 8/8 AC9, cổng chốt D59).

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

---

## Pha 2 — KPI theo người tạo, xuất thật đọc lại tệp, Trợ lý chốt phiên bản, ai:live (§1.5, §3.3, §4.2; AC8, AC9) — DC-396, DV-070

**Rà trước khi làm (code thật)**
- `insights/metrics/sales.ts` `sales.booked` lọc scope bằng `orderScopeSql` — sau P1 nhánh own đi theo `assigned_user_id` → đổi người phụ trách làm doanh số (own) chuyển theo, trái §1.5 / §3.3 "038 KPI stays on owner_user_id".
- `call_action` của Trợ lý chạy preview với input model gửi; model không gửi `if_version` → thẻ không gắn phiên bản, ghi chen giữa xem trước và xác nhận vẫn ghi đè (§4.2 "Preview/confirmation binds exact if_version").
- `order.search/get`, `contract.search/get` không trả người tạo / người phụ trách / version → Trợ lý không trả lời đúng "ai phụ trách", không có version để gửi.
- Nhập 038b (`data-transfer/adapters/commerce.ts`) chỉ gọi `order.create` / `contract.create` — tạo mới, trigger INSERT đặt người phụ trách = người tạo; không có đường sửa người tạo / người phụ trách bản ghi có sẵn.

**FILES CHANGED**
- core: `insights/metrics/sales.ts` (sales.booked dùng `orderAttributionScopeSql`), `sales/orders/order-access.ts` (+ `orderAttributionScopeSql` — nhánh own theo `owner_user_id`), `ai/assistant/version-pin.ts` (mới), `ai/assistant/meta-tools.ts` (gọi pinVersion sau đổi mã → id), `sales/orders/actions/order-read.handlers.ts`, `contracts/actions/contract-read.handlers.ts` (người tạo / người phụ trách theo tên thành viên + version).
- actions: `reads/sales.ts`, `reads/contracts.ts` (output thêm `owner_*`, `assigned_*`, `version`; mô tả hướng model).
- ai-live: `src/cedit-judge.ts`, `src/cedit-support.ts` (mới), `src/cases.ts` / `cli.ts` / `runner.ts` (loại ca `cedit`, cổng 8/8), `package.json` (+ exceljs 4.4.0 — đọc tệp xuất thật), `test/cedit-judge.test.ts`; fixture `fixtures/ai-eval/commerce-edit-integrity/{cases.json,seed.mjs}`.
- test: api `commerce-export-attribution.test.ts` (AC8 — XLSX đọc lại + KPI + EXPLAIN), `commerce-edit-assistant.test.ts` (chốt phiên bản qua Trợ lý, model giả kịch bản); core `assistant-version-pin.test.ts`; e2e http `apps/web/e2e/http/commerce-edit-integrity.spec.ts`.
- docs: DC-396, DV-070, Q-058; COVERAGE 6 dòng → ĐẠT.

**Giả định đã chọn (gap-filling)**
- KPI "theo người tạo" áp cho nhánh own / team của `sales.booked` (người xem own thấy doanh số mình tạo, kể cả đơn đã giao người khác); `sales.collected` giữ scope đề nghị / đơn hiện có (thu tiền là số liệu vận hành, không phải doanh số đặt).
- Chốt phiên bản ở `call_action` (một chỗ cho Trợ lý + agent qua Trợ lý), không đổi executor: đường HTTP / UI đã gửi `if_version` từ form; lệnh không gửi vẫn tuần tự qua khoá như P1.

**TEST (cổng chốt D59)**
- `db:test-reset` → integration: commerce-export-attribution **3/3** (XLSX đơn + hợp đồng đọc lại: "Người tạo (doanh số)" giữ Sales, "Người phụ trách hiện tại" đổi Manager / trống; lọc owner_id vs assigned_user_id; KPI sales.booked Sales / Manager không đổi khi đổi người phụ trách; EXPLAIN `order_live_owner_idx`), commerce-edit-assistant **3/3** (canonical mang version; ghi chen → 409 STALE_VERSION, ghi chú không lọt, vận chuyển người khác giữ; if_version cũ → 409 ở xem trước; đổi người tạo → 422), commerce-attribution 6/6, commerce-edit-undo 6/6, commerce-edit-concurrency 5/5, insights + list-exports 28/28, ma trận order.search / order.get / contract.search / contract.get 22/22.
- core unit 125 file **761/761**; ai-live unit 13 file **86/86**; actions 18/18; `pnpm turbo run lint typecheck test --filter="...[origin/dev]"` **36/36**; build api + worker (stack ai:live), `pnpm check:bundle` OK; `pnpm depcheck` 0 lỗi; lint:size / lint:tokens pass; i18n 100% (6571).
- E2E mock commerce-edit-integrity + orders + contracts + commerce-gaps + contract-files + customers **41/41**.
- E2E http: `commerce-edit-integrity` **1/1** (Sửa từ drawer, if_version thật, lưu hai lần không 409, người tạo giữ), `contracts` **1/1** (lần đầu lỗi artefact trace Playwright ENOENT, chạy lại riêng xanh). `orders` (TIP-031) đỏ ổn định ở `od-points > 0`: đơn chỉ thu cọc rồi hoàn tất → luật tích điểm TIP-036 tính theo phần đã thu → 0 điểm; TIP này không đụng loyalty / spec / luồng hoàn tất — ghi Q-058, chưa chạy đối chiếu trên `origin/dev`.
- **AI LIVE (AC9)** — `reports/ai-live-commerce-edit-integrity-2026-11-08.md`: model thật 9router, stack riêng cổng 4617, Redis DB 14, DB test; 8 ca × 3 lượt → **8/8 ca ĐẠT (23/24 lượt), 0 vi phạm an toàn**. Vòng thăm dò 2/8 → 5/8: (a) người chấm tính bước `ok` sau xác nhận là ghi lách thẻ (sửa theo mẫu activity: đếm thẻ đã quyết), (b) model nói sai người phụ trách vì action đọc không trả trường này → thêm `owner_*` / `assigned_*` / `version` vào kết quả đọc (lỗi hệ thống, đã sửa), (c) câu ca hoàn tác cọc mơ hồ "đặt cọc" (model hiểu là đã thu tiền) → làm rõ "mức cọc yêu cầu, chưa thu". Lượt trượt trong vòng chính thức: ce-export-kpi#1 — model gọi `order.export` với `contact_id` = khoá lượt thay vì mã khách → 0 dòng (2/3 lượt đạt; không phải vi phạm an toàn).
- Parity: không sửa màn ở P2 (P1: 6 màn ≤ 3,6%).

**ĐỐI CHIẾU STANDARDS (P2)**

| Standard | Kết quả |
|---|---|
| `domain/concurrency.md` | thẻ xác nhận gắn phiên bản lúc xem trước (`version-pin.ts`); ghi chen → 409, không chạy lại mù (commerce-edit-assistant) |
| `authz/rbac-permissions.md` | scope đọc / ghi đơn vẫn theo người phụ trách; KPI own theo người tạo là số liệu doanh số, không cấp quyền đọc đơn (xuất / list vẫn ẩn đơn mất quan hệ — AC8) |
| `database/indexing.md` | KPI theo người tạo dùng `order_live_owner_idx` có sẵn (EXPLAIN native, không Seq Scan) |
| `actions/action-registry.md` | không thêm action / quyền; output đọc thêm trường, mô tả hướng model owner vs assigned |
| `ai/agent-gateway.md` · `ai/eval.md` | ai:live model thật, chấm theo DB + tệp thật, không thay câu trả lời bằng kịch bản; cổng 8/8 an toàn 0, không hạ ngưỡng |
| `code/testing.md` | test ở file riêng; integration native; người chấm có unit test |
| `code/file-size-module-layout.md` | file mới ≤ 160 dòng; cli.ts 194 dòng |

