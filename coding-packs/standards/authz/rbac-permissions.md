# Phân quyền — Permission-based RBAC + phạm vi dữ liệu

> Chốt 2026-10-28 (RRI **D27**, thay D11 "chỉ Owner + Member").
> Engine dựa trên **quyền (permission)**, không dựa trên tên vai trò. Phát hành **5 vai trò mặc định** và phạm vi dữ liệu. Vai trò tuỳ biến cùng trang "Vai trò & phân quyền" (prototype L5991) mở ở P1, dùng chung engine này.

## Quy tắc

1. **Code chỉ kiểm permission, không bao giờ kiểm tên vai trò.**
   - ❌ `if (role === 'owner')`
   - ✅ `can(ctx, 'billing.manage')`
2. **Mỗi action trong Registry khai báo `permission: PermissionKey`** (`ActionDef.permission`). `ActionExecutor` kiểm quyền trước handler. UI ẩn hoặc vô hiệu nút bằng cùng hàm `can()`.
3. **Danh mục permission** nằm ở `packages/shared/src/authz/permissions.ts`.
   - Đặt tên `<module>.<verb>`, nhóm theo module, bám ma trận quyền của prototype (`AppChat.dc.html` L7856, khoá `perm`; trang ma trận L6011).
   - Thêm module mới thì thêm permission ở đây.
4. **Vai trò = tập permission + phạm vi dữ liệu.**
   - Lưu ở DB tenant: `role(id, key, name, is_system, permissions text[], data_scope jsonb)`.
   - `membership.role_id` lấy từ DB nền tảng; quyền resolve ở DB tenant.
   - Vai trò hệ thống (`is_system`) không xoá được và không sửa được permission. Owner có thể nhân bản thành vai trò tuỳ biến (P1).
5. **Phạm vi dữ liệu theo module** (`data_scope`): `own | team | dept | all` (D64 thêm `dept`).
   - `own`: bản ghi có `owner_user_id = me` hoặc `assignee_user_id = me`, cộng hội thoại được gán cho mình, **cộng mọi bản ghi của khách mà mình là collaborator / watcher** (`contact_collaborator`, D32).
   - `team`: bản ghi của các thành viên cùng `team_id`. Bảng `team` và `team_member` có từ đầu; UI quản lý Nhóm ở P1.
   - `dept` (D64, DC-924): bản ghi có `team_id` thuộc đơn vị của mình **hoặc đơn vị con** (cây `team.path`). Trưởng phòng thấy cả phòng và các nhóm dưới.
   - `all`: toàn bộ workspace.
   - Repo **bắt buộc** áp `scopeFilter(ctx, module)` vào mọi query list/get. Không có bypass ngầm.
6. **AI chạy đúng quyền người ra lệnh.**
   - Trợ lý: `onBehalfOfUserId`.
   - Agent trực kênh: dùng quyền **agent** do Owner cấp (`ai_agent.tool_ids`), giới hạn trong hội thoại đang phục vụ.
   - Tác vụ tự chủ: quyền của người tạo ∩ `data_scope` của task.
   - `find_actions` chỉ trả về action mà người ra lệnh có quyền.
7. **Owner duy nhất.** Mỗi workspace có đúng một Owner (`workspace.owner_user_id`), luôn có mọi permission. Chuyển quyền Owner là action `workspace.transfer_ownership` (config, cần OTP).
8. **Field-level** (P1): `custom_field_def.visible_roles`, ví dụ prototype ẩn "Mã số thuế" và "LTV" với sales. Serializer lọc trường theo quyền.
9. **Kiểm quyền 2 lớp:**
   - API: guard trên action và route đọc.
   - Repo: scope filter.
   - Test tenant-isolation đi kèm test **role-isolation**: sales A không đọc được khách của sales B khi scope là `own`.

## Chăm sóc khách — nhiều sales (D32)

- Mỗi khách có **0–1 phụ trách chính** (`contact.owner_user_id`) và nhiều `contact_collaborator(role = collaborator | watcher)`.
  - collaborator: như owner trên khách đó (xem, nhắn, tạo báo giá / đơn / lịch), **không** chuyển phụ trách, không xoá khách.
  - watcher: chỉ đọc + nhận thông báo.
