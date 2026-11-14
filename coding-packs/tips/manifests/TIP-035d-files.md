# TIP-035d — exact file manifest

M = sửa, C = tạo mới. Mọi path M đã có trên `origin/dev` (không có M tương lai).
Không file nghiệp vụ, không prisma, không migration. Hai file thêm ngoài danh sách gốc DC-908: `apps/api/package.json` (integration lấy slot) và `tools/parity/src/cli.ts` (parity theo `WEB_PORT`).

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `tools/scripts/worktree-env.mjs` | Sinh `<wt>/.env` theo bảng §1 từ `.env` checkout chính (`--write`, `--force`); `--check` cổng trống + `netsh` excludedportrange + Memurai `PING` + DB `_wt{k}`; hàm thuần `portsFor` / `planEnv` / `parseExcluded` / `isExcluded` |
| C | `tools/scripts/worktree-redis.mjs` | `start` / `stop` / `status` Memurai riêng `--port 638{k} --dir <wt>/.data/redis`; PID + log; RESP `PING` / `SHUTDOWN` / `INFO` qua `node:net` |
| C | `tools/scripts/pg-slot.mjs` | Semaphore `pg_try_advisory_lock(<ns>, slot)` trên DB `postgres`; chạy lệnh con khi giữ slot; `--wait`, `--status`, `--role-limits [--apply] [--revert]`; `PG_SLOT_HELD` / `PG_SLOT_DISABLE`; export `withSlot` |
| C | `tools/scripts/next-port.mjs` | `next dev|start -p $WEB_PORT` (đọc env hoặc `.env` gốc, mặc định 3000), chuyển tín hiệu + mã thoát |
| C | `tools/scripts/worktree/README.md` | Quy trình tạo / kiểm / dọn worktree k = 1..3, bảng cổng, sự cố thường gặp |
| C | `tools/scripts/test/worktree-env.test.mjs` | AC2–3: `planEnv` k = 1..3, giữ bí mật, che khi in, từ chối checkout chính / k sai / `.env` lạ; cổng bị chiếm; `parseExcluded` |
| C | `tools/scripts/test/pg-slot.test.mjs` | AC6–7: tối đa `PG_SLOT_COUNT` cùng lúc, `--wait` / mã 75, mã thoát lệnh con, kill nhả slot, lồng `PG_SLOT_HELD`, hai DB nền tảng khác nhau tranh chung slot |
| M | `apps/web/package.json` | `dev` / `start` qua `next-port.mjs` (bỏ `-p 3000` cứng) |
| M | `tools/scripts/e2e-http.mjs` | Lấy slot; kiểm cổng E2E trống (in PID giữ cổng); health phải trả đúng `instance` |
| M | `tools/scripts/ai-live-stack.mjs` | Như trên với `AI_LIVE_PORT`; Redis DB 14 của Memurai worktree |
| M | `tools/scripts/e2e.mjs` | Cổng E2E mock / http từ env (mặc định 3417 / 3418) |
| M | `apps/web/playwright.config.ts` | `baseURL` / `webServer` theo cổng env; `reuseExistingServer: false` khi có `WORKTREE_ID` |
| M | `apps/api/src/http/health/health.controller.ts` | Trường `instance` = `WORKTREE_ID ?? 'main'` |
| M | `packages/db/src/clients.ts` | Pool nền tảng `max` = `PLATFORM_POOL_MAX` (~L9) |
| M | `packages/core/src/kernel/tenant/tenant.providers.ts` | Pool nền tảng `max` = `PLATFORM_POOL_MAX` (~L36), mặc định 10 |
| M | `packages/db/src/env.ts` | Zod: `PLATFORM_POOL_MAX` (1–50, mặc định 10), `TENANT_BASE_DB` (mặc định `appchat_tenant_base`); `TENANT_TEMPLATE_DB` / `TEST_PLATFORM_DB` nếu chưa có |
| M | `packages/db/src/lifecycle/restore.ts` | `appchat_tenant_base` cứng (~L19) → `TENANT_BASE_DB` |
| M | `packages/db/scripts/reset-test-db.ts` | Chỉ DROP `ws_*` trong registry của `TEST_PLATFORM_DB` hiện tại (~L40–50); từ chối khi trùng DB nền tảng dev / sai mẫu tên |
| M | `packages/db/scripts/setup-dev.ts` | Không sinh mật khẩu mới khi `PG_PW_*` đã có; không ghi đè `.env` do `worktree-env.mjs` sinh (~L56) |
| M | `packages/db/package.json` | `db:setup`, `db:test-reset`, `db:migrate-tenants` (+ lệnh tạo DB dev nếu gọi chúng) qua `pg-slot` |
| M | `apps/api/package.json` | `test:integration` qua `pg-slot --wait` |
| M | `tools/parity/src/cli.ts` | URL web theo `WEB_PORT` (mặc định 3000) |
| M | `package.json` | Script `wt:env`, `wt:redis`, `slot`, `test:tools` |
| M | `.env.example` | Khối "Worktree (TIP-035d, DC-908)": `WORKTREE_ID`, `WEB_PORT`, `TENANT_BASE_DB`, `PLATFORM_POOL_MAX`, `PG_SLOT_COUNT`, `PG_SLOT_DISABLE`, `MEMURAI_EXE` (để trống) |
