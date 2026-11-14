# TIP-048 — OAuth + kho token dùng chung: `oauth_grant`, `TokenVault`, callback `/hooks/oauth` (Kênh, D62)

## HEADER
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 048 before051.
- **Parallel-safe with TIP-051c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 048 before051c.
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/events/protocol/aggregate.ts`, `packages/shared/test/event-protocol.test.ts`; integrate 048 before049.
- **Parallel-safe with TIP-049b (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048 before049b.
- **Parallel-safe with TIP-049c (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048 before049c.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`; integrate 048 before049d.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before048.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 015c before048.
- **Parallel-safe with TIP-045 (coverage-closure manifest):** sequential, shares `packages/core/src/kernel/kernel.module.ts`; integrate 048 before045.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before048.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `packages/db/test/prisma-stubs.test.ts`; integrate 047b before048.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/events/protocol/aggregate.ts`, `packages/shared/test/event-protocol.test.ts`; integrate 048 before047c.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/common.json`, `apps/web/messages/vi/common.json`, `apps/web/src/shared/api/mock/handlers.ts`; integrate 048 before047d.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `.env.example`, `packages/actions/src/index.ts`, `packages/channels/src/index.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048 before048b.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`; integrate 048 before048c.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/index.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048 before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/index.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048 before048e.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `.env.example`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048 before048h.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `apps/worker/src/roles/jobs.module.ts`, `packages/core/src/kernel/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/events/protocol/aggregate.ts`, `packages/shared/test/event-protocol.test.ts`; integrate 003b before048.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/kernel/index.ts`; integrate 003c before048.
- **Parallel-safe with TIP-003d (coverage-closure manifest):** sequential, shares `apps/api/src/http/kernel/kernel.http.module.ts`; integrate 003d before048.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before048.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/common.json`, `apps/web/messages/vi/common.json`; integrate 003f before048.
- **Parallel-safe with TIP-006b (coverage-closure manifest):** sequential, shares `apps/worker/src/roles/jobs.module.ts`; integrate 006b before048.
- **Parallel-safe with TIP-006c (coverage-closure manifest):** sequential, shares `packages/shared/src/events.ts`; integrate 006c before048.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before048.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 012b before048.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 012c before048.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 013c before048.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/channels/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 014b before048.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 015b before048.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/kernel/kernel.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 015d before048.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/kernel/kernel.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 015e before048.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/kernel/kernel.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 015f before048.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 019b before048.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/db/test/prisma-stubs.test.ts`, `packages/shared/src/api/index.ts`; integrate 019c before048.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 020b before048.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `packages/shared/src/api/index.ts`; integrate 020d before048.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 020e before048.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 022b before048.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/kernel/kernel.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 023b before048.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/api/src/http/kernel/kernel.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/common.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/common.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/kernel/kernel.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 023c before048.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 023d before048.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 023e before048.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/channels/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 023f before048.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `packages/shared/src/api/index.ts`; integrate 023g before048.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 025b before048.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 026b before048.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/common.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/common.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 026c before048.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 027b before048.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 030b before048.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/log/redact.ts`; integrate 030c before048.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 031b before048.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 032b before048.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`; integrate 032c before048.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 032d before048.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 032e before048.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 033b before048.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 033c before048.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 034b before048.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 034c before048.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 034d before048.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 036 before048.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 037 before048.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 038 before048.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 038b before048.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 039 before048.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 040 before048.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 041 before048.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 042 before048.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 042b before048.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 043 before048.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/api/src/http/kernel/kernel.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/channels/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/kernel/kernel.module.ts`, `packages/shared/src/api/index.ts`; integrate 045b before048.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/db/test/prisma-stubs.test.ts`; integrate 048 before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`; integrate 048 before048g.
- **TIP-ID:** TIP-048 · **Project:** AppChat V2 · **Module:** Kernel OAuth + kho token (dùng chung kênh, Gọi điện ZCC, sàn) · **Priority:** P0 · **Estimated:** M
- **Depends on:** 047b, 015c và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 047c, 047d, 048b, 048c, 048d, 048e, 048h, 049, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - **Refresh token dùng một lần.** Zalo OAuth v4: refresh 3 tháng, dùng một lần; cấp cặp mới thì access cũ mất hiệu lực ngay. Shopee (049b) cũng vậy. 047c (ZCC) và 048d (kênh OA) dùng chung một App Zalo, chung token của cùng OA. Hai nơi tự làm mới sẽ vô hiệu token của nhau → kho token phải có trước cả hai (DC-909).
  - **047b:** tạo quyền `callcenter.manage` (purpose `grant`) và cột `call_line.oauth_grant_id` (DC-909 d). 048 ghép sau 047b, trước 047c / 047d:
    - 047c đọc token OA bằng `TokenVault.access`, không tự lưu `zcc_oa_token_enc`, không tự làm mới.
    - 047d nút "Uỷ quyền OA" dùng `useOAuthConnect`.
  - **015c:** cổng phân loại bảng tenant cho quyền riêng tư (bảng mới phải được khai). Chung file `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `actions.json`, `packages/shared/src/api/index.ts`, mock `handlers.ts`.
  - **TIP đứng sau dùng hợp đồng §1–§10:** 048b (chọn tài khoản kênh), 048c (UI kết nối), 048d (kênh OA), 048e (Meta), 048h (TikTok), 049 (sàn).
  - 035d (cô lập worktree) đứng trước 048 (chung `.env.example`). URL mới (`HOOKS_PUBLIC_URL`) theo luật đổi cổng của 035d.
- **Files touched:** [exact M/C manifest](manifests/TIP-048-files.md). File prisma mới `tenant/oauth-grants.prisma` (chủ 048). Route web công khai mới `/oauth/return` (relay popup). Không sửa file của 047 / 047b / 047c / 047d (§11); sửa có chủ đích file đăng ký chung (kernel, worker jobs, kernel http, actions index, topic outbox, catalog Trợ lý).
- **Quyết định nguồn:** D62 (#2 kết nối, #8 thứ tự) · DC-909 · DC-904 (mẫu callback / webhook → action nội bộ nguồn `system`) · Blueprint §2.2 (`oauth_grant`), §3.4 (action `oauth.*`), §4.7 (callback) · Q-909 (App Zalo).
- **Dòng COVERAGE nhận:** D62-oauth · BP-4.7-oauth · DC-909.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. DB tenant riêng mỗi workspace (`TenantDbResolver`): không `workspace_id`, không RLS. Ghi chỉ qua `ActionExecutor`.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Chưa có OAuth ở đâu:** không redirect / callback / state / PKCE. Kênh hiện có: Zalo cá nhân (QR), webchat, email (IMAP / SMTP). Connector dùng API key (`integration_connection.credentials_enc`).
  - **Mã hoá:** `packages/core/src/kernel/crypto.ts` (37 dòng) `encryptSecret` / `decryptSecret` AES-256-GCM. Mẫu ký HMAC: `webchat/visitor-token.ts` (~54 dòng, trong `packages/core/src/channels/` — kiểm path ở Rà). Kernel có `secret-vault`, `secret-fields` cho trường bí mật của action (`packages/core/src/index.ts` ~L5–6).
  - **Hooks:**
    - `apps/api/src/http/integrations/hooks.controller.ts` (24 dòng): `/hooks/integrations/:connector/:connectionId`.
    - `apps/api/src/http/kernel/prefix.ts` ~L8: `hooks/{*path}` bỏ tiền tố `/v1` cho mọi method → GET callback dùng được.
    - `api-rate-limit.guard.ts` ~L13 bỏ qua `/hooks/`. `apps/api/src/openapi/route-scan.ts` ~L25 / ~L27 ẩn `/hooks/`. `apps/api/src/bootstrap.ts` ~L15 rawBody.
  - **Mẫu callback ghi bí mật:** `packages/core/src/channels/email/email.handlers.ts` (97 dòng): verify → `encryptSecret` ~L61 → ghi tenant ~L67–87 → ghi nền tảng ~L89–92.
  - **Action hệ thống (003c):** `exposure: 'internal'` (`packages/actions/src/define.ts` ~L33), chạy bằng capability niêm phong của domain (`kernel/actions/system`). `SYSTEM_ONLY` ở `packages/core/src/ai/assistant/catalog.ts` ~L25. `defineAction` chỉ có `permission` tĩnh (`define.ts` ~L28).
  - **Outbox v2:** `withEventTransaction` (`kernel/outbox/transaction.ts` ~L47), `writeOutbox` (`kernel/outbox/outbox.ts` ~L20). Topic khai ở `packages/shared/src/events.ts` (EVENT_SCHEMAS) + `packages/shared/src/events/protocol/aggregate.ts`; test `packages/shared/test/event-protocol.test.ts`.
  - **Guard `fake` ở production:** `packages/core/src/channels/channels.env.ts` ~L29–34.
  - **Đăng ký module:** `packages/core/src/kernel/kernel.module.ts` (93 dòng); worker `apps/worker/src/roles/jobs.module.ts` (14 dòng, `JOBS_EXTRA`); API `apps/api/src/http/kernel/kernel.http.module.ts` (18 dòng).
  - **File gần trần:** `packages/actions/src/settings-apps.ts` 408 dòng → action OAuth ở file mới `packages/actions/src/oauth.ts`.
  - **Gọi điện (chưa code):** TIP-047 `ZccClient` nhận OA Access Token v4 do caller truyền vào. TIP-047b `call_line` theo DC-909 d có `oauth_grant_id` (thay `zcc_oa_token_enc`).
- **Key files to read first:** D62 #2, #8 · DC-909 · Blueprint §2.2 (`oauth_grant`), §3.4, §4.7 · `standards/ops/observability-security.md` §2–§5 · `standards/actions/action-registry.md` · `kernel/crypto.ts` · `email.handlers.ts` · `hooks.controller.ts` · `prefix.ts` · `channels.env.ts` · tài liệu Zalo OAuth v4 (developers.zalo.me).
- **Patterns to follow:**
  - Bí mật mã hoá bằng `encryptSecret` trước khi ghi DB / Redis. API không bao giờ trả token.
  - Callback / webhook → action nội bộ nguồn `system` (DC-904). Controller không ghi DB.
  - HTTP ra ngoài bằng `fetch` Node 24 + `AbortSignal.timeout`; ký / băm bằng `node:crypto`. Không thư viện OAuth.
  - Hàm thuần + port tiêm vào (store, khoá, Clock) để unit test; đồng hồ qua `Clock` của kernel.
  - Transport `fake` cho nền tảng (`<X>_TRANSPORT=fake`), production cấm `fake`.

## APPLICABLE STANDARDS
- [ops/observability-security](../standards/ops/observability-security.md) — §1.4 không log token / code; §2 AES-256-GCM qua kernel crypto, không trả bí mật; §3.3 kiểm chữ ký trước khi đọc dữ liệu; §5 test log + response.
- [actions/action-registry](../standards/actions/action-registry.md) — action-first, `description` cho LLM, preview cho risk `config`, ca test §12.
- [database/tenant-db](../standards/database/tenant-db.md) · [database/indexing](../standards/database/indexing.md) — bảng tenant không `workspace_id`; `provider` là `text` (loại mở rộng); index `=` trước, range sau, partial.
- [events/outbox](../standards/events/outbox.md) — `oauth.grant_revoked` cùng transaction, payload chỉ id.
- [domain/concurrency](../standards/domain/concurrency.md) — khoá Redis + `SELECT … FOR UPDATE`, `version`.
- [api/response-envelope](../standards/api/response-envelope.md) — `{ error: { code, message } }`; callback là ngoại lệ (302).
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — quyền theo purpose.
- [channels/omnichannel-adapter](../standards/channels/omnichannel-adapter.md) · [integrations/provider-ports](../standards/integrations/provider-ports.md) — hợp đồng client nền tảng, transport `fake`.
- [i18n/i18n](../standards/i18n/i18n.md) · [ui/frontend-structure](../standards/ui/frontend-structure.md) — hook dùng chung ở `shared/`, chuỗi vi + en.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase lên `origin/dev` mới nhất (047b, 015c, 035d đã merge).
   - `python -X utf8 tools/obligations/manifests.py 048`.
   - Kiểm lại mọi số dòng `~`. Lệch → sửa TIP, thêm dòng "Rà lại <ngày>".
   - Đọc lại D62, DC-909, Blueprint §2.2 / §3.4 / §4.7 bản mới nhất.
   - Dev có migration tenant mới hơn `20261115100000` → đổi mốc, ghi DV + DC mới (dải 9xx).
2. Kiểm 047 / 047b đã theo DC-909 d:
   - Env `ZALO_APP_ID` / `ZALO_APP_SECRET` (không còn `ZCC_APP_*`).
   - `call_line.oauth_grant_id` (không còn `zcc_oa_token_enc`).
   - Lệch → L2. Không tự sửa `packages/voice` / `callcenter.prisma`.
3. Kiểm executor / `defineAction`:
   - Action `exposure: 'internal'` chạy đồng bộ được từ controller HTTP với capability hệ thống của domain `oauth` không (003c).
   - Handler kiểm quyền theo input bằng API authz nào (`ctx`).
   - Tên quyền nền mọi thành viên có (như action tự phục vụ `profile.update` / `notification.mark_read`).
   - Action internal có bắt buộc nằm dưới `packages/actions/src/system/` không.
   - Không có đường nào ở trên → L2 kèm đề xuất. Không tự sửa `define.ts` / executor.
4. Kiểm bí mật trong log / `action_log`:
   - Cơ chế `secret-fields` cho input action (`code`, `code_verifier`).
   - `packages/shared/src/log/redact.ts` phủ khoá nào.
   - Log request có ghi query string không (callback mang `code`, `state`). Có → che theo cơ chế hiện có; file ngoài manifest → L2.
5. Kiểm hạ tầng: `encryptSecret` đã kèm `key_version` trong blob; Redis client của kernel + helper khoá có sẵn (`lease.ts` của channels hoặc kernel); Memurai hỗ trợ `GETDEL`; `.dependency-cruiser.cjs` cho `packages/core/src/kernel` import `@appchat/channels` (không cho → đăng ký `zalo_oa` ở chỗ được phép, báo L2 nếu ngoài manifest).
6. Đọc lại tài liệu Zalo OAuth v4 bản mới:
   - Tham số URL `permission`; `code_challenge` (S256, base64 hay base64url, có bỏ `=`).
   - Callback trả `code`, `oa_id`, `state`; người dùng từ chối trả gì.
   - Body `access_token` (`expires_in` là chuỗi?), hạn refresh (3 tháng), mã lỗi refresh hỏng / dùng lại, mã vượt rate (−32), endpoint `getoa`.
   - Lệch §2 → sửa TIP (dòng "Rà lại").
7. Armed set của 035c (`packages/core/src/kernel/jobs/due-registry.ts`) đã có trên dev → job §9 dùng. Chưa có → quét workspace theo keyset, ghi Gap.
8. Cổng phân loại bảng của 015c: khai `oauth_grant` ("token của DN, không dữ liệu khách") ở đâu. File ngoài manifest → báo Chủ thầu thêm path (L2).
9. Protocol outbox: topic chưa có consumer có cần dòng ở `apps/worker/src/event-protocol.manifest.ts` không. Cần → L2 thêm path.
10. Route công khai `/oauth/return` (nhóm `(public)`): middleware / danh sách route không cần đăng nhập, lint parity / route có bắt khai route mới không. Cần sửa file ngoài manifest → L2.

## TASK
Dựng một đường OAuth + một kho token cho mọi nền tảng.
- Hợp đồng `OAuthClient` / `TokenSet` / `OAuthAccount` ở `packages/channels`.
- Client Zalo OA OAuth v4 (+ transport `fake`).
- Bảng tenant `oauth_grant` + `TokenVault` làm mới có khoá (refresh dùng một lần).
- State ký + nonce một lần; kết quả chờ chọn (pending).
- Action `oauth.start` / `oauth.complete` / `oauth.pending_get` / `oauth.cancel`.
- Callback chung `GET /hooks/oauth/:provider/callback`.
- Job `oauth-refresh`.
- Hook FE `useOAuthConnect` + mock.
- Không chọn tài khoản, không tạo kênh, không UI kết nối (048b / 048c).

## SPECIFICATIONS

### 1. Hợp đồng `packages/channels/src/oauth.ts` (brief §3.1 — giữ đúng tên)
```ts
export interface TokenSet { access: string; refresh?: string; accessExpiresAt?: string; refreshExpiresAt?: string; subject: string; scopes?: string[] }
export interface OAuthAccount { externalId: string; name: string; avatarUrl?: string; tokens?: TokenSet; meta?: Record<string, unknown> }
export interface OAuthClient {
  provider: string;
  pkce: boolean;
  authorizeUrl(i: { state: string; codeChallenge?: string; redirectUri: string }): string;
  exchange(i: { code: string; codeVerifier?: string; redirectUri: string; query: Record<string, string> }): Promise<{ grant: TokenSet; accounts: OAuthAccount[] }>;
  refresh(t: TokenSet): Promise<TokenSet>;
}
```
- Thêm `class OAuthProviderError extends Error { kind: 'invalid_grant' | 'rate_limited' | 'failed'; retryAfterSec?: number }`. Message không chứa token / code / secret.
- Thời điểm là chuỗi ISO có offset.
- `packages/channels/src/index.ts` export hợp đồng + `createZaloOaOAuthClient`. 049 re-export cùng kiểu ở `packages/integrations/src/oauth.ts` (không thuộc 048).

### 2. Zalo OA OAuth v4 — `packages/channels/src/zalo-oa/oauth.ts` (≤ 250 dòng)
- `createZaloOaOAuthClient({ appId, appSecret, http: typeof fetch, now: () => Date, transport: 'http' | 'fake' })`. `provider = 'zalo_oa'`, `pkce = true`.
- **authorizeUrl:** `https://oauth.zaloapp.com/v4/oa/permission?app_id=<appId>&redirect_uri=<mã hoá>&code_challenge=<S256>&state=<state>`.
  - Core truyền challenge base64url (RFC 7636). Zalo đòi base64 thường → client đổi ký tự + bỏ `=` theo Rà #6.
