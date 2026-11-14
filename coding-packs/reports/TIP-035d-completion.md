### COMPLETION REPORT — TIP-035d

**STATUS:** DONE — nhánh `tip/035d-worktree-isolation` (từ `origin/dev` `77f6bce1`). Hai commit:
- Code: `3a56383f`.
- Sửa nghiệm thu (regex đọc `.env`, thứ tự kiểm tên DB test) + sổ + report: commit kế tiếp.

AC1–12 đều nghiệm thu trên máy dev thật:
- wt1 = `D:/CODING/AppChat-Agy`, detached.
- wt2 chỉ dùng cho AC7, mô phỏng bằng env `_wt2` trong test.
- AC11 làm bản rút gọn: checkout chính + wt1 + lệnh thứ ba (xem dưới).
- Không chạy `ALTER ROLE` (DC-923 d).

**TÓM TẮT:**
- **Rà trước khi làm:**
  - Env đã có `PLATFORM_DATABASE_URL`, `TENANT_TEMPLATE_DB`, `TEST_PLATFORM_DB` (`test-env.ts`), `REDIS_URL`, `TENANT_POOL_MAX`, `TENANT_CLIENT_CACHE`, `TENANT_CLIENT_IDLE_MS`, `E2E_PORT` 3417 / `E2E_HTTP_PORT` 3418 / `E2E_API_PORT` 4117 / `AI_LIVE_PORT` 4617.
  - Web proxy qua `API_URL` + `NEXT_PUBLIC_WS_URL`; API / worker nạp `node --env-file=../../.env`.
  - Memurai 8.1.241 có `--port --bind --dir`.
  - Dải `netsh excludedportrange` (5357, 50000–50059, 63821–63920, 65216–65315) không đụng bảng cổng.
  - `max_connections` 100; `tenant_app` / `platform_app` CONNECT được DB `postgres` và lấy được advisory lock.
- **Env worktree (§1, DC-908 a):** `pnpm wt:env -- --k <1..3>` (`tools/scripts/worktree-env.mjs`) sinh `.env` từ `.env` checkout chính.
  - DB `_wt{k}` (cả `MIGRATOR_DATABASE_URL`).
  - Cổng web 5k00 / API 5k01 / E2E 5k17 / 5k18 / 5k19 / AI live 5k61; Memurai 638k.
  - Thư mục `.data` tuyệt đối; pool nhỏ: tenant 2, cache 10, idle 20 giây, platform 4; `PG_SLOT_COUNT` 2.
  - Luật URL 3000 → 5k00, 4000 → 5k01.
  - Bí mật chép nguyên, in ra chỉ 4 ký tự cuối.
  - Từ chối k sai, checkout chính, hoặc `.env` lạ (`--force` → `.env.bak-*`).
  - `--check`: cổng trống / không trong dải Hyper-V, Memurai PONG, đủ 4 DB; cổng do chính worktree chạy (health `wt{k}`) tính xanh.
- **Memurai riêng (DC-908 b, Q-913):** `pnpm wt:redis -- start|stop|status`.
  - `memurai.exe --port 638k --bind 127.0.0.1 --dir <wt>/.data/redis`, detached.
  - `stop` = `SHUTDOWN NOSAVE`; không đụng service 6379.
- **Slot Postgres (DC-908 c):** `tools/scripts/pg-slot.mjs`.
  - Khoá `pg_try_advisory_lock(735035, slot)` trên DB `postgres` (chung cho mọi worktree), giữ kết nối suốt lệnh con.
  - Tiến trình chết → slot tự nhả.
  - `--wait[=s]`; hết slot → mã 75.
  - Lồng `PG_SLOT_HELD` không lấy slot thứ hai; `PG_SLOT_DISABLE=1` / `CI=true` bỏ qua.
  - `--status` (application_name `appchat-pg-slot:<wt>:<lệnh>`).
  - `--role-limits` chỉ in lệnh.
  - Lệnh dùng slot: `db:setup` / `db:test-reset` / `db:migrate-tenants`, `test:integration`, `e2e:http`, `ai-live-stack`.
- **Cổng theo env (DC-908 d):**
  - `apps/web` `dev` / `start` qua `next-port.mjs` (`WEB_PORT` → `.env` → 3000).
  - Parity CLI mở `WEB_PORT`.
  - `e2e.mjs` chuyển `E2E_PORT` / `E2E_HTTP_PORT`; Playwright không dùng lại server có sẵn khi ở worktree.
  - Pool nền tảng `PLATFORM_POOL_MAX` (mặc định 10).
  - Restore dùng `TENANT_BASE_DB`.
- **Harness an toàn (DC-908 e):**
  - `e2e-http.mjs` / `ai-live-stack.mjs` lấy slot, kiểm cổng trống (in PID), health phải trả đúng `instance`.
  - `GET /v1/health` trả `instance = WORKTREE_ID ?? 'main'`.
