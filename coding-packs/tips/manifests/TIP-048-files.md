# TIP-048 — exact file manifest

M = sửa, C = tạo mới. Mọi path M đã có trên `origin/dev`. `.env.example`: 047 (ghép trước) đã thêm `ZALO_APP_ID` / `ZALO_APP_SECRET` theo DC-909 d; 035d thêm khối Worktree.
File prisma mới `tenant/oauth-grants.prisma` (chủ 048). Không sửa file của 047 / 047b / 047c / 047d.
Thêm ngoài danh sách gốc (brief §4): đăng ký chung (`kernel/index.ts`, `shared/api/index.ts`, mock `handlers.ts`, catalog Trợ lý), topic outbox (`events.ts`, `aggregate.ts`, test protocol), nhãn action / lỗi FE (`actions.json`, `common.json`), `redact.ts`, trang relay popup `/oauth/return`.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/channels/src/oauth.ts` | Hợp đồng `TokenSet` · `OAuthAccount` · `OAuthClient` · `OAuthProviderError` (dùng chung kênh / ZCC / sàn) |
| C | `packages/channels/src/zalo-oa/oauth.ts` | Zalo OA OAuth v4: authorize + PKCE, exchange (`secret_key`), `getoa` lấy subject, refresh dùng một lần, ánh xạ lỗi, transport `fake` |
| C | `packages/channels/test/zalo-oa-oauth.test.ts` | AC2: URL, PKCE, form, hạn, subject, ánh xạ lỗi, không lộ token |
| M | `packages/channels/src/index.ts` | Export hợp đồng + `createZaloOaOAuthClient` |
| C | `packages/db/prisma/tenant/oauth-grants.prisma` | Model `OAuthGrant` + enum `oauth_grant_status`; dòng đầu sở hữu TIP-048 |
| C | `packages/db/prisma/tenant/migrations/20261115100000_oauth_grants/migration.sql` | Bảng + enum + CHECK + unique(provider, subject) + partial (status, access_expires_at) WHERE status = 'active' |
| M | `packages/db/test/prisma-stubs.test.ts` | OWNERS `'oauth-grants': '048'`; tổng file +1 |
| C | `packages/core/src/kernel/oauth/token-vault.ts` | `upsert` / `access` / `refreshNow` / `info`; khoá Redis + `FOR UPDATE`, transaction riêng, nhật ký cứu hộ, `invalid_grant` → `revoked` + outbox |
| C | `packages/core/src/kernel/oauth/oauth-state.ts` | Verifier + challenge S256, state ký HMAC, nonce Redis 10 phút dùng một lần, kiểm `return_to` |
| C | `packages/core/src/kernel/oauth/pending-connect.ts` | Kết quả exchange chờ chọn (Redis 15 phút, token mã hoá, chỉ người tạo đọc): `create` / `get` / `take` / `drop` |
| C | `packages/core/src/kernel/oauth/providers.ts` | `registerOAuthProvider` / `providerFor` / `permissionFor`; đăng ký `zalo_oa` (channel, grant) |
| C | `packages/core/src/kernel/oauth/oauth.handlers.ts` | Handler `oauth.start` / `complete` / `pending_get` / `cancel`; `OAuthCallbackService` |
| C | `packages/core/src/kernel/oauth/oauth-refresh.processor.ts` | Job `oauth-refresh`: grant sắp hết hạn + `refresh_failed` quá backoff, metric |
| C | `packages/core/src/kernel/oauth/oauth.module.ts` | Module Nest + env zod (`OAUTH_STATE_SECRET`, `HOOKS_PUBLIC_URL`, `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_OA_TRANSPORT`), guard production cấm `fake` |
| C | `packages/core/src/kernel/oauth/oauth.jobs.module.ts` | Queue + lịch 5 phút `oauth-refresh` (ROLE=jobs) |
| M | `packages/core/src/kernel/kernel.module.ts` | Import `OAuthModule` |
| M | `packages/core/src/kernel/index.ts` | Export `OAuthModule`, `OAuthJobsModule`, `TokenVault`, `PendingConnect`, `registerOAuthProvider`, `providerFor`, `OAuthCallbackService` |
| C | `packages/core/test/token-vault.test.ts` | AC6–8 unit: một lần refresh khi tranh chấp, lỗi tạm thời, `invalid_grant`, nhật ký cứu hộ |
| C | `packages/core/test/oauth-state.test.ts` | AC3: HMAC sai, provider lệch, hết hạn, dùng lại, `return_to` không hợp lệ, verifier không trên URL |
| M | `apps/worker/src/roles/jobs.module.ts` | `OAuthJobsModule` vào `JOBS_EXTRA` |
| C | `packages/actions/src/oauth.ts` | `oauth.start` · `oauth.complete` (internal) · `oauth.pending_get` · `oauth.cancel`; `PURPOSE_PERMISSION` |
| M | `packages/actions/src/index.ts` | Import / đăng ký `oauth.ts` |
| M | `packages/core/src/ai/assistant/catalog.ts` | `SYSTEM_ONLY` thêm `oauth.complete` |
| C | `packages/shared/src/api/oauth.ts` | Zod `OAUTH_PURPOSES`, `OAUTH_ERROR_CODES`, `oauthStartOutputSchema`, `oauthPendingSchema` |
| M | `packages/shared/src/api/index.ts` | Export `oauth.ts` |
| M | `packages/shared/src/events.ts` | EVENT_SCHEMAS `oauth.grant_revoked` `{ grant_id, provider }` |
| M | `packages/shared/src/events/protocol/aggregate.ts` | `by('oauth_grant', 'grant_id')` |
| M | `packages/shared/test/event-protocol.test.ts` | Topic mới khớp registry + aggregate |
| M | `packages/shared/src/log/redact.ts` | Khoá `access_token`, `refresh_token`, `code_verifier`, `secret_key`, `client_secret` (nếu chưa phủ) |
| M | `packages/shared/src/i18n/server/vi/channels.ts` | Lỗi `oauth_state_invalid`, `oauth_denied`, `oauth_exchange_failed`, `grant_revoked`, `provider_rate_limited`, `oauth_not_configured` |
| M | `packages/shared/src/i18n/server/en/channels.ts` | Như trên (en) |
| C | `apps/api/src/http/kernel/oauth.controller.ts` | `GET /hooks/oauth/:provider/callback` → `OAuthCallbackService` → 302; `no-store`, `no-referrer`; không ghi DB |
| M | `apps/api/src/http/kernel/kernel.http.module.ts` | Đăng ký `OAuthController` |
| C | `apps/api/test/integration/oauth.test.ts` | AC1, AC3–7, AC9–10, AC12: luồng fake đầy đủ, quyền theo purpose, tranh chấp refresh, revoked + outbox, job, log, cô lập workspace |
| C | `apps/web/src/shared/oauth/useOAuthConnect.ts` | Hook dùng chung: popup đồng bộ / chuyển trang, `BroadcastChannel`, `pending_get`, `cancel`, xoá tham số `oauth*` |
| C | `apps/web/src/shared/oauth/useOAuthConnect.test.tsx` | AC11 |
| C | `apps/web/src/shared/oauth/OAuthReturnRelay.tsx` | Trang relay popup: phát kết quả qua `BroadcastChannel` (dự phòng `postMessage` cùng origin) rồi đóng cửa sổ |
| C | `apps/web/src/app/(public)/oauth/return/page.tsx` | Route `/oauth/return` (chỉ routing) → `OAuthReturnRelay` |
| C | `apps/web/src/shared/api/mock/domains/oauth.ts` | Mock `oauth.start` / `pending_get` / `cancel` |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Đăng ký `oauthHandlers` |
| M | `apps/web/messages/vi/actions.json` | `oauth.start` / `complete` / `pending_get` / `cancel` `.title` |
| M | `apps/web/messages/en/actions.json` | Như trên (en) |
| M | `apps/web/messages/vi/common.json` | `oauth.error.*` + câu "Đã xong, bạn có thể đóng cửa sổ này" |
| M | `apps/web/messages/en/common.json` | Như trên (en) |
| M | `.env.example` | `OAUTH_STATE_SECRET`, `HOOKS_PUBLIC_URL`, `ZALO_OA_TRANSPORT`; chú thích `ZALO_APP_ID` / `ZALO_APP_SECRET` dùng chung kênh OA + ZCC (thêm nếu 047 chưa có) |