- **exchange:**
  - `POST https://oauth.zaloapp.com/v4/oa/access_token`, header `secret_key: <appSecret>`, form `code`, `app_id`, `grant_type=authorization_code`, `code_verifier`.
  - Code dùng một lần, sống 10 phút.
  - `accessExpiresAt = now + expires_in` (giây; nhận số hoặc chuỗi; mặc định 90000 = 25 giờ). `refreshExpiresAt = now + 90 ngày` (3 tháng — kiểm Rà #6). `scopes = []`.
  - **Subject tin cậy:** gọi `getoa` bằng access mới → `oa_id`, tên, ảnh. So với `query.oa_id` (tham số URL, không ký) — lệch → `failed`.
  - Trả `grant.subject = oa_id`; `accounts = [{ externalId: oa_id, name, avatarUrl }]`. `getoa` lỗi tạm thời → vẫn trả grant, `name = oa_id`.
- **refresh:** cùng endpoint, form `refresh_token`, `app_id`, `grant_type=refresh_token`. Trả cặp mới; access cũ mất hiệu lực ngay; refresh cũ không dùng lại được.
- **Ánh xạ lỗi** (Zalo có thể trả HTTP 200 kèm `error` âm):
  - Refresh / code không hợp lệ, hết hạn, đã dùng → `invalid_grant` (mã cụ thể theo Rà #6).
  - −32 (vượt rate App) / HTTP 429 → `rate_limited`.
  - Còn lại, 5xx, timeout 10 giây → `failed`.
- **Transport `fake`** (không trạng thái):
  - `authorizeUrl` trả thẳng `redirectUri?code=fake_<ngẫu nhiên>&oa_id=<FAKE_OA_ID>&state=<state>` (không trang đồng ý).
  - `exchange` / `refresh` sinh token theo thế hệ (`fake-a-<n>`, `fake-r-<n>`). `refresh` nhận `fake-r-revoked` → `invalid_grant`.
  - Đếm số lần `exchange` / `refresh` trong tiến trình (`fakeZaloOaStats()`) cho test.
- Không log body / token. Không gọi API OA khác (gửi tin, upload — 048d).

### 3. DB tenant — `oauth-grants.prisma` + migration `20261115100000_oauth_grants` (DC-909 a)
- Dòng đầu: `// tenant/oauth-grants.prisma — sở hữu: TIP-048 (02-TASK-GRAPH.md → Bản đồ sở hữu file).`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid pk | uuidv7 từ app |
| `provider` | text | loại mở rộng (`zalo_oa`, `facebook`, …) — validate theo registry, không enum; CHECK `length ≤ 40` |
| `subject` | text | `oa_id` / page id / shop id; CHECK `length ≤ 200` |
| `access_enc` | bytea | `encryptSecret` |
| `refresh_enc` | bytea null | |
| `access_expires_at` · `refresh_expires_at` | timestamptz null | |
| `scopes` | text[] default `'{}'` | |
| `status` | enum `oauth_grant_status` (`active · refresh_failed · revoked`) default `active` | |
| `version` | int default 1 | CAS |
| `refreshed_at` | timestamptz null | |
| `last_error` | text null | mã lỗi, không body nền tảng; CHECK `length ≤ 500` |
| `created_by` | uuid null | user tạo grant |
| `created_at` · `updated_at` | timestamptz default now() | |

- Index:
  - `unique (provider, subject)`.
  - `(status, access_expires_at) WHERE status = 'active'` — job làm mới. Partial chỉ khai trong SQL.
- Không FK từ bảng khác sang `oauth_grant` (`channel_account`, `call_line`, `integration_connection` là domain khác — consumer xử lý `oauth.grant_revoked`).
- `packages/db/test/prisma-stubs.test.ts`: OWNERS `'oauth-grants': '048'`, tổng file +1 (sau 047b: 66 → 67 — kiểm Rà).

### 4. `TokenVault` — `packages/core/src/kernel/oauth/token-vault.ts` (≤ 300 dòng; DC-909 a)
- **Chỉ `TokenVault` được gọi `client.refresh()`.** 047c, 048d, 048e, 048h, 049 lấy token qua `access()`.
- API:
  - `upsert(tx, provider, set: TokenSet, opts?: { createdBy?: string }) → { grantId, version }`:
    - `INSERT … ON CONFLICT (provider, subject) DO UPDATE`: token mới, `status = 'active'`, `last_error = null`, `version + 1`.
    - Chạy trong transaction của caller (`oauth.complete`). Cùng OA trong một workspace → một dòng.
  - `access(db, grantId) → string`: access rõ, chỉ trong bộ nhớ. `db` = client tenant gốc, không phải transaction của caller (brief ghi `tx`; đổi vì vault phải mở transaction riêng — bước 3).
  - `refreshNow(db, grantId)`: cho job §9.
  - `info(db, grantId)`: `{ id, provider, subject, status, access_expires_at, refresh_expires_at, refreshed_at, last_error }`, không token — cho 048c / 047d hiện hạn uỷ quyền.
- **`access()`:**
  1. Đọc grant. `revoked` → 409 `grant_revoked`. Access còn ≥ 10 phút → giải mã, trả.
  2. Lấy khoá Redis `oauth:refresh:<ws>:<grantId>` (`SET NX PX 30000` + token ngẫu nhiên; nhả bằng so token).
     - Không lấy được → chờ (poll 250 ms, tối đa 12 giây) rồi đọc lại. `version` đã tăng và access còn hạn → trả.
  3. Giữ khoá → **transaction riêng của vault** (không chạy trong transaction nghiệp vụ của caller — caller rollback không được làm mất cặp mới):
     - `SELECT … FROM oauth_grant WHERE id = $1 FOR UPDATE`.
     - `version` đã khác lần đọc và access còn hạn → trả (tiến trình khác vừa làm mới).
     - Có nhật ký cứu hộ của đúng `version` (bước 4) → ghi cặp trong nhật ký, không gọi nền tảng.
     - Gọi `client.refresh()` (timeout 10 giây).
     - `UPDATE` token mới, hạn mới, `version + 1`, `refreshed_at`, `status = 'active'`, `last_error = null` → commit.
  4. **Nhật ký cứu hộ:** ngay khi nền tảng trả cặp mới, trước commit, ghi Redis `oauth:refresh:journal:<ws>:<grantId>` (mã hoá, `base_version`, TTL 1 giờ). Commit xong thì xoá. Commit lỗi → lần sau dùng cặp trong nhật ký (refresh cũ đã cháy).
  5. **`invalid_grant`** → cùng transaction: `status = 'revoked'`, `last_error = 'invalid_grant'`, `version + 1` + `writeOutbox('oauth.grant_revoked', { grant_id, provider })`. Trả 409 `grant_revoked`.
  6. **Lỗi tạm thời** (`failed`, `rate_limited`):
     - Access còn hạn (> 0) → trả access cũ, ghi `last_error`, giữ `active`.
     - Access hết hạn → `status = 'refresh_failed'` + `last_error`. Trả 502 `oauth_exchange_failed` / 429 `provider_rate_limited`.
     - `refresh_failed` tự về `active` khi lần làm mới sau thành công.
- **Trạng thái:** `active` dùng được · `refresh_failed` lỗi tạm thời và access đã hết hạn (job thử lại) · `revoked` cần uỷ quyền lại (`upsert` đưa về `active`).
- Port tiêm vào để unit test: `GrantStore` (Prisma), `RefreshLock` (Redis), `Clock`, `cipher`. Token rõ không ra khỏi hàm; không log.

### 5. State + pending (`oauth-state.ts`, `pending-connect.ts`)
- **code_verifier:** 32 byte ngẫu nhiên → base64url (43 ký tự). Challenge = base64url(SHA-256(verifier)).
- **State trên URL** = `b64u(JSON{ v: 1, n: nonce, p: provider, rt: return_to })` + `.` + `b64u(HMAC-SHA256(OAUTH_STATE_SECRET, phần đầu))`, ≤ 1 KB.
  - Verifier **không** nằm trên URL (lộ URL thì PKCE vô nghĩa).
- **Bản ghi state** Redis `oauth:state:<nonce>` TTL 600 giây: `{ ws, userId, provider, purpose ('channel' | 'grant' | 'connector'), ref?, returnTo, codeVerifierEnc, createdAt }`.
- **verify(provider, state):**
  - HMAC so bằng `timingSafeEqual` → sai → `oauth_state_invalid` (không I/O nào).
  - `p` phải khớp `:provider`.
  - `GETDEL` bản ghi (dùng một lần). Thiếu (hết 10 phút / đã dùng) → `oauth_state_invalid`, vẫn biết `rt` để quay về đúng trang.
- **`return_to`:** đường dẫn tương đối, bắt đầu `/`, không `//`, không `\`, không ký tự điều khiển, ≤ 512 ký tự, mặc định `/`. Kiểm ở `oauth.start` và lúc dựng URL quay về (chống open redirect).
- **Pending** (`pending-connect.ts`):
  - id 128 bit ngẫu nhiên (base64url 22 ký tự). Redis `oauth:pending:<ws>:<id>` TTL 900 giây.
  - Giá trị: `{ userId, provider, purpose, ref?, grantId, accounts: [{ externalId, name, avatarUrl?, meta?, tokensEnc? }], createdAt }`. Token của từng tài khoản (Facebook page — 048e) mã hoá `encryptSecret`.
  - `get(ws, userId, id)`: người khác người tạo → như không có (404).
  - `take(ws, userId, id)` (`GETDEL`): 048b / 047c / 049 dùng khi chọn tài khoản.
  - `drop(ws, userId, id)`.

### 6. Registry nền tảng + env (`providers.ts`, `oauth.module.ts`)
- `registerOAuthProvider(client, { purposes, permission? })` + `providerFor(key)` → `{ client, purposes, permissionFor(purpose) }`.
  - `permission` mặc định theo `PURPOSE_PERMISSION` (§7); ghi đè từng purpose nếu cần.
  - Key không có → 404. Provider khai nhưng chưa cấu hình → 503 `oauth_not_configured`.
- 048 đăng ký `zalo_oa`, purposes `['channel', 'grant']` (kênh OA 048d · đường dây ZCC 047c). 048e: `facebook`, `instagram`; 048h: `tiktok_messaging`; 049b: `shopee`; 049c: `tiktok_shop`.
- Env (zod trong `oauth.module.ts`, như `channels.env.ts`):

| Biến | Luật |
|---|---|
| `OAUTH_STATE_SECRET` | ≥ 32 ký tự. Production bắt buộc (thiếu → không khởi động). Dev / test thiếu → dẫn xuất `HMAC(APP_ENC_KEY, 'oauth-state')` + một dòng `warn` |
| `HOOKS_PUBLIC_URL` | URL công khai của API. Production bắt buộc `https`. Dev mặc định `http://localhost:<API_PORT>` |
| `ZALO_APP_ID` · `ZALO_APP_SECRET` | Một App Zalo cho OA API + ZCC (DC-909 c). Thiếu khi transport `http` → `zalo_oa` "chưa cấu hình" (503) |
| `ZALO_OA_TRANSPORT` | `http` · `fake`, mặc định `http`. Production + `fake` → không khởi động. 048d dùng lại cùng biến |

- `redirect_uri` = `<HOOKS_PUBLIC_URL>/hooks/oauth/<provider>/callback`, giống hệt ở authorize và exchange. Chủ nhà khai URL này ở App Zalo (Q-909).
- **Đăng ký (1–2 dòng mỗi chỗ, không thêm logic vào file chung):**
  - `kernel.module.ts` import `OAuthModule` · `kernel/index.ts` export `OAuthModule`, `OAuthJobsModule`, `TokenVault`, `PendingConnect`, `registerOAuthProvider`, `providerFor`, `OAuthCallbackService`.
  - `kernel.http.module.ts` thêm `OAuthController` · worker `jobs.module.ts` thêm `OAuthJobsModule` vào `JOBS_EXTRA`.
  - `packages/channels/src/index.ts` export hợp đồng + client Zalo · `packages/actions/src/index.ts` import `oauth.ts` · `packages/shared/src/api/index.ts` export `oauth.ts` · mock `handlers.ts` thêm `oauthHandlers`.

### 7. Action — `packages/actions/src/oauth.ts` + `packages/core/src/kernel/oauth/oauth.handlers.ts` (≤ 350 dòng)
- `PURPOSE_PERMISSION = { channel: 'channels.manage', grant: 'callcenter.manage', connector: 'integrations.manage' }` export ở `oauth.ts` (DC-909 b).
- Quyền tĩnh của action = quyền nền mọi thành viên có (Rà #3). Handler kiểm quyền purpose trước mọi tác dụng phụ → 403.

| Action | Risk | Quyền | Input → Output | Ghi chú |
|---|---|---|---|---|
| `oauth.start` | config | `PURPOSE_PERMISSION[purpose]` + provider hỗ trợ purpose (không → 400) | `{ provider, purpose, ref?, return_to? }` → `{ authorize_url }` | Preview: nền tảng, mục đích, scopes. Tạo verifier + state (§5). `agentGrantable: false` |
| `oauth.complete` | write · `exposure: 'internal'` | Capability hệ thống domain `oauth`; handler kiểm lại quyền purpose của `userId` trong state (vai trò có thể đổi trong 10 phút) | `{ provider, purpose, ref?, code, code_verifier?, redirect_uri, query }` → `{ pending_id }` | Nguồn `system`, actor = `userId` của state. `code` / `code_verifier` khai trường bí mật (Rà #4). Exchange → `TokenVault.upsert` → pending. Idempotency theo nonce. Thêm vào `SYSTEM_ONLY` |
| `oauth.pending_get` | read | Chỉ người tạo pending | `{ pending_id }` → `{ provider, purpose, grant_id, accounts: [{ external_id, name, avatar_url }] }` | Không bao giờ trả token |
| `oauth.cancel` | write | Chỉ người tạo pending | `{ pending_id }` → `{ ok: true }` | Xoá pending, không xoá grant (grant có thể đang dùng chung với ZCC). `invalidates: ['oauth-pending']` |

- `description` tiếng Anh cho LLM, có ví dụ input. Title i18n `actions.oauth.<verb>.title` (vi + en).
- `query` của callback: bỏ `code` / `state`, tối đa 20 khoá, mỗi giá trị ≤ 512 ký tự.
- DTO đọc ở `packages/shared/src/api/oauth.ts`: `OAUTH_PURPOSES`, `OAUTH_ERROR_CODES`, `oauthPendingSchema`, `oauthStartOutputSchema`. Action + FE + mock dùng chung zod.
- Ca test action-registry §12 (happy, 403, policy nguồn `ui` / `assistant` / `agent`, idempotency) nằm trong `apps/api/test/integration/oauth.test.ts`.

### 8. Callback — `GET /hooks/oauth/:provider/callback` (`apps/api/src/http/kernel/oauth.controller.ts`)
- Ngoài `/v1` (`prefix.ts`). Không cần đăng nhập — danh tính lấy từ state.
- Controller không ghi DB. Gọi `OAuthCallbackService.complete(provider, query)` (trong `oauth.handlers.ts`):
  1. `providerFor(provider)`. Không có → 404 envelope.
  2. Verify state (§5). Sai HMAC → 302 `APP_PUBLIC_URL/?oauth_error=oauth_state_invalid`. Hết hạn / đã dùng → 302 về `rt` kèm `oauth_error=oauth_state_invalid`.
  3. `query.error` (người dùng từ chối) → 302 về `return_to` kèm `oauth_error=oauth_denied`.
  4. Chạy `oauth.complete` qua `ActionExecutor` (nguồn `system`, workspace của state).
  5. Thành công → 302 `APP_PUBLIC_URL<return_to>` thêm `oauth=<pending_id>` bằng `URL` API (giữ query sẵn có như `oauth_flow`). Lỗi → `oauth_error=<code>` (§12).
- Header: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- Log một dòng `info`: `provider`, `outcome`, `ws`, `traceId`. Không ghi `code`, `state`, query.
- Không rate-limit riêng: state sai bị loại trước mọi I/O; state đúng dùng một lần.

### 9. Job `oauth-refresh` (`oauth-refresh.processor.ts`, `oauth.jobs.module.ts`, worker ROLE=jobs)
- Queue `oauth-refresh`, lịch 5 phút (mẫu scheduler của jobs module có sẵn). Đăng ký `OAuthJobsModule` vào `JOBS_EXTRA` (`apps/worker/src/roles/jobs.module.ts`).
- Chọn workspace:
  - Có armed set 035c → mỗi lần ghi grant đặt `due_at = access_expires_at − 30 phút` domain `oauth`; job đọc `workspace_due` ≤ 200 / lượt.
  - Chưa có → quét workspace active theo keyset, ghi Gap.
- Mỗi workspace:
  - `SELECT id FROM oauth_grant WHERE status = 'active' AND access_expires_at < now() + interval '30 minutes' ORDER BY access_expires_at LIMIT 50` (index partial §3).
  - Thêm dòng `refresh_failed`: bảng nhỏ, không cần index riêng; backoff Redis `oauth:backoff:<ws>:<grantId>` 5 → 60 phút.
- Gọi `TokenVault.refreshNow` (cùng khoá §4). Một grant lỗi không dừng lượt.
- Metric `oauth_refresh_total{provider,result}` (label không chứa id).
- Làm mới đều tay cũng giữ refresh token luôn mới (Zalo 3 tháng, Shopee 30 ngày).

### 10. FE — `apps/web/src/shared/oauth/useOAuthConnect.ts` (≤ 200 dòng, không UI)
- `useOAuthConnect({ provider, purpose, ref?, returnTo? })` → `{ start, cancel, reset, status, accounts, grantId, pendingId, error }`.
  - `status`: `idle · redirecting · waiting · ready · error`.
  - 048c, 047d, 049d dùng lại, không viết lại.
- **`start()`** (gọi trong handler click):
  - Sinh `flow` ngẫu nhiên. Mở popup trống **đồng bộ**: `window.open('about:blank', 'appchat-oauth', 'popup,width=600,height=720')` (sau `await` trình duyệt chặn popup).
  - Popup mở được → `return_to = /oauth/return?oauth_flow=<flow>` (trang relay). Bị chặn (`null`) → `return_to` = đường dẫn hiện tại (bỏ tham số `oauth*`) + `oauth_flow=<flow>`.
  - `useAction('oauth.start').run(...)` → popup: `popup.location.href = authorize_url`; bị chặn: `window.location.assign(authorize_url)`.
- **Trang relay** `apps/web/src/app/(public)/oauth/return/page.tsx` (chỉ routing) → `shared/oauth/OAuthReturnRelay.tsx` (≤ 80 dòng):
  - Đọc `oauth`, `oauth_error`, `oauth_flow` → `BroadcastChannel('appchat-oauth').postMessage({ flow, pendingId, error })`. Không có `BroadcastChannel` → `window.opener?.postMessage(…, location.origin)`.
  - Rồi `window.close()`. Không đóng được → dòng "Đã xong, bạn có thể đóng cửa sổ này" (i18n `common`).
  - Không dựa `window.opener` làm đường chính: COOP của nền tảng có thể cắt opener.
- **Cửa sổ gốc** nghe `BroadcastChannel` (+ `message` cùng origin), chỉ nhận đúng `flow` của mình → `useAction('oauth.pending_get').run({ pending_id })` → `accounts`, `grantId`. Không dựa `popup.closed` (COOP làm sai). Chờ quá 10 phút → `idle`.
- **Chuyển trang** (popup bị chặn): trang gốc tải lại với `?oauth=` / `?oauth_error=` → hook đọc lúc mount → `pending_get` → `router.replace` xoá tham số `oauth*`.
  - Luật cho 048c / 047d / 049d: gắn hook ở cấp section (luôn mount khi trang tải), không chỉ trong modal; có `oauth` trên URL thì mở lại bước chọn tài khoản.
- `error = { code, messageKey: 'oauth.error.<code>' }` (namespace `common`, vi + en). Hook không tự hiện thông báo.
- `cancel()` → `oauth.cancel`. `reset()` → về `idle`.
- **Mock** `apps/web/src/shared/api/mock/domains/oauth.ts` (đăng ký ở `mock/handlers.ts`):
  - `oauth.start` → `authorize_url` = `<origin><return_to>&oauth=mock-pending-1` (giả callback ngay).
  - `oauth.pending_get` → 2 OA mẫu. `oauth.cancel` → `{ ok: true }`.

### 11. Ranh giới với Gọi điện (DC-909 c, d)
- 048 **không sửa** file của 047 / 047b / 047c / 047d. Tài liệu các TIP đó đổi theo DC-909 d (Chủ thầu sửa TIP).
- **Một App Zalo:** `ZALO_APP_ID` / `ZALO_APP_SECRET` cho OA API + ZCC (047 đổi tên từ `ZCC_APP_*`).
  - `.env.example`: 047 đã thêm hai dòng này (DC-909 d) → 048 chỉ thêm chú thích "dùng chung kênh OA + ZCC". Chưa có thì thêm, không tạo dòng trùng.
  - Webhook ZCC `/hooks/zalo-zcc/:appId` (047c) dùng cùng App ID.
- **Một grant mỗi OA mỗi workspace:** provider `zalo_oa`, subject `oa_id`.
  - Kênh OA (048d) gắn qua `channel_account.oauth_grant_id` (048b). Đường dây ZCC gắn qua `call_line.oauth_grant_id` (047b).
  - Cùng OA → cùng dòng grant → một chuỗi làm mới.
- **047c:**
  - `call_line.create / update` nhận `grant_id` từ pending (purpose `grant`, `PendingConnect.take`); kiểm `grant.subject = zcc_oa_id`.
  - Trước mỗi lời gọi `ZccClient` (yêu cầu / kiểm quyền gọi): `TokenVault.access(db, line.oauth_grant_id)` → truyền token vào client (đúng hợp đồng TIP-047).
  - Không lưu `zcc_oa_token_enc`. Không tự gọi endpoint `access_token` của Zalo.
  - Consumer `oauth.grant_revoked` → `call_line.status = 'error'`, `last_error = 'grant_revoked'` + thông báo Owner.
- **047d:** nút "Uỷ quyền OA" / "Uỷ quyền lại" ở Cài đặt → Tổng đài dùng `useOAuthConnect({ provider: 'zalo_oa', purpose: 'grant', ref: line_id })`. Quyền `callcenter.manage`.
- **Ranh giới khác:** kênh (048b `channel.oauth_select` dùng purpose `channel`, consumer revoked → tài khoản `expired`); sàn (049 dùng purpose `connector`).

### 12. Lỗi, i18n, log
| Mã | HTTP | Khi nào |
|---|---|---|
| `oauth_state_invalid` | 400 | State sai / hết 10 phút / dùng lại / provider lệch; `return_to` không hợp lệ ở `oauth.start` dùng lỗi validate chung |
| `oauth_denied` | — | Người dùng từ chối ở trang nền tảng (chỉ qua redirect) |
| `oauth_exchange_failed` | 502 | Đổi code / làm mới lỗi (không phải `invalid_grant`); subject lệch |
| `grant_revoked` | 409 | Grant `revoked` hoặc nền tảng trả `invalid_grant` |
| `provider_rate_limited` | 429 | Nền tảng giới hạn; kèm `Retry-After` nếu có |
| `oauth_not_configured` | 503 | Provider chưa cấu hình (thiếu App ID / Secret) — thêm ngoài brief §3.1 |

- Callback luôn trả 302 kèm `oauth_error=<mã>`; cột HTTP áp cho envelope API / action.
- Message server ở `packages/shared/src/i18n/server/{vi,en}/channels.ts`. FE `common.json` `oauth.error.*` (vi + en).
- Message không chứa token, code, `oa_id`, `secret_key`.
- `redact.ts` thêm khoá `access_token`, `refresh_token`, `code_verifier`, `secret_key`, `client_secret` (nếu chưa phủ).
- `oauth.grant_revoked`: EVENT_SCHEMAS `{ grant_id, provider }` + aggregate `by('oauth_grant', 'grant_id')`. 048 chỉ phát; consumer ở 048b / 047c / 049.

### 13. Lệnh DB (CLAUDE.md §7 — đủ ba lệnh, đúng thứ tự)
`pnpm --filter @appchat/db run db:generate` → `db:migrate-tenants` → `db:setup`. Kiểm `_appchat_migrations` của `appchat_tenant_template` có `20261115100000_oauth_grants`. Trong worktree: chạy với env worktree (035d), lệnh nặng tự lấy slot.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given dev có workspace cũ, when chạy ba lệnh DB, then mọi workspace + template có `oauth_grant` (unique, index partial, CHECK); OWNERS có `oauth-grants: '048'`, dòng đầu đúng mẫu, tổng file +1 | log ba lệnh + `_appchat_migrations` + `\d oauth_grant` + `pnpm --filter @appchat/db test` |
| 2 | Given client Zalo với `http` giả, when authorize / exchange / refresh, then URL đúng tham số + PKCE S256; exchange POST header `secret_key`, form đúng, `code_verifier` có; `expires_in` chuỗi → hạn đúng (Clock cố định); subject từ `getoa`, lệch `oa_id` URL → `failed`; refresh trả cặp mới; lỗi → `invalid_grant` / `rate_limited` / `failed`; message lỗi không chứa token / secret. Zalo thật: chưa nghiệm thu với provider thật | `packages/channels/test/zalo-oa-oauth.test.ts` |
| 3 | Given state, when HMAC sai / provider khác / quá 10 phút / dùng lần hai, then `oauth_state_invalid`; `return_to` = `//x`, `https://x`, `/\x`, > 512 ký tự → `oauth.start` từ chối; URL `authorize_url` không chứa verifier | `packages/core/test/oauth-state.test.ts` + integration |
| 4 | Given manager / sales / vai trò tuỳ biến chỉ có `callcenter.manage`, when `oauth.start` `zalo_oa`, then manager được cả `channel` + `grant`; sales → 403; tuỳ biến → `grant` được, `channel` 403; purpose `connector` với `zalo_oa` → 400; nguồn `agent` bị chặn | `apps/api/test/integration/oauth.test.ts` |
| 5 | Given `ZALO_OA_TRANSPORT=fake`, when start → mở `authorize_url` → GET callback, then 302 `APP_PUBLIC_URL<return_to>` có `oauth=<id>` và giữ `oauth_flow`; `pending_get` của người tạo trả 1 OA, không token; người khác → 404; `access_enc` không chứa token rõ; `cancel` xoá pending, grant còn; callback có `error=access_denied` → `oauth_error=oauth_denied` | integration |
| 6 | Given access còn < 10 phút, when 5 lời gọi `access()` song song (kết nối DB riêng), then nền tảng giả nhận đúng 1 lần refresh; cả 5 nhận access mới; `version` +1; caller rollback transaction nghiệp vụ sau `access()` không làm mất cặp mới | integration + `packages/core/test/token-vault.test.ts` |
| 7 | Given nền tảng trả `invalid_grant`, when `access()`, then cùng transaction `status = 'revoked'`, `last_error`, outbox `oauth.grant_revoked` payload chỉ `{ grant_id, provider }`; lần sau → 409 `grant_revoked`; uỷ quyền lại (upsert) → `active`, `version` tăng, vẫn một dòng | integration + `pnpm --filter @appchat/shared test` (`event-protocol.test.ts`) |
| 8 | Given lỗi tạm thời, when access còn hạn / đã hết hạn, then trả access cũ / `refresh_failed` + 502 hoặc 429; không `revoked`; commit lỗi sau khi nền tảng trả cặp mới → lần sau dùng nhật ký cứu hộ, không gọi refresh lần hai | `token-vault.test.ts` |
| 9 | Given 5.000 grant (sinh bằng `generate_series` trong test) + vài grant sắp hết hạn, when job `oauth-refresh` chạy, then chỉ làm mới grant `active` hết hạn < 30 phút + `refresh_failed` quá backoff; EXPLAIN dùng index partial §3; job đăng ký ở ROLE=jobs | integration + EXPLAIN dán report |
| 10 | Given log capture, when chạy luồng AC5 + AC6 + AC7, then log, response, `action_log` của `oauth.complete` không chứa `code`, `code_verifier`, access / refresh token, `secret_key`; production + `ZALO_OA_TRANSPORT=fake` hoặc thiếu `OAUTH_STATE_SECRET` → không khởi động | integration + unit env |
| 11 | Given hook FE, when start (popup mở / bị chặn → chuyển trang), quay về `?oauth=` / `?oauth_error=`, tin `BroadcastChannel` đúng / sai `flow`, then gọi `pending_get` đúng một lần, trả `accounts` / `grantId` / `error.code`, bỏ tin sai `flow`, xoá tham số `oauth*` khỏi URL; mock chạy được | `apps/web/src/shared/oauth/useOAuthConnect.test.tsx` |
| 12 | Given hai workspace A / B, when A tạo grant + pending, then B không đọc được grant / pending của A; `pnpm i18n:check` đủ vi + en; file trong trần | integration + output lệnh |

### Commands / evidence gate
- DB: ba lệnh §13 + `psql … -d appchat_tenant_template -c "SELECT name FROM _appchat_migrations ORDER BY name DESC LIMIT 3;"`.
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{channels,db,core,actions,shared,api,worker,web}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check`.
- Integration (`--workers=1`, slot `pg-slot` của 035d): `pnpm --filter @appchat/api test:integration -- test/integration/oauth.test.ts`.
- Zalo thật (App + domain HTTPS — Q-909, Q-006): chưa nghiệm thu với provider thật. Ghi rõ ở report.

## CONSTRAINTS
- **DO NOT:**
  - Lưu token / code dạng rõ (DB, Redis, `action_log`, log); trả token qua API.
  - Để nơi khác ngoài `TokenVault` gọi `refresh()` hoặc endpoint `access_token` của Zalo.
  - Làm mới trong transaction nghiệp vụ của caller.
  - Đặt `code_verifier` trên URL state.
  - Cho `return_to` tuyệt đối (open redirect).
  - Thêm `workspace_id` / RLS vào `oauth_grant`; FK chéo domain sang `oauth_grant`.
  - Nhét action vào `packages/actions/src/settings-apps.ts` (408 dòng).
  - Sửa file của 047 / 047b / 047c / 047d.
  - Ghi DB từ controller; cho agent / Trợ lý tự uỷ quyền (`agentGrantable: false`).
  - Dùng thư viện OAuth (`openid-client`, `simple-oauth2` …), Docker.
- **REUSE:**
  - `encryptSecret` / `decryptSecret` (`kernel/crypto.ts`), `secret-fields` cho input action.
  - Redis client + helper khoá có sẵn; `Clock`; uuidv7.
  - Outbox `withEventTransaction` / `writeOutbox`; action hệ thống 003c.
  - Mẫu `hooks.controller.ts`, `prefix.ts`, guard `fake` của `channels.env.ts`.
  - `useAction` (`apps/web/src/shared/actions`).
- **SKIP:**
  - Chọn tài khoản / tạo `channel_account` / route webhook (048b); UI kết nối, hạn uỷ quyền (048c).
  - Adapter kênh OA, webhook kênh (048d); OAuth client Facebook / Instagram / TikTok / Shopee / TikTok Shop (048e / 048h / 049b / 049c).
  - Consumer `oauth.grant_revoked` (048b / 047c / 049).
  - Thu hồi chủ động ở nền tảng (`oauth.revoke`); dọn grant mồ côi.

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync` (Chủ thầu).
- [x] Hợp đồng đúng brief §3.1: kiểu, file, action, route, env, mã lỗi.
- [x] Refresh dùng một lần: một nơi làm mới, khoá Redis + `FOR UPDATE`, commit riêng, nhật ký cứu hộ.
- [x] Một App Zalo cho OA + ZCC; ranh giới Gọi điện rõ (§11).
- [x] Bí mật mã hoá, không log, không trả ra (observability-security §2, §5).
- **Gap đã khai:**
  - Chưa có App Zalo thật + domain HTTPS (Q-909, Q-006) → transport `fake`.
  - Một OA nối hai workspace (kênh ở A, ZCC ở B) → hai chuỗi token độc lập. Chặn ở route 048b / 047c; xảy ra thật → DC mới.
  - Mã lỗi Zalo cụ thể + mã hoá challenge kiểm ở Rà #6.
  - Thêm mã `oauth_not_configured` (503) và biến `ZALO_OA_TRANSPORT` ngoài brief §3.1.
  - Grant mồ côi (không còn kênh / đường dây dùng) vẫn được làm mới; dọn để TIP sau.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope. Rà #3 / #4 / #8 / #9 cần file ngoài manifest → L2.
- [ ] AC 1–12 có kết quả từng cái, dán output thật (`pnpm …`, EXPLAIN, log capture), không "pass" chung chung.
- [ ] **Tenant DB (BUILDER-HANDOFF #4):** `oauth_grant` không `workspace_id`, không RLS; chạy CẢ `db:generate` → `db:migrate-tenants` → `db:setup`; template có `20261115100000_oauth_grants`.
- [ ] **Action-first (BUILDER-HANDOFF #3):** controller không ghi DB; `oauth.complete` chạy qua `ActionExecutor` nguồn `system`; FE chỉ `useAction(id).run(input)`.
- [ ] **Bí mật (observability-security §2, §5):** token mã hoá AES-256-GCM qua kernel crypto; không log / không trả token, code, verifier; test bắt log.
- [ ] **Refresh một lần:** `git grep -n "v4/oa/access_token" -- packages apps` chỉ thấy `packages/channels/src/zalo-oa/oauth.ts` (+ test); `git grep -n "\.refresh(" -- packages/core` chỉ thấy `kernel/oauth/token-vault.ts`.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
