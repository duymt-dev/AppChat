# TIP-002: DB nền tảng + tenant

## HEADER
- TIP-ID: TIP-002
- Project: AppChat V2
- Module: `packages/db` + kernel tenant context
- Depends on: TIP-001 (xếp chồng — nhánh tách từ `tip/001-scaffold-backend`)
- Priority: P0 · REQ: A03, N02
- Estimated effort: 14 giờ
- **Files touched:**
  - `packages/db/prisma/platform/{ops,routing}.prisma` (fill) + `prisma/platform/_base.prisma` (create: generator + datasource)
  - `packages/db/prisma/tenant/kernel.prisma` (fill) + `prisma/tenant/_base.prisma` (create)
  - `packages/db/prisma/{platform,tenant}/migrations/<ts>_002_*/migration.sql` (create)
  - `packages/db/prisma/tenant/bootstrap.sql` (create: extensions + `f_unaccent`) · `packages/db/sql/roles.sql` (create: 4 role)
  - `packages/db/prisma.platform.config.ts`, `prisma.tenant.config.ts` (create)
  - `packages/db/src/{index,env,platform-db,tenant-db,tenant-resolver,tenant-context,lru,provisioner,tenant-migrate,db-name,errors}.ts` (create); `src/generated/*` (sinh, gitignore)
  - `packages/db/scripts/{setup-dev,migrate}.ts` (create) — tạo role / DB / template dev
  - `packages/db/test/{unit,integration}/*.test.ts`, `packages/db/test/factories/*` (create)
  - **Bảng tạm cho test (chỉ ở TIP này):** `packages/db/prisma/platform/_workspace-registry.prisma` → không; registry `workspace` thuộc `identity.prisma` (TIP-004). TIP-002 tạo **view tối thiểu** qua interface `WorkspaceRegistry` (port) để resolver không phụ thuộc bảng của TIP-004 — xem DC-008.
  - `packages/core/src/kernel/{tenant-context.ts, kernel.module.ts}` (modify: provider `TENANT_RESOLVER`, `PLATFORM_DB`) · `packages/core/src/kernel/env.ts` (modify: biến DB)
  - `.env.example` (modify)
- **Parallel-safe with:** sequential (003 dựa trên resolver)

## CONTEXT
- Blueprint §2.0 (mô hình tenant, vòng đời, role), §2.1 (quy tắc chung), §2.2 bảng `tenant_*_route`, `tenant_migration`, `workspace_stats`, `platform_audit_log` (ops / routing) và kernel tenant (`action_log`, `outbox_event`, `idempotency_key`, `file`, `sequence_counter`, `notification`).
- Standards: `database/tenant-db.md` (10 quy tắc + 4 test bắt buộc), `database/indexing.md`.
- Môi trường: Postgres 16 native + pgvector 0.8.1; superuser qua `pgpass.conf` (Q-007).

## TASK
1. **Hai schema Prisma đa file → hai client** sinh vào `src/generated/{platform,tenant}` (Prisma 7, `prisma-client` generator, driver adapter `@prisma/adapter-pg`).
2. **Bảng TIP-002:**
   - [P] `ops.prisma`: `tenant_migration`, `workspace_stats`, `platform_audit_log`.
   - [P] `routing.prisma`: `tenant_channel_route`, `tenant_widget_route`, `tenant_bank_feed_route`, `tenant_integration_route`, `tenant_sign_route`.
   - [T] `kernel.prisma`: `action_log`, `outbox_event`, `idempotency_key`, `file`, `sequence_counter`, `notification`, `schema_meta` (version của DB tenant).
3. **Template DB** `appchat_tenant_template`: extensions `pgcrypto, vector, pg_trgm, unaccent, btree_gist, citext` + `f_unaccent(text) IMMUTABLE` + migration tenant; không app nào kết nối.
4. **`PlatformDb`** (1 client) · **`TenantDbResolver.get(ctx)`**: nhận `TenantContext` đã xác thực (brand type, chỉ tạo qua `TenantContext.fromMembership` / `fromRoute` / `system`), tra `WorkspaceRegistry` (cache 60s), `db_status ≠ active` → `WORKSPACE_UNAVAILABLE` (503 provisioning / restoring, 423 suspended / archived / archiving / deleting), cache client LRU 100, đóng idle > 10 phút, pool `max=3`.
5. **Provisioner** `provision(workspaceId)`: `CREATE DATABASE ws_<short> TEMPLATE appchat_tenant_template OWNER appchat_migrator`, cấp quyền `appchat_tenant_app`, ghi `schema_meta`, idempotent (DB đã có → bỏ qua), trả `db_name`. `drop(workspaceId)` cho test / xoá.
6. **`tenant-migrate`**: duyệt workspace `active | suspended`, song song 4, áp migration tenant còn thiếu, ghi `tenant_migration`, DB lỗi không chặn DB khác.
7. **Script dev**: `pnpm --filter @appchat/db db:setup` tạo 4 role + `appchat_platform` + template (idempotent); `db:migrate` = platform → template → tenant-migrate.
8. Test cô lập tenant (4 ca bắt buộc của standard) trên DB thật.

