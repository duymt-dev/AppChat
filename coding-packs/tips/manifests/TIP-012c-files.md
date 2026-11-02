# TIP-012c — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/integrations/src/registry.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/integrations/src/index.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/integrations/src/types.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/integrations/src/connectors/brevo/manifest.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/integrations/src/connectors/smtp/manifest.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/services/resolver.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/services/read.service.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/services/webhook.service.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/services/form-schema.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/services/adapter-selection.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/services/connection-detail.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/services/connection-health.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/operations/call-receipt.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/operations/call-runner.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/operations/probe.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/actions/integration-disconnect.handler.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/jobs/integration-call.processor.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/jobs/integrations.jobs.module.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/integrations.module.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/integrations/public.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/index.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/actions/src/index.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/actions/src/marketing.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/shared/src/api/integrations.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/shared/src/api/marketing.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/shared/src/api/index.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/shared/src/index.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/shared/src/events.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/db/prisma/tenant/integrations.prisma` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/db/prisma/tenant/marketing.prisma` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/marketing.module.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/marketing.providers.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/jobs/marketing.jobs.module.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/jobs/marketing-scheduler.module.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/jobs/campaign-dispatch.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/jobs/campaign-results.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/services/campaign-policy.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/services/campaign-read.service.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/services/recipient-snapshot.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/services/recipient-export.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/actions/campaign-write.handlers.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/actions/campaign-approval.handlers.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/actions/campaign-extras.handlers.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/repos/recipients.repo.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `packages/core/src/marketing/services/unsubscribe-token.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/api/src/http/integrations/hooks.controller.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/api/src/http/integrations/integrations.controller.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/api/src/http/integrations/integrations.http.module.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/settings/registry.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/settings/types.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/settings/api.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/settings/components/IntegrationsSection.tsx` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/settings/screens/SettingsScreen.tsx` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/marketing/components/WizardSteps.tsx` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/marketing/hooks/useWizard.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/marketing/components/CampaignDetail.tsx` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/marketing/components/DetailTabs.tsx` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/features/marketing/types.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/shared/api/mock/domains/settings.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/shared/api/mock/domains/marketing.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/messages/vi/settings.json` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/messages/en/settings.json` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/messages/vi/marketing.json` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/messages/en/marketing.json` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/messages/vi/actions.json` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `apps/web/messages/en/actions.json` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| M | `tools/parity/parity.manifest.ts` | Existing/predecessor tenant-mail sender/receipt/UI integration |
| C | `packages/integrations/src/ports/tenant-mail.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/src/connectors/brevo/tenant-adapter.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/src/connectors/brevo/tenant-client.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/src/connectors/brevo/callback.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/src/connectors/smtp/tenant-adapter.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/src/connectors/smtp/tenant-transport.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/src/network/smtp-target.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/src/tenant-mail-validation.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/actions/src/tenant-mail.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/shared/src/api/tenant-mail.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/src/integrations/mail/module.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/src/integrations/mail/senders.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/src/integrations/mail/read.handler.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/src/integrations/mail/dispatch.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/src/integrations/mail/receipts.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/src/integrations/mail/ingress.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/src/integrations/mail/results.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/src/integrations/mail/recovery.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/src/marketing/services/mail-sender.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/src/marketing/actions/mail-result.handler.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/db/prisma/tenant/tenant-mail.prisma` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/db/prisma/tenant/migrations/20261102001230_tenant_mail/migration.sql` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `apps/web/src/features/settings/components/EmailMarketingSection.tsx` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `apps/web/src/features/settings/components/email-marketing/MailSenderStatus.tsx` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `apps/web/src/features/settings/hooks/useTenantMail.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `apps/web/src/features/marketing/components/MailSenderPicker.tsx` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/test/tenant-mail.test.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/test/tenant-smtp-security.test.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/test/fixtures/brevo/tenant-mail-contract.json` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/integrations/test/fixtures/smtp/tenant-mail-contract.json` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/test/tenant-mail.test.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `packages/core/test/tenant-mail-dispatch.test.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `apps/api/test/integration/tenant-mail.test.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `apps/api/test/integration/tenant-mail-callbacks.test.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `apps/worker/test/integration/tenant-mail-composition.test.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `apps/web/e2e/tenant-mail.spec.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `fixtures/ai-eval/tenant-mail/cases.json` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `tools/parity/modules/tenant-mail.ts` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| C | `coding-packs/reports/TIP-012c-completion.md` | Bounded tenant mail implementation/evidence; platform and Inbox mail kept separate |
| M | `packages/actions/src/marketing-extras.ts` | Discriminated approved sender and actual delivery/read projection contract |
| M | `packages/core/src/marketing/repos/campaigns.repo.ts` | Discriminated approved sender and actual delivery/read projection contract |
| M | `packages/core/src/marketing/jobs/marketing.jobs.providers.ts` | Discriminated approved sender and actual delivery/read projection contract |
| M | `apps/web/src/features/marketing/api.ts` | Discriminated approved sender and actual delivery/read projection contract |
| M | `packages/core/src/integrations/actions/integration-connect.handler.ts` | Reviewer source seam: current config/sender evidence and delivery-aware projection |
| M | `packages/core/src/integrations/services/connections.service.ts` | Reviewer source seam: current config/sender evidence and delivery-aware projection |
| M | `packages/core/src/marketing/events/campaign-attribution.ts` | Reviewer source seam: current config/sender evidence and delivery-aware projection |
| M | `packages/core/src/marketing/ai/marketing-ai.service.ts` | Reviewer source seam: current config/sender evidence and delivery-aware projection |
| M | `apps/web/src/features/marketing/components/MarketingAiDrawer.tsx` | Reviewer source seam: current config/sender evidence and delivery-aware projection |
| M | `apps/web/src/shared/api/mock/domains/settings-apps.ts` | Reviewer source seam: current config/sender evidence and delivery-aware projection |
| M | `apps/api/src/http/marketing/marketing.controller.ts` | Review wiring: actual sender GET route and durable callback-binding lifecycle recovery |
| M | `apps/api/src/http/marketing/marketing.http.module.ts` | Review wiring: actual sender GET route and durable callback-binding lifecycle recovery |
| M | `packages/core/src/kernel/consistency/operation-recovery.ts` | Review wiring: actual sender GET route and durable callback-binding lifecycle recovery |
| C | `packages/core/src/integrations/mail/bindings.ts` | Isolated verifier generation capture and bounded expiry purge |
| C | `packages/core/src/integrations/mail/purge.ts` | Isolated verifier generation capture and bounded expiry purge |

## Future M provenance

- `packages/core/src/integrations/services/form-schema.ts`: TIP-023c-generative-ui.md
- `packages/core/src/integrations/services/adapter-selection.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/integrations/services/connection-detail.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/integrations/services/connection-health.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/integrations/operations/call-receipt.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/integrations/operations/call-runner.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/integrations/operations/probe.ts`: TIP-012b-bank-connectors.md
- `packages/shared/src/api/marketing.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/marketing.providers.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/jobs/marketing-scheduler.module.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/jobs/campaign-dispatch.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/jobs/campaign-results.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/services/campaign-policy.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/services/campaign-read.service.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/services/recipient-snapshot.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/services/recipient-export.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/actions/campaign-write.handlers.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/actions/campaign-approval.handlers.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/actions/campaign-extras.handlers.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/repos/recipients.repo.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/services/unsubscribe-token.ts`: TIP-037-marketing.md
- `packages/actions/src/marketing-extras.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/repos/campaigns.repo.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/jobs/marketing.jobs.providers.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/events/campaign-attribution.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/ai/marketing-ai.service.ts`: TIP-037-marketing.md
- `apps/api/src/http/marketing/marketing.controller.ts`: TIP-037-marketing.md
- `packages/core/src/kernel/consistency/operation-recovery.ts`: TIP-045b-app-hardening.md
