# TIP014b exact file manifest

134 unique paths. M=existing modification, C=new; contract.test.ts is future-M created by prerequisite045b; document-link/order-confirmation/receipt-send are future-M from032b; appendix/send.handlers is future-M from030b. SDK wrappers remain in channels package. Legacy parity only1-2-line facade; settings types extracted separately. Tests are dedicated files.

| Mode | Path | Purpose |
|---|---|---|
| M | `packages/channels/src/types.ts` | Provider/session/delivery integration |
| M | `packages/channels/src/index.ts` | Provider/session/delivery integration |
| M | `packages/channels/src/registry.ts` | Provider/session/delivery integration |
| M | `packages/channels/src/zalo-personal/transport.ts` | Provider/session/delivery integration |
| M | `packages/channels/src/zalo-personal/zca-transport.ts` | Provider/session/delivery integration |
| M | `packages/channels/src/zalo-personal/adapter.ts` | Provider/session/delivery integration |
| M | `packages/channels/src/zalo-personal/normalize.ts` | Provider/session/delivery integration |
| M | `packages/channels/src/zalo-personal/manifest.ts` | Provider/session/delivery integration |
| M | `packages/channels/src/zalo-personal/fake-transport.ts` | Provider/session/delivery integration |
| M | `packages/core/src/channels/channels.module.ts` | Provider/session/delivery integration |
| M | `packages/core/src/channels/public.ts` | Provider/session/delivery integration |
| M | `packages/core/src/channels/actions/channel-manage.handlers.ts` | Provider/session/delivery integration |
| M | `packages/core/src/channels/jobs/channels.jobs.module.ts` | Provider/session/delivery integration |
| M | `packages/core/src/channels/jobs/lease.ts` | Provider/session/delivery integration |
| M | `packages/core/src/channels/jobs/sessions.ts` | Provider/session/delivery integration |
| M | `packages/core/src/channels/jobs/send.processor.ts` | Provider/session/delivery integration |
| M | `packages/core/src/channels/services/send-queue.ts` | Provider/session/delivery integration |
| M | `packages/core/src/channels/services/control.ts` | Provider/session/delivery integration |
| M | `packages/core/src/channels/services/read.service.ts` | Provider/session/delivery integration |
| M | `packages/core/src/inbox/inbox.module.ts` | Provider/session/delivery integration |
| M | `packages/core/src/inbox/actions/message.handlers.ts` | Provider/session/delivery integration |
| M | `packages/core/src/inbox/services/outbound.ts` | Provider/session/delivery integration |
| M | `packages/core/src/inbox/services/view.ts` | Provider/session/delivery integration |
| M | `packages/core/src/inbox/services/pipeline.ts` | Provider/session/delivery integration |
| M | `packages/core/src/inbox/jobs/inbox.jobs.module.ts` | Provider/session/delivery integration |
| M | `packages/core/src/inbox/jobs/inbound.processor.ts` | Provider/session/delivery integration |
| M | `packages/core/src/crm/services/identity.service.ts` | Provider/session/delivery integration |
| M | `packages/core/src/crm/public.ts` | Provider/session/delivery integration |
| M | `packages/core/src/index.ts` | Provider/session/delivery integration |
| M | `packages/actions/src/inbox.ts` | Provider/session/delivery integration |
| M | `packages/actions/src/settings-apps.ts` | Provider/session/delivery integration |
| M | `packages/actions/src/index.ts` | Provider/session/delivery integration |
| M | `packages/db/prisma/tenant/channels.prisma` | Provider/session/delivery integration |
| M | `packages/db/prisma/tenant/inbox.prisma` | Provider/session/delivery integration |
| M | `packages/shared/src/api/channels.ts` | Provider/session/delivery integration |
| M | `packages/shared/src/api/inbox.ts` | Provider/session/delivery integration |
| M | `packages/shared/src/api/index.ts` | Provider/session/delivery integration |
| M | `packages/shared/src/events.ts` | Provider/session/delivery integration |
| M | `packages/shared/src/index.ts` | Provider/session/delivery integration |
| M | `apps/api/src/http/channels/channels.http.module.ts` | Provider/session/delivery integration |
| M | `apps/api/src/http/inbox/inbox.http.module.ts` | Provider/session/delivery integration |
| M | `apps/worker/src/roles/channels.module.ts` | Provider/session/delivery integration |
| M | `apps/web/src/features/inbox/components/MessageMenu.tsx` | Provider/session/delivery integration |
| M | `apps/web/src/features/inbox/components/MessageBubble.tsx` | Provider/session/delivery integration |
| M | `apps/web/src/features/inbox/types.ts` | Provider/session/delivery integration |
| M | `apps/web/src/features/inbox/api.ts` | Provider/session/delivery integration |
| M | `apps/web/src/features/settings/components/ManageChannelDrawer.tsx` | Provider/session/delivery integration |
| M | `apps/web/src/features/settings/api.ts` | Provider/session/delivery integration |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Provider/session/delivery integration |
| M | `apps/web/src/shared/api/mock/domains/settings.ts` | Provider/session/delivery integration |
| M | `apps/web/src/shared/api/http-transport.ts` | Provider/session/delivery integration |
| M | `coding-packs/standards/channels/omnichannel-adapter.md` | Provider/session/delivery integration |
| M | `tools/parity/parity.manifest.ts` | Provider/session/delivery integration |
| M | `apps/web/messages/vi/actions.json` | Provider/session/delivery integration |
| M | `apps/web/messages/vi/inbox.json` | Provider/session/delivery integration |
| M | `apps/web/messages/vi/settings.json` | Provider/session/delivery integration |
| M | `packages/shared/src/i18n/server/vi/channels.ts` | Provider/session/delivery integration |
| M | `packages/shared/src/i18n/server/vi/inbox.ts` | Provider/session/delivery integration |
| M | `apps/web/messages/en/actions.json` | Provider/session/delivery integration |
| M | `apps/web/messages/en/inbox.json` | Provider/session/delivery integration |
| M | `apps/web/messages/en/settings.json` | Provider/session/delivery integration |
| M | `packages/shared/src/i18n/server/en/channels.ts` | Provider/session/delivery integration |
| M | `packages/shared/src/i18n/server/en/inbox.ts` | Provider/session/delivery integration |
| M | `packages/channels/test/contract.test.ts` | Provider/session/delivery integration |
| C | `packages/channels/src/operations.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/channels/src/zalo-personal/provider-operations.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/channels/src/zalo-personal/provider-refs.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/channels/src/zalo-personal/provider-receipts.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/channels/src/zalo-personal/provider-history.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/channels/src/zalo-personal/provider-capabilities.md` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/operation-store.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/operation-service.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/operation-read.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/provider-event.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/delivery-receipts.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/receipt-recovery.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/history-run.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/contact-sync.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/session-generation.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/control-commands.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/operations/types.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/jobs/provider-operations.processor.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/jobs/provider-events.processor.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/jobs/provider-history.processor.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/jobs/contact-sync.processor.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/actions/operation-cancel.handler.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/channels/actions/contact-sync.handler.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/inbox/actions/message-provider.handlers.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/inbox/services/inbound-sync-policy.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/src/crm/services/identity-match.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/actions/src/channel-operations.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/db/prisma/tenant/channel-operations.prisma` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/db/prisma/tenant/migrations/20261102001420_provider_operations/migration.sql` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/db/prisma/platform/migrations/20261102001420_channel_route_scan/migration.sql` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/shared/src/api/channel-operations.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/api/src/http/inbox/channel-operations.controller.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/api/src/http/channels/channel-sync.controller.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/web/src/features/inbox/components/MessageProviderStatus.tsx` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/web/src/features/inbox/components/MessageProviderStatus.test.tsx` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/web/src/features/inbox/hooks/useMessageProviderStatus.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/web/src/features/settings/components/ContactSyncPanel.tsx` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/web/src/features/settings/hooks/useContactSync.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/web/src/features/settings/channel-sync-types.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/channels/test/zalo-operations.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/channels/test/zalo-receipts.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/channels/test/zalo-history.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/channels/test/zalo-live.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/test/channel-operations.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/test/channel-delivery-recovery.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/test/channel-session-fence.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/test/channel-history-policy.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/test/channel-sync-identity.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/test/channel-contacts-sync.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/test/actions/channel-operation-cancel.matrix.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `packages/core/test/actions/channel-sync-contacts.matrix.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/api/test/integration/channel-operations.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/worker/test/integration/channel-shutdown.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/worker/test/integration/channel-delivery.test.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/web/e2e/channel-operations.spec.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `apps/web/e2e/http/channel-operations.spec.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `tools/parity/manifests/channel-operations.ts` | Bounded domain module or dedicated acceptance evidence |
| C | `fixtures/ai-eval/channel-vertical.json` | Bounded domain module or dedicated acceptance evidence |
| M | `packages/db/prisma/platform/routing.prisma` | Provider capability or immutable commerce file correlation integration |
| M | `packages/channels/src/webchat/manifest.ts` | Provider capability or immutable commerce file correlation integration |
| M | `packages/channels/src/email/manifest.ts` | Provider capability or immutable commerce file correlation integration |
| M | `packages/core/src/sales/quotes/services/quote-send.ts` | Provider capability or immutable commerce file correlation integration |
| M | `packages/core/src/sales/payments/services/invoice-send.ts` | Provider capability or immutable commerce file correlation integration |
| M | `packages/core/src/contracts/actions/contract-send.handlers.ts` | Provider capability or immutable commerce file correlation integration |
| M | `packages/core/src/sales/documents/document-link.ts` | Provider capability or immutable commerce file correlation integration |
| M | `packages/core/src/sales/orders/actions/order-confirmation.handler.ts` | Provider capability or immutable commerce file correlation integration |
| M | `packages/core/src/sales/payments/actions/receipt-send.handler.ts` | Provider capability or immutable commerce file correlation integration |
| M | `packages/core/src/contracts/appendix/send.handlers.ts` | Provider capability or immutable commerce file correlation integration |
| M | `packages/core/src/inbox/events/inbox.rules.ts` | Dedicated history cache refresh without live downstream effects |
| C | `apps/worker/test/integration/channel-history-side-effects.test.ts` | Dedicated history cache refresh without live downstream effects |
