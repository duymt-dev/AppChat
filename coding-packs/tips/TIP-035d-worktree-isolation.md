# TIP-035d — Cô lập worktree chạy song song: env, Memurai, cổng, slot Postgres (Hạ tầng thi công, D62)

## HEADER
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before006d.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/db/src/lifecycle/restore.ts`; integrate 015c before035d.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before020e.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `package.json`, `tools/scripts/e2e-http.mjs`; integrate 023b before035d.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/package.json`, `tools/scripts/ai-live-stack.mjs`; integrate 023c before035d.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/api/package.json`; integrate 030b before035d.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `package.json`; integrate 032b before035d.
- **Parallel-safe with TIP-035c (coverage-closure manifest):** sequential, shares `packages/db/package.json`; integrate 035d before035c.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `packages/db/src/lifecycle/restore.ts`; integrate 041 before035d.
- **Parallel-safe with TIP-044 (coverage-closure manifest):** sequential, shares `apps/api/package.json`, `package.json`; integrate 035d before044.
- **Parallel-safe with TIP-045 (coverage-closure manifest):** sequential, shares `package.json`, `packages/db/package.json`, `packages/db/src/lifecycle/restore.ts`; integrate 035d before045.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/api/package.json`; integrate 045b before035d.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `apps/web/package.json`, `package.json`, `tools/parity/src/cli.ts`, `tools/scripts/e2e-http.mjs`; integrate 035d before046.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before047.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/package.json`; integrate 035d before047d.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before048.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before048b.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `.env.example`, `tools/scripts/e2e-http.mjs`; integrate 035d before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `.env.example`, `tools/scripts/e2e-http.mjs`; integrate 035d before048e.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before048h.
- **TIP-ID:** TIP-035d · **Project:** AppChat V2 · **Module:** Công cụ thi công — cô lập 3 worktree (không code nghiệp vụ, không UI) · **Priority:** P1 · **Estimated:** M (2 pha: P1 env + Memurai + cổng; P2 slot Postgres + an toàn DB)
- **Depends on:** 016b, 034d — trước 020e, 003e, 001c, 003f, 003g, 003h, 003i, 004b, 004c, 011b, 012d, 013b, 013c, 014c, 017b, 018b, 019d, 020f, 022d, 031b, 031c, 006d, 033d, 026c, 032e, 035b, 035c, 047, 047b, 047c, 047d, 048, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - Lúc viết (2026-11-14) `dev` đã DONE tới 006c; 016b / 034d đang mở PR (#223 / #224). 035d ghép ngay sau hai TIP đó, trước mọi TIP chờ còn lại (D62 #8). Mục tiêu: ba luồng chạy song song từ đầu — A TIP cũ · B Gọi điện · C Kênh (D62 #7).
  - 020e là TIP chờ kế tiếp trong bảng thứ tự. Nếu lúc thi công 016b / 034d chưa merge mà đã có TIP khác chen vào → ghép 035d ngay sau TIP đang mở PR cuối cùng, cập nhật dòng này ở Rà.
  - Các TIP đứng sau có chung file với 035d (Chủ thầu đảo dòng khai hai phía):
    - `.env.example`: 006d, 020e, 047, 048, 048b, 048d, 048e, 048h.
    - `packages/db/package.json`: 035c, 045. `apps/web/package.json`: 023c, 046, 047d.
    - `package.json`: 023b, 032b, 044, 045, 046. `tools/scripts/e2e-http.mjs`: 023b, 046, 048d, 048e. `tools/scripts/ai-live-stack.mjs`: 023c.
    - `packages/db/src/lifecycle/restore.ts`: 015c, 041, 045. `tools/parity/src/cli.ts`: 046. `apps/api/package.json`: 030b, 044, 045b.
    - Mọi TIP chờ có chung file đều đứng sau 035d qua dòng khai hai phía.
  - 035d không đụng code nghiệp vụ, nên không chờ TIP nghiệp vụ nào.
- **Files touched:** [exact M/C manifest](manifests/TIP-035d-files.md). Không có file prisma, không migration. Sửa có chủ đích file công cụ / harness của TIP khác: `e2e-http.mjs`, `ai-live-stack.mjs`, `e2e.mjs`, `playwright.config.ts`, `tools/parity/src/cli.ts`, hai script `packages/db/scripts/reset-test-db.ts` / `setup-dev.ts`, và một trường ở `health.controller.ts`.
- **Quyết định nguồn:** D62 (#7 thi công song song, #8 thứ tự) · DC-908 · Q-913 · `standards/database/tenant-db.md` §1, §6, §10.
- **Dòng COVERAGE nhận:** D62-worktree · DC-908 · Q-913.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2` = checkout chính (k = 0). Worktree k = 1..3 do Chủ thầu tạo bằng `git worktree add` (thư mục gốc gọi là `<wt>`). Tài liệu ở repo docs.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Env / dữ liệu:** chỉ checkout chính có `.env`, `.env.local-admin`, `.data/`. Worktree mới chưa chạy được.
  - **DB:**
    - Template chung `appchat_tenant_template`. `db:setup` (`packages/db/src/setup.ts` ~L110) áp migration của nhánh đang đứng → worktree khác nhánh ghi đè schema template của nhau. `CREATE DATABASE … TEMPLATE` lỗi khi có phiên khác nối template.
    - `appchat_tenant_base` cứng ở `packages/db/src/lifecycle/restore.ts` ~L19.
    - `ensureRoles` (`setup.ts` ~L51–61) chạy `ALTER ROLE … PASSWORD`. `packages/db/scripts/setup-dev.ts` ~L56 sinh mật khẩu mới khi thiếu `PG_PW_*` và ghi đè `.env` → chạy ở worktree làm đổi mật khẩu role dùng chung, checkout chính mất kết nối.
    - `db:test-reset` (`packages/db/scripts/reset-test-db.ts` ~L40–50) DROP mọi `ws_*` của DB nền tảng test rồi DROP DB nền tảng test FORCE → cùng tên DB test là giết test của worktree khác.
    - `db:migrate-tenants` duyệt registry của DB nền tảng trong `process.env` — đúng khi mỗi worktree có env riêng.
    - Pool nền tảng cứng 10: `packages/db/src/clients.ts` ~L9, `packages/core/src/kernel/tenant/tenant.providers.ts` ~L36.
    - Postgres native ~100 kết nối, dùng chung với dự án khác trên máy (DC-908).
  - **Harness integration** (`apps/api/test/integration/setup.ts`, không sửa): đọc `.env` ở gốc worktree; `FILES_DIR` tạm; Redis DB 15; `listen(0)`; `fileParallelism: false`.
  - **E2E:** không có globalSetup. `tools/scripts/e2e-http.mjs` (108 dòng) chỉ gọi health `localhost:${API_PORT}` → cổng bị chiếm thì test chạy vào backend của worktree khác.
  - **Cổng:**
    - API 4000 (`packages/core/src/kernel/env.ts` ~L7). Web `-p 3000` cứng (`apps/web/package.json` ~L7–9).
    - E2E web 3417 / 3418, `E2E_API_PORT` 4117. `AI_LIVE_PORT` 4617 + Redis DB 14. Parity mở web `:3000` (`tools/parity/src/cli.ts`).
    - `APP_PUBLIC_URL` `:3000` (CORS), `WIDGET_API_URL` `:4000`.
    - Demo ở checkout chính (API 4117 / web 3117) trùng cổng `e2e:http`.
  - **Redis (Memurai 6379, 16 DB; dev dùng DB 0 / 14 / 15):**
    - BullMQ không prefix (`with-job-context.ts` ~L40–55) → cùng DB là ăn job của nhau; scheduler id cố định.
    - `outbox:dirty` (`outbox.ts` ~L12) `SPOP` xuyên worktree; khoá `rl:` dùng chung.
    - Pub/sub bỏ qua DB index: `appchat:channels:control`, `appchat:ai:cancel`, `appchat:assistant:run:*`, Socket.IO adapter, `serverSideEmit`.
    - Kết luận: tách DB index không đủ → mỗi worktree một Memurai riêng (DC-908 b).
  - **Thư mục:** `FILES_DIR` mặc định `<cwd>/.data/files` (API và worker khác `cwd` → hai thư mục khác nhau); `ARCHIVE_DIR`, `MAIL_CONSOLE_DIR` tương tự.