## SPECIFICATIONS
### Business Rules
- Tên DB: `ws_` + 12 ký tự `[a-z0-9]` lấy từ uuid workspace (bỏ `-`, 12 ký tự đầu của phần ngẫu nhiên) — không nhận tên từ client. Validate regex `^ws_[a-z0-9]{12}$` trước mọi câu SQL động.
- Bảng tenant **không** có `workspace_id`.
- `sequence_counter`: `INSERT … ON CONFLICT (kind) DO UPDATE SET value = sequence_counter.value + 1 RETURNING value` (dùng ở TIP-003 `formatCode`).
- `outbox_event` partial index `(available_at) WHERE status = 'pending'`; `notification` partial `(user_id, created_at DESC) WHERE read_at IS NULL` + `(user_id, created_at DESC)`; `action_log (created_at DESC) INCLUDE (action_id, actor_type, status)`, `(run_id)`; `idempotency_key` pk(key) + `(created_at)` cho job dọn.
- Role: `appchat_platform_app` (DML platform), `appchat_tenant_app` (CONNECT + DML `ws_*`), `appchat_provisioner` (CREATEDB), `appchat_migrator` (owner schema). Dev đặt mật khẩu qua env.

### Validation & Error Handling
- `TenantDbResolver.get` không có context hợp lệ → `TenantContextError` (không mở kết nối).
- Workspace không có trong registry → `NOT_FOUND`.
- Provision lỗi giữa chừng → `DROP DATABASE IF EXISTS` dọn, ném lỗi.

## ACCEPTANCE CRITERIA
1. `prisma validate` + `generate` xanh cho cả 2 schema; migration SQL sinh bằng `migrate diff` khớp schema (không drift).
2. `db:setup` chạy 2 lần liên tiếp không lỗi (idempotent); template có đủ 6 extension + `f_unaccent('Đặng Thị Hà') = 'Dang Thi Ha'`.
3. `provision(ws)` tạo DB `ws_*` từ template < 10 giây, có bảng kernel; gọi lại → không lỗi, cùng `db_name`.
4. **(a)** Không có `TenantContext` hợp lệ (object tự dựng) → resolver từ chối, không mở kết nối.
5. **(b)** `db_status` provisioning → `WORKSPACE_UNAVAILABLE` 503; suspended → 423.
6. **(c)** Route registry (`tenant_channel_route`) → `TenantContext.fromRoute` → đúng DB.
7. **(d)** Hai workspace song song ghi `sequence_counter` / `notification` → mỗi DB chỉ thấy dữ liệu của mình (DB thật).
8. LRU: vượt `max` → client cũ nhất bị đóng; client idle quá hạn bị đóng.
9. `tenant-migrate`: thêm migration giả lập vào 2 DB, 1 DB hỏng → DB còn lại vẫn migrate, `tenant_migration` ghi `failed` + `done`.
10. Lint / typecheck / lint:size / depcheck xanh.

## CONSTRAINTS
- Không tạo bảng của TIP khác (`workspace`, `membership`… thuộc 004). Resolver đọc registry qua port `WorkspaceRegistry` (DC-008); TIP-004 cài adapter Prisma cho port.
- Không Docker. Không `PrismaClient` tay ngoài `packages/db`.
- Thư viện mới: `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg` (Blueprint §2.0) — trong stack.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`
- [ ] 10 AC có test chạy thật (integration trên Postgres 16 native)
- [ ] Cổng D59: trước commit + chốt TIP (full E2E hồi quy mock; E2E http / parity N/A)
- [ ] Không query thiếu index cho đường nóng (outbox, notification)
- [ ] Commit + SHA + report + ba sổ + bảng tiến độ
