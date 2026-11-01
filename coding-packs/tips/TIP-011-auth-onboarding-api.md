# TIP-011: Auth & onboarding — nối API cho màn đã có

## HEADER
- TIP-ID: TIP-011
- Project: AppChat V2
- Module: `apps/api/src/http/identity` · `packages/core/src/identity` · `packages/shared/src/api/identity.ts` · `apps/web/src/{shared/api,features/auth,features/onboarding}` · `apps/web/e2e/http`
- Depends on: TIP-004 (auth, workspace, provisioning), TIP-009 (trial khi khai báo) — nhánh xếp chồng từ `tip/009-billing-core`
- Priority: P0 · REQ: A01 (đăng nhập / đăng ký OTP, quên mật khẩu), A02 (khai báo DN), A04 (đổi workspace), A06 (trial 15 ngày)
- Estimated effort: 12 giờ
- **Files touched:**
  - Shared: `packages/shared/src/api/identity.ts` (`sessionSchema`, `meSchema`, `authBrandSchema`, `provisioningSchema`), `packages/shared/src/identity/{brand.ts, workspace-kind.ts}`.
  - DB: `platform/identity.prisma` — `membership.notices_seen text[]` (thông báo trial đã xem, theo người × workspace) + migration `platform/migrations/<ts>_011_onboarding`.
  - Core: `identity/services/session.service.ts` (ack thông báo, workspace đầu tiên), `identity/actions/onboarding-toggle-step.handler.ts`, `business-profile-update.handler.ts` (khai báo lần đầu đặt tên workspace = tên pháp lý), `billing/services/billing-read.service.ts` (`trialState`, `kind` của workspace), `identity/identity.env.ts` (+ `MAIL_CONSOLE_DIR` — dev / test, cấm production).
  - Action: `packages/actions/src/dashboard.ts` — `onboarding.toggle_step` thêm `db: 'platform'` (schema input / output giữ nguyên).
  - API: `apps/api/src/http/identity/{session.controller.ts, auth.controller.ts, workspaces.controller.ts}` — `GET /v1/session`, `POST /v1/session/ack`, `GET /v1/workspace/provisioning`, `GET /v1/auth/brand`; đăng nhập / xác thực xong tự tạo workspace đầu tiên nếu user chưa có.
  - Web: `apps/web/src/shared/api/http-transport.ts` (access token trong bộ nhớ, refresh một lần khi 401, `X-Workspace-Id` theo phiên), `next.config.ts` (rewrite `/api/*` → API khi `http`), `features/auth/api.ts` (phiên đặt workspace header).
  - Test: `apps/api/test/integration/onboarding.test.ts`, `apps/web/src/shared/api/mock/identity-shape.test.ts`, `tools/contract/src/cases.ts` (+ `onboarding.toggle_step`), `apps/web/e2e/http/auth-onboarding.spec.ts` + `apps/web/playwright.http.config.ts` + `tools/scripts/e2e-http.mjs`.
- **Parallel-safe with:** 012, 013

## CONTEXT
- Blueprint §4.2 (auth & phiên), §8 Auth flow: đăng ký OTP → tạo workspace → khai báo bắt buộc → trial + 10.000 credit → chào mừng → `/dashboard`; access token chỉ trong bộ nhớ web, refresh token cookie httpOnly; 401 → refresh một lần rồi thử lại.
- FE mock (`shared/api/mock/{routes,auth-routes}.ts`): `GET /session` `{ authed, declared, trialSeen, expiredSeen, trialDaysLeft, provisioned, trialEndsAt }`, `GET /auth/brand`, `GET /workspace/provisioning` `{ status }`, `POST /session/ack { notice }`; `GET /me` `{ user{ id, name, initial, phone, title, locale, email }, workspaces[{ id, name, initial, kind, plan, color }], current_workspace_id, billing }`.
- OnboardingGate (prototype L9555–9560): chưa đăng nhập → `/login`; chưa khai báo → popup khai báo; đang khởi tạo → ProvisioningCard; xong → chào mừng trial (một lần); trial hết → thông báo (đóng được).