- **Key files to read first:** D62 #7–8 · DC-908 · Q-913 · `packages/db/src/{env,clients,setup}.ts` · `packages/db/src/lifecycle/restore.ts` · `packages/db/scripts/{reset-test-db,setup-dev}.ts` · `tools/scripts/{e2e-http,ai-live-stack,e2e}.mjs` · `apps/web/playwright.config.ts` · `apps/api/test/integration/setup.ts` (chỉ đọc).
- **Patterns to follow:**
  - Script Node ESM `.mjs` như `e2e-http.mjs` / `ai-live-stack.mjs`: `node:child_process`, `node:net`, `node:fs`. Không thêm thư viện.
  - `pg` nạp từ `packages/db` bằng `createRequire` (không thêm dependency ở gốc).
  - Hàm thuần export để test (`portsFor`, `planEnv`, `parseExcluded`); `main()` chỉ chạy khi gọi trực tiếp file.
  - Mặc định chế độ xem: in kế hoạch. Ghi chỉ khi `--write` / `--apply`.
  - Biến mới luôn có mặc định = hành vi cũ. Mỗi script ≤ 300 dòng.

## APPLICABLE STANDARDS
- [code/testing](../standards/code/testing.md) — §2 integration chạy Postgres + Redis thật; §4b chỉ test phần ảnh hưởng; test ở file riêng.
- [database/tenant-db](../standards/database/tenant-db.md) — §1 DB nền tảng + template + `ws_*`; §6 thứ tự migrate; §10 role Postgres dùng chung.
- [ops/observability-security](../standards/ops/observability-security.md) §2 — bí mật chỉ ở env, không commit `.env`; script không in mật khẩu / key.
- [domain/gap-filling](../standards/domain/gap-filling.md) — chỗ thiết kế im lặng (tên biến, cờ Memurai): tra thang, ghi "Giả định đã chọn".
- [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md) — nhánh `tip/035d-worktree-isolation`, PR vào `dev`.

