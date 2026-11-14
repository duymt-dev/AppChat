# TIP-004b — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/db/prisma/platform/identity.prisma` | user_mfa (last_used_step), recovery codes, lockout theo (user, ip/device), refresh successor_ciphertext |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` | Hàng Bảo mật ẩn có mã |
| C | `packages/db/prisma/platform/migrations/20261102006200_account_security/migration.sql` | Bảng bảo mật |
| M | `packages/core/src/identity/services/sessions.service.ts` | Cửa sổ xoay 10 giây, successor mã hoá |
| M | `packages/core/src/identity/services/auth.service.ts` | Bước OTP + khoá |
| C | `packages/core/src/identity/services/totp.ts` | RFC 6238 |
| C | `packages/core/src/identity/services/mfa.service.ts` | Bật/tắt/xác minh |
| C | `packages/core/src/identity/actions/security-settings.handlers.ts` | Chính sách mật khẩu/khoá/bắt buộc 2FA |
| M | `packages/core/src/identity/identity.module.ts` | Đăng ký |
| M | `packages/actions/src/settings.ts` | security.update, mfa.enable/disable |
| M | `apps/api/src/http/identity/auth.controller.ts` | Bước OTP |
| M | `apps/api/src/http/identity/settings.controller.ts` | GET /settings/security |
| M | `apps/web/src/features/settings/registry.ts` | Mục Bảo mật |
| C | `apps/web/src/features/settings/components/SecuritySection.tsx` | UI bảo mật |
| C | `apps/web/src/features/settings/components/MfaSetupModal.tsx` | Bật 2FA |
| M | `apps/web/src/features/auth/screens/LoginScreen.tsx` | Bước OTP |
| M | `apps/web/src/features/settings/api.ts` | securityQuery |
| M | `apps/web/src/shared/api/mock/domains/settings-apps.ts` | Mock bảo mật |
| M | `apps/web/messages/vi/settings.json` | Bảo mật |
| M | `apps/web/messages/en/settings.json` | Security |
| M | `apps/web/messages/vi/auth.json` | OTP |
| M | `apps/web/messages/en/auth.json` | OTP |
| M | `tools/parity/parity.manifest.ts` | settings:security |
| C | `packages/core/test/totp.test.ts` | Vector RFC 6238 |
| C | `apps/api/test/integration/auth-security.test.ts` | 2FA/khoá |
| C | `apps/api/test/integration/auth-refresh-race.test.ts` | Nhiều tab |
| C | `apps/web/e2e/settings-security.spec.ts` | E2E |