## TASK
1. **Phiên `GET /v1/session`** (public): không token / token sai → `{ authed: false, … }` (200, không 401 — cổng FE tự chuyển `/login`). Có token: workspace đang dùng (`/me.current_workspace_id`) → `declared` (có business_profile), `provisioned` (DB tenant `active` **và** đã có subscription — trial do consumer `billing.trial` tạo bất đồng bộ), `trialDaysLeft`, `trialEndsAt` (ms), `trialSeen` / `expiredSeen` (`membership.notices_seen`), `workspace_id`.
2. **`POST /v1/session/ack { notice: 'trial_welcome' | 'trial_expired' }`** → 204, ghi `notices_seen` (idempotent).
3. **Workspace đầu tiên:** xác thực OTP / đăng nhập xong mà user chưa có membership active → tạo workspace (tên = phần trước @ của email) + job `tenant.provision`; khai báo lần đầu đổi tên workspace thành tên pháp lý / họ tên.
4. **`GET /v1/workspace/provisioning`** (workspace đang dùng): `running` khi DB chưa `active` hoặc chưa có subscription, `failed` khi job hết lượt, còn lại `ready`.
5. **`GET /v1/auth/brand`** (public): nội dung khung giới thiệu màn đăng nhập (cấu hình shared).
6. **`/v1/me`**: thêm `user.initial`, `user.title` (tên vai trò ở workspace đang dùng), `phone` chuỗi; mỗi workspace `initial`, `kind` (`personal | team | business` theo gói), `color` (theo kind), `plan` (tên gói, chưa có → '').
7. **`onboarding.toggle_step`** (handler, `db: 'platform'`): lưu `workspace.settings.onboarding_steps[step]`, trả `done_count`.
8. **FE http:** transport giữ access token trong bộ nhớ (lấy từ `/auth/otp/verify`, `/auth/password/login`, `/auth/refresh`), lần đầu / gặp 401 → `POST /auth/refresh` một lần rồi gọi lại; đăng xuất xoá token; `X-Workspace-Id` = `session.workspace_id`, đổi khi `workspace.switch` thành công. Next rewrite `/api/:path*` → `API_URL` (mặc định `http://localhost:4000`) khi `NEXT_PUBLIC_API_MODE=http`.
9. **E2E http:** đăng ký thật (OTP đọc từ thư dev `MAIL_CONSOLE_DIR`) → khai báo (tra MST mock) → khởi tạo (worker thật) → chào mừng trial 15 ngày → vào app; đăng xuất → đăng nhập OTP lại vào thẳng app; quên mật khẩu → link → đặt lại → đăng nhập mật khẩu.

## SPECIFICATIONS
- Không đổi schema input / output action. Auth ngoài Action Registry (Blueprint §4.2).
- Thư dev ra file chỉ khi `MAIL_PROVIDER=console` và `MAIL_CONSOLE_DIR` có giá trị; production cấm (env validate).
- `trialDaysLeft` = ngày còn lại khi `trialing`, 0 khi khác; `expiredSeen` = đã ack **hoặc** workspace không ở trạng thái "hết trial về gói Miễn phí" (gói trả phí không bị nhắc).

## ACCEPTANCE CRITERIA
1. Migration 011 thêm `membership.notices_seen` (mặc định rỗng).
2. Đăng ký OTP → verify → user có workspace `provisioning` (current); `/session` `authed:true, declared:false`; không token → `authed:false` 200.
3. Khai báo (`business_profile.update`) → workspace đổi tên theo tên pháp lý; `/workspace/provisioning` `running` tới khi DB active + trial; rồi `ready`; `/session` `declared, provisioned, trialDaysLeft 15, trialEndsAt = +15 ngày`.
4. `/session/ack trial_welcome` → `trialSeen:true` (gọi lại không lỗi); sai notice → 422.
5. Hết trial (đồng hồ +16 ngày, scheduler) → `trialDaysLeft 0`, `expiredSeen:false`; ack → true. Gói trả phí → `expiredSeen:true` không cần ack.
6. `/me` đúng `meSchema` (initial, title, kind, color, plan); `/session`, `/auth/brand`, `/workspace/provisioning` đúng schema dùng chung; mock FE parse cùng schema.
7. `onboarding.toggle_step` lưu theo workspace, `done_count` đúng; contract case xanh ở mock + HTTP.
8. Đăng nhập lại user đã có workspace không tạo workspace mới.
9. E2E http (desktop + mobile) luồng đăng ký → khai báo → trial → app, đăng nhập OTP, quên / đặt lại mật khẩu xanh; E2E mock `auth` + `onboarding` xanh.
10. Cổng D59 xanh (+ smoke bản build).

## CONSTRAINTS
- Không sửa màn / style FE (chỉ lớp api / transport). Không đổi luồng mock.
- Dashboard đọc bước onboarding đã lưu là TIP-038.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 10 AC có test thật
- [ ] Cổng D59 trước commit + chốt TIP
- [ ] Commit + SHA + report + ba sổ + tiến độ