- **DB dùng chung an toàn:**
  - `db:setup` trong worktree (`.env` có header) lấy DB nền tảng từ URL, chỉ in, không ghi đè `.env`, không đổi mật khẩu role; thiếu `PG_PW_*` → dừng.
  - `db:test-reset` chỉ chấp nhận `appchat_platform_test(_wt[1-3])?` khác DB dev (sai → mã 2, kiểm TRƯỚC khi nối).
  - Chỉ DROP `ws_*` trong registry của chính nó.
- **Lỗi lộ ra khi nghiệm thu AC10:** bộ đọc `.env` của `e2e-http.mjs` / `ai-live-stack.mjs` / `setup-dev.ts` / `reset-test-db.ts` dùng `^[A-Z_]+=`, nên bỏ qua biến có chữ số (`E2E_API_PORT`…).
  - Hậu quả: harness trong worktree chạy cổng mặc định 4117 / 3418, không phải cổng của worktree.
  - Đã sửa thành `^[A-Z_][A-Z0-9_]*=` (DV-125 mục 3).
- **Hướng dẫn:** `tools/scripts/worktree/README.md` (bảng cổng, tạo / chạy / slot / sự cố / dọn — SQL chỉ in, không script nào tự xoá DB).

**FILES CHANGED** (lệch manifest ở DV-125):
- Mới: `tools/scripts/{worktree-env, worktree-redis, pg-slot, next-port}.mjs`, `tools/scripts/worktree/README.md`, `tools/scripts/test/{worktree-env, pg-slot}.test.mjs`.
- Sửa:
  - `packages/db/src/{env, clients}.ts`, `packages/db/src/lifecycle/restore.ts`, `packages/db/scripts/{setup-dev, reset-test-db}.ts`, `packages/db/package.json`.
  - `packages/core/src/kernel/tenant/tenant.providers.ts`.
  - `apps/api/src/http/health/health.controller.ts` + `apps/api/test/health.test.ts`, `apps/api/package.json`.
  - `apps/web/package.json`, `apps/web/playwright.config.ts`.
  - `tools/scripts/{e2e, e2e-http, ai-live-stack}.mjs`, `tools/parity/src/cli.ts`.
  - `package.json`, `.env.example`.
- Không file nghiệp vụ.

**MIGRATION:** không có (TIP không đổi schema). DB wt1 tạo bằng `db:setup` trong worktree:
- `appchat_platform_wt1` +24 migration.
- `appchat_tenant_template_wt1` +129 migration.

**TEST / NGHIỆM THU**

| AC | Kết quả (output thật) |
|---|---|
| 1 | Checkout chính: `.env` 0 biến mới.<br>`webPort({})` = 3000; `expectedInstance({})` = `main`; `platformPoolMax({})` = 10; restore mặc định `appchat_tenant_base`.<br>Unit: `@appchat/db` 35/35, `apps/api` 11/11 (gồm `health.test` 5/5), `@appchat/core` 1327 pass / 1 skip (206 file). |
| 2–3 | `worktree-env.test.mjs` 8/8: planEnv k = 2, che bí mật, k = 0 / 4 → 2, `--write` ở checkout chính → 2, `.env` lạ → 2 / `--force` OK, `--check` đỏ đúng mục, Hyper-V, cổng của wt1 xanh, `portFree` thật.<br>wt1 `--check` 11/11 ✓. |
| 4 | Trước khi start: 6379 PONG.<br>`wt:redis start`: 6381 PONG, PID 10604, `--dir D:/CODING/AppChat-Agy/.data/redis`.<br>`wt:redis stop`: "Memurai 6381 đã dừng", `status` "không chạy", không còn LISTEN 6381.<br>Sau stop: 6379 PING = true, 6381 = false. |
| 5 | API wt1 (PID 16932, :5101, health `instance:"wt1"`) + worker jobs (PID 24860); đăng ký OTP tạo workspace `01a1da19-…`.<br>`netstat -ano`: **0** kết nối từ PID wt1 tới 6379, **119** tới 6381.<br>6381 `DBSIZE` 254, toàn `bull:*` (`bull:tenant:events`, `bull:billing-scheduler:repeat:…`, `bull:sales-scheduler:meta`…). |
| 6–7 | `pg-slot.test.mjs` 4/4 trên Postgres thật: tối đa 2 cùng lúc, lệnh thứ 3 chờ; không `--wait` → 75; mã 3 truyền ra; kill nhả slot; lồng không tự khoá; `_wt1` / `_wt2` tranh chung slot; `--status` thấy `appchat-pg-slot:wt1:` / `wt2:`. |
| 8 | Trước: `ws_*` 83, registry test chính 72 (67 còn DB).<br>wt1 `db:test-reset` → "drop 0 DB tenant test".<br>Sau: 83 / 72 / 67 không đổi; registry wt1 0.<br>`TEST_PLATFORM_DB=appchat_platform_test_x` → mã 2; `=appchat_platform_wt1` (DB dev) → mã 2, không DROP. |
| 9 | wt1 `db:setup` → "appchat_platform_wt1 +24, appchat_tenant_template_wt1 +129; .env worktree giữ nguyên".<br>sha `.env` trước = sau `1a92200fc7bd46c7`; checkout chính vẫn nối được (mật khẩu role không đổi). |
| 10 | (a) Server giả giữ 5119 → `e2e:http — cổng 5119 đang bị chiếm (PID 21204) — dừng tiến trình đó hoặc đổi cổng`, mã 1.<br>(b) API giả trả `instance:"wt2"` trên 5119 → `cổng 5119 trả instance "wt2", cần "wt1" — dừng`, mã 1.<br>(c) Cổng trống: `e2e:http --no-build auth-onboarding --project=desktop` ở wt1 → **3 passed (1.1m)**, mã 0; cổng 5118 / 5119 trống sau khi xong. |
| 11 | Rút gọn: checkout chính + wt1 cùng `test:integration` một file, lệnh thứ ba `--wait` ở wt1.<br>`--status` giữa chừng: `slot 0 — appchat-pg-slot:wt1:vitest…`, `slot 1 — appchat-pg-slot:main:vitest…` (tối đa 2).<br>Lệnh thứ ba in "đang chờ slot — đang giữ: wt1, main" rồi chạy sau khi nhả.<br>wt1 `contract.test.ts` 25/25, chính `inbox-translation.test.ts` 3/3, cả hai bắt đầu 20:11:14, không lỗi cổng / DB / Redis.<br>`pg_stat_activity` lúc đó: tổng 43/100 (dự án khác `zac_variants_ui` 24, `appchat` 13; AppChat V2 6).<br>Chưa dựng đủ wt2 + wt3 (`pnpm dev` + parity 5300): máy chỉ có một worktree; khi Chủ nhà tạo đủ 3 worktree, chạy theo README. |
| 12 | `git diff --stat origin/dev`: chỉ file manifest + `apps/api/test/health.test.ts` (DV-125); không file nghiệp vụ.<br>`@appchat/db` lint / typecheck / test 35 xanh; typecheck core / api / web / parity sạch; `pnpm lint:size` "4683 file, không file nào vượt trần"; `pnpm depcheck` "no dependency violations"; `pnpm test:tools` 12/12. |

