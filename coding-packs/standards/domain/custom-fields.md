# Domain — Trường dữ liệu tuỳ biến (Custom Fields)

> Chốt D56 (2026-10-30), thực hiện REQ-F04 (kéo lên P0). Áp cho 6 thực thể: `contact`, `product`, `quote`, `order`, `ticket`, `appointment`.

## Quy tắc

1. **Định nghĩa một nơi:** `custom_field_def(entity, key, label, type, options, required, ai, sys, visible_in, roles, condition, sort)` (Blueprint §2). Quản lý qua `custom_field.define / update / delete` — trang Cài đặt → Trường dữ liệu (đủ 6 thực thể) và lối tắt "Trường thông tin mở rộng" trên màn danh sách. Hai lối dùng **cùng dữ liệu**.
   - `sys = true`: trường hệ thống (cột thật của bảng), chỉ đổi được cờ hiển thị / bắt buộc, không đổi kiểu, không xoá. Trường trùng cột thật của màn (danh mục / thời lượng sản phẩm, trạng thái thanh toán đơn) cũng là `sys` để không hiện hai lần.
   - `key` sinh tự động (`cf_<n>`), không đổi sau khi tạo; đổi nhãn không ảnh hưởng dữ liệu.
2. **Lưu giá trị:** mỗi bảng thực thể có cột `custom jsonb NOT NULL DEFAULT '{}'`, khoá = `key` của trường **không phải hệ thống**.
   - Index: GIN `(custom jsonb_path_ops)` cho lọc bằng; trường có `visible_in.filter` kiểu number / currency / date thêm expression index `((custom->>'cf_x')::numeric)` / `::date` khi cần lọc khoảng (`database/indexing.md`).
   - Xoá trường: giá trị giữ 30 ngày (undo), job dọn sau đó.
3. **Ghi qua action:** `create` / `update` của 6 thực thể nhận thêm `custom` (schema chung `customValuesSchema`, hàm kiểm `validateCustomValues` ở `packages/shared/src/custom-fields/values.ts` — dùng chung FE, mock và BE). Ticket, lịch hẹn hiện chỉ có `create` → sửa giá trị sau tạo chờ action `update` của hai module này.
   - `ActionExecutor` (FE mock: handler) **kiểm theo định nghĩa hiện hành**: key phải tồn tại và không phải `sys`; kiểu đúng; `picklist` / `multi` / `tier` thuộc `options`; `required` bắt buộc khi tạo; trường bị ẩn theo `roles` thì người không thuộc vai trò không ghi được. Sai → `422 VALIDATION_FAILED` với `fields: { "custom.cf_x": code }`.
   - Kiểu lưu: text / textarea / phone / email / picklist / tier / lookup = string; number = number; currency = **string VND** (như mọi số tiền); date = `YYYY-MM-DD`; multi / tags = string[]; file = `file_id` (upload qua storage port).
   - `update` merge từng key; gửi `null` để xoá giá trị một trường.
4. **Hiển thị theo `visible_in`** (một primitive dùng chung ở `apps/web/src/shared/custom-fields/`):
   - `form` → phần **"Thông tin thêm"** cuối form tạo / sửa, ô dựng theo kiểu (`CustomFieldInputs`).
   - `list` → mỗi trường thành một cột của `DataTable` (`customColumns()`), định dạng qua `fmt`.
   - `filter` → ô lọc trong `FilterPopover` cho kiểu picklist / tier / multi (chọn giá trị) và text (chứa); màn lọc bằng select trên thanh (Hỗ trợ, Lịch hẹn) dùng `CustomFilterSelects` (chỉ kiểu lựa chọn). Query gửi `cf.<key>=<giá trị>`; API lọc trước khi phân trang.
   - `detail` → khối **"Thông tin thêm"** ở drawer chi tiết / Hồ sơ 360° (`CustomFieldList`).
   - Form Sản phẩm dùng khung "Trường dữ liệu riêng" có sẵn của prototype (L4487) thay cho phần "Thông tin thêm".
   - `kanban`, `export`: thẻ Kanban hiện tối đa 2 trường; xuất Excel thêm cột — làm cùng lúc với tính năng xuất của module.
   - `roles` rỗng = mọi vai trò; có giá trị thì chỉ vai trò đó thấy / sửa. `condition` (hiện có điều kiện) là P1 — đợt này lưu được nhưng chưa áp.
5. **Nhãn:** `label` do người dùng nhập, hiển thị nguyên văn (không qua i18n — như tên vai trò tuỳ biến, `i18n/i18n.md` §6). Nhãn kiểu trường, vị trí hiển thị, "Thông tin thêm" qua i18n.
6. **AI:** `find_actions` trả input schema kèm định nghĩa trường của workspace (trường `ai = true`, LLM được điền). Form Generative UI (D55) dựng được ô trường tuỳ biến từ cùng định nghĩa. Trường `ai = true` do AI điền gắn nhãn ✦ như prototype.
7. **Kiểm thử:** unit cho validate `customValues` (đủ kiểu, required, options, role); e2e mỗi module có bảng: tạo trường → hiện cột + ô form + ô lọc → nhập giá trị → lọc ra đúng bản ghi → hiện trong chi tiết.
