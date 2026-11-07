# TIP-001: Scaffold backend

## HEADER
- TIP-ID: TIP-001
- Project: AppChat V2
- Module: nền backend (apps/api, apps/worker, packages/{core,db,ai,channels,integrations})
- Depends on: None (monorepo FE đã có — D38)
- Priority: P0 · REQ: N01, N12
- Estimated effort: 10 giờ
- **Files touched:**
  - `apps/api/**` (create) — `package.json`, `tsconfig.json`, `eslint.config.mjs`, `tsup.config.ts`, `vitest.config.ts`, `src/main.ts`, `src/app.module.ts`, `src/bootstrap.ts`, `src/http/health/*`, `src/http/<domain>/<domain>.http.module.ts` × 19, `src/middleware/trace.middleware.ts`, `test/*.test.ts`
  - `apps/worker/**` (create) — `package.json`, `tsconfig.json`, `eslint.config.mjs`, `tsup.config.ts`, `vitest.config.ts`, `src/main.ts`, `src/worker.module.ts`, `src/roles/{channels,ai,jobs}.module.ts`, `test/*.test.ts`
  - `packages/core/**` (create) — `src/index.ts`, `src/kernel/{kernel.module.ts, clock.ts, ids.ts, request-context.ts, env.ts, logger/*}`, `src/<domain>/<domain>.module.ts` + `src/<domain>/jobs/<domain>.jobs.module.ts` × 19, `test/*.test.ts`
  - `packages/db/**` (create) — `package.json`, `src/index.ts`, `prisma/platform/*.prisma` × 8, `prisma/tenant/*.prisma` × 22 (rỗng, header sở hữu)
  - `packages/ai/**` (create) — `package.json`, `src/index.ts` (stub cho TIP-019)
  - `packages/channels/**` (create) — `src/types.ts`, `src/define.ts`, `src/registry.ts`, `src/coming-soon.ts`, `src/{zalo-personal,webchat,email}/manifest.ts`, `test/registry.test.ts`
  - `packages/integrations/**` (create) — `src/types.ts`, `src/define.ts`, `src/registry.ts`, `src/coming-soon.ts`, `src/connectors/{sepay,casso,brevo,smtp}/manifest.ts`, `test/registry.test.ts`
  - `packages/shared/src/log/redact.ts` (create) + 1 dòng export ở `packages/shared/src/index.ts` (modify) — danh sách khoá che PII (`ops/observability-security.md` §1.4)
  - `.dependency-cruiser.cjs` (create), `.env.example` (create), `package.json` gốc (modify: script `depcheck`, devDeps), `.github/workflows/{ci,full}.yml` (modify: bước `pnpm depcheck`), `pnpm-lock.yaml`
- **Parallel-safe with:** sequential — mọi TIP sau phụ thuộc file tổng hợp do TIP này tạo.

## CONTEXT
- Working directory: `D:\CODING\AppChat_Ver2`
- Key files: `plans/BLUEPRINT.md` §1.1–1.3, §6, §8 · `02-TASK-GRAPH.md` → Bản đồ sở hữu file · `standards/code/{file-size-module-layout,testing}.md` · `standards/ops/observability-security.md` §1–2 · `standards/channels/omnichannel-adapter.md` (Hợp đồng) · `standards/integrations/provider-ports.md` (Hợp đồng) · `goals/GOAL-BACKEND.md` (cổng test D59)
- Patterns: package workspace kiểu `packages/actions` (`type: module`, `main: ./src/index.ts`, eslint `typescript-eslint` recommended + `no-explicit-any`), `tsconfig.base.json`.
- Dữ liệu kênh / connector cho manifest: `fixtures/prototype-parity/settings.json` (`channels` 16 loại, `connectors` 18).

