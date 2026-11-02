# TIP-004c — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `apps/api/src/http/identity/mail-webhook.controller.ts` | Webhook Brevo |
| M | `apps/api/src/http/identity/identity.http.module.ts` | Đăng ký |
| C | `packages/core/src/identity/services/mail-suppression.ts` | Suppression |
| M | `packages/core/src/identity/services/auth.service.ts` | Chặn gửi OTP tới địa chỉ bị chặn |
| M | `packages/db/prisma/platform/notify.prisma` | mail_suppression |
| C | `packages/db/prisma/platform/migrations/20261102006800_mail_suppression/migration.sql` | Bảng |
| C | `apps/api/test/integration/mail-webhook.test.ts` | Integration |