## Rà trước khi làm
1. Rebase lên `origin/dev` mới nhất (016b / 034d đã merge; chưa merge thì tách xếp chồng từ nhánh TIP chờ cuối).
   - `python -X utf8 tools/obligations/manifests.py 035d`.
   - Kiểm lại mọi số dòng `~` trên `origin/dev`. Lệch → sửa TIP, thêm dòng "Rà lại <ngày>".
   - Đọc lại D62, DC-908, Q-913 bản mới nhất.
2. Tìm mọi chỗ cứng cổng / DB / Redis / thư mục:
   - `git grep -n -E "3000|4000|4117|3117|3417|3418|4617|6379|appchat_tenant_template|appchat_tenant_base|appchat_platform_test" -- "*.ts" "*.mjs" "*.cjs" "*.json"`.
   - Chỗ nằm ngoài manifest → escalation L2 trước khi sửa (không tự thêm file).
3. Kiểm tên biến thật và ghi vào bảng §1 (sửa TIP):
   - `packages/db/src/env.ts`, `packages/core/src/kernel/env.ts`, `tenant.providers.ts`: URL DB nền tảng, `TENANT_TEMPLATE_DB`, `TEST_PLATFORM_DB`, URL Redis, Redis DB của AI live / test, pool tenant, cache (`TENANT_CLIENT_CACHE`), idle.
   - `playwright.config.ts`, `e2e.mjs`: biến cổng E2E web mock / http (đang cứng thì thêm biến, mặc định 3417 / 3418).
   - `TENANT_TEMPLATE_DB` / `TEST_PLATFORM_DB` đã được `setup.ts`, provisioner, harness integration đọc từ env chưa. Chỗ cứng ngoài manifest → L2.
4. Kiểm cách web nạp URL API (`NEXT_PUBLIC_*`, `apps/web/.env*`, rewrites trong `next.config`) và `turbo.json` có lọc biến không (`envMode`, `globalPassThroughEnv`).
   - Web đọc env riêng của `apps/web` → `worktree-env.mjs --write` ghi thêm `apps/web/.env.local` (file không commit).
   - Cần sửa file nguồn ngoài manifest → L2.
5. Memurai: `"C:\Program Files\Memurai\memurai.exe" --version`. Kiểm cờ dòng lệnh `--port`, `--bind`, `--dir`. Service Memurai 6379 của checkout chính đang chạy và giữ nguyên.
6. `netsh int ipv4 show excludedportrange protocol=tcp`: dải cổng do Hyper-V / WinNAT giữ. Cổng `5{k}00`–`5{k}61` hoặc `638{k}` rơi vào dải → đổi bảng cổng bằng DC mới (dải 9xx của nhánh), không tự đổi.
7. Đo Postgres: `SHOW max_connections;` + `SELECT usename, count(*) FROM pg_stat_activity GROUP BY 1;`. Ghi report (cơ sở cho `PG_SLOT_COUNT`, pool, số ở Q-913).
8. Kiểm:
   - Role Postgres của app có `CONNECT` trên DB `postgres` (nơi giữ khoá slot — §4).
   - `.env.local-admin` có chứa tên DB / cổng không (có → áp cùng bảng ghi đè khi chép sang worktree).
   - Tên lệnh npm tạo DB dev (`db:setup-dev` hay tên khác) trong `packages/db/package.json`.

## TASK
Cho checkout chính và 3 worktree (k = 1..3) chạy dev / test cùng lúc mà không đụng DB, cổng, Redis, thư mục của nhau. Test nặng xếp hàng theo slot Postgres.
- `worktree-env.mjs`: sinh / kiểm `.env` worktree theo bảng §1.
- `worktree-redis.mjs`: Memurai riêng mỗi worktree.
- `pg-slot.mjs`: semaphore slot Postgres cho lệnh nặng; tuỳ chọn giới hạn role (Q-913).
- `next-port.mjs`: web nghe `WEB_PORT`.
- Harness E2E / AI live: kiểm cổng trống, health đúng `instance`, lấy slot.
- Pool nền tảng, DB base theo env.
- An toàn DB dùng chung: `db:test-reset` chỉ dọn của mình; `setup-dev` không đổi mật khẩu khi đã có.
- Không đổi code nghiệp vụ. Checkout chính không đặt biến mới → hành vi như cũ.

## SPECIFICATIONS

### 1. Bảng env worktree k = 1..3 (DC-908 a)
Checkout chính (k = 0) không đặt biến mới → mọi giá trị như cột "Chính".

