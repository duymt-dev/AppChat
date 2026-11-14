# TIP-048f — Bình luận bài đăng Facebook / Instagram vào Hộp thư (Kênh, D62)

## HEADER
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 048f before051.
- **Parallel-safe with TIP-051b (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`; integrate 048f before051b.
- **Parallel-safe with TIP-051c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 048f before051c.
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/test/assistant-coverage.test.ts`; integrate 048f before049.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048f before049d.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/inbox.ts`; integrate 048b before048f.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048c before048f.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `packages/channels/src/facebook/adapter.ts`, `packages/channels/src/facebook/manifest.ts`, `packages/channels/src/facebook/normalize.ts`, `packages/channels/src/instagram/adapter.ts`, `packages/channels/src/instagram/manifest.ts`, `packages/channels/src/instagram/normalize.ts`, `packages/channels/src/meta/webhook.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 048e before048f.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/MessageBubble.tsx`, `apps/web/src/features/inbox/components/MessageMenu.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/channels/src/operations.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/channels/jobs/provider-operations.processor.ts`, `packages/core/src/channels/operations/provider-event.ts`, `packages/core/src/channels/operations/types.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/inbox/services/view.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before048f.
- **Parallel-safe with TIP-045 (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 048f before045.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 048f before046.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/channels/src/facebook/manifest.ts`, `packages/channels/src/instagram/manifest.ts`, `packages/channels/src/meta/webhook.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/inbox/comments/comment-reply.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/test/assistant-coverage.test.ts`, `packages/db/prisma/tenant/social.prisma`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 048f before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 048f before048h.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/db/test/prisma-stubs.test.ts`; integrate 048 before048f.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `packages/channels/src/operations.ts`, `packages/core/src/channels/operations/provider-event.ts`; integrate 048d before048f.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`; integrate 003b before048f.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003c before048f.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before048f.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 004b before048f.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before048f.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before048f.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before048f.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/pipeline.ts`; integrate 013c before048f.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 014c before048f.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/reply/reply-context.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before048f.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/channels/operations/provider-event.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/inbox/services/view.ts`, `tools/parity/parity.manifest.ts`; integrate 015c before048f.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/db/prisma/tenant/inbox.prisma`, `tools/parity/parity.manifest.ts`; integrate 015d before048f.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/inbox/repos/conversations.repo.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/inbox/services/view.ts`, `tools/parity/parity.manifest.ts`; integrate 015e before048f.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/repos/conversations.repo.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 015f before048f.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/reply/reply-context.ts`, `tools/parity/parity.manifest.ts`; integrate 019b before048f.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/Composer.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/db/test/prisma-stubs.test.ts`, `tools/parity/parity.manifest.ts`; integrate 019c before048f.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 020b before048f.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatPanel.tsx`, `apps/web/src/features/inbox/components/Composer.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/inbox.ts`; integrate 020c before048f.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatPanel.tsx`, `apps/web/src/features/inbox/components/Composer.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 020d before048f.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 020e before048f.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatPanel.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/inbox/services/view.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before048f.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/channels/operations/provider-event.ts`, `packages/core/src/inbox/services/outbound.ts`, `packages/db/prisma/tenant/inbox.prisma`; integrate 022c before048f.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/test/assistant-coverage.test.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 023b before048f.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatPanel.tsx`, `apps/web/src/features/inbox/components/Composer.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before048f.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023d before048f.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 023e before048f.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023f before048f.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023g before048f.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/api/src/http/inbox/conversations.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatPanel.tsx`, `apps/web/src/features/inbox/components/Composer.tsx`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/components/MessageBubble.tsx`, `apps/web/src/features/inbox/components/MessageMenu.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/channels/src/operations.ts`, `packages/core/src/channels/jobs/provider-operations.processor.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/repos/conversations.repo.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 025b before048f.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before048f.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before048f.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 027b before048f.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/MessageBubble.tsx`, `packages/actions/src/index.ts`, `packages/core/test/assistant-coverage.test.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before048f.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 030c before048f.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 031b before048f.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before048f.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032c before048f.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032d before048f.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 032e before048f.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before048f.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatPanel.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 033c before048f.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before048f.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034c before048f.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034d before048f.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/reply/reply-context.ts`; integrate 036 before048f.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before048f.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before048f.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before048f.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before048f.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 040 before048f.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 041 before048f.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 042 before048f.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/pipeline.ts`, `tools/parity/parity.manifest.ts`; integrate 042b before048f.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/db/prisma/tenant/inbox.prisma`; integrate 042c before048f.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before048f.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/db/prisma/tenant/inbox.prisma`, `tools/parity/parity.manifest.ts`; integrate 045b before048f.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `packages/db/test/prisma-stubs.test.ts`; integrate 047b before048f.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/test/assistant-coverage.test.ts`; integrate 047c before048f.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 047d before048f.
- **TIP-ID:** TIP-048f · **Project:** AppChat V2 · **Module:** Kênh — bình luận bài đăng (Hộp thư) · **Priority:** P0 · **Estimated:** XL (3 pha: P1 schema + nhận; P2 action + adapter; P3 giao diện)
- **Depends on:** 048b, 048c, 048e và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 048g, 048h, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 048b: `thread` trong `NormalizedInbound`, `mode` / `targetExternalId` trong `OutboundMessage`, `capabilities.comments` / `sync`; ingress `/hooks/channels/:type` + biên nhận `channel_webhook_event` + hàng đợi `channel-hooks`; cửa sổ gửi `send-window.ts`; lỗi `comment_unsupported` / `private_reply_used` / `private_reply_expired`.
  - 048c: khối Đồng bộ theo năng lực — công tắc "Bình luận" mỗi tài khoản.
  - 048e: adapter Facebook Page / Instagram, webhook Meta (`X-Hub-Signature-256`, split `entry[]`), Graph client, quyền App Review.
  - 048g (livestream) và 048h (bình luận TikTok) dùng lại bảng `social_post`, hội thoại `comment` và action `comment.*` của TIP này.
- **Files touched:** [exact M/C manifest](manifests/TIP-048f-files.md). File prisma mới `tenant/social.prisma` (chủ 048f; 048g thêm bảng live). Sửa có chủ đích `tenant/inbox.prisma` (TIP khác sở hữu) và CHECK `channel_operation_kind_check` của TIP-014b. File gần trần (`pipeline.ts`, mock `domains/inbox.ts`) chỉ nhận facade 1–2 dòng.
- **Quyết định nguồn:** D62 (#3) · DC-914 · DC-913 · DC-910 · **DC-921 (Q-911 / Q-912 Chủ nhà chốt 2026-11-14: AI agent là nhân viên — chat thẳng, làm thẳng, không gợi ý, không luật riêng cho agent)** · PD-904 · REQ-B13 · `standards/channels/omnichannel-adapter.md` (Thao tác trên tin / nhóm).
- **Dòng COVERAGE nhận:** REQ-B13 · REQ-B17 · D62-comments · PD-904 · DC-914 · DC-921 · Q-911 · Q-912

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. DB tenant riêng mỗi workspace (`TenantDbResolver`): không `workspace_id`, không RLS.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Pipeline tin vào** `packages/core/src/inbox/services/pipeline.ts` (~231 dòng, gần trần):
    - policy ~L79–85 → dedupe ~L93–95 → hội thoại ~L96 → khách ~L98–111 → khoá ~L113 → tạo / cập nhật hội thoại ~L119–170 (`kind` theo `isGroup` ~L152) → INSERT tin ~L173–178 → participant → thống kê ~L194–198 → outbox ~L206.
    - `wantsAgent` ~L50–56: kích agent khi `ai_mode` ≠ off.
  - **`inbox.prisma`** (~313 dòng): `ConversationKind` direct | group ~L6–11; `Conversation` ~L120–179, unique(channel_account_id, external_thread_id) ~L175; `Message` ~L183–211 (`replyToId` nội bộ, `recalledAt`, `deletedAt`, `origin`), unique(channel_account_id, external_msg_id).
  - **Lệnh bền** (TIP-014b):
    - `channel-operations.prisma` `ChannelOperation` ~L58–82, `kind` text + CHECK `channel_operation_kind_check` IN ('recall','react') (migration `20261102001420_provider_operations` ~L50).
    - `OperationKind` ở `packages/channels/src/operations.ts` ~L9 và `packages/core/src/channels/operations/types.ts` ~L5.
    - `requestOperation` (`operation-service.ts` ~L22) ghi lệnh + event cùng commit → 202 `job_accepted`.
    - Worker `provider-operations.processor.ts`: `queued → dispatch_reserved` rồi gọi kênh (~L186–210 `recall` / `react`); kết quả qua `applyOperationResult` (`provider-event.ts`).
    - Worker thao tác chỉ mở ở `onStarted` của phiên lease (`channels.jobs.module.ts` ~L110–117). Kênh webhook (`StatelessChannels` ~L151) chỉ mở worker gửi.
  - **Gửi:** `outbound.ts` `writeOutgoing` ~L60–119 (`isGroup` ~L73, `replyToExternalMsgId` ~L77, `emailOutboundExtras` ~L79) → outbox → `send.processor.ts`. Handler `message.send` ở `message.handlers.ts` ~L61–90 (`agentTurnOf` ~L66).
  - **AI:** `agent-turn.ts` (5 dòng) `agentTurnOf`. `reply.service.ts` (343 dòng): `copilot = aiMode === 'copilot'` ~L97; agent gửi câu trả lời qua `send()` ~L65–79 = `message.send` nguồn `agent` + `servedConversationId` (policy §3.3: agent send trong hội thoại đang phục vụ → chạy ngay, `policy.ts` ~L49); tự trả lời khi `aiMode === 'auto'` ~L271. `reply-tools.ts` ~L137 bỏ `message.send` khỏi tool (câu trả lời cuối do `send()` gửi). `pipeline.ts` `wantsAgent` ~L50–56 chỉ chặn nhóm theo `group_ai_policy` — hội thoại `comment` đi như direct. `greeting.ts` ~L66 chỉ chào hội thoại `direct`. Mặc định `ai_mode` hội thoại mới theo cài đặt tài khoản (`pipeline.ts` ~L160). `conversation.set_ai_mode` (`actions/src/inbox.ts` ~L124; handler `conversation-state.handlers.ts`).
  - **Danh sách:** `conversations.repo.ts` `ConvFilter` ~L10–17, `listConversationIds` ~L93–107 (keyset `(last_message_at, id)`), `folderCounts` ~L127. Tab ở `read.service.ts` ~L82 (7 tab). `INBOX_FOLDERS` ở `shared/src/api/inbox.ts` ~L9; `kind` direct | group ~L25. Controller `conversations.controller.ts` ~L34–38.
  - **FE Hộp thư:** `TopTabs.tsx` (38) dựng tab từ `counts.tabs`; `Composer.tsx` (182) chưa có công khai / riêng; `MessageMenu.tsx` (130) `'zalo_personal'` cứng ~L62; `MessageBubble.tsx` (213); `ChatPanel.tsx` (126); `ConvRow.tsx` (103) badge ~L49–60; mock `domains/inbox.ts` 382 dòng (gần trần).
  - **Prototype (bản 2026-11-10):** Hộp thư L1809–2610 không vẽ bình luận. Tab L1893–1899 không có "Bình luận". Menu tin L13022 / hội thoại L13043 không có trả lời công khai / riêng / ẩn. Drawer kênh: khối Đồng bộ "Bình luận" mặc định bật L12485 (048c làm theo năng lực). → mức 2, PD-904.
  - **Meta (khảo sát 2026-11-13):**
    - Webhook Page `feed`: `item = comment`, `verb add | edited | remove` (+ `hide` / `unhide`), gồm bài quảng cáo. IG: field `comments`.
    - Trả lời: FB `POST /{object-id}/comments`; IG `POST /{ig-comment-id}/replies`.
    - Ẩn `POST /{comment-id}` `is_hidden`; xoá `DELETE /{comment-id}`; thích (FB) `POST|DELETE /{comment-id}/likes`.
    - Nhắn riêng `POST /{PAGE-ID}/messages` `recipient: { comment_id }`. FB: 1 tin / bình luận / 7 ngày, nhắn tiếp chỉ khi khách trả lời (mở 24 giờ). IG: 1 tin / 7 ngày (bài / reel), live chỉ khi đang phát (048g).
    - Quyền: `pages_manage_engagement`, `pages_read_user_content`, `pages_read_engagement`, `instagram_manage_comments` — 048e xin cùng App Review (Q-908).
- **Key files to read first:** DC-914, DC-921, D62, PD-904 · TIP-048b §3.2 (hợp đồng) · TIP-048e (adapter Meta) · `standards/channels/omnichannel-adapter.md` · các file nêu trên.
- **Patterns to follow:**
  - Lệnh bền `recall` / `react` của TIP-014b (`requestOperation` → processor → `applyOperationResult`).
  - Ingress → biên nhận → hàng đợi → `adapter.handleWebhook` của 048b.
  - Facade 1–2 dòng vào file gần trần; logic ở `packages/core/src/inbox/comments/`.
  - FE: component mới ở `features/inbox/components/comments/`, hook ở `hooks/`, mock domain riêng.

## APPLICABLE STANDARDS
- [channels/omnichannel-adapter](../standards/channels/omnichannel-adapter.md) — core / UI không `switch (type)`; năng lực khai ở manifest; lệnh `remote` qua `channel_operation`, chỉ ACK mới đổi trạng thái.
- [actions/action-registry](../standards/actions/action-registry.md) · [api/response-envelope](../standards/api/response-envelope.md) — action `comment.*`, risk `send` / `delete`, preview, 202 `job_accepted`.
- [events/outbox](../standards/events/outbox.md) — gửi qua outbox + limiter; payload chỉ id.
- [database/tenant-db](../standards/database/tenant-db.md) · [database/indexing](../standards/database/indexing.md) — partial index, keyset, EXPLAIN 100k.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — `inbox.reply` / `inbox.manage`, scope `inbox`.
- [domain/concurrency](../standards/domain/concurrency.md) · [domain/state-machine](../standards/domain/state-machine.md) — nhắn riêng một lần dưới khoá; trạng thái lệnh.
- [domain/gap-filling](../standards/domain/gap-filling.md) — hành vi gửi ra mới đã chốt (DC-921: agent là nhân viên); không thêm permission (Q-912).
- [ui/frontend-structure](../standards/ui/frontend-structure.md) · [ui/prototype-parity](../standards/ui/prototype-parity.md) (§6b mức 2) · [ui/interaction-patterns](../standards/ui/interaction-patterns.md) · [i18n/i18n](../standards/i18n/i18n.md).
- [ops/observability-security](../standards/ops/observability-security.md) — không log nội dung bình luận / token.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` mới nhất, sau khi 048b, 048c, 048e đã merge.
   - `python -X utf8 tools/obligations/manifests.py 048f`. Tích hợp trước các TIP chung file.
   - Kiểm lại mọi số dòng `~` ở CONTEXT. Lệch → sửa TIP, thêm dòng "Rà lại <ngày>".
2. Đọc lại tài liệu Meta bản mới nhất theo `META_GRAPH_VERSION` của 048e: field `feed` / `comments`, nhắn riêng, giới hạn. Khác ghi chú → sửa `provider-capabilities.md` (048e) + ghi report.
3. Đổi mốc `20261115120000_social_comments` nếu dev đã có migration mới hơn. Ghi DV kèm tên mới; báo 048g.
4. Kiểm 048b đã có đúng hợp đồng §3.2: `thread`, `mode`, `targetExternalId`, `capabilities.comments`, `sync`. Kiểm 048e đăng ký field `feed` / `comments` khi `subscribed_apps`. Thiếu → escalation L2, không tự sửa file 048b.
5. Kiểm CHECK `channel_operation_kind_check` còn đúng tên. Đếm `channel_operation` hiện có (migration chỉ nới CHECK, không đổi dòng cũ).
6. EXPLAIN list "Tất cả" / "Của tôi" hiện tại làm mốc trước khi lọc `kind <> 'comment'` (AC8).
7. Kiểm `executor.ts` ~L148 (`served` theo `conversation_id` input) với `comment.private_reply` của agent: input mang `conversation_id` của hội thoại bình luận đang phục vụ → policy chạy ngay. Khác → sửa trong handler (không đổi `policy.ts`), ghi report.

## TASK
Đưa bình luận bài đăng Facebook Page / Instagram vào Hộp thư thành loại hội thoại riêng; nhân viên — người hoặc AI agent (DC-921) — trả lời công khai, nhắn riêng, ẩn, xoá, thích.
- **Pha 1:** `social.prisma` + migration; nhận webhook `feed` / IG `comments` → hội thoại `comment`, sửa / xoá / ẩn, tin của chính Page.
- **Pha 2:** 6 action `comment.*`; adapter gửi theo `mode`; lệnh bền ẩn / xoá / thích; nhắn riêng một lần / 7 ngày; agent trả lời bình luận như tin direct (DC-921).
- **Pha 3:** tab "Bình luận", thẻ bài đăng, Công khai / Nhắn riêng, menu bình luận; mock, i18n, parity mask PD-904, e2e.

## SPECIFICATIONS

### 1. Dữ liệu (pha 1) — `social.prisma` + migration `20261115120000_social_comments`
- Dòng đầu: `// tenant/social.prisma — sở hữu: TIP-048f (02-TASK-GRAPH.md → Bản đồ sở hữu file).`. Không Prisma relation xuyên domain; FK nội DB viết SQL.

| Bảng / cột | Nội dung | Ràng buộc / index |
|---|---|---|
| `social_post` | id, channel_account_id, external_post_id, kind (`post · video · reel · live · ad`), permalink null, caption null (≤ 2000), media_url null, published_at null, comments_count int default 0, last_comment_at null, created_at, updated_at | unique(channel_account_id, external_post_id); FK channel_account ON DELETE CASCADE |
| `social_comment` | message_id (pk), liked_at null, private_reply_at null, private_reply_message_id null, private_reply_conversation_id null, private_reply_eligible bool null (kênh báo riêng từng bình luận — 048h TikTok) | FK message ON DELETE CASCADE; dòng tạo khi thích / nhắn riêng / kênh báo đủ điều kiện |
| `conversation.kind` | enum `ConversationKind` thêm `comment` | — |
| `conversation.post_id` | uuid null → `social_post` | FK ON DELETE SET NULL; idx `(post_id, last_message_at DESC) WHERE post_id IS NOT NULL` |
| list tab Bình luận | — | idx `conversation (kind, last_message_at DESC, id DESC) WHERE kind = 'comment'` |
| `message.hidden_at` | timestamptz null — ẩn (từ AppChat sau ACK, hoặc từ kênh) | — |
| `message.external_parent_id` | text null — id bình luận cha phía kênh | — |
| `channel_operation_kind_check` | thêm `comment_hide`, `comment_unhide`, `comment_delete`, `comment_like` | `DROP CONSTRAINT … ADD CONSTRAINT` cùng migration |

- `social_comment` là bảng thêm so với brief: giữ khoá nhắn riêng một lần (PK + điều kiện `private_reply_at IS NULL`) và trạng thái thích, không thêm cột lên `message`.
- `prisma-stubs.test.ts`: OWNERS `social: '048f'`, tổng file + 1.
- Ba lệnh DB (CLAUDE.md §7) — §10.

### 2. Nhận bình luận (pha 1) — `comment-inbound.ts`
1. **Adapter** (`facebook/comments.ts`, `instagram/comments.ts`; gọi từ `normalize.ts` / `adapter.ts` của 048e):
   - `meta/webhook.ts` (048e) phân loại field: `feed` (`item = comment`) và IG `comments` → `HookItem.kind = 'comment'` (thêm nhánh, không đổi chữ ký / route).
   - `handleWebhook` đổi thành `NormalizedInbound` có `thread: { kind: 'comment', post: { externalId, kind, permalink?, caption?, mediaUrl?, publishedAt? }, parentExternalId? }`; `externalMsgId` = id bình luận; người gửi = `from.id`.
   - Thiếu permalink / caption / ảnh → adapter gọi `GET /{post-id}` (FB) hoặc `GET /{media-id}` (IG) một lần, LRU trong tiến trình (1.000 bài, 10 phút). Lỗi → để trống, không chặn.
   - `verb edited` / `remove` / `hide` / `unhide` → `sink.event({ kind: 'comment_changed', accountId, key, commentId, change: 'edited' | 'removed' | 'hidden' | 'unhidden' | 'private_reply_eligible', body?, at })` (`ProviderEvent` mới ở `operations.ts`), không qua pipeline tin vào.
   - Bài live (`media_product_type = LIVE`, `live_videos`) → bỏ ở 048f, 048g nhận.
2. **Core** — `pipeline.ts` rẽ `thread.kind === 'comment'` sang `ingestComment(tx, inbound)` (facade 1–2 dòng):
   - Tài khoản tắt đồng bộ bình luận (`settings.sync.comments = false`, 048c) → biên nhận `ignored`.
   - Upsert `social_post` theo (account, external_post_id); tăng `comments_count`, `last_comment_at`.
   - Khoá thread `external_thread_id = 'c:<post_external_id>:<author_external_id>'`. Hội thoại `kind = 'comment'`, `post_id`, khách theo `contact_identity` (account, author id) như tin direct.
   - Dedupe theo unique(channel_account_id, external_msg_id). Lặp webhook → không tạo tin mới.
   - `message.external_parent_id` = id bình luận cha. Trả lời của người khác dưới bình luận của X vào hội thoại của chính người trả lời.
   - Bình luận do chính Page / tài khoản IG viết (`from.id` = id tài khoản): tin đã gửi từ AppChat → trùng `external_msg_id` (kết quả gửi đã ghi) → bỏ. Viết ngoài AppChat → tin `out` vào hội thoại của tác giả bình luận cha; không tìm thấy cha → `ignored`.
   - Phân công, SLA, thông báo theo cài đặt tài khoản như tin direct. `last_inbound_at` vẫn cập nhật (048b) nhưng không mở cửa sổ nhắn tin direct.
3. **Sự kiện đổi phía kênh** (`comment-ops.ts`, gọi từ `provider-event.ts`):
   - `edited` → cập nhật `body`, phát `message.updated`.
   - `remove` → `deleted_at`; `hide` / `unhide` → `hidden_at`. Phát `message.updated`.
   - `private_reply_eligible` → `social_comment.private_reply_eligible = true` (048h dùng cho bình luận TikTok đủ điều kiện).
   - Sự kiện tới trước tin gốc → `ignored` (không tạo tin rỗng).

### 3. Action (pha 2) — `packages/actions/src/inbox-comments.ts` (module `inbox`)
| Action | Risk | Quyền | agentGrantable | Ghi chú |
|---|---|---|---|---|
| `comment.reply` | send | `inbox.reply` + scope | true | Input `{ conversation_id, message_id, text (1–8000), attachment_id? }`. Kênh cần `capabilities.comments.publicReply`. Tin `out` vào hội thoại bình luận, `mode: 'public_reply'`, `targetExternalId` = id bình luận. Idempotency-Key |
| `comment.private_reply` | send | `inbox.reply` + scope | true | Input `{ message_id, text (1–2000) }`. Kênh cần `privateReply`. Một lần / bình luận; ≤ 7 ngày từ lúc bình luận (giờ kênh). Tin vào hội thoại direct cùng khách (§4). Idempotency-Key |
| `comment.hide` · `comment.unhide` | write | `inbox.manage` + scope | true | Lệnh bền `comment_hide` / `comment_unhide` → 202. `hide` có hoàn tác bằng `comment.unhide` |
| `comment.delete` | delete | `inbox.manage` + scope | false | Lệnh bền `comment_delete` → 202. Không hoàn tác; preview cảnh báo "xoá trên Facebook / Instagram" |
| `comment.like` | write | `inbox.reply` + scope | true | Input `{ message_id, liked: boolean }`. Lệnh bền `comment_like`, ý định mới thay lệnh cũ còn `queued` (như `react`) |

- Mọi action có `preview()` (assistant-coverage). Preview gửi nêu kênh, bài, người nhận, chế độ.
- **Kiểm trước mọi ghi:** hội thoại `kind = 'comment'` (ngược lại 409 `INVALID_STATE`); năng lực thiếu → 409 `comment_unsupported`; tin đích đã xoá → 409 `INVALID_STATE`.
- **Agent là nhân viên (DC-921):** mọi nguồn chạy theo bảng nguồn × rủi ro §3.3 có sẵn (`policy.ts`), không thêm luật riêng. Agent trực kênh gọi `comment.reply` / `private_reply` trên hội thoại đang phục vụ → chạy ngay như `message.send`; `comment.delete` (risk `delete`) với agent → bị cấm sẵn theo bảng (`agentGrantable: false`). Nhắn riêng đích là hội thoại direct khác: `servedConversation` tính theo `conversation_id` nguồn (bình luận) → handler truyền `conversation_id` của hội thoại bình luận (Rà #7).
- **Không thêm permission (Q-912).** Thiếu quyền → 403; ngoài scope → 404.
- Nhãn `actions.comment__*.title` vi + en. Ô `message_id` có đường tra (`GET /v1/inbox/conversations/:id/messages`).

### 4. Nhắn riêng — `private-reply.ts` (pha 2)
1. **Một lần / bình luận:** trong transaction, `INSERT social_comment … ON CONFLICT (message_id) DO UPDATE SET private_reply_at = $now WHERE social_comment.private_reply_at IS NULL RETURNING`. Không trả dòng → 409 `private_reply_used`. Hai người bấm cùng lúc: một người thắng.
2. **Hạn 7 ngày:** `now − message.created_at` (giờ kênh của bình luận) > 7 ngày → 409 `private_reply_expired`. Số giờ khai ở manifest (`comments.privateReplyHours`, mặc định 168) — không `switch (type)`.
   - Đủ điều kiện = `(manifest.comments.privateReply && social_comment.private_reply_eligible !== false) || private_reply_eligible === true`. Không đủ → 409 `comment_unsupported`. Cờ từng bình luận do kênh báo (048g live, 048h TikTok) — cùng hàm với `can` ở §7.
3. **Hội thoại đích:** hội thoại direct cùng khách trên cùng tài khoản.
   - Đã có hội thoại direct với khách (theo `contact_identity` đã ghép PSID / IGSID) → nối vào.
   - Chưa có → tạo hội thoại direct `external_thread_id = 'pr:<comment_id>'`, cùng khách, cùng người phụ trách.
   - ACK gửi trả `recipient_id` → đổi `external_thread_id` sang id người nhận (cùng transaction, dưới khoá). Đã có hội thoại khác mang id đó → ghi tin vào hội thoại sẵn có, hội thoại `pr:` đóng (ghi report nếu gặp).
4. **Gửi:** `writeOutgoing` với `comment: { mode: 'private_reply', targetExternalId: <comment_id> }` → `OutboundMessage.mode` / `targetExternalId` (048b). `send-window.ts` không áp cho tin nhắn riêng đầu tiên (hạn của nó là bước 2).
5. **Sau khi gửi:** tin tiếp theo trong hội thoại direct theo cửa sổ 24 giờ của 048b — mở khi khách trả lời. Bình luận nguồn hiện chip "Đã nhắn riêng" + link sang hội thoại direct.
6. **Lỗi:** Meta trả lỗi rõ → giữ `private_reply_at` (không chắc Meta đã tính lượt), hiện lỗi trên tin, không cho thử lại. Lỗi trước khi gọi kênh (tài khoản tạm dừng, thiếu ref) → rollback cả transaction.

### 5. Adapter gửi + lệnh bền (pha 2)
1. **Gửi theo `mode`** (`facebook/comments.ts`, `instagram/comments.ts`):
   - `public_reply`: FB `POST /{comment_id}/comments`; IG `POST /{comment_id}/replies`. `externalMsgId` = id bình luận mới.
   - `private_reply`: `POST /{page_id}/messages` `recipient: { comment_id }`, `messaging_type: RESPONSE`. Trả `externalMsgId` = `message_id` + `recipient_id`.
   - Chỉ text (FB `public_reply` thêm 1 ảnh qua `attachment_url`). Kiểu khác → 409 `comment_unsupported` ở action, trước outbox.
   - Lỗi Meta theo `meta/graph.ts` (048e): 190 → `expired`; 10 / 200 → thiếu quyền (`failed`); 613 → chậm lại; 551 → người nhận không nhận được.
2. **Lệnh bền** (TIP-014b, `remote`):
   - `ChannelOperations.moderateComment(accountId, ref, op)`, `op = 'hide' | 'unhide' | 'delete' | 'like' | 'unlike'`.
   - FB: `POST /{id}` `is_hidden`, `DELETE /{id}`, `POST|DELETE /{id}/likes`. IG: `POST /{id}` `hide`, `DELETE /{id}`; IG không thích (`comments.like = false`).
   - Manifest: `operations.comment_hide | comment_unhide | comment_delete = 'remote'`; FB thêm `comment_like = 'remote'`.
   - `provider-operations.processor.ts` gọi `moderateComment` cho 4 loại mới, cùng luồng `queued → dispatch_reserved → confirmed | failed | unknown`. Không tự thử lại sau `dispatch_reserved`.
   - **Chỉ ACK mới đổi trạng thái:** `confirmed` → `hidden_at` / `deleted_at` / `social_comment.liked_at` (`comment-ops.ts`), phát `message.updated`. `failed` / `unknown` → giữ nguyên, FE hiện lỗi.
   - Tham chiếu phía kênh = `message.external_msg_id` (chuỗi). Thiếu → 409 `INVALID_STATE` trước khi tạo lệnh.
3. **Worker thao tác cho kênh webhook:** `channels.jobs.module.ts` mở / đóng `operators` cùng `senders` trong `StatelessChannels` (~L151) cho kênh có `operations`. Hàng đợi `chop-<accountId>` concurrency 1. Không đổi luồng kênh lease.

### 6. AI agent trả lời bình luận như nhân viên — `comment-reply.ts` (pha 2, DC-921)
- Chủ nhà 2026-11-14: "AI trong này đóng vai trò là 1 nhân viên … đừng có gán quyền gì cho agents cả. chat thẳng, làm thẳng không gợi ý gì cả". Không trần copilot, không chặn riêng agent, không mã lỗi riêng cho agent.
1. **Chế độ AI như tin direct:** hội thoại `comment` mới lấy `ai_mode` theo cài đặt tài khoản (`auto` / `copilot` / `off`, `pipeline.ts` ~L160). `conversation.set_ai_mode` không đổi. `wantsAgent` không đổi (hội thoại `comment` không phải `group`).
2. **`message.send` vào hội thoại `comment` = trả lời công khai** bình luận khách mới nhất còn hiện của hội thoại (không xoá / không ẩn). `outbound.ts` gắn `comment: { mode: 'public_reply', targetExternalId }` khi hội thoại là `comment` — một chỗ, dùng chung cho người (Composer chế độ Công khai), agent `auto` (`send()` ở `reply.service.ts`) và lời nhắn của Trợ lý. Không có bình luận khách nào còn hiện → 409 `INVALID_STATE`. `comment.reply` vẫn dùng khi chọn trả lời một bình luận cụ thể.
3. **Tool agent:** `comment.reply` / `private_reply` / `hide` / `unhide` / `like` cấp được ở Builder (nhóm Hộp thư). Agent `auto` gọi trong lượt như mọi tool ghi (`reply-tools.ts`); copilot vẫn `dry_run` như hiện có. Lượt agent trên hội thoại `comment` nhận thêm ngữ cảnh "Đang trả lời bình luận công khai trên bài <caption> — người khác cùng đọc; việc riêng (SĐT, đơn, giá riêng) thì nhắn riêng" (`reply-context.ts`, 1–2 dòng gọi `commentContext()` của `comment-reply.ts`).
4. **Lời chào kênh** không gửi vào hội thoại `comment` (`greeting.ts` đã chỉ chào `direct`, giữ nguyên).
5. **Luật chung giữ nguyên** (không phải luật riêng cho agent): không action bulk cho `comment.*`; follow-up / chiến dịch / theo dõi không chọn hội thoại `comment` (lọc `kind`); thao tác hàng loạt Hộp thư bỏ qua hội thoại `comment` (gửi hàng loạt luôn duyệt — D06). Nhắn riêng 1 lần / bình luận là luật nền tảng, áp cho mọi người gửi.

### 7. Đọc + danh sách (pha 2)
1. **Tab "Bình luận"** = thư mục `comments` mới (`INBOX_FOLDERS`):
   - `WHERE cv.kind = 'comment' AND <live> AND <scope>` → index partial `(kind, last_message_at DESC, id DESC) WHERE kind = 'comment'`.
   - Các tab khác (`all`, `mine`, `unread`…) thêm `cv.kind <> 'comment'` — bình luận không lẫn vào luồng chat. EXPLAIN trước / sau (Rà bước 6).
   - `read.service.ts` thêm `['comments', n.comments, null]` **cuối dãy** (sau `complaint`) để không đẩy tab của prototype (prototype-parity §7). Đếm theo scope.
2. **Lọc theo bài:** `GET /v1/inbox/conversations?folder=comments&post_id=<uuid>` → index `(post_id, last_message_at DESC)`.
3. **DTO** (`shared/src/api/inbox.ts`, mở rộng tương thích ngược — gap-filling §5):
   - Hội thoại: `kind` thêm `comment`; `post?: { id, kind, permalink, caption, media_url, comments_count }`. Nạp theo lô (`post-read.ts`), không N+1.
   - Tin: `comment?: { hidden, parent_external_id, private_reply_conversation_id, liked, can: { public_reply, private_reply, hide, delete, like }, reason? }`. `can` = năng lực kênh ∩ quyền ∩ trạng thái (nhắn riêng đã dùng / quá hạn → false + `reason`). Nhắn riêng: `(manifest.comments.privateReply && eligible !== false) || eligible === true`.
4. Danh sách dùng keyset hiện có `(last_message_at, id)`, không `SELECT *`.

### 8. Giao diện (pha 3, PD-904 — mức 2)
- Prototype không vẽ → làm theo `interaction-patterns.md`, dùng token + primitive có sẵn; ghi "Giả định đã chọn".
1. **Tab** "Bình luận" ở `TopTabs.tsx` (đọc `counts.tabs`), cuối dãy tab, nhãn `tabs.comments`.
2. **`ConvRow.tsx`:** icon bình luận + dòng phụ "trên bài: <caption 1 dòng …>" + tooltip (IP-6.1).
3. **`comments/PostCard.tsx`** (≤ 150 dòng): đầu luồng chat — ảnh thu nhỏ, caption 2 dòng + "Xem thêm", loại bài (bài / video / reel / quảng cáo), số bình luận, nút "Mở bài" (link ngoài, `rel="noopener"`). Ảnh lỗi → khung chữ cái đầu.
4. **`comments/CommentModeToggle.tsx`:** trên Composer, "Trả lời công khai" (mặc định) / "Nhắn riêng".
   - "Nhắn riêng" vô hiệu + tooltip lý do (đã dùng / quá 7 ngày / kênh không hỗ trợ — IP-1.5).
   - Thiếu `inbox.reply` → ẩn Composer (như hiện tại).
   - Chế độ nhắn riêng: đếm ký tự 2000, nhãn người nhận.
5. **`Composer.tsx`:** chỉ gắn toggle + `useCommentActions` (facade 1–2 dòng). Gửi `comment.reply` / `comment.private_reply` qua `ConfirmActionHost` theo risk `send`. Chế độ copilot: nháp AI điền vào ô như tin direct.
6. **`comments/CommentMenu.tsx`** (menu ⋯ của tin bình luận, `ActionMenu`): Trả lời · Nhắn riêng · Thích / Bỏ thích · Ẩn / Hiện · divider · Xoá (danger, cuối — IP-1.2). Mục theo `comment.can` + `<Can>`.
   - `MessageMenu.tsx` rẽ sang `CommentMenu` khi hội thoại `comment`; bỏ `'zalo_personal'` cứng ~L62 → đọc năng lực qua DTO.
7. **`MessageBubble.tsx`:** ẩn → mờ + nhãn "Đã ẩn"; xoá → "Bình luận đã bị xoá"; chip "Đã nhắn riêng" → hội thoại direct; dấu thích; trả lời lồng có dòng "trả lời <tên>".
8. **Lệnh bền:** sau 202 hiện trạng thái tại chỗ ("Đang ẩn…") qua `useMessageProviderStatus`; `confirmed` cập nhật theo `message.updated`; `failed` / `unknown` → toast theo mã, giữ nguyên.
9. **`hooks/useCommentActions.ts`** (≤ 150 dòng): bọc `useAction('comment.*')`, Idempotency-Key cho send.
10. **Mobile 390:** menu ⋯ thành action sheet; toggle không tràn ngang; vùng chạm ≥ 44px.
11. **Trạng thái:** tab rỗng (lời mời kết nối Facebook / Instagram nếu có `channels.manage`), lỗi + Thử lại, đang tải (IP-5).

### 9. Mock, i18n, parity, e2e (pha 3)
- Mock `shared/api/mock/domains/inbox-comments.ts`: 2 bài, 6 hội thoại bình luận, đủ 6 action + lỗi `private_reply_used` / `private_reply_expired`. Đăng ký ở `handlers.ts`; `domains/inbox.ts` (382 dòng) chỉ gọi 1–2 dòng. `PARITY_FIXTURE=1` → không thêm hội thoại bình luận (giữ ảnh đo).
- i18n vi (nguồn) + en: `inbox.json` (`tabs.comments`, `comments.*`), `actions.json` (`actions.comment__*.title`), server `i18n/server/{vi,en}/inbox.ts` (xem trước "Bình luận: …", nhãn ngữ cảnh lượt agent). `pnpm i18n:check`.
- Parity: mask tab "Bình luận" ở màn Hộp thư, `reason: 'PD-904 — không có trong prototype (mức 2)'`. `pnpm lint:masks` · `pnpm parity inbox`.
- E2E mock `apps/web/e2e/inbox-comments.spec.ts`; E2E http `apps/web/e2e/http/inbox-comments.spec.ts` (`META_TRANSPORT=fake`, webhook giả).

### 10. Lệnh DB (CLAUDE.md §7 — đủ ba lệnh, đúng thứ tự)
`pnpm --filter @appchat/db run db:generate` → `db:migrate-tenants` → `db:setup`. Kiểm `_appchat_migrations` của `appchat_tenant_template` có `20261115120000_social_comments`.

### 11. Lỗi
| Mã | HTTP | Khi nào |
|---|---|---|
| `comment_unsupported` (048b) | 409 | Kênh không có năng lực / kiểu tin không hỗ trợ |
| `private_reply_used` (048b) | 409 | Bình luận đã được nhắn riêng |
| `private_reply_expired` (048b) | 409 | Quá 7 ngày từ lúc bình luận |
| `INVALID_STATE` (có sẵn) | 409 | Không phải hội thoại bình luận; tin đã xoá; thiếu tham chiếu kênh; `message.send` vào hội thoại bình luận không còn bình luận khách nào hiện |

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given Page đã kết nối, when webhook `feed` `add` gửi 2 lần + `edited` + `remove`, then một hội thoại `comment` khoá `c:<post>:<author>`, một tin (dedupe theo id bình luận), nội dung đổi theo `edited`, `deleted_at` có sau `remove`, `social_post.comments_count` đúng | `apps/api/test/integration/inbox-comments.test.ts` + `packages/channels/test/meta-comments.test.ts` |
| 2 | Given hai người bình luận cùng bài + một trả lời lồng, when nhận, then hai hội thoại riêng; trả lời lồng có `external_parent_id`; bình luận Page viết ngoài AppChat thành tin `out` đúng hội thoại; tin AppChat đã gửi không bị tạo trùng | `inbox-comments.test.ts` + fixture `feed_comment_page_reply.json` |
| 3 | Given tài khoản tắt đồng bộ bình luận, when webhook `feed`, then biên nhận `ignored`, không tạo hội thoại; IG `comments` tương tự | `inbox-comments.test.ts` |
| 4 | Given hội thoại bình luận, when `comment.reply`, then gọi FB `POST /{comment_id}/comments` (IG `/replies`) qua outbox + limiter, tin `out` có `external_msg_id` mới | `meta-comments.test.ts` (transport `fake`) + `inbox-comments.test.ts` |
| 5 | Given bình luận 2 ngày tuổi, when `comment.private_reply` lần 1, then tin vào hội thoại direct cùng khách, chip "Đã nhắn riêng"; lần 2 → 409 `private_reply_used`; hai lệnh song song → một thắng; bình luận 8 ngày → 409 `private_reply_expired` | `inbox-comments.test.ts` + `packages/core/test/comment-policy.test.ts` |
| 6 | Given `comment.hide` / `comment.delete` / `comment.like`, when tạo, then 202 + `channel_operation` `queued`; trước ACK tin chưa đổi; ACK `confirmed` → `hidden_at` / `deleted_at` / `liked_at`; `unknown` không tự thử lại; IG `comment.like` → 409 `comment_unsupported` | `inbox-comments.test.ts` + `meta-comments.test.ts` |
| 7 | Given tài khoản `ai_mode = auto`, agent được cấp `comment.private_reply`, when khách bình luận, then agent trả lời công khai ngay (`message.send` → `public_reply` đúng bình luận mới nhất, không cần duyệt); agent gọi `comment.private_reply` trong lượt → tin vào hội thoại direct; `copilot` → nháp như tin direct; `comment.delete` không có trong Builder (`agentGrantable: false`); không lời chào kênh | `inbox-comments.test.ts` + `comment-policy.test.ts` (dùng `mock-model`) |
| 8 | Given vai trò không có `inbox.manage`, when `comment.hide` / `comment.delete`, then 403; không có `inbox.reply` → `comment.reply` / `private_reply` / `like` 403; ngoài scope own → 404 | `inbox-comments.test.ts` |
| 9 | Given 100k hội thoại (20k `comment`), when tab Bình luận LIMIT 20, lọc `post_id`, tab "Tất cả" (có `kind <> 'comment'`), then Index Scan đúng index §1 / index hiện có, không Seq Scan; không tệ hơn mốc Rà bước 6 | EXPLAIN (ANALYZE, BUFFERS) dán report |
| 10 | Given ba lệnh DB, when chạy, then mọi workspace + template có `social_post` / `social_comment` / cột mới; CHECK `channel_operation` nhận 4 loại mới, lệnh cũ giữ nguyên; `prisma-stubs` OWNERS `social: '048f'` | `pnpm --filter @appchat/db test` + truy vấn `_appchat_migrations` |
| 11 | Given UI mock, when mở tab Bình luận → hội thoại → Nhắn riêng → Ẩn → Xoá, then thẻ bài đúng, toggle khoá khi đã nhắn riêng (tooltip lý do), Xoá ở cuối menu (danger) + xác nhận; parity Hộp thư < 5% với mask PD-904; mobile 390 không tràn ngang | `pnpm e2e inbox-comments` + `PostCard.test.tsx` + `pnpm parity inbox` |
| 12 | Given API thật (`META_TRANSPORT=fake`), when e2e http chạy luồng AC4–AC6; Page thật của shop | `pnpm e2e:http inbox-comments` — Page thật: chưa nghiệm thu với provider thật (Q-908 App Review) |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{channels,shared,actions,db,core,api,web}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check` · `pnpm lint:masks`.
- DB: ba lệnh §10, rồi `psql … -d appchat_tenant_template -c "SELECT name FROM _appchat_migrations ORDER BY name DESC LIMIT 3;"`.
- Unit: `pnpm --filter @appchat/channels test -- test/meta-comments.test.ts` · `pnpm --filter @appchat/core test -- test/comment-policy.test.ts test/assistant-coverage.test.ts`.
- Integration (`--workers=1`, `TENANT_CLIENT_CACHE=10`, kiểm slot Postgres trước): `pnpm --filter @appchat/api test:integration -- test/integration/inbox-comments.test.ts`.
- FE: `pnpm parity inbox` · `pnpm e2e inbox-comments` · `pnpm e2e:http inbox-comments`.
- EXPLAIN như AC9.
- Provider thật: chưa có App Review (Q-908) → ghi "chưa nghiệm thu với provider thật".

## CONSTRAINTS
- **DO NOT:**
  - Thêm luật / mã lỗi / trần chế độ AI riêng cho agent trên hội thoại bình luận (DC-921 — agent là nhân viên).
  - Nhắn riêng hàng loạt; follow-up / chiến dịch vào hội thoại bình luận.
  - Thêm permission mới (Q-912).
  - Đổi trạng thái ẩn / xoá / thích trước ACK của kênh; tự thử lại lệnh `dispatch_reserved`.
  - `switch (type)` trong core / UI — đọc `capabilities.comments` / `operations`.
  - Thêm `workspace_id` / RLS; Prisma relation xuyên domain.
  - Thêm logic vào `pipeline.ts`, `Composer.tsx`, mock `domains/inbox.ts` quá 1–2 dòng facade.
  - Thêm thư viện ngoài (Graph gọi bằng `fetch` qua `meta/graph.ts`).
  - Log nội dung bình luận / token.
- **REUSE:**
  - Ingress + biên nhận + `channel-hooks` + `send-window.ts` (048b).
  - `meta/graph.ts`, webhook Meta, `fake-transport.ts` (048e).
  - `requestOperation` + `provider-operations.processor.ts` + `applyOperationResult` (014b).
  - `writeOutgoing` / outbox / limiter; `contact_identity`; `useAction`, `ConfirmActionHost`, `ActionMenu`, `useMessageProviderStatus`.
- **SKIP:**
  - Livestream (048g). Bình luận TikTok (048h). Bình luận Zalo OA (không có API — Sắp có).
  - Đánh giá (Google Business / Shopee — ẩn).
  - Đăng bài / quảng cáo; thống kê bài.
  - Gộp hai hội thoại direct trùng khách.

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync` khi Chủ thầu ghép dải 048.
- [x] Bảng / action / path khớp DC-914 + brief §3.3; thêm `social_comment` có lý do (khoá nhắn riêng một lần).
- [x] Agent là nhân viên (DC-921): trả lời / nhắn riêng như người, không luật riêng; không permission mới (Q-912); không nhắn hàng loạt.
- [x] Lệnh bền theo omnichannel-adapter (chỉ ACK đổi trạng thái); index theo indexing.md; EXPLAIN 100k.
- [x] 12 AC có Given / When / Then + bằng chứng; ô cần Page thật ghi trung thực.
- **Gap đã khai:**
  - Meta App Review (`pages_manage_engagement`, `pages_read_user_content`, `instagram_manage_comments`) chưa có (Q-908) → chỉ test transport `fake` + fixtures.
  - Nhắn riêng lỗi sau khi gọi kênh giữ khoá một lần (không chắc Meta đã tính lượt) — người dùng nhắn tiếp được khi khách trả lời.
  - Hội thoại `pr:` trùng khách không tự gộp (ghi report nếu gặp).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; BE 200–400 dòng (trần 600), FE 150–250 (trần 400).
- [ ] AC 1–12 có kết quả từng cái, dán output thật (`pnpm …`, EXPLAIN); ô cần Page thật ghi "chưa nghiệm thu với provider thật".
- [ ] **Action-first (BUILDER-HANDOFF):** mọi ghi qua `ActionExecutor`; FE chỉ `useAction(id).run(input)`; webhook chỉ ghi biên nhận rồi xử lý nền.
- [ ] **Gửi qua outbox + limiter; ẩn / xoá / thích qua `channel_operation`** — chỉ ACK mới đổi trạng thái; không thử lại sau `dispatch_reserved`.
- [ ] **Agent là nhân viên (DC-921, D51):** agent `auto` trả lời bình luận thẳng như tin direct; không luật / mã lỗi riêng cho agent; gửi hàng loạt vẫn duyệt (D06).
- [ ] **Tenant DB:** không `workspace_id`; chạy CẢ `db:generate` → `db:migrate-tenants` → `db:setup`; template có `20261115120000_social_comments`.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