- **Chống giành khách:** tạo / nhập trùng với khách đã có owner → trả `CONTACT_OWNED` (409) kèm tên người phụ trách, không trả dữ liệu khách; UI hiện "Xin chia sẻ" (`contact.request_access`). Owner của khách hoặc người có `crm.reassign` duyệt.
- **Chuyển phụ trách** chỉ với `crm.reassign` (Quản lý, Chủ sở hữu). Agent / Trợ lý chỉ **đề xuất** (approval).
- **Doanh số** ghi `owner_user_id` lúc tạo chứng từ; không đổi khi chuyển phụ trách.
- `scopeFilter(ctx, 'crm' | 'sales' | 'inbox' | 'booking')` với `own` phải join `contact_collaborator` (index `contact_collaborator(user_id, contact_id)`).

## 5 vai trò mặc định (seed khi tạo workspace)

> Ma trận permission × vai trò và data scope mặc định chi tiết: **Blueprint §3.5**.

| Key | Tên | Tóm tắt quyền | Phạm vi dữ liệu |
|---|---|---|---|
| `owner` | Chủ sở hữu | Tất cả, gồm billing, vai trò, chuyển quyền | all |
| `manager` | Quản lý | Tất cả nghiệp vụ, thành viên, kênh, agent, duyệt (báo giá, hợp đồng, chiến dịch, hoàn tiền nếu Owner uỷ quyền); không billing, không vai trò | all |
| `sales` | Sales | Hộp thư, Khách hàng, Sản phẩm (xem), Báo giá, Hợp đồng (nháp), Đơn, Đề nghị thanh toán (tạo/gửi), Lịch hẹn, dùng Trợ lý | own (khách, hội thoại, báo giá, đơn được gán) |
| `cs` | CSKH | Hộp thư, Khách hàng (xem, sửa thông tin liên hệ), Ticket, Lịch hẹn, Loyalty (xem); không xem giá vốn hay giá trị đơn | own (ticket/hội thoại) + đọc khách: all |
| `accountant` | Kế toán | Đơn, Đề nghị thanh toán, thu tiền, hoàn tiền (đề xuất), công nợ, đối soát; xem khách | all (module sales), không vào Hộp thư |

- Ánh xạ sang prototype (Admin / Sales Manager / Sales Agent / CS Agent / Viewer):
  - Admin → `manager` có thêm quyền thành viên.
  - Sales Manager → `manager`.
  - Sales Agent → `sales`.
  - CS Agent → `cs`.
  - Viewer → vai trò tuỳ biến P1.
- Trang Vai trò & phân quyền ở P0 chỉ đọc (xem ma trận). Sửa / tạo vai trò mở ở P1. Đây là ngoại lệ parity có ghi tên.
- Giới hạn số user theo gói (`plan.max_users`). Gói Cá nhân chỉ có 1 user (SRS BR-03).

## Hợp đồng

```ts
// packages/shared/src/authz
export type PermissionKey = `${ModuleKey}.${string}`;           // 'quote.approve', 'billing.manage', 'inbox.assign'
export interface AuthzContext { userId: string; isOwner: boolean; permissions: ReadonlySet<PermissionKey>; scope: Record<ModuleKey, 'own'|'team'|'all'>; teamIds: string[] }
export const can = (ctx: AuthzContext, p: PermissionKey) => ctx.isOwner || ctx.permissions.has(p);
// packages/core/kernel/authz/scope.ts
export function scopeFilter(ctx: AuthzContext, module: ModuleKey): Prisma.Sql | WhereInput;   // own → owner/assignee = me; team → in teamIds
```

## Lý do

- Chủ nhà yêu cầu nhiều sales, CSKH… cùng tham gia (2026-10-28).
- Prototype có sẵn 6 vai trò và ma trận quyền.
- Dựng trên permission ngay từ đầu để vai trò tuỳ biến (P1) và phòng ban / sơ đồ tổ chức (P3) chỉ là dữ liệu, không phải viết lại engine.
