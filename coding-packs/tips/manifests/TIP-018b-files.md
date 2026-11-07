# TIP-018b — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/channels/src/email/imap-transport.ts` | XOAUTH2 |
| C | `packages/channels/src/email/oauth.ts` | PKCE + refresh |
| M | `packages/core/src/channels/email/credentials.ts` | Lưu refresh token |
| M | `packages/core/src/channels/email/email.handlers.ts` | Nhánh OAuth |
| M | `apps/api/src/http/channels/channels.controller.ts` | start/callback |
| M | `apps/web/src/features/settings/components/EmailConnectStep.tsx` | Nút OAuth |
| M | `apps/web/messages/vi/settings.json` | Chuỗi |
| M | `apps/web/messages/en/settings.json` | Strings |
| C | `packages/channels/test/email-oauth.test.ts` | Unit |
| C | `apps/api/test/integration/email-oauth.test.ts` | OAuth giả |
