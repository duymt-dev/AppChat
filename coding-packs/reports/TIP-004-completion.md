### COMPLETION REPORT — TIP-004

**STATUS:** DONE
**COMMIT:** `4ec203e` (code) · `9044eb4` (build api / worker + ổn định test) trên nhánh `tip/004-identity-auth` (xếp chồng trên `tip/003-action-kernel`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - `packages/db/prisma/platform/identity.prisma` (điền) + migration `platform/migrations/20261030100000_004_identity` (sinh bằng `prisma migrate diff` + SQL viết tay: `membership_user_active_idx (user_id) INCLUDE (workspace_id, role_key) WHERE status='active'`, `membership_workspace_created_idx`, `invite_pending_idx … INCLUDE (email, role_key, expires_at) WHERE accepted_at IS NULL AND revoked_at IS NULL`, `refresh_token_family_active_idx WHERE revoked_at IS NULL`, `otp_code_reset_hash_idx WHERE purpose='reset' AND consumed_at IS NULL`, CHECK email chữ thường).
  - `packages/db/src/workspace-registry.ts` — `PrismaWorkspaceRegistry` (DC-008).
  - `packages/integrations/src/ports/{mail,tax-lookup}.ts`, `connectors/brevo/mail.ts`, `connectors/mock/{console-mail,tax-lookup}.ts`, `connectors/vietqr/tax-lookup.ts` + `test/ports.test.ts`.
  - `packages/core/src/identity/` — `identity.env.ts`, `identity.module.ts`, `public.ts`, `tax-fixture.ts`, `services/{secrets,access-tokens,otp.service,sessions.service,auth.service,workspaces.service,invites.service,mail-templates,identity.tokens}.ts`, `actions/{profile-update,workspace-switch,business-profile-update}.handler.ts`, `jobs/{tenant-provision.processor,identity.jobs.module}.ts`.
  - `packages/core/src/kernel/rate-limit.ts`; `packages/core/test/identity-unit.test.ts`.
  - `apps/api/src/http/identity/{auth.controller,workspaces.controller,http-util}.ts`, `apps/api/src/http/kernel/actor.module.ts`; `apps/api/test/integration/{auth,workspaces}.test.ts`.
- Modified: `packages/core/src/kernel/{kernel.module.ts (ENV_SOURCE), tenant/tenant.providers.ts (registry Prisma), actions/{executor (db 'platform'), action-context (PlatformTx), handler, actions.module, tip-owners}.ts, index.ts}`, `packages/core/src/index.ts` (1 dòng facade — DC-023), `apps/api/src/{app.module.ts, http/kernel/{request-actor (JwtActorResolver), kernel.http.module, error.filter (Retry-After)}.ts, http/identity/identity.http.module.ts}`, `apps/{api,worker}/{package.json, tsup.config.ts}`, `apps/api/test/integration/{setup,actions}.test.ts` (JWT thật thay dev header), `.env.example`, `coding-packs/DECISIONS.md`.

**TEST RESULTS:**
- Acceptance criteria: 13/13 pass (Postgres 16 native + Memurai thật)
  1. Migration 004 áp qua `db:setup` (idempotent); đủ 5 index viết tay; `EXPLAIN` tra membership → `membership_user_active_idx` — **pass**
  2. Đăng ký: `otp/request` → mã ở mail console → `otp/verify` 200 + access token + cookie `rt=…; Path=/api/v1/auth; Expires; HttpOnly; SameSite=Lax; Secure`; email viết hoa / có khoảng trắng được chuẩn hoá; DB chỉ có sha256 của mã; sai 5 lần → mã khoá (mã đúng sau đó 401); hết 10 phút → 401 — **pass**
  3. Chống dò: login / reset với email chưa có + register với email đã có → 204, không gửi mail — **pass**
  4. Rate limit: lần 6 / 15 phút cùng email → 429 `RATE_LIMITED` + `Retry-After`; 21 lần / giờ cùng IP → 429 — **pass**
  5. `password/set` cần token; `password/login` đúng 200; sai mật khẩu và email lạ → cùng 401, cùng body; hash `$argon2id$v=19$m=19456,t=2,p=1$` — **pass**
  6. Refresh xoay vòng; dùng lại token đã xoay → 401 `reused` + token mới nhất của family cũng chết; logout xoá cookie + thu hồi; quên mật khẩu: link 15 phút → đặt lại → refresh cũ bị thu hồi; link dùng lại / hết hạn → 401 — **pass**
  7. `POST /v1/workspaces` 201 provisioning → worker BullMQ thật (queue `tenant`) tạo `ws_*` → `ready`; `db_status=active`, `provisioned_at`; outbox `workspace.ready` trong DB tenant mới; người ngoài xem trạng thái → 403; workspace đang provisioning → action 503 `WORKSPACE_UNAVAILABLE` — **pass**
  8. `/v1/actions` dùng JWT thật: không / sai / hết hạn token → 401; workspace không phải thành viên → 403 trước khi mở DB tenant; vai trò từ `membership.role_key` (`custom:*` chưa có quyền → 403). Bộ integration TIP-003 (17 ca) xanh với JWT thật — **pass**
  9. `profile.update` ghi DB nền tảng, `action_log` ở DB tenant; `workspace.switch` sang workspace lạ → 403, hợp lệ → `current_workspace_id` đổi; `business_profile.update` lưu + `declared_at`, `needs_declare` → false; sales → 403 — **pass**
  10. Invite: tạo + mail; email khác → 403; đúng email → membership `cs` active; dùng lại → 409; quá 7 ngày → 409; mời người đã là thành viên → `CONFLICT` — **pass**
  11. Tra MST mock → dữ liệu; sai định dạng → 422; provider không thấy → 404; chưa đăng nhập → 401. Adapter VietQR + Brevo test bằng fetch giả (không gọi mạng) — **pass**
  12. Log thật (pino, mức info) của luồng OTP request / verify sai / verify đúng / login sai không chứa email, mã OTP, access token, refresh token — **pass**
  13. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (shared · core · api · worker · db · integrations · contract · web) 24/24 task — core 58 · integrations 11 · db 17 · api 5 · worker 6 · contract 4 · shared 48 · web 72; `pnpm depcheck` xanh (99 known); `lint:size` 979 file.
- **Cổng "chốt TIP":** `pnpm lint` 13/13 · `pnpm typecheck` 13/13 · `pnpm test` 13/13 task, 0 failed · `db test:integration` 7 passed · `api test:integration` **38 passed** (auth 11 · workspaces 10 · actions 13 · relay-sequence 3 · contract 1; chạy 3 lần liên tiếp xanh) · `pnpm depcheck` xanh · `pnpm i18n:check` 100% (4471 key) · `pnpm build` 3/3 · **smoke bản build**: `node dist/main.js` (api) → health 200, `otp/request` 204, `otp/verify` + `/me` 200, `/me` không token 401; worker `ROLE=jobs` khởi động không lỗi · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (3.0m, lượt chạy lại sau `9044eb4`; lượt đầu 221 passed · 1 failed chập chờn `quotes.spec.ts:37`, chạy riêng 15/15 xanh). E2E http + parity: N/A — TIP không có màn UI (nối FE auth / onboarding là TIP-011).

**ISSUES DISCOVERED:**
- Bản build `apps/{api,worker}` (tsup) trước đây gộp phụ thuộc bắc cầu của `@appchat/*` (pg, ioredis, bullmq — CJS) vào bundle ESM → `node dist/main.js` chết ngay (`Dynamic require of "events"`, `Directory import ioredis/built/utils`). TIP-001..003 chỉ kiểm `pnpm build` xanh, không chạy bản build. Sửa ở `9044eb4`: mọi gói npm để ngoài bundle + khai `pg`, `@prisma/client`, `@prisma/adapter-pg`, `ioredis`, `bullmq` ở `dependencies` của app. Đề xuất thêm bước smoke `node dist/main.js` vào cổng chốt TIP cho TIP backend.
- Full E2E lượt đầu: 1 ca `quotes.spec.ts:37` (desktop) lỗi URL `from_quote` — module web không đổi trong TIP này; chạy riêng spec đó 3 lần → 15/15 xanh (ca chập chờn, ghi nhận). Lượt chạy lại sau sửa build: xem dòng E2E ở trên.
- Bộ đếm rate limit trên Memurai sống qua các lần chạy test → test dùng IP giả theo lần chạy.
- CI GitHub vẫn chưa chạy integration (Q-008).

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-014 (email chữ thường + CHECK thay citext) · DC-015 (argon2id + HS256 bằng `node:crypto`) · DC-016 (refresh 30 ngày / 1 ngày) · DC-017 (lời mời 7 ngày, accept cần đăng nhập + trùng email) · DC-018 (SMTP dự phòng để TIP-006) · DC-019 (`business_profile.update` thuộc 004) · DC-020 (`/v1/me` thêm `current_workspace_id`, `needs_declare`, `db_status`, `declared`) · DC-021 (`tenant.provision` thử 3 lần, hết lượt → `failed`) · DC-022 (rate limit theo email cho lệnh gửi / login, `otp/verify` theo IP) · DC-023 (1 dòng facade ở `core/src/index.ts`).
- `otp/request` purpose `reset` = gửi link đặt lại (cùng luồng `password/reset-request`), không gửi mã 6 số.
- Action `db: 'platform'`: nghiệp vụ commit DB nền tảng trước, rồi `action_log` / outbox / idempotency ở DB tenant (Blueprint §2.0 "nền tảng trước"); handler nền tảng phải idempotent theo input.
- `DevActorResolver` (DC-010) đã xoá; `AuthzContext` tạm lấy từ `ROLE_DEFS[role_key]` cho tới TIP-005.

**DEVIATIONS FROM SPEC:** không có.

**SUGGESTIONS FOR CHỦ THẦU:**
- Thêm "smoke bản build" vào D59 cổng chốt TIP cho TIP backend (bắt lỗi đóng gói như trên).
- TIP-011 nối FE: `features/auth/api.ts` đang gọi `/auth/password/reset-request` và đọc `needs_declare` từ `otp/verify` — backend trả `needs_declare` ở `GET /v1/me`; `GET /session` / `/session/ack` của mock không có ở backend (trial thuộc TIP-009).
