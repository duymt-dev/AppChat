# TIP-048b — Nền kênh webhook: route mức App, biên nhận, chọn tài khoản OAuth, cửa sổ gửi, danh sách kênh theo registry (Kênh, D62)

## HEADER
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `.env.example`, `packages/actions/src/index.ts`, `packages/channels/src/coming-soon.ts`, `packages/channels/test/registry.test.ts`, `packages/db/prisma/platform/routing.prisma`; integrate 048b before049.
- **Parallel-safe with TIP-049b (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048b before049b.
- **Parallel-safe with TIP-049c (coverage-closure manifest):** sequential, shares `.env.example`; integrate 048b before049c.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `.env.example`, `packages/actions/src/index.ts`, `packages/channels/src/index.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048 before048b.
- **Parallel-safe with TIP-003g (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 003g before048b.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/api/src/http/channels/channels.http.module.ts`, `packages/actions/src/index.ts`, `packages/channels/src/index.ts`, `packages/channels/src/registry.ts`, `packages/channels/src/types.ts`, `packages/channels/test/contract.test.ts`, `packages/core/src/channels/channels.module.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/services/read.service.ts`, `packages/core/src/channels/services/send-queue.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/sales/orders/actions/order-confirmation.handler.ts`, `packages/core/src/sales/payments/actions/receipt-send.handler.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`, `packages/db/prisma/platform/routing.prisma`, `packages/db/prisma/tenant/channels.prisma`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/channels.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 014b before048b.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/db/prisma/tenant/inbox.prisma`; integrate 022c before048b.
- **Parallel-safe with TIP-022d (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/services/accounts.service.ts`; integrate 022d before048b.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/crm/labels.ts`; integrate 026c before048b.
- **Parallel-safe with TIP-045 (coverage-closure manifest):** sequential, shares `apps/api/src/bootstrap.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 048b before045.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/index.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048b before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `.env.example`, `apps/api/src/http/channels/channel-hooks.controller.ts`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/index.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048b before048e.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/inbox.ts`; integrate 048b before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 048b before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/coming-soon.ts`, `packages/channels/src/registry.ts`, `packages/channels/test/registry.test.ts`, `packages/core/src/channels/channels.env.ts`, `packages/core/src/channels/channels.module.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 048b before048h.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before048b.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`; integrate 003b before048b.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/channels/channels.module.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`; integrate 003c before048b.
- **Parallel-safe with TIP-003d (coverage-closure manifest):** sequential, shares `apps/api/src/bootstrap.ts`; integrate 003d before048b.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 003e before048b.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before048b.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 012b before048b.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 012c before048b.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`; integrate 013c before048b.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/services/accounts.service.ts`; integrate 014c before048b.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/index.ts`; integrate 015b before048b.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/pipeline.ts`; integrate 015c before048b.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`, `packages/db/prisma/tenant/inbox.prisma`; integrate 015d before048b.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`; integrate 015e before048b.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/shared/src/api/inbox.ts`; integrate 015f before048b.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 019c before048b.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 020b before048b.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/inbox.ts`; integrate 020c before048b.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/inbox.ts`; integrate 020d before048b.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`; integrate 020e before048b.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/channels/services/accounts.service.ts`, `packages/core/src/channels/services/read.service.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/support/events/ai-complaint.consumer.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/channels.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 022b before048b.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/channels/src/types.ts`, `packages/core/src/channels/channels.module.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/services/read.service.ts`, `packages/core/src/inbox/services/meta.service.ts`, `packages/db/prisma/tenant/channels.prisma`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 023b before048b.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/index.ts`, `packages/core/src/channels/channels.module.ts`, `packages/core/src/channels/services/read.service.ts`, `packages/shared/src/api/channels.ts`, `packages/shared/src/i18n/server/en/channels.ts`, `packages/shared/src/i18n/server/vi/channels.ts`; integrate 023c before048b.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 023d before048b.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 023e before048b.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/channels/src/index.ts`; integrate 023f before048b.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/inbox/services/meta.service.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/inbox.ts`; integrate 025b before048b.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/index.ts`; integrate 026b before048b.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 027b before048b.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 030b before048b.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 030c before048b.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 031b before048b.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/sales/orders/actions/order-confirmation.handler.ts`, `packages/core/src/sales/payments/actions/receipt-send.handler.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`; integrate 032b before048b.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 032c before048b.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 032d before048b.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/inbox.ts`; integrate 032e before048b.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/booking/appointment-state.ts`; integrate 033b before048b.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/inbox.ts`; integrate 033c before048b.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 034b before048b.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 034c before048b.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 034d before048b.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 036 before048b.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/services/accounts.service.ts`, `packages/core/src/channels/services/send-queue.ts`, `packages/shared/src/api/channels.ts`; integrate 037 before048b.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 038 before048b.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 038b before048b.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 039 before048b.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/send.processor.ts`; integrate 040 before048b.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 041 before048b.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 042 before048b.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/api/src/http/channels/channels.http.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/channels/services/accounts.service.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/shared/src/api/channels.ts`; integrate 042b before048b.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`, `packages/db/prisma/tenant/inbox.prisma`; integrate 042c before048b.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 043 before048b.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/channels/src/index.ts`, `packages/channels/test/contract.test.ts`, `packages/core/src/channels/channels.module.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/services/send-queue.ts`, `packages/db/prisma/tenant/inbox.prisma`; integrate 045b before048b.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before048b.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/db/prisma/platform/routing.prisma`, `packages/shared/src/crm/labels.ts`, `packages/shared/src/support/ticket-state.ts`; integrate 047b before048b.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 047c before048b.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/core/src/inbox/services/meta.service.ts`; integrate 047d before048b.
- **TIP-ID:** TIP-048b · **Project:** AppChat V2 · **Module:** Kênh — nền webhook + chọn tài khoản + cửa sổ gửi (backend, không UI) · **Priority:** P0 · **Estimated:** XL (2 pha: P1 schema + ingress + route; P2 chọn tài khoản + cửa sổ gửi + danh sách kênh theo registry)
- **Depends on:** 048, 014b, 022c, 022d, 003g, 026c và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 048c, 048d, 048e, 048f, 048g, 048h, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 048 tạo `oauth_grant`, `TokenVault`, pending chọn tài khoản, `oauth.start` / `oauth.pending_get`, bảng provider. `channel.oauth_select` đọc pending; `channel.reauthorize` gọi `oauth.start`.
  - 014b là chủ hợp đồng adapter (`types.ts`, `registry.ts`, `contract.test.ts`), `channels.prisma`, lệnh bền và `send.processor.ts`. Ghép sau để không viết đè.
  - 022c / 022d sửa `outbound.ts` / `send.processor.ts` (ý định báo giá, cap 200 tin chủ động / ngày). Cửa sổ gửi chèn sau cap, trước guard.
  - 003g đưa `Clock` vào mọi chỗ tính thời điểm. `windowState` nhận `now` từ `Clock` để test nhảy giờ.
  - 026c sửa `shared/crm/labels.ts` (nguồn khách). 048b thêm nguồn kênh mới cùng file.
- **Files touched:** [exact M/C manifest](manifests/TIP-048b-files.md). Không có file prisma mới. Sửa có chủ đích `tenant/channels.prisma` (chủ 014), `tenant/inbox.prisma` (chủ 016), `platform/routing.prisma` (chủ 002). Sửa danh sách 3 kênh cứng ở báo giá / đơn / phiếu thu / ticket / lịch hẹn để đọc registry.
- **Quyết định nguồn:** D62 (#2, #5, #6) · DC-910 · DC-909 (chỉ dùng) · Q-907 / DC-923 (hạn mức chốt) · Q-912 (không thêm permission) · Blueprint §2.2, §4.7, §6 · omnichannel-adapter quy tắc 2, 6, 7, 8, 10.
- **Dòng COVERAGE nhận:** REQ-B12 · REQ-B16 (chọn tài khoản, một Page / OA một workspace) · BP-4.7-channels · BP-6-webhook · STD-channels-adapter-8b · D62-foundation · D62-quota · DC-910 · Q-907.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. DB tenant riêng mỗi workspace (`TenantDbResolver`): không `workspace_id`, không RLS. Route webhook ở DB nền tảng.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Hợp đồng adapter** `packages/channels/src/types.ts` (212 dòng):
    - `ConnectKind` ~L7, `SendKind` ~L9, `ChannelManifest` ~L11–39 (connect ~L19, capabilities ~L20–34, `proactive` ~L33, `session` ~L36).
    - `NormalizedInbound` ~L49–63, `OutboundMessage` ~L65–80 (`replyToExternalMsgId` ~L73), `RawWebhook` ~L126–130.
    - `ChannelAdapter` ~L132–158: `handleWebhook?` ~L145 **không ai gọi**.
  - **Registry:** `registry.ts` (33) `buildChannelRegistry` deps ~L15–31. `coming-soon.ts` (44) `SOON` ~L8–22 (zalo_oa, facebook, messenger, instagram, tiktok_messaging…; oauth → session webhook ~L43). `define.ts` `isConnectable`.
  - **Test gác:** `registry.test.ts` (82) đòi 16 type + đúng 3 GA (~L13, ~L26–30, ~L42–46). `contract.test.ts` (160) `DRIVERS` ~L93–101. `capabilities.proactive` chỉ được kiểm ở contract ~L113.
  - **Webhook có sẵn (mẫu):**
    - `apps/api/src/http/integrations/hooks.controller.ts` (24): `/hooks/integrations/:connector/:connectionId`, `MAX_BODY` 256KB ~L9.
    - `apps/api/src/bootstrap.ts` `rawBody: true` ~L15. `http/kernel/prefix.ts` ~L8 `hooks/{*path}` mọi method. `api-rate-limit.guard.ts` bỏ qua `/hooks/` ~L13. `openapi/route-scan.ts` `UNPREFIXED` / `HIDDEN` ~L25–27 đã gồm `/hooks/`.
    - `core/integrations/services/webhook.service.ts` (100): route → verify → `createMany skipDuplicates` + outbox (`inEventTransaction` ~L55–70). Biên nhận mẫu `integration_event` (`integrations.prisma` ~L119–130).
  - **Route nền tảng:** `routing.prisma` (60) `TenantChannelRoute` ~L7–18 (cho lease). Chưa có khoá (type, external_id). Unique (type, external_id) chỉ ở DB tenant → một Page gắn được hai workspace.
  - **Core kênh:**
    - `accounts.service.ts` (121): settings ~L13–34, `route()` ~L83–89, `setStatus` ~L96–120.
    - `channel-connect.handlers.ts` (110) cứng Zalo ~L48 / ~L61 / ~L69 / ~L91. Mẫu kết nối có callback: `email/email.handlers.ts` (97) verify → `encryptSecret` ~L61 → `applyTenant` ~L67–87 → `finalizePlatform` ~L89–92.
    - `channels.module.ts` (191) `channelRegistryFor` ~L78–92. `channels.env.ts` (43) cấm transport giả ở production ~L29–34.
    - `jobs/channels.jobs.module.ts` (184): lease / senders / `StatelessChannels` ~L151 / pollers. Worker `roles/channels.module.ts` L1 ghi "TIP sau KHÔNG sửa" → gắn qua `ChannelsJobsModule`.
  - **Gửi:**
    - `services/send-queue.ts` (108) `SendJob { proactive, deferrable }`.
    - `jobs/send.processor.ts` (202) ~L70–128: suspend → pace → cap chủ động ~L91–101 → jitter → guard ~L105–110 → `adapter.send` ~L114.
    - `inbox/services/outbound.ts` (158): `sendableAccount` ~L53–57, `writeOutgoing` ~L60–119.
    - `proactive = true` ở `email-send.handlers` ~L67, `quote-send` ~L91, `campaign-scheduler` ~L54, `campaign-system.handlers` ~L103.
  - **Nhận:** `inbox/services/pipeline.ts` (231): policy ~L79–85 → dedupe ~L93–95 → khách ~L98–111 → khoá ~L113 → hội thoại ~L119–170 → INSERT ~L173–178 → stats ~L194–198 → outbox ~L206. `inbound.processor.ts` concurrency 4 ~L60. Chưa có `last_inbound_at`.
  - **Prisma:** `channels.prisma` (91) `ChannelAccount` ~L19–41. `inbox.prisma` (313) `Conversation` ~L120–179.
  - **Danh sách 3 kênh cứng:** `quote-send.ts` ~L14 · `order-confirmation.handler.ts` ~L37 · `receipt-send.handler.ts` ~L46 · `ai-complaint.consumer.ts` ~L34 · `calendar-follow-ups.ts` ~L24 · `shared/support/ticket-state.ts` ~L11 · `shared/booking/appointment-state.ts` ~L8 · `shared/crm/labels.ts` `sourceOfChannel` ~L31–32 (kênh lạ → `manual`).
  - **Giữ 3 kênh (không mở):** `marketing/state.ts` ~L13, `campaign-read.service.ts` ~L216 (chiến dịch chỉ Zalo cá nhân + Email), `login-attempt.ts` ~L29 (QR Zalo).
  - **DTO:** `shared/api/channels.ts` (143) ~L54–69 chưa có `connect_kind`. `shared/api/inbox.ts` `connectChannelsSchema` ~L141 ← `GET /inbox/connect-channels` (`inbox/services/meta.service.ts`). `GET /settings/channels` ← `channels/services/read.service.ts`.
  - **Kích thước:** `actions/src/settings-apps.ts` 408 dòng (quá trần) → action mới ở file riêng. `pipeline.ts` 231, `send.processor.ts` 202.
- **Key files to read first:** DC-910, DC-909, D62 · Blueprint §2.2 (`tenant_channel_webhook_route`, `channel_webhook_event`), §4.7, §6 (Kênh webhook) · TIP-048 (hợp đồng OAuth) · file nêu trên.
- **Patterns to follow:**
  - Ingress: `hooks.controller.ts` + `webhook.service.ts` (raw body, chống trùng bằng unique, 200 nhanh, xử lý ở queue).
  - Route nền tảng: `connections.service.ts` upsert `tenant_integration_route`.
  - Kết nối hai DB: `email.handlers.ts` (`applyTenant` → `finalizePlatform`, có bù).
  - Webhook chạy action nội bộ nguồn `system` qua system adapter (DC-904).

## APPLICABLE STANDARDS
- [channels/omnichannel-adapter](../standards/channels/omnichannel-adapter.md) — quy tắc 2 (chỉ đọc manifest), 6 (gửi qua outbox + limiter), 7 (`connect.kind`), 8 (route — DC-910 đổi thành `/hooks/channels/:type`), 10 (credential).
- [events/outbox](../standards/events/outbox.md) — event cùng transaction; consumer `oauth.grant_revoked` idempotent.
- [database/tenant-db](../standards/database/tenant-db.md) · [database/indexing](../standards/database/indexing.md) — partial index, EXPLAIN.
- [api/response-envelope](../standards/api/response-envelope.md) — 409 / 402 / 422.
- [actions/action-registry](../standards/actions/action-registry.md) · [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — `channels.manage`, không thêm quyền (Q-912).
- [ops/observability-security](../standards/ops/observability-security.md) — webhook: chữ ký, không log body / token, metric.
- [domain/concurrency](../standards/domain/concurrency.md) · [domain/gap-filling](../standards/domain/gap-filling.md).
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` sau khi 048 đã merge. Chạy `python -X utf8 tools/obligations/manifests.py 048b`; tích hợp trước các TIP chờ chung file (dòng khai ở HEADER).
2. Kiểm lại mọi số dòng `~` trên `origin/dev`. Lệch → sửa TIP dòng "Rà lại <ngày>".
3. Đối chiếu hợp đồng thật của 048: `TokenSet`, `OAuthAccount`, `PendingConnect` (đọc / tiêu một lần), service của `oauth.start`, event `oauth.grant_revoked`. Tên khác brief → theo code 048, ghi report.
4. Đổi mốc migration nếu dev đã có migration mới hơn `20261115110000` (tenant) / `20261115110100` (platform). Ghi DV kèm tên mới; sửa Blueprint §2.2 + DC-910 bằng DC mới.
5. Kiểm giới hạn body của parser Nest khi `rawBody: true`. `/hooks/channels/*` cần 1MB: đặt giới hạn riêng cho đường này ở `bootstrap.ts`, không nâng cho cả API. Parser không chặn thì không sửa `bootstrap.ts`.
6. Đếm type trong `coming-soon.ts`: đủ `whatsapp`, WhatsApp Business API, `telegram`, `line`, `viber`, `wechat` chưa (PD-903). Thiếu → thêm "Sắp có" + sửa số type ở `registry.test.ts`. Không bật type nào.
7. Đọc lại tài liệu nền tảng bản mới nhất, ghi ngày đọc vào report: Zalo OA webhook (200 ≤ 2 giây; gửi lại 30 giây / 5 / 15 / 30 phút / 1 giờ), Meta Webhooks (`hub.challenge`, `X-Hub-Signature-256`), TikTok Business webhook (`TikTok-Signature`).
8. Hạn mức kênh: đọc cách `QuotaService` đếm `channels` (trạng thái nào được tính, mã lỗi khi vượt). Dùng đúng cách đếm đó cho tài khoản mới.
9. Index của `message`: có index bắt đầu bằng `conversation_id` dùng được cho đếm tin `out` sau một mốc chưa. Thiếu → thêm partial index ở migration tenant §3.
10. Kiểm CHECK DB của `ticket.channel`, `appointment.source`, `contact.source`. Có CHECK → mở trong migration tenant §3, ghi report.
11. Kiểm `startApi()` (harness integration) có cách ghi đè provider để nạp kênh giả không. Không có → thêm tham số tuỳ chọn nhỏ ở harness test (L1, ghi DV), không thêm biến môi trường production.

## TASK
**Pha 1 — schema + ingress + route:**
- Hợp đồng adapter webhook (`webhook.ts`, `types.ts`) + kênh webhook giả cho contract test.
- Migration tenant `channel_webhook_event`, `channel_account.oauth_grant_id`, `conversation.last_inbound_at`. Migration platform `tenant_channel_webhook_route`.
- `GET|POST /hooks/channels/:type` → biên nhận → queue `channel-hooks` → `adapter.handleWebhook` → `InboundSink`.

**Pha 2 — chọn tài khoản + cửa sổ gửi + registry:**
- `channel.oauth_select` / `channel.reauthorize` + hạn mức kênh (Q-907) + thu hồi grant → `expired`.
- Cửa sổ gửi `send-window.ts`, kiểm ở `outbound.ts` (409 sớm) và `send.processor.ts` (chốt cuối).
- Danh sách 3 kênh cứng → registry. Nguồn khách / kênh ticket / nguồn lịch hẹn có kênh mới. Marketing giữ nguyên.
- DTO danh mục kênh (`connect_kind`, `oauth`, `via`, `sync`, `window`) cho 048c.

Không bật kênh thật (048d / 048e / 048h). Không UI (048c).

## SPECIFICATIONS

### 1. Hợp đồng adapter (`packages/channels/src/types.ts` + `webhook.ts` mới)
1. **`ChannelManifest.connect`** thêm:
   - `oauth?: { provider: string; picker: boolean; scopes: string[] }` — provider đăng ký ở `kernel/oauth/providers.ts` (048). `picker = true` → bước chọn nhiều tài khoản.
   - `via?: string` — thẻ mở luồng kết nối của type khác (`messenger` → `facebook`). Thẻ có `via` không tự tạo tài khoản.
2. **`capabilities`** thêm (đều tuỳ chọn; vắng = như cũ):
   - `window?: { hours: number; after: 'blocked' | 'tag_human_agent'; tagHours?: number; maxBeforeReply?: number; graceAfterWindow?: number }`.
   - `comments?: { publicReply: boolean; privateReply: boolean; hide: boolean; delete: boolean; like: boolean }` (048f dùng).
   - `live?: boolean` (048g dùng).
   - `sync?: Array<'messages' | 'comments' | 'auto_contact' | 'history'>` — khối Đồng bộ ở drawer (048c).
3. **`NormalizedInbound.thread?`**: `{ kind: 'direct' | 'comment'; post?: { externalId; kind: 'post' | 'video' | 'reel' | 'live' | 'ad'; permalink?; caption?; mediaUrl?; publishedAt? }; parentExternalId?: string }`. 048b chỉ khai kiểu.
4. **`OutboundMessage`** thêm `mode?: 'public_reply' | 'private_reply'`, `targetExternalId?: string`, `windowTag?: 'human_agent'`. Chỉ cửa sổ gửi (§7) đặt `windowTag`; adapter đọc để gắn tag nền tảng.
5. **`packages/channels/src/webhook.ts`** (mới):
   - `ChannelWebhook { challenge?(query): string | null; verify(raw: Buffer, headers, secrets): boolean; split(raw: Buffer): HookItem[] }`.
   - `HookItem { routeKey: string; eventKey: string; kind: 'message' | 'echo' | 'read' | 'reaction' | 'comment' | 'live' | 'account' | 'other'; body: unknown }`.
   - Tiện ích `safeEqual(a, b)` so chữ ký thời gian hằng (`crypto.timingSafeEqual`).
   - `eventKey` ổn định qua lần gửi lại của nền tảng (id sự kiện / `mid`; không có thì sha256 của item + timestamp nền tảng).
6. **Adapter:** `webhook?: ChannelWebhook` + `handleWebhook?(item: HookItem, account: ChannelAccountRuntime, sink: InboundSink): Promise<void>`. Chữ ký cũ nhận `RawWebhook` chưa ai gọi: thay, giữ hay bỏ `RawWebhook` thì ghi report.
7. **`ChannelDeps`** thêm:
   - `hooks?: { http: typeof fetch; secrets: Record<string, string | undefined>; transport: 'http' | 'fake' }` (048d / 048e / 048h dùng).
   - `extra?: ChannelEntry[]` — chỉ test. `channels.env.ts` chặn `extra` khi `NODE_ENV = production`.
8. **Bất biến khi build registry** (`registry.ts`, ném lỗi lúc khởi động, bỏ qua type `coming_soon`):
   - `connect.kind = 'oauth'` ⇒ có `connect.oauth`.
   - `connect.via` trỏ tới type có trong registry, khác chính nó.
   - `session = 'webhook'` ⇒ adapter có `webhook` + `handleWebhook`.
   - `window.after = 'tag_human_agent'` ⇒ có `tagHours`.
9. **Kênh giả** `packages/channels/test/fixtures/fake-webhook-channel.ts`:
   - Type `fake_hook`: `connect.kind = 'oauth'` (provider `fake`), `session = 'webhook'`, `window { hours: 24, after: 'tag_human_agent', tagHours: 168 }`, `sync ['messages', 'auto_contact']`.
   - Chữ ký HMAC-SHA256 (secret test) trên raw body. `split` theo `entries[].account_id` → `fake_hook:<account_id>`.
   - Biến thể `fake_hook_count`: `window { hours: 48, after: 'blocked', maxBeforeReply: 10, graceAfterWindow: 3 }`.
   - Nạp qua `deps.extra` ở `contract.test.ts` và integration (Rà #11). Không vào registry production.

### 2. Route nền tảng (`platform/routing.prisma`, migration `20261115110100_channel_webhook_route`)
1. Bảng `tenant_channel_webhook_route`:
   - `route_key text PK` = `'<type>:<external_id>'` (`zalo_oa:<oa_id>`, `facebook:<page_id>`, `instagram:<ig_id>`, `tiktok_messaging:<business_id>`).
   - `workspace_id`, `channel_account_id uuid`, `type text`, `status` CHECK `active | disabled`, `updated_at`.
   - Index `(workspace_id)`.
2. **Một Page / OA chỉ thuộc một workspace** (`hook-route.ts` `claim`):
   - `INSERT … ON CONFLICT (route_key) DO UPDATE … WHERE tenant_channel_webhook_route.workspace_id = EXCLUDED.workspace_id OR tenant_channel_webhook_route.status = 'disabled' RETURNING workspace_id`.
   - Không trả dòng → 409 `channel_in_use_elsewhere`. Lỗi không nêu tên workspace kia.
   - Route `disabled` của workspace khác được giành lại (workspace cũ đã ngắt).
3. Ngắt / xoá tài khoản (`accounts.service.ts`) → route `disabled` cùng luồng `finalizePlatform`. Tạm dừng không đổi route: sự kiện vẫn nhận, processor bỏ qua theo trạng thái tài khoản.
4. Ghi hai DB theo mẫu `email.handlers.ts`: claim route trước, ghi tenant sau. Tenant lỗi → bù route (xoá dòng vừa claim nếu trước đó chưa có).
5. Đọc route theo lô (`WHERE route_key = ANY($1)`), cache trong tiến trình 60 giây, xoá cache khi claim / disable trong cùng tiến trình.

### 3. Tenant (migration `20261115110000_channel_webhooks`)
1. `channel_webhook_event`:
   - Cột: `id uuid PK`, `channel_account_id uuid NOT NULL`, `event_key text NOT NULL`, `kind text NOT NULL`, `payload jsonb NOT NULL`, `received_at timestamptz NOT NULL DEFAULT now()`, `processed_at timestamptz NULL`, `outcome text NULL` CHECK `applied | ignored | failed`, `attempts int NOT NULL DEFAULT 0`.
   - `UNIQUE (channel_account_id, event_key)`.
   - Index chờ xử lý: `(received_at) WHERE processed_at IS NULL`.
   - Index dọn: `(processed_at) WHERE processed_at IS NOT NULL`.
   - FK `channel_account_id` → `channel_account` ON DELETE CASCADE (cùng domain kênh).
   - Model Prisma ở `channels.prisma` (cùng domain).
2. `channel_account.oauth_grant_id uuid NULL` + index `(oauth_grant_id) WHERE oauth_grant_id IS NOT NULL` (consumer thu hồi tra theo grant). Không FK sang `oauth_grant` (file của 048).
3. `conversation.last_inbound_at timestamptz NULL`. Điền dữ liệu cũ bằng `max(created_at)` của tin chiều vào từng hội thoại (tên cột kiểm ở Rà).
4. Nếu Rà #9 thiếu: partial index `message (conversation_id, created_at) WHERE direction = 'out'` cho đếm tin ra sau mốc.
5. Nếu Rà #10 có CHECK: mở CHECK `ticket.channel` / `appointment.source` / `contact.source` cho 4 type mới.
6. Ba lệnh DB đúng thứ tự (CLAUDE.md §7): `db:generate` → `db:migrate-tenants` → `db:setup`.

### 4. Ingress `GET|POST /hooks/channels/:type` (`channel-hooks.controller.ts` + `hook-ingress.service.ts`)
1. **Controller** ngoài `/v1` (`prefix.ts` đã có `hooks/{*path}`). Không xác thực người dùng. Bỏ qua rate limit API như `/hooks/` hiện có. Không vào OpenAPI (`HIDDEN`).
2. **`:type`** phải có trong registry, `status ≠ coming_soon` và có `webhook`. Ngược lại 404, không ghi gì.
3. **GET:** `adapter.webhook.challenge(query)` trả chuỗi → 200 `text/plain` đúng chuỗi đó. `null` → 403.
4. **POST:**
   1. Raw body bắt buộc, ≤ `CHANNEL_HOOKS_MAX_BYTES` (mặc định 1MB). Thiếu → 400, quá → 413; không ghi.
   2. `verify(raw, headers, secrets)` mức App. Sai / thiếu header → **401**, không ghi DB, không enqueue. Metric `channel_hook_rejected_total{type, reason}`. Log không có body / chữ ký.
   3. `split(raw)` → `HookItem[]`. Tra route theo lô (§2.5).
   4. Item không có route / route `disabled` → bỏ, metric `channel_hook_unrouted_total{type}`, không lỗi.
   5. Gom item theo workspace. Mỗi workspace: `createMany … skipDuplicates` vào `channel_webhook_event` (trùng `(channel_account_id, event_key)` → bỏ qua). Một POST chứa nhiều Page / OA thuộc nhiều workspace → mỗi workspace nhận đúng phần của mình.
   6. Enqueue job `channel-hooks` cho id vừa chèn (jobId = id biên nhận; trùng thì BullMQ bỏ).
   7. Trả **200** (`EVENT_RECEIVED` cho Meta, body rỗng cho kênh khác). Mục tiêu p95 < 500ms; trần cứng Zalo ≤ 2 giây.
5. **Không ghi được biên nhận** (DB tenant / Redis lỗi) → 503 để nền tảng gửi lại. Đã ghi biên nhận mà enqueue lỗi → vẫn 200; sweeper (§5.4) bắt.
6. Không gọi API nền tảng, không gọi AI, không chạy pipeline trong request.

### 5. Xử lý nền (`hook-events.processor.ts`, queue `channel-hooks`)
1. Đăng ký ở `ChannelsJobsModule` (worker `ROLE=channels`). Concurrency `CHANNEL_HOOKS_CONCURRENCY` (mặc định 4). Không sửa `apps/worker/src/roles/channels.module.ts`.
2. Mỗi job: đọc biên nhận (`processed_at IS NULL`) → nạp `ChannelAccountRuntime` → `adapter.handleWebhook(item, account, sink)` → ghi `processed_at`, `outcome`, `attempts + 1`.
   - Tài khoản `paused` / `disconnected` / `expired` → `outcome = 'ignored'`.
   - `InboundSink` là pipeline có sẵn. Chống trùng tin vẫn bằng `UNIQUE(channel_account_id, external_msg_id)`.
   - Lỗi tạm → thử lại back-off (5 lần), rồi `failed` + metric `channel_hook_failed_total{type}`.
3. Biên nhận đã có `processed_at` (job chạy lại / trùng) → bỏ, không gọi adapter lần hai.
4. **Sweeper** 5 phút: biên nhận `processed_at IS NULL AND received_at < now() - 2 phút` theo index chờ (LIMIT 500) → enqueue lại.
5. **Dọn** hằng ngày: xoá `processed_at < now() - CHANNEL_HOOK_RETENTION_DAYS` (mặc định 7) theo lô 5.000.
5b. **Echo (tin AppChat gửi, nền tảng báo lại — `HookItem.kind = 'echo'`)** — móc cho 048d / 048e / 048h (bổ sung 2026-11-14):
   - Khớp tin `out` có sẵn cùng tài khoản theo `external_msg_id` → chỉ cập nhật trạng thái đã gửi, không tạo tin mới.
   - Echo tới **trước** lúc `send.processor` ghi `external_msg_id` (nền tảng trả ACK chậm): khớp tin `out` đang gửi (`pending` / `sending`) cùng tài khoản + người nhận theo khoá gửi adapter trả (client ref / `metadata` id) trong cửa sổ `CHANNEL_ECHO_MATCH_SECONDS` (mặc định 120); khớp được → gắn `external_msg_id` vào tin đó. `send.processor` ghi ACK sau đó dùng UPDATE có điều kiện (`external_msg_id IS NULL OR = $id`) — không ghi đè, không tạo trùng.
   - Echo không khớp tin AppChat nào (shop gửi từ app của nền tảng) → ghi tin `out` nguồn `external` (không qua cửa sổ gửi, không trừ hạn mức chủ động, vẫn tính vào đếm `maxBeforeReply` của §7).
   - Logic khớp ở file riêng `packages/core/src/channels/hooks/echo-match.ts` (`matchEcho(tx, account, echo)` → `matched` | `attached` | `external`), processor chỉ gọi. Echo và ACK tới cùng lúc: khoá dòng tin đang gửi (`SELECT … FOR UPDATE`) để chỉ một bên ghi id.
   - Kiểm lại ở Rà: trạng thái tin hiện có (`pending` / `sending` / `sent`) và cột chứa khoá gửi của adapter; thiếu cột → ghi DV + migration nhỏ trong migration §3.
6. Payload thô chỉ ở `channel_webhook_event` (≤ 7 ngày). Không log payload.

### 6. Chọn tài khoản OAuth (`packages/actions/src/channel-oauth.ts` + `core/channels/oauth/channel-oauth.handlers.ts`)
Action ở file **mới** (`settings-apps.ts` đã 408 dòng). Export ở `packages/actions/src/index.ts`.
1. **`channel.oauth_select`** (risk `config`, quyền `channels.manage`, nguồn `ui` / `assistant`, `Idempotency-Key`):
   - Input `{ pending_id, external_ids: string[] (1–20), quick?: { name?, agent_id?, ai_mode?, assign_mode? } }`.
   - Output `{ accounts: [{ id, type, external_id, name, status, reconnected: boolean }] }`.
   - Đọc pending (048): chỉ người tạo đọc được, purpose = `channel`. Sai / hết hạn → 400 `oauth_state_invalid`.
   - Type kênh = manifest có `connect.oauth.provider` = provider của pending. `external_ids` phải nằm trong `accounts` của pending → ngược lại 422.
   - Từng `external_id`, theo thứ tự:
     1. Tài khoản cùng (type, external_id) đã có trong workspace → **nối lại**: cập nhật `oauth_grant_id`, `status = 'connected'`, không tính hạn mức lần hai.
     2. Chưa có → `QuotaService.assert('channels', +1)` (Q-907). Vượt → dừng lô, trả lỗi hạn mức có sẵn của `QuotaService` (FE mở mua addon kênh). Tài khoản đã tạo trước đó trong lô giữ nguyên.
     3. Claim route `<type>:<external_id>` (§2.2). Trùng workspace khác → 409 `channel_in_use_elsewhere`, không tạo tài khoản.
     4. Tạo `channel_account` (name = `quick.name` ?? tên trên nền tảng; `credentials_enc` rỗng — token chỉ ở `oauth_grant`). Áp `quick` qua đường cấu hình agent / phân công có sẵn.
   - Grant: provider một grant cho cả lô (Meta user token) → mọi tài khoản trỏ cùng grant. Provider token theo từng tài khoản (Zalo OA, page token) → `TokenVault.upsert` theo `subject = external_id` (048). Kiểm hợp đồng thật ở Rà #3.
   - Tiêu pending sau khi xong (một lần). Phát event có sẵn của kênh (`channel_account.connected` hoặc tên tương đương — kiểm ở Rà) qua outbox.
2. **`channel.reauthorize`** (risk `config`, `channels.manage`):
   - Input `{ channel_account_id, return_to? }` → output `{ authorize_url }`.
   - Chỉ kênh có `connect.oauth`. Gọi service `oauth.start` purpose `channel` + `ref` = id tài khoản.
   - Khi `oauth_select` nhận pending có `ref`: chỉ cho chọn đúng external_id của tài khoản đó, cập nhật grant, `status = 'connected'`.
3. **Thu hồi grant:** consumer event `oauth.grant_revoked` (048) → mọi tài khoản có `oauth_grant_id` đó chuyển `expired` + thông báo Owner. Idempotent (kiểm trạng thái đích). Route giữ `active` để Uỷ quyền lại không mất Page.
4. **Hạn mức (Q-907 chốt, DC-923):** mỗi tài khoản (Page / OA / IG / TikTok) = 1 kênh, như 3 kênh cũ; vượt → lỗi hạn mức có sẵn, mua addon kênh. Không cờ đảo.
5. **Quyền:** không thêm permission (Q-912). `channel.oauth_select` / `channel.reauthorize` risk `config` → `agentGrantable: false` theo bảng nguồn × rủi ro §3.3 có sẵn (cấu hình luôn do người; OAuth cần đăng nhập nền tảng trên trình duyệt) — luật chung, không phải luật riêng cho kênh mới (DC-921).

### 7. Cửa sổ gửi (`core/inbox/services/send-window.ts`)
1. Hàm thuần `windowState({ manifest, lastInboundAt, outSinceInbound, now, sender }) → { state: 'open' | 'tag' | 'closed'; reason?: 'window_closed' | 'window_tag_required' }`:
   - Manifest không có `window` → `open` (3 kênh cũ không đổi hành vi).
   - Chưa có tin vào (`lastInboundAt = null`) → `closed`.
   - `now - lastInboundAt ≤ hours` → `open`; riêng `maxBeforeReply`: đã gửi ≥ `maxBeforeReply` tin ra sau tin vào cuối → `closed`.
   - Quá `hours`:
     - `after = 'tag_human_agent'` + `sender = 'human'` + còn trong `tagHours` → `tag` (gửi kèm `windowTag = 'human_agent'`).
     - `after = 'tag_human_agent'` + `sender ≠ 'human'` + còn trong `tagHours` → `closed`, `reason = 'window_tag_required'`.
     - `graceAfterWindow` > 0 và số tin ra sau mốc hết hạn < `graceAfterWindow` → `open`.
     - Còn lại → `closed`, `reason = 'window_closed'`.
   - `now` lấy từ `Clock` (003g). `outSinceInbound` đếm tin `out` có `created_at > last_inbound_at` (index Rà #9).
2. **Người gửi** (`sender`):
   - `human` = action nguồn `ui` do người bấm (`message.send` từ Hộp thư / 360°).
   - Còn lại là `automation`: AI agent, Trợ lý thay người, follow-up, báo giá / đơn / phiếu thu tự gửi, chiến dịch, system. **Không bao giờ dùng tag** — tag HUMAN_AGENT của Meta chỉ cho người thật trả lời (chính sách nền tảng). Trong cửa sổ, agent gửi như người (DC-921).
   - `SendJob` thêm `sender` (thiếu = `automation`).
3. **Tham số kênh** (adapter 048d / 048e / 048h khai, 048b chỉ hỗ trợ):

   | Kênh | `hours` | `after` | Thêm |
   |---|---|---|---|
   | `zalo_oa` | 168 | `blocked` | — |
   | `facebook` / `instagram` | 24 | `tag_human_agent` | `tagHours` 168 |
   | `tiktok_messaging` | 48 | `blocked` | `maxBeforeReply` 10, `graceAfterWindow` 3 |

4. **Kiểm sớm** ở `outbound.ts` (`writeOutgoing`, trước khi ghi tin): `closed` → 409 `window_closed` / `window_tag_required`, không ghi tin, không enqueue. `tag` → ghi tin + `windowTag`.
5. **Chốt cuối** ở `send.processor.ts` (sau cap chủ động, trước guard / `adapter.send`): tính lại với `now` lúc gửi.
   - `closed` → tin `failed` lý do cuối `window_closed` (hoặc `window_tag_required`), **không thử lại, không gọi kênh**, metric `channel_send_window_blocked_total{type}`.
   - Tin `tag` mà quá `tagHours` lúc gửi → cũng `closed`.
5b. **Giới hạn tốc độ nền tảng** ở `send.processor.ts` (móc cho 048d / 048e / 048h, bổ sung 2026-11-14): adapter ném `ChannelOperationError('rate_limited', { retryAfterMs })` — mã nghiệp vụ `provider_rate_limited` (048d / 048e / 048h gọi theo tên này) — (429 / mã giới hạn của nền tảng, vd Zalo −32, Meta 613) → hoãn job theo `retryAfterMs` (mặc định 60 giây, trần 15 phút; BullMQ `moveToDelayed`), **không** tính vào chuỗi 3 lỗi / 10 phút tự tạm dừng, **không** đánh dấu tin `failed`, không tăng `attempts` chuyển `failed`; metric `channel_send_rate_limited_total{type}`. Lỗi `provider_rate_limited` (429) chỉ trả cho người gọi khi action đồng bộ gặp giới hạn (vd `comment.*` gọi thẳng).
   - Job chạy lại sau khi hoãn vẫn qua chốt cửa sổ ở mục 5: hết cửa sổ trong lúc hoãn → `window_closed` cuối, không gọi kênh.
   - Giới hạn chung của App (Zalo 4.000 / phút mọi OA): limiter mức App do 048d (`app-limiter.ts`); 048b chỉ hoãn job.
6. **Không mở chiến dịch marketing** cho kênh mới: giữ `marketing/state.ts`, `campaign-read.service.ts` (chỉ Zalo cá nhân + Email).


### 8. Danh sách kênh cứng → registry
1. Helper `core/channels/services/channel-kinds.ts`:
   - `sendableType(type, kind: 'text' | 'file')` = type có trong registry, không `coming_soon`, `capabilities.send` có `kind`.
   - `isLiveType(type)` = có trong registry, không `coming_soon`.
2. `quote-send.ts` ~L14, `order-confirmation.handler.ts` ~L37, `receipt-send.handler.ts` ~L46: thay mảng 3 kênh bằng `sendableType(conv.channelType, 'file')`. Nhánh dự phòng giữ như cũ. Kiểu `QuoteChannel` mở thành `string` đã kiểm (kiểm DTO / input action ở Rà: input `channel` của action giữ `auto` + 3 kênh cũ nếu FE chưa cần chọn kênh mới).
3. `ai-complaint.consumer.ts` ~L34: kênh ticket = `conv.channelType` nếu nằm trong `TICKET_CHANNELS`, ngược lại `webchat` như cũ.
4. `calendar-follow-ups.ts` ~L24: `last_channel` thuộc `APPOINTMENT_SOURCES` thì giữ, ngược lại `staff`.
5. `shared` không import `channels`: `TICKET_CHANNELS` / `APPOINTMENT_SOURCES` / `CONTACT_SOURCES` thêm thẳng 4 type D62 (`zalo_oa`, `facebook`, `instagram`, `tiktok_messaging` — nguồn khách dùng nhãn `tiktok`). Test gác `packages/core/test/channel-kinds.test.ts`: mọi type registry có `send` (trừ `coming_soon`, trừ type `via`) phải có trong ba danh sách.
6. `shared/crm/labels.ts`: `CONTACT_SOURCES` + `zalo_oa`, `facebook`, `instagram`, `tiktok`; `SOURCE_STYLE` màu từ token thương hiệu có sẵn (thiếu thì dùng token trung tính, ghi report); `sourceOfChannel`: `zalo_oa → zalo_oa`, `facebook | messenger → facebook`, `instagram → instagram`, `tiktok_messaging → tiktok`. Nhãn `messages/{vi,en}/customers.json` `source.*`.
7. Không đụng `login-attempt.ts` (QR Zalo), `marketing/*`.

### 9. Danh mục kênh cho FE + env
1. `shared/api/channels.ts` thêm `channelCatalogItemSchema`:
   - `{ type, label_key, icon, group, status: 'ga' | 'beta' | 'coming_soon', connect_kind, oauth: { provider, picker } | null, via: string | null, sync: string[], window: { hours, after, tag_hours } | null, send: string[], max_text_length }`.
   - Nhóm kênh ở `GET /settings/channels` thêm cùng các trường; tài khoản thêm `external_id` và `grant: { status, access_expires_at, refresh_expires_at } | null` (đọc lô `oauth_grant`, không N+1, không trả token).
2. `GET /inbox/connect-channels` (`meta.service.ts`) trả mảng `channelCatalogItemSchema` đủ mọi type registry (cả `coming_soon`). `connectChannelsSchema` chỉ thêm trường, client cũ không vỡ.
   - Trường mới để `.optional()` ở 048b: mock FE hiện có (`inbox-shape.test.ts`, mock `settings-apps.ts`) vẫn parse. 048c điền mock rồi mới dùng.
3. Chỉ đọc manifest, không `switch(type)`.
4. Env (`channels.env.ts` + `.env.example`, khối "Kênh webhook"):
   - `CHANNEL_HOOKS_MAX_BYTES=1048576` · `CHANNEL_HOOKS_CONCURRENCY=4` · `CHANNEL_HOOK_RETENTION_DAYS=7` · `CHANNEL_ECHO_MATCH_SECONDS=120`.
   - Secret theo kênh (`META_APP_SECRET`…) do 048d / 048e / 048h thêm. `HOOKS_PUBLIC_URL` của 048.

### 10. Lỗi (i18n server `channels.ts` vi + en)
| Mã | HTTP | Khi nào |
|---|---|---|
| `window_closed` | 409 | Ngoài cửa sổ, không có đường tag |
| `window_tag_required` | 409 | Ngoài cửa sổ, chỉ người gửi được (tag HUMAN_AGENT) |
| `channel_in_use_elsewhere` | 409 | Page / OA đã gắn workspace khác |
| `comment_unsupported` | 409 | Kênh không có `capabilities.comments` (048f dùng) |
| `private_reply_used` | 409 | Bình luận đã nhắn riêng (048f dùng) |
| `private_reply_expired` | 409 | Quá 7 ngày (048f dùng) |

048b khai đủ 6 mã; ba mã cuối 048f ném.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given kênh webhook giả có route, when POST `/hooks/channels/fake_hook` với chữ ký sai / thiếu header / body > 1MB, then 401 / 401 / 413; `channel_webhook_event` không thêm dòng, queue không có job; log không chứa body | `channel-hooks.test.ts` + `webhook.test.ts` |
| 2 | Given cùng một event gửi 3 lần (nền tảng gửi lại), when processor chạy, then 1 biên nhận, `handleWebhook` gọi 1 lần, 1 tin vào Hộp thư; job chạy lại trên biên nhận đã xử lý không gọi adapter | `channel-hooks.test.ts` |
| 3 | Given một POST có 3 mục cho 2 workspace + 1 mục không có route, when gửi, then 200 trong < 2 giây; mỗi workspace có đúng biên nhận của mình; mục lạ bị bỏ (metric `unrouted`); DB tenant lỗi → 503 | `channel-hooks.test.ts` (đo thời gian) |
| 4 | Given Page `P` đã gắn workspace A, when workspace B gọi `channel.oauth_select` chọn `P`, then 409 `channel_in_use_elsewhere`, B không có tài khoản mới, route vẫn của A; A ngắt kết nối → B chọn lại được | `channel-oauth-select.test.ts` |
| 5 | Given gói còn 1 kênh trống, when chọn 2 Page một lần, then Page 1 tạo, Page 2 trả lỗi hạn mức của `QuotaService`; nối lại Page đã có không tính thêm (Q-907 chốt, DC-923) | `channel-oauth-select.test.ts` |
| 6 | Given pending của user khác / hết hạn, when `channel.oauth_select`, then 400 `oauth_state_invalid`; given grant bị thu hồi (`oauth.grant_revoked`), then tài khoản dùng grant → `expired` + thông báo; `channel.reauthorize` trả `authorize_url` có `ref` | `channel-oauth-select.test.ts` |
| 7 | Given hội thoại `fake_hook` có tin khách cuối 25 giờ trước, when agent / follow-up / chiến dịch gửi, then 409 `window_tag_required`, không ghi tin; when người bấm gửi (nguồn `ui`), then tin ghi với `windowTag = 'human_agent'`, adapter nhận tag; 8 ngày → 409 `window_closed` | `send-window.test.ts` (integration) + `packages/core/test/send-window.test.ts` |
| 8 | Given tin đã enqueue lúc cửa sổ còn mở, when nhảy `Clock` qua hạn trước khi job chạy, then tin `failed` lý do cuối `window_closed`, adapter không được gọi, không thử lại | `send-window.test.ts` (integration) |
| 9 | Given biến thể 48 giờ / 10 / +3, when gửi tin thứ 11 trước khi khách trả lời, then 409 `window_closed`; quá 48 giờ gửi được thêm 3 tin, tin thứ 4 bị chặn | `packages/core/test/send-window.test.ts` |
| 10 | Given 3 kênh cũ (không có `window`), when chạy lại test gửi / báo giá / đơn / phiếu thu / ticket / lịch hẹn hiện có, then hành vi không đổi; hội thoại kênh webhook giả gửi báo giá đi đúng kênh của hội thoại; chiến dịch vẫn chỉ Zalo cá nhân + Email | `send-window.test.ts` + integration `quotes` / `orders` / `payments` / `channels` có sẵn + `channel-kinds.test.ts` |
| 11 | Given `contract.test.ts` có driver kênh webhook giả, when chạy, then normalize / dedupe / send / probe / rate limit pass; registry thiếu `connect.oauth` cho kênh `oauth` → lỗi khởi động | `pnpm --filter @appchat/channels test` |
| 12 | Given 200k biên nhận (2% chưa xử lý), when EXPLAIN truy vấn sweeper (chờ quá 2 phút, LIMIT 500) và dọn > 7 ngày, then Index Scan trên index partial §3.1, không Seq Scan; EXPLAIN đếm tin ra sau mốc của một hội thoại dùng index `message` | EXPLAIN (ANALYZE, BUFFERS) dán report |
| 13 | Given adapter giả ném `rate_limited` (`retryAfterMs` 30 000) 3 lần liên tiếp trong 10 phút, when `send.processor` chạy, then job hoãn 30 giây mỗi lần, tin vẫn `pending`, tài khoản KHÔNG tự tạm dừng; lần 4 thành công → tin `sent` | `apps/api/test/integration/send-window.test.ts` |
| 14 | Given tin AppChat đang gửi chưa có `external_msg_id`, when echo cùng tin tới trước ACK rồi ACK tới, then chỉ 1 tin `out`, có `external_msg_id`; echo của tin shop gửi từ app nền tảng → 1 tin `out` nguồn `external`; echo lặp lại → không thêm tin | `channel-hooks.test.ts` + `packages/core/test/echo-match.test.ts` |

- Nền tảng thật (Zalo OA / Meta / TikTok) chưa có adapter ở 048b: mọi AC chạy bằng kênh giả. Ghi "chưa nghiệm thu với provider thật" — nghiệm thu ở 048d / 048e / 048h.

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{channels,shared,actions,db,core,api}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check`.
- DB: `pnpm --filter @appchat/db run db:generate` → `db:migrate-tenants` → `db:setup`; rồi `psql … -d appchat_tenant_template -c "SELECT name FROM _appchat_migrations ORDER BY name DESC LIMIT 3;"` thấy `20261115110000_channel_webhooks`; DB nền tảng thấy `20261115110100_channel_webhook_route`.
- Unit: `pnpm --filter @appchat/channels test` · `pnpm --filter @appchat/core exec vitest run test/send-window.test.ts test/channel-kinds.test.ts test/echo-match.test.ts`.
- Integration (`--workers=1`, chờ slot Postgres): `pnpm --filter @appchat/api test:integration -- test/integration/channel-hooks.test.ts test/integration/channel-oauth-select.test.ts test/integration/send-window.test.ts test/integration/channels.test.ts test/integration/quotes.test.ts test/integration/orders.test.ts test/integration/payments.test.ts`.
- EXPLAIN như AC12.

## CONSTRAINTS
- **DO NOT:**
  - `switch(type)` / `if (type === …)` ở core, inbox, sales, support (chỉ đọc manifest).
  - Xử lý tin, gọi API nền tảng hay gọi AI trong request webhook.
  - Trả 2xx khi chữ ký sai; trả lỗi khi chỉ là mục không có route.
  - Log raw body, chữ ký, token; trả token qua API.
  - Lưu token kênh OAuth trong `credentials_enc` (chỉ `oauth_grant` qua `TokenVault`).
  - Dùng tag HUMAN_AGENT cho AI / agent / follow-up / chiến dịch / system.
  - Mở chiến dịch marketing cho kênh mới.
  - Thêm permission mới; cấp `channel.oauth_select` cho agent.
  - Thêm `workspace_id` vào bảng tenant; FK sang `oauth_grant`.
  - Nhồi action vào `settings-apps.ts` (408 dòng); sửa `apps/worker/src/roles/channels.module.ts`.
  - Bật kênh thật (048d / 048e / 048h) hay dựng UI (048c).
- **REUSE:**
  - `hooks.controller.ts` / `webhook.service.ts` (raw body, `createMany skipDuplicates`, 200 nhanh).
  - `email.handlers.ts` (`applyTenant` → `finalizePlatform`, bù); upsert route kiểu `connections.service.ts`.
  - Pipeline nhận có sẵn (`InboundSink`); `QuotaService.assert`; `TokenVault` / pending / `oauth.start` của 048.
  - `Clock` (003g); `encryptSecret` / `decryptSecret` (`kernel/crypto.ts`); mẫu HMAC `webchat/visitor-token.ts`.
- **SKIP:**
  - Adapter Zalo OA / Meta / TikTok, data deletion Meta (048d / 048e / 048h).
  - Bình luận, livestream (048f / 048g) — chỉ khai kiểu.
  - UI kết nối, drawer, chip Hộp thư (048c).
  - Đổi luật hạn mức gói (Q-907 do Chủ nhà chốt).

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync` lúc ghép (Chủ thầu).
- [x] Khớp DC-910 + Blueprint §2.2 / §4.7 / §6: route mức App, biên nhận idempotent, một Page / OA một workspace, cửa sổ hai chỗ.
- [x] Index theo indexing.md (partial chờ xử lý / dọn, index đếm tin ra), EXPLAIN ở AC12.
- [x] 14 AC đo được; ô cần nền tảng thật ghi "chưa nghiệm thu với provider thật".
- **Gap đã khai:**
  - Tham số cửa sổ từng nền tảng do adapter khai (048d / 048e / 048h); 048b chỉ thử bằng kênh giả.
  - Đổi URL route khỏi omnichannel-adapter quy tắc 8 (`/:accountKey` → `/:type` mức App) theo DC-910; standard sửa ở nhánh docs.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; BE 200–400 dòng, trần 600.
- [ ] AC 1–14 có kết quả từng cái, dán output thật (`pnpm …`, EXPLAIN); ô nền tảng thật ghi "chưa nghiệm thu với provider thật".
- [ ] **Kênh (BUILDER-HANDOFF + omnichannel-adapter):** core / UI chỉ đọc manifest, không `switch(type)`; gửi luôn qua outbox + limiter của kênh; credential / token mã hoá, không log, không trả API.
- [ ] **Action-first:** `channel.oauth_select` / `channel.reauthorize` chạy qua `ActionExecutor`; webhook vào pipeline qua queue, không ghi tắt.
- [ ] **Tenant DB:** không `workspace_id`; chạy CẢ `db:generate` → `db:migrate-tenants` → `db:setup`; template có migration mới.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
