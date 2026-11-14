# TIP-004: Identity & auth

## HEADER
- TIP-ID: TIP-004
- Project: AppChat V2
- Module: `packages/db/prisma/platform/identity.prisma` · `packages/core/src/identity` · `apps/api/src/http/identity` · `packages/integrations` (port `mail`, `tax_lookup`)
- Depends on: TIP-003 (xếp chồng — nhánh tách từ `tip/003-action-kernel`)
- Priority: P0 · REQ: A01, A02 (tra MST + lưu khai báo), A03 (tạo workspace → provision), A04 (membership N–N, đổi workspace)
- Estimated effort: 14 giờ
- **Files touched:**
  - `packages/db/prisma/platform/identity.prisma` (điền) + migration `platform/migrations/<ts>_004_identity`; `packages/db/src/workspace-registry.ts` (adapter Prisma của port `WorkspaceRegistry` — DC-008).
  - `packages/core/src/identity/` — `services/{passwords,access-tokens,otp,refresh-tokens,auth,workspaces,memberships,invites,business-profile}.ts`, `actions/{profile-update,workspace-switch,business-profile-update}.handler.ts`, `jobs/{identity.jobs.module,tenant-provision.processor}.ts`, `identity.module.ts`, `mail-templates.ts`.
  - `packages/core/src/kernel/{rate-limit.ts, actions/executor.ts (db:'platform'), actions/tip-owners.ts, kernel.module.ts (env JWT / mail / tax), tenant/tenant.providers.ts (registry Prisma)}`.
  - `packages/integrations/src/ports/{mail,tax-lookup}.ts`, `connectors/brevo/mail.ts`, `connectors/console-mail.ts`, `connectors/vietqr/tax-lookup.ts`, `connectors/mock-tax-lookup.ts`.
  - `apps/api/src/http/identity/{auth.controller,me.controller,workspaces.controller,business-lookup.controller,cookies}.ts` + `identity.http.module.ts`; `apps/api/src/http/kernel/request-actor.ts` (JWT + membership thay dev resolver — đóng nửa "actor" của DC-010).
  - Test: `packages/core/test/identity-unit.test.ts`, `apps/api/test/integration/{auth,workspaces}.test.ts` (+ cập nhật harness TIP-003 sang JWT thật).
- **Parallel-safe with:** sequential (005 dựa trên membership + AuthzContext)

## CONTEXT
- Blueprint §2.0 (vòng đời DB tenant), §2.2 `[P] platform/identity.prisma`, §4.1 (header), §4.2 (auth & phiên), §8 (auth flow, MailProvider Brevo, TaxLookupProvider VietQR), §9 (argon2id, JWT HS256, CSRF, rate-limit).
- Standards: `api/response-envelope.md`, `integrations/provider-ports.md`, `ops/observability-security.md` (§1.4 không log PII, §2.4 argon2id + hash token, §3.2 rate limit), `database/{tenant-db,indexing}.md`.
- FE đã có (mock): `apps/web/src/features/auth/api.ts` (`/auth/otp/request|verify`, `/auth/password/login|reset-request|reset`, `/auth/logout`), `features/onboarding` (`business_profile.update`, `/business-lookup/tax/:code`, provisioning). Nối FE là TIP-011.

## TASK
1. **Schema [P]:** `user` (email lưu chữ thường — DC-014), `otp_code`, `refresh_token`, `workspace` (+ cột registry `db_name/db_host/db_status/schema_version/provisioned_at/archived_at/archive_key`), `membership` (+ `delegations text[]`), `invite`, `business_profile`. Index theo Blueprint §2.2 + standards indexing (membership `(user_id, status) INCLUDE (workspace_id, role_key)`; otp `(email, purpose, created_at DESC)`; invite `(workspace_id, created_at DESC)` partial chưa nhận / chưa thu hồi).
2. **Mật khẩu & token:** argon2id (`node:crypto.argon2`, Node 24 — DC-015); access JWT HS256 15 phút (`JWT_SECRET` ≥ 32 byte, `kid` để xoay); refresh token ngẫu nhiên 32 byte, lưu `sha256`, xoay vòng theo `family_id`, **dùng lại token đã xoay → thu hồi cả family**; cookie `rt` HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; "Ghi nhớ" 30 ngày, không thì 1 ngày (DC-016).
3. **OTP email:** 6 số, lưu `sha256`, hạn 10 phút, sai 5 lần → khoá mã; rate limit 5 / 15 phút / email + 20 / giờ / IP (Redis) → `RATE_LIMITED` 429 + `Retry-After`; **luôn 204** kể cả email không tồn tại / đã có (chống dò). Mail qua port `MailProvider` (`console` dev — chỉ khi `NODE_ENV≠production`, `brevo` thật), template vi / en theo locale.
4. **Endpoint §4.2:** `POST /v1/auth/otp/request|otp/verify|password/login|password/set|password/reset-request|password/reset|refresh|logout|invite/accept`, `GET /v1/me`, `POST /v1/workspaces`, `GET /v1/workspaces/:id/provisioning`, `GET /v1/business-lookup/tax/:taxCode`. Quên mật khẩu: link 15 phút (`otp_code` purpose `reset`, token 32 byte), luôn 204.
5. **Tạo workspace:** ghi `workspace(db_status=provisioning, db_name=ws_<12 hex cuối>)` + membership owner → job `tenant.provision` (queue BullMQ `tenant`, worker ROLE=jobs, `jobId = ws` idempotent): `TenantProvisioner.provision` → `db_status=active`, `provisioned_at` → outbox `workspace.ready` trong DB tenant mới. Lỗi → `db_status` giữ provisioning, job retry back-off 3 lần, hết lượt → trả `failed` ở endpoint provisioning.
6. **Registry thật:** `PrismaWorkspaceRegistry` (packages/db) thay `MemoryWorkspaceRegistry` trong kernel khi có DB.
7. **Actor thật cho `/v1/actions`:** `JwtActorResolver` — Bearer access JWT → user; `X-Workspace-Id` → membership `active` (không có → 403 trước khi mở DB tenant); `AuthzContext` từ `ROLE_DEFS[role_key]` (TIP-005 thay bằng bảng `role` tenant + cache). Xoá `DevActorResolver`.
8. **Executor `db: 'platform'`** (Blueprint §3.2 bước 6): handler chạy trong transaction DB nền tảng; `action_log` + outbox + idempotency vẫn ghi DB tenant (sau, transaction riêng — "nền tảng trước").
9. **Handler:** `profile.update`, `workspace.switch` (kiểm membership đích), `business_profile.update` (DC-019: chuyển chủ từ 011 sang 004 — 011 chỉ nối FE). `InviteService.create / accept / revoke` cho TIP-013 dùng (handler `member.invite` / `invite.revoke` vẫn thuộc 013).
10. **Tra MST:** port `TaxLookupProvider` — `vietqr` (`https://api.vietqr.io/v2/business/:taxCode`, timeout 5 s) và `mock` (fixture); MST sai định dạng → 422; không thấy / provider lỗi → 404 (UI nhập tay — D35).

