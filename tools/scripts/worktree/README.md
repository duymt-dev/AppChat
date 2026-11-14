# Worktree song song (TIP-035d, DC-908)

Checkout chính (`D:/CODING/AppChat_Ver2`, k = 0) và tối đa 3 worktree (k = 1..3) chạy dev / test cùng lúc mà không đụng DB, cổng, Redis,
thư mục của nhau. Checkout chính **không đặt biến mới** → mọi thứ như cũ (web 3000, API 4000, Memurai 6379, `appchat_platform`).

## Bảng cổng

| k | Web | API | E2E web mock | E2E web http | E2E API | AI live | Memurai |
|---|-----|-----|--------------|--------------|---------|---------|---------|
| 0 (chính) | 3000 | 4000 | 3417 | 3418 | 4117 | 4617 | 6379 (service) |
| 1 | 5100 | 5101 | 5117 | 5118 | 5119 | 5161 | 6381 |
| 2 | 5200 | 5201 | 5217 | 5218 | 5219 | 5261 | 6382 |
| 3 | 5300 | 5301 | 5317 | 5318 | 5319 | 5361 | 6383 |

DB của worktree k: `appchat_platform_wt{k}` · `appchat_tenant_template_wt{k}` · `appchat_platform_test_wt{k}` · `appchat_tenant_base_wt{k}`
(role / mật khẩu dùng chung với checkout chính — không bao giờ `ALTER ROLE … PASSWORD`).

## Tạo worktree k

1. Chủ thầu: `git worktree add D:/CODING/<tên> origin/dev` (hoặc `-b <nhánh>`).
2. Trong `<wt>`: `pnpm install`.
3. `pnpm wt:env -- --k 1` (xem trước, bí mật che) → `pnpm wt:env -- --k 1 --write` (ghi `<wt>/.env` từ `.env` checkout chính, tạo `.data/`).
4. `pnpm wt:redis -- start` (Memurai riêng 638k, dữ liệu `<wt>/.data/redis`).
5. Tạo DB (lệnh nặng tự lấy slot Postgres):
   - Chép `.env.local-admin` từ checkout chính sang `<wt>` (superuser dev — DC-009; không commit).
   - `pnpm --filter @appchat/db run db:generate`
   - `pnpm --filter @appchat/db run db:setup` → tạo `appchat_platform_wt{k}` + template + base; `.env` worktree giữ nguyên, mật khẩu role giữ nguyên.
   - `pnpm --filter @appchat/db run db:test-reset` → tạo `appchat_platform_test_wt{k}`.
6. `pnpm wt:env -- --k 1 --check` phải xanh hết (cổng trống / không nằm trong dải Hyper-V, Memurai PONG, đủ 4 DB).

Mỗi migration tenant mới: chạy **trong worktree đó** `db:generate` → `db:migrate-tenants` (+ `-- --test`) → `db:setup` (CLAUDE.md §7).
Kiểm `_appchat_migrations` của `appchat_tenant_template_wt{k}` có migration mới nhất của nhánh.

## Chạy

- Dev: `pnpm dev` (web nghe `WEB_PORT`); API / worker: `node --env-file=../../.env dist/main.js` trong `apps/api` / `apps/worker` (cổng
  `API_PORT`, Redis 638k từ `.env` worktree).
- E2E mock: `pnpm e2e <module>` (cổng `E2E_PORT`; worktree không dùng lại server có sẵn — cổng bị chiếm thì báo lỗi).
- E2E http: `pnpm e2e:http <spec>` — lấy slot, kiểm cổng trống (in PID giữ cổng), health phải trả đúng `instance = wt{k}`.
- AI live: `node tools/scripts/ai-live-stack.mjs -- …` — như trên với `AI_LIVE_PORT`, Redis DB 14 trên Memurai của worktree.
- Parity: `pnpm parity <id>` mở `http://localhost:<WEB_PORT>`.

## Slot Postgres

Postgres dev có ~100 kết nối, dùng chung với dự án khác. Lệnh nặng (`test:integration`, `e2e:http`, `ai-live-stack`, `db:setup`,
`db:test-reset`, `db:migrate-tenants`) giữ một slot qua `tools/scripts/pg-slot.mjs` (mặc định `PG_SLOT_COUNT=2` cho cả máy, khoá
`pg_try_advisory_lock` trên DB `postgres`). Lệnh nhẹ (`dev`, unit, lint) không lấy slot.

- Xem: `pnpm slot -- --status` (slot nào, worktree / lệnh nào giữ).
- Chạy tay một lệnh nặng: `pnpm slot -- --wait -- <lệnh>`; không `--wait` → mã 75 khi hết slot.
- Lồng (`PG_SLOT_HELD` đã có) không lấy slot thứ hai. `PG_SLOT_DISABLE=1` / `CI=true` → bỏ qua.
- Giới hạn role (Q-913, tuỳ chọn): `pnpm slot -- --role-limits` chỉ in lệnh; Chủ nhà tự chạy `--apply` (superuser), gỡ bằng `--revert`.

## Sự cố

| Triệu chứng | Xử lý |
|---|---|
| `--check` đỏ "Hyper-V" | Cổng nằm trong `netsh int ipv4 show excludedportrange protocol=tcp` → đổi bảng cổng bằng DC mới, không tự đổi |
| Memurai không lên | `pnpm wt:redis -- status`, xem `<wt>/.data/redis/memurai.log`; khởi động lại máy → chạy lại `start` |
| Slot "kẹt" | Tiến trình chết → kết nối đóng → slot tự nhả. `pnpm slot -- --status` thấy pid còn sống → lệnh đó còn chạy |
| `e2e:http` báo cổng bị chiếm | In PID giữ cổng — dừng tiến trình CỦA MÌNH (kiểm dòng lệnh), không dừng tiến trình worktree khác |
| Health trả instance khác | Cổng đang là backend của worktree khác / checkout chính → dừng, kiểm `.env` worktree |
| DB thiếu | `--check` in tên DB thiếu → bước 5 |

## Dọn worktree k

1. `pnpm wt:redis -- stop`.
2. Không script nào tự xoá DB. Chạy tay bằng superuser (psql / pgAdmin), kiểm đúng `k` trước:
   ```sql
   -- DB tenant trong registry của worktree (chạy trên appchat_platform_wt{k} và appchat_platform_test_wt{k}):
   SELECT 'DROP DATABASE "' || db_name || '" WITH (FORCE);' FROM workspace;
   -- Rồi bốn DB của worktree:
   DROP DATABASE appchat_platform_test_wt1 WITH (FORCE);
   DROP DATABASE appchat_platform_wt1 WITH (FORCE);
   UPDATE pg_database SET datistemplate = false WHERE datname IN ('appchat_tenant_template_wt1', 'appchat_tenant_base_wt1');
   DROP DATABASE appchat_tenant_template_wt1 WITH (FORCE);
   DROP DATABASE appchat_tenant_base_wt1 WITH (FORCE);
   ```
3. Chủ thầu: `git worktree remove <wt>`.
