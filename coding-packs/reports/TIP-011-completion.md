### COMPLETION REPORT — TIP-011

**STATUS:** DONE
**COMMIT:** `31cc35f` (code) trên nhánh `tip/011-auth-onboarding-api` (xếp chồng trên `tip/009-billing-core`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - `packages/db/prisma/platform/migrations/20261030140000_011_onboarding` (`membership.notices_seen text[]`).
  - Shared: `packages/shared/src/api/identity.ts` (`sessionSchema`, `meSchema`, `authBrandSchema`, `provisioningSchema`), `packages/shared/src/identity/{brand.ts, workspace-kind.ts, index.ts}`.
  - Core: `packages/core/src/identity/actions/onboarding-toggle-step.handler.ts`.
  - API: `apps/api/src/http/identity/{session.controller.ts (GET /session, POST /session/ack, GET /workspace/provisioning, GET /auth/brand), me.view.ts}`.
  - Web: `apps/web/playwright.http.config.ts`, `apps/web/e2e/http/auth-onboarding.spec.ts`, `apps/web/src/shared/api/mock/identity-shape.test.ts`.
  - Tools: `tools/scripts/e2e-http.mjs` (`pnpm e2e:http`).
  - Test: `apps/api/test/integration/onboarding.test.ts` (8).
- Modified: `packages/db/{prisma/platform/identity.prisma, src/tenant-resolver.ts (chỉ cache workspace active — DC-040), test/resolver.test.ts}`, `packages/actions/src/dashboard.ts` (`onboarding.toggle_step` + `db: 'platform'`), `packages/core/src/identity/{identity.env.ts (MAIL_CONSOLE_DIR), identity.module.ts, services/workspaces.service.ts (ensureFirst, onboarding, ackNotice), actions/business-profile-update.handler.ts (đổi tên workspace tự tạo)}`, `packages/core/src/billing/services/billing-read.service.ts` (`trialState`, plan key / segment cho `/me`), `apps/api/src/http/identity/{auth.controller.ts (workspace đầu tiên + needs_declare), workspaces.controller.ts, identity.http.module.ts}`, `apps/web/{next.config.ts (rewrites http, distDir), playwright.config.ts (bỏ e2e/http), eslint.config.mjs, src/shared/api/http-transport.ts, src/features/auth/hooks/useAuthFlow.ts, src/features/onboarding/hooks/useDeclareForm.ts}`, `tools/contract/src/cases.ts`, `.env.example`, `.gitignore`, `.dependency-cruiser.cjs`, `package.json`, `coding-packs/{DECISIONS.md, plans/BLUEPRINT.md §4.2}`.

**TEST RESULTS:**
- Acceptance criteria: 10/10 pass
  1. Migration 011: `membership.notices_seen` mặc định `ARRAY[]` — **pass**
  2. Verify OTP đăng ký → 1 workspace `provisioning` (tên theo email, owner, đang dùng), `needs_declare:true`; `/session` `authed:true, declared:false`; không token / token sai → `authed:false` 200 — **pass**
  3. Khai báo → workspace đổi tên "CÔNG TY TNHH MEDIASOFT"; `/workspace/provisioning` `running` → `ready` (worker thật: DB active + consumer trial); `/session` `declared, provisioned, trialDaysLeft 15, trialEndsAt 2026-11-14T08:00Z, expiredSeen true` — **pass**
  4. `/session/ack trial_welcome` 204 (2 lần, lưu một lần) → `trialSeen`; notice sai 422; không token 401 — **pass**
  5. Đồng hồ +16 ngày + scheduler → `trialDaysLeft 0, expiredSeen false` → ack → true; lên gói Team → không nhắc, `/me` kind `team` màu `#0E9B7E` — **pass**
  6. `/me` khớp `meSchema` (initial, title "Chủ sở hữu", phone '', kind / color / plan "Cá nhân Pro"); `/auth/brand` vi / en; mock FE parse cùng 4 schema (4 ca) — **pass**
  7. `onboarding.toggle_step` → `done_count` 1 / 2 / 1, lưu `workspace.settings.onboarding_steps`; contract case mock + HTTP xanh — **pass**
  8. Đăng nhập OTP lại: không tạo workspace mới, `needs_declare:false` — **pass**
  9. E2E http (`pnpm e2e:http`, api + worker bản build thật) desktop + mobile-390: đăng ký → khai báo → khởi tạo → chào mừng trial 15 ngày → vào app → tải lại (refresh cookie) → đăng xuất → đăng nhập OTP; quên mật khẩu → link → đặt lại → đăng nhập mật khẩu; OTP sai → **6 passed · 0 failed**, 2 lượt liên tiếp. E2E mock `auth` + `onboarding` xanh trong full hồi quy — **pass**
  10. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (shared · core · db · api · worker · web · actions · contract) 24/24 task; `pnpm depcheck` xanh (99 known); `lint:size` 1055 file.
- **Cổng "chốt TIP":** `pnpm lint` 13/13 · `pnpm typecheck` 13/13 · `pnpm test` 13/13 task, 0 failed · `db test:integration` 7 passed · `api test:integration` **77 passed** (onboarding 8 · billing 9 · notify 6 · realtime 5 · authz 9 · auth 11 · workspaces 10 · actions 13 · relay-sequence 3 · contract 3) · `pnpm depcheck` xanh · `pnpm i18n:check` 100% (4471 key) · `pnpm build` 3/3 · smoke bản build: api health 200, `/v1/session` không token → `authed:false`, `/v1/auth/brand` 200, `/v1/workspace/provisioning` không token 401; worker `ROLE=jobs` khởi động sạch · E2E http 6/6 (×2) · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (2.9m). Parity: N/A — TIP không đổi giao diện (chỉ lớp api / transport).

**ISSUES DISCOVERED:**
- `TenantDbResolver` cache trạng thái `provisioning` 60s → API trả 503 tới một phút sau khi worker đã đặt `active` (lộ ra ở E2E http đăng ký) → chỉ cache `active` (DC-040, thêm unit test).
- Khai báo gửi khi DB tenant còn khởi tạo (< 2 s sau đăng ký) → 503 `WORKSPACE_UNAVAILABLE`; popup khai báo thử lại mỗi giây (tối đa 20 lần), không đổi UI.
- Sau đăng nhập, cổng onboarding đọc phiên cũ `authed:false` khi refetch → đẩy về /login (mobile) → `useEnterApp` refetch phiên trước khi chuyển trang.
- Lượt full E2E mock đầu: config mock nhặt cả `e2e/http/` (6 ca đỏ vì không có backend) → `testIgnore: ['**/http/**']`; chạy lại 222 / 0.
- Realtime `/ws` ở FE chế độ http chưa nối (FE mới phát qua mock) — TIP-013 / 016.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-035 (bước checklist ở `workspace.settings`), DC-036 (workspace đầu tiên khi đăng nhập, đổi tên lúc khai báo), DC-037 (`GET /v1/session`), DC-038 (`/me` kind / color theo gói), DC-039 (token bộ nhớ + refresh + rewrite), DC-040 (cache resolver), DC-041 (`pnpm e2e:http`).

**DEVIATIONS FROM SPEC:** không có (`onboarding.toggle_step` thêm `db: 'platform'` — metadata thực thi, schema input / output giữ nguyên; ghi DC-035).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-013: nối Cài đặt sang http, kiểm bằng `pnpm e2e:http <spec>`; nối socket `/ws` ở FE (token trong bộ nhớ của transport).
- TIP-038: Dashboard đọc `workspace.settings.onboarding_steps`.
- CI: job `e2e-http` cần Postgres + Redis (Q-008).

## Bổ sung — TIP-011b (2026-11-02)

Nghĩa vụ chưa đạt của TIP này chuyển sang [TIP-011b](../tips/TIP-011b-industry-taxonomy.md): REQ-A02d. File TIP gốc không sửa (DC-233).