| Nhóm | Biến | Chính (mặc định cũ) | Worktree k |
|---|---|---|---|
| Định danh | `WORKTREE_ID` (mới) | không đặt → `main` | `wt{k}` |
| DB | URL DB nền tảng (tên biến — Rà #3) | `appchat_platform` | `appchat_platform_wt{k}`; chỉ đổi tên DB, giữ host / role / mật khẩu |
| DB | `TENANT_TEMPLATE_DB` | `appchat_tenant_template` | `appchat_tenant_template_wt{k}` |
| DB | `TEST_PLATFORM_DB` | `appchat_platform_test` | `appchat_platform_test_wt{k}` |
| DB | `TENANT_BASE_DB` (mới) | `appchat_tenant_base` | `appchat_tenant_base_wt{k}` |
| Redis | URL Redis (tên — Rà #3) | `…:6379/0` | `redis://127.0.0.1:638{k}/0` (Memurai riêng) |
| Redis | DB AI live / DB test | 14 / 15 | 14 / 15 trên cổng `638{k}` |
| Cổng | `WEB_PORT` (mới) | 3000 | `5{k}00` |
| Cổng | `API_PORT` | 4000 | `5{k}01` |
| URL | `APP_PUBLIC_URL` | `http://localhost:3000` | `http://localhost:5{k}00` |
| URL | `WIDGET_API_URL` | `http://localhost:4000` | `http://localhost:5{k}01` |
| E2E | web mock / web http (tên — Rà #3) | 3417 / 3418 | `5{k}17` / `5{k}18` |
| E2E | `E2E_API_PORT` | 4117 | `5{k}19` |
| AI live | `AI_LIVE_PORT` | 4617 | `5{k}61` |
| Thư mục | `FILES_DIR` · `ARCHIVE_DIR` · `MAIL_CONSOLE_DIR` | tương đối `.data/…` | tuyệt đối `<wt>/.data/files` · `<wt>/.data/archive` · `<wt>/.data/mail` |
| Pool | pool tenant · `TENANT_CLIENT_CACHE` · idle (tên — Rà #3) | như cũ | 2 · 10 · 20000 |
| Pool | `PLATFORM_POOL_MAX` (mới) | 10 | 4 |
| Slot | `PG_SLOT_COUNT` (mới) | 2 | 2 |

- Ví dụ k = 2: web 5200, API 5201, E2E 5217 / 5218 / 5219, AI live 5261, Memurai 6382.
- Biến không có trong bảng (`PG_PW_*`, `APP_ENC_KEY`, key LLM `LLM_SEED_*`, embed `EMBED_SEED_*`, …) chép nguyên từ `.env` checkout chính.
- Luật chung cho URL thêm sau (ví dụ `HOOKS_PUBLIC_URL` của TIP-048): giá trị chứa `localhost:3000` / `127.0.0.1:3000` đổi sang `5{k}00`; chứa `localhost:4000` / `127.0.0.1:4000` đổi sang `5{k}01`. In danh sách biến bị đổi theo luật này.
- Role Postgres dùng chung với checkout chính. Mật khẩu giữ nguyên (không `ALTER ROLE`).

### 2. `tools/scripts/worktree-env.mjs` — sinh / kiểm env
- **Lệnh:** `pnpm wt:env -- --k <1..3> [--write] [--force] [--check] [--from <đường dẫn .env>]`.
  - Không cờ: in bảng biến sẽ ghi. Giá trị bí mật che, chỉ hiện 4 ký tự cuối.
  - `--write`: ghi `<wt>/.env`.
  - `--check`: chỉ kiểm, không ghi (xem dưới).
- **Nguồn:** `.env` của checkout chính, tìm bằng `git rev-parse --git-common-dir` (cha của thư mục `.git` chung). `--from` ghi đè.
- **Kết quả:** `<wt>/.env` có khối đầu `# Sinh bởi tools/scripts/worktree-env.mjs (TIP-035d) — wt{k} — <thời điểm ISO>`, rồi các biến. Không sửa tay; chạy lại để cập nhật.
- **An toàn:**
  - Từ chối `--write` khi đang ở checkout chính (`git rev-parse --git-dir` = `--git-common-dir`): mã thoát 2.
  - `k` ngoài 1..3: mã 2.
  - `<wt>/.env` đã có mà không có khối "Sinh bởi" → từ chối, trừ `--force` (chép `.env.bak-<thời điểm>` trước khi ghi).
  - Chỉ đọc `.env` checkout chính. Không ghi ra ngoài `<wt>`.
  - Tạo các thư mục `<wt>/.data/files`, `archive`, `mail`, `redis` nếu chưa có.
- **`--check`** (mã 0 = sẵn sàng, 1 = có mục đỏ; in bảng từng mục):
  - Cổng `5{k}00`, `5{k}01`, `5{k}17`, `5{k}18`, `5{k}19`, `5{k}61` trống: thử `listen` trên `127.0.0.1` rồi đóng. Cổng đang do chính worktree chạy (health trả `instance = wt{k}`) tính là xanh.
  - Không cổng nào nằm trong dải `netsh int ipv4 show excludedportrange protocol=tcp` (chỉ khi `win32`).
  - Memurai `638{k}` trả `PONG`.
  - Bốn DB `_wt{k}` đã có (`SELECT datname FROM pg_database`). Thiếu thì in lệnh tạo (§8), không tự tạo.
- **Hàm thuần export để test:** `portsFor(k)`, `planEnv(baseText, k, wtRoot) → { lines, overridden, kept }`, `parseExcluded(netshText) → [{ start, end }]`, `isExcluded(port, ranges)`.

### 3. `tools/scripts/worktree-redis.mjs` — Memurai riêng (DC-908 b, Q-913)
- **Lệnh:** `pnpm wt:redis -- start|stop|status [--k <n>]`. Mặc định `k` lấy từ `WORKTREE_ID` trong `<wt>/.env`.
- **`start`:**
  - Chạy `C:\Program Files\Memurai\memurai.exe` (ghi đè bằng `MEMURAI_EXE`) với `--port 638{k} --bind 127.0.0.1 --dir <wt>/.data/redis` (cờ kiểm ở Rà #5).
  - Tiến trình tách (`detached` + `unref`). Ghi PID `<wt>/.data/redis/memurai.pid`, log `<wt>/.data/redis/memurai.log`.
  - Chờ `PING` tối đa 5 giây. Không lên → mã 1 + in đuôi log.
  - Đang chạy rồi → báo, mã 0.
- **`stop`:** gửi `SHUTDOWN`; quá 5 giây → kill theo PID. Xoá PID file.
- **`status`:** `PING`, `INFO server` (cổng, uptime), PID.
- `PING` / `SHUTDOWN` / `INFO` viết bằng giao thức RESP qua `node:net` (vài dòng, không thư viện).
- Không bao giờ đụng cổng 6379 / service Memurai của checkout chính.
- Không cài service Windows. Khởi động lại máy → chạy lại `start` (`wt:env --check` báo đỏ khi chưa chạy).
- Dữ liệu Redis của worktree là dữ liệu dev, mất được.

### 4. `tools/scripts/pg-slot.mjs` — slot Postgres (DC-908 c, Q-913)
- **Lệnh:**
  - `node tools/scripts/pg-slot.mjs [--wait[=<giây>]] -- <lệnh> <đối số…>`: lấy một slot, chạy lệnh con, nhả slot khi lệnh con thoát. Trả đúng mã thoát của lệnh con.
  - `--status`: slot nào đang giữ, bởi worktree / lệnh nào.
  - `--role-limits [--apply] [--revert]`: §4.2.
- **Cơ chế:**
  - Kết nối DB `postgres` (cùng host / role với URL DB nền tảng, đổi tên DB).
  - **Khoá advisory chỉ có hiệu lực trong một database.** DB nền tảng riêng mỗi worktree không dùng làm chỗ khoá được.
  - Thử `SELECT pg_try_advisory_lock(<ns>, <slot>)` với `slot` = 0..`PG_SLOT_COUNT − 1` (mặc định 2). `ns` là hằng số AppChat cố định trong script.
  - Giữ kết nối mở suốt lệnh con. Khoá phiên tự nhả khi kết nối đóng / tiến trình chết → không kẹt slot.
  - `application_name = 'appchat-pg-slot:<WORKTREE_ID|main>:<lệnh rút gọn ≤ 40 ký tự>'`. `--status` đọc `pg_locks` + `pg_stat_activity`.
  - Không có slot:
    - `--wait` → thử lại mỗi 2 giây tới hạn (mặc định 1800 giây). Mỗi 30 giây in "đang chờ slot — đang giữ: …".
    - Không `--wait` → mã 75 ngay.
  - Lệnh con nhận `PG_SLOT_HELD=<slot>`. Gặp lại `pg-slot` khi biến đã có → chạy thẳng (không lấy slot thứ hai, không tự khoá).
  - Ctrl+C / SIGTERM: chuyển tín hiệu cho lệnh con, chờ thoát, đóng kết nối.
  - Lối thoát giữ hành vi cũ:
    - `PG_SLOT_DISABLE=1` hoặc `CI=true` → chạy thẳng.
    - Không nối được Postgres → cảnh báo một dòng rồi chạy thẳng (lệnh con tự báo lỗi Postgres như cũ).
  - Export `withSlot(fn, opts)` để `e2e-http.mjs` / `ai-live-stack.mjs` dùng trong tiến trình. `withSlot` đặt `process.env.PG_SLOT_HELD` để tiến trình con (`db:setup`, `db:test-reset` …) không lấy slot thứ hai.
- **Áp vào lệnh nặng:**
  - `packages/db/package.json`: `db:setup`, `db:test-reset`, `db:migrate-tenants`; lệnh tạo DB dev nếu nó gọi các lệnh trên (lồng thì `PG_SLOT_HELD` xử lý).
  - `apps/api/package.json`: `test:integration`.
  - `tools/scripts/e2e-http.mjs`, `tools/scripts/ai-live-stack.mjs`: lấy slot trước khi tạo DB / bật stack.
  - Root `package.json`: `"slot": "node tools/scripts/pg-slot.mjs"` (chạy tay: `pnpm slot -- --status`).
  - Lệnh nhẹ (`dev`, unit test, lint) không lấy slot.

#### 4.2 Giới hạn role (Q-913, tuỳ chọn)
- `--role-limits` chỉ in lệnh:
  - `ALTER ROLE appchat_tenant_app CONNECTION LIMIT 45;`
  - `ALTER ROLE appchat_platform_app CONNECTION LIMIT 20;`
  - Số là đề xuất từ rà; chỉnh theo Rà #7.
- `--apply` mới chạy. Cần quyền superuser và Chủ nhà đồng ý (Q-913).
- `--revert` in / chạy `CONNECTION LIMIT -1`.

### 5. Cổng web theo env — `tools/scripts/next-port.mjs`
- `apps/web/package.json`: `dev` = `node ../../tools/scripts/next-port.mjs dev`; `start` = `node ../../tools/scripts/next-port.mjs start`.
- Script:
  - Cổng = `WEB_PORT` của `process.env`. Không có thì đọc dòng `WEB_PORT=` trong `.env` ở gốc repo (tránh turbo lọc biến — Rà #4). Không có nữa → 3000.
  - Chạy `next <dev|start> -p <cổng> <đối số còn lại>` (bin `next` của `apps/web`). Chuyển tín hiệu, trả mã thoát.
- `tools/parity/src/cli.ts`: URL web = `http://localhost:<WEB_PORT ?? 3000>` (hoặc biến parity có sẵn — kiểm ở Rà).

### 6. E2E / AI live
- `apps/api/src/http/health/health.controller.ts`: body health thêm `instance: process.env.WORKTREE_ID ?? 'main'`. Không đổi trường cũ. Không lộ bí mật.
- `tools/scripts/e2e-http.mjs`:
  1. Lấy slot (`withSlot`, chờ).
  2. Trước khi bật API / web: cổng E2E API + web http phải trống. Bị chiếm → dừng mã 1, in PID giữ cổng (`netstat -ano` lọc theo cổng). Không chạy test vào backend lạ.
  3. Sau khi bật: health phải trả `instance === (WORKTREE_ID ?? 'main')`. Khác → dừng mã 1.
- `tools/scripts/ai-live-stack.mjs`: như trên với `AI_LIVE_PORT`; Redis DB 14 trên Memurai của worktree.
- `tools/scripts/e2e.mjs` + `apps/web/playwright.config.ts`:
  - Cổng mock / http đọc env (mặc định 3417 / 3418).
  - `baseURL`, `webServer.url`, `webServer.command` theo cổng đó.
  - Có `WORKTREE_ID` → `reuseExistingServer: false` (cổng bị chiếm thì Playwright báo lỗi, không dùng server lạ). Checkout chính giữ như cũ.

### 7. Pool + DB base theo env (DC-908 d)
- `packages/db/src/env.ts`: khai (zod) `PLATFORM_POOL_MAX` (số nguyên 1–50, mặc định 10) và `TENANT_BASE_DB` (mặc định `appchat_tenant_base`). Thêm `TENANT_TEMPLATE_DB` / `TEST_PLATFORM_DB` nếu chưa có (Rà #3), mặc định tên cũ.
- `packages/db/src/clients.ts` ~L9 và `packages/core/src/kernel/tenant/tenant.providers.ts` ~L36: `max` của pool nền tảng = `PLATFORM_POOL_MAX`.
- `packages/db/src/lifecycle/restore.ts` ~L19: `appchat_tenant_base` → `TENANT_BASE_DB`.
- Không đổi logic khác của các file này.

### 8. An toàn DB dùng chung
- `packages/db/scripts/reset-test-db.ts` ~L40–50:
  - Chỉ DROP `ws_*` có trong registry `workspace` của `TEST_PLATFORM_DB` hiện tại. Không quét `pg_database LIKE 'ws_%'`.
  - Từ chối (mã 2) khi `TEST_PLATFORM_DB` trùng DB nền tảng dev của env hiện tại, hoặc không khớp `^appchat_platform_test(_wt[1-3])?$`.
  - DROP FORCE chỉ DB nền tảng test của chính nó.
- `packages/db/scripts/setup-dev.ts` ~L56:
  - `PG_PW_*` đã có trong env → dùng lại. Không sinh mới, không đổi mật khẩu role.
  - `.env` có khối "Sinh bởi worktree-env.mjs" → không ghi đè `.env`; chỉ in việc cần làm.
  - Checkout chính thiếu `PG_PW_*` → hành vi cũ (sinh + ghi).
- `ensureRoles` (`setup.ts` ~L51–61) đặt lại cùng mật khẩu → vô hại khi `PG_PW_*` chép nguyên. Không sửa `setup.ts`.
- **Tạo DB worktree** (chạy trong `<wt>` với env worktree, lệnh nặng tự lấy slot):
  - Lần đầu: `pnpm --filter @appchat/db run db:generate` → lệnh tạo DB dev (tên — Rà #8) tạo `appchat_platform_wt{k}` + template + base.
  - Mỗi migration mới: ba lệnh `db:generate` → `db:migrate-tenants` → `db:setup` (CLAUDE.md §7), chạy trong worktree đó.
- **Dọn worktree:** README in lệnh `DROP DATABASE … WITH (FORCE)` cho bốn DB `_wt{k}` và các `ws_*` trong registry `appchat_platform_wt{k}`. Không script nào tự chạy lệnh dọn.

### 9. `.env.example`, root `package.json`, README
- `.env.example` thêm khối (mọi dòng để trống / chú thích; checkout chính không đặt):
  - `# --- Worktree (TIP-035d, DC-908) — chỉ đặt trong worktree (pnpm wt:env) ---`
  - `WORKTREE_ID=` · `WEB_PORT=` · `TENANT_BASE_DB=` · `PLATFORM_POOL_MAX=` · `PG_SLOT_COUNT=` · `PG_SLOT_DISABLE=` · `MEMURAI_EXE=` (mỗi biến một dòng, kèm chú thích mặc định).
- Root `package.json`: `wt:env`, `wt:redis`, `slot`, `test:tools` (`node --test "tools/scripts/test/*.test.mjs"`).
- `tools/scripts/worktree/README.md` (≤ 150 dòng):
  - Tạo worktree k: `git worktree add` (Chủ thầu) → `pnpm install` → `pnpm wt:env -- --k 1 --write` → `pnpm wt:redis -- start` → tạo DB (§8) → `pnpm wt:env -- --k 1 --check` xanh.
  - Bảng cổng k = 1..3.
  - Lệnh nặng tự lấy slot; xem bằng `pnpm slot -- --status`.
  - Sự cố: cổng bị Hyper-V giữ, Memurai không lên, slot kẹt (tiến trình chết → slot tự nhả), DB thiếu.
  - Dọn: `wt:redis stop` + lệnh DROP in sẵn.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given checkout chính không đặt biến mới, when chạy web + API + `db:setup` + restore như cũ, then web nghe 3000, API 4000, health `instance = main`, pool nền tảng 10, restore dùng `appchat_tenant_base`; test đang xanh vẫn xanh | output `pnpm turbo run test --filter=@appchat/{db,core,api,web}` + gọi health (đường health kiểm ở Rà) |
| 2 | Given `.env` mẫu (fixture) + k = 2, when `planEnv`, then đúng bảng §1 (DB `_wt2`, cổng 5200 / 5201 / 5217 / 5218 / 5219 / 5261, Memurai 6382, thư mục tuyệt đối); `PG_PW_*` / key LLM / embed giữ nguyên; bí mật che khi in; k = 0 / 4 → mã 2; `--write` ở checkout chính → mã 2; `.env` không do script sinh → từ chối khi thiếu `--force` | `tools/scripts/test/worktree-env.test.mjs` |
| 3 | Given cổng 5101 bị chiếm (server giả trong test), hoặc text `netsh` có dải chứa 5117, when `--check`, then mã 1 và chỉ đúng mục đỏ; cổng do chính worktree chạy (health `wt1`) không tính đỏ | `worktree-env.test.mjs` |
| 4 | Given service Memurai 6379 đang chạy, when `wt:redis start --k 1` rồi `stop`, then 6381 trả `PONG` khi chạy, cổng trống sau `stop`, dữ liệu nằm ở `<wt>/.data/redis`; `PING` 6379 trước / sau không đổi | output lệnh + `INFO server` |
| 5 | Given API + worker của wt1 và của checkout chính cùng chạy, when wt1 chạy một action có outbox + job, then `netstat -ano` không có kết nối nào từ PID của API / worker wt1 tới cổng 6379; khoá `bull:*` của job nằm ở 6381 | output `netstat -ano` lọc 6379 / 6381 + danh sách PID wt1 + `KEYS bull:*` trên 6381 |
| 6 | Given `PG_SLOT_COUNT=2`, when 3 lệnh giữ slot 5 giây chạy song song với `--wait`, then tối đa 2 chạy cùng lúc, lệnh thứ 3 chạy sau; không `--wait` → mã 75; lệnh con thoát mã 3 → `pg-slot` trả 3 và slot nhả; kill tiến trình giữ slot → slot nhả; lồng `PG_SLOT_HELD` không tự khoá | `tools/scripts/test/pg-slot.test.mjs` (Postgres thật) |
| 7 | Given hai tiến trình có DB nền tảng khác nhau (`_wt1`, `_wt2`), when cùng lấy slot, then tranh cùng một bộ slot (khoá ở DB `postgres`); `--status` thấy `application_name` đúng worktree / lệnh | `pg-slot.test.mjs` + output `--status` |
| 8 | Given wt2 có workspace test đang dùng, when `db:test-reset` ở wt1, then các `ws_*` của wt2 và của checkout chính còn nguyên; `TEST_PLATFORM_DB` trùng DB nền tảng dev hoặc sai mẫu tên → mã 2, không DROP gì | output + `psql -c "SELECT datname FROM pg_database WHERE datname LIKE 'ws_%'"` trước / sau |
| 9 | Given `.env` worktree có `PG_PW_*`, when chạy lệnh tạo DB dev trong worktree, then không đổi mật khẩu role (checkout chính vẫn nối được), `.env` worktree không bị ghi đè (hash trước / sau bằng nhau) | output + `sha256sum .env` trước / sau |
| 10 | Given cổng E2E API của wt1 bị chiếm, when `pnpm e2e:http <module>` ở wt1, then dừng trước khi chạy test và in PID giữ cổng; health trả `instance` khác → mã 1; cổng trống + đúng `instance` → spec xanh | output `e2e-http.mjs` ba ca |
| 11 | Given checkout chính + wt1 + wt2 + wt3 cùng chạy, when wt1 `test:integration` một file, wt2 `e2e:http` một module, wt3 `pnpm dev` + đăng nhập demo + `pnpm parity <id>` vào web 5300, checkout chính `pnpm dev`, then không lỗi cổng / DB / Redis; `--status` tối đa 2 slot; tổng kết nối AppChat trong `pg_stat_activity` ghi report | log 4 cửa sổ + `pnpm slot -- --status` + truy vấn `pg_stat_activity` |
| 12 | Given diff của TIP, when `git diff --stat origin/dev`, then chỉ có file trong manifest, không file nghiệp vụ; lint / typecheck / unit của gói đổi + `pnpm depcheck` + `pnpm lint:size` xanh | output lệnh |

### Commands / evidence gate
- `pnpm test:tools` (= `node --test "tools/scripts/test/*.test.mjs"`). Thiếu Postgres → `pg-slot.test.mjs` skip có ghi lý do (không tính pass).
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{db,core,api,web}` · `pnpm depcheck` · `pnpm lint:size`.
- Integration (tự lấy slot sau TIP này): `pnpm --filter @appchat/api test:integration -- <file lifecycle / restore hiện có — tên kiểm ở Rà>`.
- E2E: `pnpm e2e:http <module nhỏ>` ở wt1 và ở checkout chính.
- Tay, dán output: `pnpm wt:env -- --k 1 --check` · `pnpm wt:redis -- status` · `pnpm slot -- --status` · `SELECT usename, count(*) FROM pg_stat_activity GROUP BY 1`.

## CONSTRAINTS
- **DO NOT:**
  - Sửa code nghiệp vụ (domain `packages/core/src/<domain>`, action, handler, UI).
  - Thêm prefix Redis / `REDIS_NS` vào BullMQ / Socket.IO / pub-sub (DC-908 b chọn Memurai riêng).
  - Đổi mặc định của biến cũ; bắt checkout chính đặt biến mới.
  - Đổi mật khẩu role Postgres. Chạy `ALTER ROLE … CONNECTION LIMIT` khi chưa `--apply` và chưa có đồng ý của Chủ nhà (Q-913).
  - Tự xoá DB `_wt{k}` / `ws_*` của worktree khác. Script dọn chỉ in lệnh.
  - Đụng service / cổng Memurai 6379 của checkout chính.
  - Dùng Docker, cài service Windows, thêm thư viện npm.
  - Commit `.env`, `.data/`, PID / log của Memurai.
- **REUSE:**
  - Mẫu spawn + chờ health của `e2e-http.mjs` / `ai-live-stack.mjs`.
  - `pg` của `packages/db` (`createRequire`); env zod ở `packages/db/src/env.ts`.
  - Harness integration hiện có (`setup.ts` đọc `.env` gốc worktree) — không sửa.
- **SKIP:**
  - Prefix Redis trong code (không cần khi Memurai riêng).
  - Tạo worktree / nhánh (`git worktree add` do Chủ thầu).
  - Gắn `test:tools` vào CI (ghép ở 046).
  - Worktree thứ 4 trở lên; máy khác Windows (`netsh` bỏ qua khi không phải `win32`).

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Không file nghiệp vụ, không prisma.
- [x] Bảng env k = 1..3 khớp DC-908 a; Memurai riêng (DC-908 b); slot `pg_try_advisory_lock` (DC-908 c); biến pool / base / cổng web theo env (DC-908 d); kiểm cổng + `instance` (DC-908 e).
- [x] Checkout chính không đặt biến mới → hành vi như cũ.
- [x] Q-913: giới hạn role chỉ in lệnh, `--apply` khi Chủ nhà đồng ý.
- **Gap đã khai:**
  - Tên biến pool tenant / idle / cổng E2E web / URL Redis chưa kiểm (Rà #3).
  - Cách web nạp URL API + turbo lọc env chưa kiểm (Rà #4).
  - Hai file thêm ngoài danh sách gốc: `apps/api/package.json` (integration lấy slot), `tools/parity/src/cli.ts` (parity theo `WEB_PORT`).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope. Chỗ cứng phát hiện ở Rà #2 nằm ngoài manifest → L2.
- [ ] AC 1–12 có kết quả từng cái, dán output thật (lệnh, `--status`, `CLIENT LIST`, `pg_stat_activity`), không "pass" chung chung.
- [ ] **Làm đúng TIP (BUILDER-HANDOFF #1):** diff chỉ chứa file công cụ / harness trong manifest; không đổi code nghiệp vụ.
- [ ] **DB riêng mỗi workspace (BUILDER-HANDOFF #4):** mỗi worktree có DB nền tảng / template / test / base riêng; migration mới chạy CẢ `db:generate` → `db:migrate-tenants` → `db:setup` trong đúng worktree; `_appchat_migrations` của `appchat_tenant_template_wt{k}` có migration mới nhất của nhánh.
- [ ] **Bí mật (observability-security §2):** script không in `PG_PW_*` / key; `.env` / `.data/` không commit.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
