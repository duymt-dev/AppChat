### COMPLETION REPORT — TIP-002

**STATUS:** DONE
**COMMIT:** `fce8c7c` (code) trên nhánh `tip/002-db-platform-tenant` (xếp chồng trên `tip/001-scaffold-backend`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - `packages/db/prisma/{platform,tenant}/_base.prisma` — generator `prisma-client` (ESM) + datasource; `prisma.{platform,tenant}.config.ts` (Prisma 7 config).
  - `packages/db/prisma/platform/{ops,routing}.prisma` (điền) — `tenant_migration`, `workspace_stats`, `platform_audit_log`, 5 bảng `tenant_*_route`.
  - `packages/db/prisma/tenant/kernel.prisma` (điền) — `action_log`, `outbox_event`, `idempotency_key`, `file`, `sequence_counter`, `notification`, `schema_meta`.
  - Migration `prisma/platform/migrations/20261030000000_002_platform_ops_routing`, `prisma/tenant/migrations/20261030000000_002_tenant_kernel` (sinh bằng `prisma migrate diff --from-empty` + SQL viết tay: covering `action_log(created_at DESC) INCLUDE (action_id, actor_type, status)`, partial `outbox_event(available_at) WHERE status='pending'`, partial `notification(user_id, created_at DESC) WHERE read_at IS NULL`, CHECK `schema_meta` một dòng).
  - `prisma/tenant/bootstrap.sql` — 6 extension + `f_unaccent` IMMUTABLE.
  - `packages/db/src/` — `errors.ts`, `registry.ts` (port `WorkspaceRegistry` + `MemoryWorkspaceRegistry` — DC-008), `db-name.ts`, `env.ts`, `tenant-context.ts` (dấu xác thực), `lru.ts`, `clients.ts` (nơi duy nhất `new PrismaClient`), `tenant-resolver.ts`, `migrations.ts`, `provisioner.ts`, `tenant-migrate.ts`, `platform-recorder.ts`, `setup.ts` (`setupCluster`).
  - `packages/db/scripts/setup-dev.ts` (`pnpm --filter @appchat/db db:setup`), `vitest.integration.config.ts`.
  - `packages/core/src/kernel/tenant/tenant.providers.ts` — `PLATFORM_DB`, `TENANT_RESOLVER`, `WORKSPACE_REGISTRY`, `DB_ENV`, đóng client khi shutdown.
  - Test: `packages/db/test/resolver.test.ts`, `packages/db/test/integration/{helpers,tenant-isolation.test,tenant-migrate.test}.ts`, `packages/core/test/kernel-db.test.ts`.
- Modified: `packages/core/src/kernel/{kernel.module.ts (forRoot), index.ts}`, `apps/api/src/app.module.ts` + `apps/worker/src/worker.module.ts` (`KernelModule.forRoot()`), `packages/db/{package.json, tsconfig.json, vitest.config.ts, .gitignore}`, `packages/db/test/prisma-stubs.test.ts` (bỏ qua `_base.prisma`), `packages/shared/src/api/envelope.ts` (+`WORKSPACE_UNAVAILABLE` — mã có sẵn trong standard response-envelope §5), `.dependency-cruiser.cjs` (bỏ `src/generated`), `pnpm-workspace.yaml` (allowBuilds prisma), `.env.example`.

**TEST RESULTS:**
- Acceptance criteria: 10/10 pass
  1. `prisma validate` 2 schema xanh; `generate` 2 client; migration sinh từ `migrate diff` — **pass**
  2. `db:setup` chạy 2 lần: lần 2 "+0 migration" (idempotent); template có `btree_gist citext pg_trgm pgcrypto unaccent vector`; `f_unaccent('Đặng Thị Hà · Nguyễn Văn Ước') = 'Dang Thi Ha · Nguyen Van Uoc'` (integration) — **pass**
  3. `provision` tạo `ws_*` từ template < 10 s, gọi lại `created: false` cùng tên; `drop` xoá — **pass**
  4. (a) context tự dựng / copy / undefined → `TenantContextError`, không tra registry, không tạo client — **pass**
  5. (b) provisioning / restoring → 503; suspended / archived / archiving / deleting → 423 `WORKSPACE_UNAVAILABLE`, không mở client — **pass**
  6. (c) `tenant_channel_route` (DB nền tảng thật) → `TenantContexts.fromRoute` → `current_database()` = DB của workspace — **pass**
  7. (d) 2 workspace song song: 20 vs 7 lần `sequence_counter` → 20 / 7; notification chỉ thấy của mình — **pass**
  8. LRU vượt 2 → đóng client ít dùng nhất; idle > hạn → đóng; cache registry 60s + `invalidate` — **pass**
  9. `tenant-migrate`: OK1 (active) + OK2 (suspended) → done, BROKEN → failed "already exists", ARCHIVED bỏ qua; `tenant_migration` ghi đúng; bảng mới đọc được bằng `appchat_tenant_app` nhờ default privileges của template; chạy lại idempotent — **pass**
  10. Lint / typecheck / lint:size / depcheck — **pass**
  - Thêm: `appchat_tenant_app` không `CREATE DATABASE` được (permission denied); không kết nối được template.
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test --filter=db,core,api,worker,shared` 15/15 task (db 17 · core 38 · api 5 · worker 6 · shared 36); `pnpm depcheck` xanh.
- **Cổng "chốt TIP":** `pnpm lint` 12/12 · `lint:size` 912 file · `lint:tokens` · `lint:masks` · `pnpm typecheck` 12/12 · `pnpm test` 12/12 task, 0 failed (api 5 · core 38 · shared 36 · db 17 · worker 6 · integrations 5 · channels 8 · ui 2 · actions 3 · web 71) · `pnpm --filter @appchat/db test:integration` **7 passed** (Postgres 16 native) · `pnpm depcheck` xanh (99 known) · `pnpm i18n:check` 100% · `pnpm build` 3/3 · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (4.0m). E2E http + parity: N/A — TIP không có luồng UI.
- Tenant isolation: 4 ca bắt buộc của `database/tenant-db.md` — (a)(b) unit, (c)(d) integration DB thật — **pass**. Ca "`X-Workspace-Id` ngoài membership → 403" cần membership (TIP-004) → TIP-003 làm bằng guard + TIP-004 nối membership thật.
- EXPLAIN: chưa có list API (TIP-003 trở đi).

**ISSUES DISCOVERED:**
- CI GitHub chưa có Postgres → `test:integration` chỉ chạy máy dev; `ci.yml` chưa có service Postgres (đề xuất bổ sung khi Chủ nhà muốn CI chạy integration — Q-008).
- `prisma migrate diff` cần chạy lại khi TIP sau đổi schema; mỗi TIP thêm thư mục migration riêng, không sửa migration của 002.

**GIẢ ĐỊNH ĐÃ CHỌN:**
- DC-008 — `WorkspaceRegistry` là port; TIP-004 cài adapter đọc bảng `workspace`.
- DC-009 — superuser dev `appchat_dev_admin`, 4 role do `db:setup` tạo, mật khẩu chỉ ở `.env` / `pgpass.conf`.
- Runner migration tự viết (`_appchat_migrations`) thay `prisma migrate deploy` — để `tenant-migrate` áp song song lên nhiều DB và ghi `tenant_migration`; SQL vẫn sinh bằng `prisma migrate diff` (DC-012).
- Tên DB `ws_` + 12 ký tự **cuối** uuid (phần ngẫu nhiên của uuidv7; 12 ký tự đầu là timestamp nên dễ trùng giữa workspace tạo cùng lúc).
- Owner DB tenant = `appchat_migrator`; `appchat_provisioner` là member của migrator để `CREATE DATABASE … OWNER`.

**DEVIATIONS FROM SPEC:** không có.

**SUGGESTIONS FOR CHỦ THẦU:**
- Blueprint §2.0 nói "cache Redis 60s" cho registry; TIP-002 cache trong process 60s (Redis chưa có tới TIP-003). TIP-003 có thể chuyển sang Redis nếu cần nhiều tiến trình đồng bộ invalidate.