## TASK
Dựng khung backend chạy được, rỗng nghiệp vụ, để TIP 002 → 046 chỉ **điền stub domain mình**:
1. `packages/core`: `KernelModule` (global) + 19 domain module rỗng theo Blueprint §1.2 (`identity, authz, billing, channels, inbox, crm, catalog, sales, contracts, documents, integrations, booking, support, marketing, loyalty, ai, insights, notify, platform`), mỗi domain có thêm `<Domain>JobsModule` rỗng cho worker. `src/index.ts` export đủ — TIP sau không sửa.
2. Kernel tối thiểu của TIP-001: `Clock` (`SystemClock`, `FixedClock` cho test; token `CLOCK`), `uuidv7()`, `RequestContext` (AsyncLocalStorage: `traceId`, `source`, `ws?`, `userId?`, …), logger pino JSON có `redact` theo `packages/shared/src/log/redact.ts` và tự gắn trường context vào mỗi dòng, adapter `LoggerService` của Nest, `loadEnv()` validate zod lúc boot.
3. `apps/api`: Nest HTTP, prefix `/v1`, middleware trace (`X-Request-Id` nhận hoặc sinh uuidv7, trả lại header, chạy request trong `RequestContext`, log 1 dòng `info` mỗi request), `GET /v1/health` → `{ data: { status: 'ok', service: 'api', time } }`, `AppModule` import sẵn 19 `<Domain>HttpModule` rỗng.
4. `apps/worker`: Nest standalone, `ROLE=channels | ai | jobs | all`, mỗi role import sẵn `<Domain>JobsModule` theo bảng hàng đợi Blueprint §1.3; ROLE sai → không khởi động.
5. `packages/db`: stub Prisma đúng bản đồ sở hữu (header ghi TIP chủ + bảng), chưa có generator / client (TIP-002).
6. `packages/channels`, `packages/integrations`: kiểu hợp đồng theo standard, `define*()` kiểm trùng, registry duy nhất; 3 kênh phát hành và 4 connector phát hành có manifest (adapter do TIP chủ thêm), các mục còn lại `coming_soon`.
7. `packages/ai`: package rỗng cho TIP-019.
8. Công cụ: build bằng tsup (+ `@swc/core` cho decorator metadata của Nest), test vitest, lint (`no-console` = error ở backend), `pnpm depcheck` (dependency-cruiser — DC-004), CI thêm `pnpm depcheck`.

## SPECIFICATIONS

### Business Rules
- **Ranh giới phụ thuộc** (Blueprint §1.1) — dependency-cruiser chặn:
  - `packages/shared` → không import gói nội bộ nào.
  - `packages/actions` → chỉ `shared`.
  - `packages/db` → chỉ `shared`.
  - `packages/{ai,channels,integrations}` → chỉ `shared`, `actions`.
  - `packages/core` → `db, actions, shared, ai, channels, integrations` (không `apps/*`, không `ui`).
  - `apps/{api,worker}` → không `ui`, không `apps/web`.
  - `apps/web`, `packages/ui` → không `core`, `db`, `ai`, `channels`, `integrations`.
  - Không vòng phụ thuộc giữa module (`no-circular`); không import gói chưa khai trong `package.json` (`no-non-package-json`).
- **Worker role ↔ JobsModule** (theo queue §1.3):
  - `channels`: `channels`, `inbox`, `marketing`.
  - `ai`: `ai`.
  - `jobs`: `identity, authz, billing, crm, catalog, sales, contracts, documents, integrations, booking, support, loyalty, insights, notify, platform`.
  - `all` = hợp của 3 role (dev gộp một tiến trình).
- **Log** (`ops/observability-security.md` §1): JSON; mỗi dòng có `level, time, msg, traceId, source` (+ `ws, userId, runId, actionId, conversationId, job` khi có); che `phone, email, password, otp, token, credentials*, authorization, cookie` ở mọi độ sâu ≤ 2 và header `authorization`, `cookie`; cấm `console.*` ở backend.
- **traceId:** header `X-Request-Id` hợp lệ (1–128 ký tự `[A-Za-z0-9._-]`) thì dùng lại, không thì sinh uuidv7; luôn trả header `X-Request-Id`.
- **Env (zod, boot):** `NODE_ENV` (`development|test|production`, mặc định `development`), `LOG_LEVEL` (`fatal|error|warn|info|debug|trace|silent`, mặc định `info`), `API_PORT` (số, mặc định `4000`), `ROLE` (worker; `channels|ai|jobs|all`, mặc định `all`). Biến DB / Redis / khoá mã hoá do TIP chủ thêm (002, 003, …) vào cùng schema.
- **Manifest kênh:** khoá `type` duy nhất; kết nối được (`isConnectable`) ⇔ `status ≠ 'coming_soon'` **và** đã gắn adapter. 3 kênh phát hành (`zalo_personal`, `webchat`, `email`) có manifest `status: 'ga'`, adapter do TIP chủ (014 / 017 / 018) gắn trong thư mục của mình — trước đó `isConnectable = false`. 13 kênh còn lại `coming_soon`.
- **Manifest connector:** khoá `key` duy nhất; `port` thuộc danh sách port của standard; cùng luật `isConnectable`. 4 connector phát hành (`sepay`, `casso`, `brevo`, `smtp`) có thư mục riêng, `status: 'ga'`, adapter do TIP chủ gắn (004, 010); 13 connector còn lại `coming_soon`. `web_widget` của fixture là lối tắt sang kênh `webchat` (channel registry), **không** phải connector — TIP-012 ghép thẻ này từ `channelRegistry` (DC-006).