**TEST:**
- Unit `@appchat/db` 35/35, `apps/api` 11/11, `@appchat/core` 1327 pass / 1 skip.
- `pnpm test:tools` 12/12 (worktree-env 8 + pg-slot 4).
- Integration (AC11): `contract.test.ts` 25/25 (wt1), `inbox-translation.test.ts` 3/3 (chính).
- E2E http (AC10): `auth-onboarding` desktop 3/3 ở wt1.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `code/testing.md` §2, §4b | Test file riêng `tools/scripts/test/*.test.mjs`; pg-slot chạy Postgres thật, không Postgres → skip có lý do; chỉ test phần ảnh hưởng | — |
| `database/tenant-db.md` §1 | Mỗi worktree đủ DB nền tảng + template + base + test riêng; `ws_*` theo registry của chính nó | — |
| `database/tenant-db.md` §6 | `db:generate` → `db:migrate-tenants` → `db:setup` chạy trong worktree, giữ slot; README nhắc thứ tự | — |
| `database/tenant-db.md` §10 | Role / mật khẩu dùng chung, không `ALTER ROLE … PASSWORD`; `setup-dev` không ghi `.env` worktree; role limit chỉ in | DC-923 (d) |
| `ops/observability-security.md` §2 | `.env` / `.data` / PID / log Memurai không commit; `wt:env` che bí mật (4 ký tự cuối, mật khẩu URL `****`); `pg-slot` không in URL | — |
| `domain/gap-filling.md` | Giả định đã chọn ghi DC-453 (tên biến, Migrator, `db:setup`, `.env.local-admin`, health) | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/035d-worktree-isolation` từ `origin/dev`, PR vào `dev` | — |
| D62 #7–8 · DC-908 · Q-913 | Bảng cổng / DB / Memurai / slot theo TIP §1; checkout chính không đổi | AC11 rút gọn (một worktree) |

**SỔ:**
- DC-453 (giả định chi tiết cô lập worktree).
- DV-125 (lệch manifest + sửa regex đọc `.env`).
- COVERAGE: D62-worktree / DC-908 / Q-913 → ĐẠT; `merge.py` 1806 dòng, 0 lỗ hổng.
- GOAL-RELEASE dòng 57 → DONE.

**VIỆC CÒN LẠI:**
1. (Tuỳ chọn, Chủ nhà) `pnpm slot -- --role-limits --apply` bằng superuser nếu muốn chặn cứng số kết nối theo role (Q-913).
2. Khi đủ 3 worktree: chạy AC11 đầy đủ (wt2 `e2e:http` + wt3 `pnpm dev` / parity 5300) theo `tools/scripts/worktree/README.md`.
