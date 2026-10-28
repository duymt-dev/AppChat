# Database — Mỗi workspace một database

> Chốt V14 / D21. **Thay thế** mô tả "shared DB + RLS + `workspace_id`" trong phần PATTERNS_DETECTED của Scan Report, vốn chép từ spec cũ.

## Quy tắc

1. **Hai loại DB, hai Prisma client:**
   - `appchat_platform` (`@appchat/db/platform`): identity, billing, registry, routing, cấu hình model.
   - `ws_<short_id>` (`@appchat/db/tenant`): mọi dữ liệu nghiệp vụ.
   - Bảng mới **phải ghi rõ** `[P]` (platform) hay `[T]` (tenant) trong Blueprint §2.2.
2. **Bảng tenant không có `workspace_id`, không RLS.** Cô lập ở mức database.
3. **Không FK giữa 2 DB.** Tham chiếu user từ tenant chỉ là cột scalar `user_id`; service kiểm tồn tại qua `membership`.
4. **Chỉ lấy DB tenant qua `TenantDbResolver.get(ctx)`** với `TenantContext` đã xác thực (membership hoặc route registry).
   - Cấm tạo `PrismaClient` tay.
   - Cấm nhận tên DB hoặc host từ client.
5. **Thao tác chạm 2 DB không có transaction chung.**
   - Làm phía platform trước với khoá idempotent `(workspace_id, ref_type, ref_id)`, rồi ghi tenant.
   - Job đối soát hằng giờ sửa chênh lệch.
6. **Migration:**
   - Mỗi TIP một thư mục `<ts>_<tip>_<desc>` trong `platform/` hoặc `tenant/`. Không sửa migration đã merge.
   - Phải **expand-compatible**: code mới chạy được với schema cũ một version.
   - Thứ tự deploy: platform → template → `tenant-migrate` (song song 4, ghi `tenant_migration`).
7. **Prisma relation chỉ trong cùng một file domain.** Xuyên domain thì dùng cột scalar; FK (trong cùng DB) thêm bằng SQL trong migration.
8. **Cột chuẩn:**
   - `id uuid` (bảng hot dùng uuidv7 sinh từ app), `created_at timestamptz default now()`, `updated_at`, `deleted_at` nếu xoá mềm.
   - Tiền `bigint` VND. Thời gian `timestamptz`. Enum Postgres giá trị snake_case tiếng Anh.
   - **Ngoại lệ:** loại mở rộng được (`channel_account.type`, `integration_connection.connector_key`, permission) dùng `text` + validate theo registry trong code, không dùng enum.
9. **Phân quyền dữ liệu:** bảng nghiệp vụ có chủ sở hữu phải có `owner_user_id` (và/hoặc `assignee_user_id`) + `team_id` nullable, để `scopeFilter` hoạt động (`authz/rbac-permissions.md`).
   - Áp cho: contact, conversation, quote, contract, order, invoice, appointment, ticket.
10. **Role Postgres:** app dùng `appchat_platform_app` / `appchat_tenant_app` (DML). Chỉ job provision dùng `appchat_provisioner`; chỉ migrate dùng `appchat_migrator`.

## Test bắt buộc (thay test RLS)

- `X-Workspace-Id` ngoài membership → 403, không mở kết nối tenant.
- Resolver từ chối khi thiếu context.
- Route kênh / widget / webhook / integration resolve đúng DB.
- 2 workspace song song không thấy dữ liệu của nhau, chạy trên DB thật.