### Validation & Error Handling
- Env sai → `loadEnv()` ném lỗi liệt kê biến sai, tiến trình thoát mã ≠ 0 (không in giá trị biến).
- `ROLE` sai → worker không khởi động.
- Registry trùng `type` / `key` → `define*()` ném lỗi lúc import.
- Envelope / `AppError` / filter lỗi: **TIP-003**, không làm ở đây.

## ACCEPTANCE CRITERIA
1. **Given** repo sau TIP · **When** `pnpm --filter @appchat/api build` và `pnpm --filter @appchat/worker build` · **Then** ra `dist/main.js`, chạy được bằng `node`.
2. **Given** API đang chạy · **When** `GET /v1/health` không kèm header · **Then** 200, body `{ data: { status: 'ok', service: 'api', time } }`, header `X-Request-Id` là uuidv7.
3. **Given** request có `X-Request-Id: abc-123` · **Then** response trả lại đúng `abc-123`, dòng log request có `traceId: "abc-123"`, `source: "http"`. Header không hợp lệ (ký tự lạ / > 128) → sinh mới.
4. **Given** logger ghi object chứa `phone`, `email`, `token`, `password`, `credentials_enc`, header `authorization` · **Then** output không chứa giá trị gốc (thay bằng `[redacted]`).
5. **Given** `FixedClock(t)` · **Then** `now()` trả `t`, `advance(ms)` dịch đúng; `uuidv7()` đúng định dạng version 7 / variant 10 và tăng dần theo thời gian.
6. **Given** env thiếu / sai (`API_PORT=abc`, `ROLE=foo`) · **Then** `loadEnv()` ném lỗi nêu tên biến.
7. **Given** worker `ROLE=channels | ai | jobs | all` · **Then** dựng được application context đúng tập JobsModule; `ROLE=foo` → lỗi.
8. **Given** `packages/core` · **Then** `index.ts` export đủ 19 `<Domain>Module` + 19 `<Domain>JobsModule` + `KernelModule`; `AppModule` import đủ 19 `<Domain>HttpModule`.
9. **Given** registry kênh · **Then** 16 `type` duy nhất khớp fixture `settings.json` → `channels`; 3 kênh phát hành có manifest đủ trường; mọi `coming_soon` không kết nối được; `define` trùng → lỗi. Registry connector: 17 `key` duy nhất = fixture `connectors` trừ `web_widget`; `define` trùng → lỗi. Chưa gắn adapter → không mục nào kết nối được.
10. **Given** `pnpm depcheck` · **Then** xanh trên repo; một import vi phạm (ví dụ `packages/channels` → `@appchat/core`) → đỏ (kiểm bằng file tạm, không commit).
11. **Given** 30 file `.prisma` · **Then** đúng tên + thư mục theo bản đồ sở hữu, mỗi file có header TIP chủ.
12. Lint (`no-console` backend), typecheck, `pnpm lint:size` xanh cho các package mới.

## CONSTRAINTS
- Không tạo lại `apps/web`, `packages/{actions,shared,ui}`; sửa `packages/shared` chỉ thêm `log/redact.ts` + 1 dòng export (cổng chốt chạy typecheck `apps/web`).
- Không viết nghiệp vụ, không bảng, không Prisma client, không envelope / ActionExecutor (002, 003).
- Không Docker. Không `console.*` ở backend. File ≤ 600 dòng.
- Thư viện mới: `@nestjs/{common,core,platform-express}`, `reflect-metadata`, `rxjs` (Nest — stack), `pino` (standard ops §1), `tsup` (Blueprint §1.1), `@swc/core` (đã có trong lockfile qua Next), `dependency-cruiser` (standard code §6). Không thêm gì khác.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`
- [ ] 12 AC có test / lệnh chạy thật, ghi kết quả từng AC
- [ ] Cổng D59: trước commit (lint + typecheck + unit + depcheck package đổi) · chốt TIP (full lint / typecheck / unit / depcheck / build, full E2E hồi quy mock; integration + E2E http + parity = N/A — TIP không có DB / luồng UI)
- [ ] Ranh giới import (Blueprint §1.1) có trong `.dependency-cruiser.cjs`
- [ ] Không query DB (chưa có DB ở TIP này)
- [ ] Commit + SHA + `reports/TIP-001-completion.md` + ba sổ + bảng tiến độ goal