## SPECIFICATIONS
### Business Rules
- Đăng ký: `otp/request(register)` chỉ gửi mã khi email **chưa** có user; `login` / `reset` chỉ gửi khi **đã** có. Phản hồi luôn 204.
- `otp/verify(register)` tạo user (`email_verified_at`), trả `{ access_token, user, needs_password: true, needs_declare: true }` + cookie. `login` trả `needs_password = !password_hash`. `needs_declare` = user chưa có workspace active nào đã khai báo `business_profile` (thêm cho FE — mở rộng tương thích ngược).
- `password/login` sai email hoặc mật khẩu → cùng 401 `UNAUTHENTICATED` (không lộ email nào tồn tại); có rate limit như OTP.
- `password/set` cần access token; `password/reset` đổi mật khẩu + **thu hồi mọi refresh token** của user.
- `invite/accept { token }` (cần access token; email của user phải trùng email mời; hạn 7 ngày) → membership `active` với `role_key` của lời mời; mời đã nhận / thu hồi / hết hạn → 409 / 410 → dùng `CONFLICT` 409.
- `GET /v1/me` → `{ user, workspaces: [{ id, name, role, db_status, plan: null, trial_ends_at: null }] }` (plan / trial do TIP-009 điền).
- Log không chứa email / OTP / token / mật khẩu (redact + không log body auth).

### Validation & Error Handling
- Body sai → 422 `VALIDATION_FAILED` + `fields`. Thiếu / sai access token → 401. Workspace không phải thành viên → 403. Workspace đang provisioning → 503 `WORKSPACE_UNAVAILABLE` (resolver TIP-002).

## ACCEPTANCE CRITERIA
1. Migration platform 004 áp được trên DB thật (`db:setup` idempotent), index đúng như Task 1; `EXPLAIN` lookup membership dùng Index Only Scan.
2. Đăng ký trọn vẹn: `otp/request(register)` → mã ở mail console (test bắt) → `otp/verify` → 200 + access token + cookie `rt` đúng thuộc tính; mã sai 5 lần → mã khoá (đúng mã sau đó vẫn 401); mã hết hạn → 401.
3. Chống dò: `otp/request` với email chưa có (login / reset) và đã có (register) → 204, **không** gửi mail.
4. Rate limit: lần thứ 6 trong 15 phút cùng email → 429 `RATE_LIMITED` + `Retry-After`.
5. Mật khẩu: `password/set` → `password/login` đúng → 200; sai → 401 cùng thông báo với email không tồn tại; hash trong DB là `$argon2id$`.
6. Refresh: xoay vòng trả token mới; dùng lại token cũ → 401 + cả family bị thu hồi (token mới nhất cũng hết dùng); logout → thu hồi + xoá cookie; quên mật khẩu → link 15 phút → đặt lại → refresh cũ bị thu hồi.
7. `POST /v1/workspaces` → 201 + workspace provisioning; job `tenant.provision` (worker thật trên BullMQ / Memurai) tạo `ws_*` → `active`; endpoint provisioning `running` → `ready`; outbox `workspace.ready` trong DB tenant.
8. `/v1/actions` dùng JWT thật: không token → 401; workspace không phải thành viên → 403 trước khi mở DB tenant; vai trò lấy từ `membership.role_key`. Bộ integration TIP-003 xanh với JWT thật.
9. `profile.update` (db platform) đổi `user`, `action_log` ghi DB tenant; `workspace.switch` sang workspace không phải thành viên → 403; `business_profile.update` lưu + `declared_at`, `needs_declare` thành false.
10. Invite: tạo (service) → accept bằng đúng email → membership active; email khác → 403; token đã dùng / hết hạn → 409.
11. Tra MST: mock trả dữ liệu; MST sai định dạng → 422; không thấy → 404.
12. Log của luồng OTP / login không chứa email, mã OTP, token (bắt output logger).
13. Cổng D59 xanh.

## CONSTRAINTS
- Không thêm thư viện: argon2id + HS256 bằng `node:crypto` (DC-015); cookie tự parse.
- Không đổi schema action trong `packages/actions`. Mã lỗi dùng mã có sẵn.
- `MemoryWorkspaceRegistry` giữ lại cho test.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 13 AC có test thật (Postgres + Memurai)
- [ ] Cổng D59 trước commit + chốt TIP
- [ ] Commit + SHA + report + ba sổ + tiến độ
