# TIP-037 — Marketing broadcast, segmentation, AI suggestions và campaign reporting

## HEADER
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before026c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before032e.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 037 before006d.
- **Parallel-safe with TIP-022d (coverage-closure manifest):** sequential, shares `packages/channels/src/zalo-personal/manifest.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/services/accounts.service.ts`; integrate 037 before022d.
- **Parallel-safe with TIP-046 (release gate manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 037 before046.
- **Parallel-safe with TIP-001b (coverage-closure manifest):** sequential, shares `apps/web/src/features/marketing/columns.tsx`, `apps/web/src/features/marketing/components/AnalyzeModal.tsx`, `apps/web/src/features/marketing/components/CampaignDetail.tsx`, `apps/web/src/features/marketing/components/DetailTabs.tsx`, `apps/web/src/features/marketing/components/WizardSteps.tsx`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`; integrate 037 before001b.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 037 before003e.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 037 before003f.
- **Parallel-safe with TIP-003g (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 037 before003g.
- **Parallel-safe with TIP-003h (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 037 before003h.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 037 before004b.
- **Parallel-safe with TIP-011b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 037 before011b.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 037 before013b.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 037 before013c.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `packages/core/src/channels/services/accounts.service.ts`; integrate 037 before014c.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings-apps.ts`; integrate 037 before017b.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 037 before018b.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 037 before031b.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 037 before031c.
- **Parallel-safe with TIP-020e (RAG model lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate 037 before020e.
- **Parallel-safe with TIP-045 (Native infrastructure manifest):** sequential, shares `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/index.ts`; integrate 037 before045.
- **Parallel-safe with TIP-022c (Sales agent behavior manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 037 before022c.
- **Parallel-safe with TIP-034d (Ticket stock manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before034d.
- **Parallel-safe with TIP-034c (Ticket bulk manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before034c.
- **Parallel-safe with TIP-034b (Support categories manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before034b.
- **Parallel-safe with TIP-027b (Product media manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before027b.
- **Parallel-safe with TIP-032d (Commerce files manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before032d.
- **Parallel-safe with TIP-033c (Appointment order manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before033c.
- **Parallel-safe with TIP-020d (RAG citations manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before020d.
- **Parallel-safe with TIP-020c (KB scope manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 037 before020c.
- **Parallel-safe with TIP-023g (Record AI manifest):** sequential, shares `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before023g.
- **Parallel-safe with TIP-030c (Parent signing manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 037 before030c.
- **Parallel-safe with TIP-006b (Event delivery manifest):** sequential, shares `apps/worker/src/roles/jobs.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/core/src/marketing/events/campaign-attribution.ts`; integrate 037 before006b.
- **Parallel-safe with TIP-003c (System actions manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`; integrate 037 before003c.
- **Parallel-safe with TIP-003b (Event protocol manifest):** sequential, shares `apps/worker/src/roles/jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/index.ts`; integrate 037 before003b.
- **Parallel-safe with TIP-023f (Assistant input manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before023f.
- **Parallel-safe with TIP-023e (Action discovery manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 037 before023e.
- **Parallel-safe with TIP-023d (Assistant plans manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before023d.
- **Parallel-safe with TIP-015c (Privacy manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/services/send-guards.ts`, `packages/core/src/index.ts`, `packages/core/src/marketing/services/recipient-export.ts`, `packages/core/src/marketing/services/recipient-snapshot.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before015c.
- **Parallel-safe with TIP-019c (AI utilities manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before019c.
- **Parallel-safe with TIP-033b (Booking operations manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before033b.
- **Parallel-safe with TIP-012c (Tenant mail manifest):** sequential, shares `apps/api/src/http/marketing/marketing.controller.ts`, `apps/api/src/http/marketing/marketing.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/marketing.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/marketing.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/marketing/api.ts`, `apps/web/src/features/marketing/components/CampaignDetail.tsx`, `apps/web/src/features/marketing/components/DetailTabs.tsx`, `apps/web/src/features/marketing/components/MarketingAiDrawer.tsx`, `apps/web/src/features/marketing/components/WizardSteps.tsx`, `apps/web/src/features/marketing/hooks/useWizard.ts`, `apps/web/src/features/marketing/types.ts`, `apps/web/src/shared/api/mock/domains/marketing.ts`, `packages/actions/src/index.ts`, `packages/actions/src/marketing-extras.ts`, `packages/actions/src/marketing.ts`, `packages/core/src/index.ts`, `packages/core/src/marketing/actions/campaign-approval.handlers.ts`, `packages/core/src/marketing/actions/campaign-extras.handlers.ts`, `packages/core/src/marketing/actions/campaign-write.handlers.ts`, `packages/core/src/marketing/ai/marketing-ai.service.ts`, `packages/core/src/marketing/events/campaign-attribution.ts`, `packages/core/src/marketing/jobs/campaign-dispatch.ts`, `packages/core/src/marketing/jobs/campaign-results.ts`, `packages/core/src/marketing/jobs/marketing-scheduler.module.ts`, `packages/core/src/marketing/jobs/marketing.jobs.module.ts`, `packages/core/src/marketing/jobs/marketing.jobs.providers.ts`, `packages/core/src/marketing/marketing.module.ts`, `packages/core/src/marketing/marketing.providers.ts`, `packages/core/src/marketing/repos/campaigns.repo.ts`, `packages/core/src/marketing/repos/recipients.repo.ts`, `packages/core/src/marketing/services/campaign-policy.ts`, `packages/core/src/marketing/services/campaign-read.service.ts`, `packages/core/src/marketing/services/recipient-export.ts`, `packages/core/src/marketing/services/recipient-snapshot.ts`, `packages/core/src/marketing/services/unsubscribe-token.ts`, `packages/db/prisma/tenant/marketing.prisma`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/marketing.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before012c.
- **Parallel-safe with TIP-015e (Contact merge manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/marketing/repos/recipients.repo.ts`, `packages/core/src/marketing/services/recipient-snapshot.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before015e.
- **Parallel-safe with TIP-015f (Contact lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/index.ts`, `packages/core/src/marketing/marketing.module.ts`, `packages/core/src/marketing/repos/recipients.repo.ts`, `packages/core/src/marketing/services/recipient-snapshot.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before015f.
- **Parallel-safe with TIP-032c (Commerce edit manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before032c.
- **Parallel-safe with TIP-015d (CRM ownership manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/notify/events/domain.rules.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before015d.
- **Parallel-safe with TIP-026b (CRM activity manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before026b.
- **Parallel-safe with TIP-012b (Bank integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before012b.
- **Parallel-safe with TIP-019b (Runtime integration manifest):** sequential, shares `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before019b.
- **Parallel-safe with TIP-025b (Inbox integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/channels/src/zalo-personal/manifest.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before025b.
- **Parallel-safe with TIP-022b (agent behavior manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/channel-types.ts`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/channels/services/accounts.service.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/channels.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before037.
- **Parallel-safe with TIP-014b (Zalo lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/channels/src/zalo-personal/manifest.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/public.ts`, `packages/core/src/channels/services/send-queue.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/channels.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before037.
- **Parallel-safe with TIP-032b (accepted foundation manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before037.
- **Parallel-safe with TIP-045b (hardening manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/services/send-queue.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before037. Recompute for later TIPs.
- **Parallel-safe with TIP-030b (contract files manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before037. Recompute when incomplete manifests expand.
- **Parallel-safe with TIP-023c (genui revised manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/marketing.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/marketing.json`, `apps/web/src/features/marketing/components/MarketingAiDrawer.tsx`, `apps/web/src/features/marketing/screens/MarketingScreen.tsx`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/channels.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before037. Recompute when remaining manifests expand.
- **Parallel-safe with TIP-023c (genui exact manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/marketing.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/marketing.json`, `apps/web/src/features/marketing/components/MarketingAiDrawer.tsx`, `apps/web/src/features/marketing/screens/MarketingScreen.tsx`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/channels.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023c before TIP-037. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/channels/src/zalo-personal/manifest.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/public.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023b before TIP-037.
- **Parallel-safe with TIP-023b (public API wiring):** sequential, shares `packages/core/src/index.ts`, `packages/shared/src/index.ts`, `packages/shared/src/api/index.ts`; integrate TIP-023b before TIP-037.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/channels/src/zalo-personal/manifest.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/public.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023b before TIP-037. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-032b before TIP-037. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-015b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-037. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate this TIP before 041. Recheck incomplete manifests.
- **Parallel-safe with TIP-038b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 038b. Recheck incomplete manifests.
- **Parallel-safe with TIP-040:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 040. Recheck incomplete manifests.
- **Parallel-safe with TIP-039:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 039. Recheck incomplete manifests.
- **Parallel-safe with TIP-038 (expanded manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 038; recheck after remaining manifests expand.
- **Parallel-safe with TIP-038:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `tools/parity/parity.manifest.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 038. Recheck after incomplete manifests expand.
- TIP-ID: TIP-037; Project: AppChat V2; Module: marketing; Priority: P1; Estimated: XL (schema/query → lifecycle → dispatch → AI/UI).
- Depends on:014–018/019/021/022/026,023b/023c; integrate sau015b/020b/030b/032b/036/042/042b/042c/043/045b vì shared files, trước038/044/046.
- **Credit policy:** Q030 đã đóng theo DC246: chỉ charge AI theo pricebook hiện hữu, không phát sinh per-message tariff; provider fee ngoài hệ thống không được gọi là miễn phí. Không lấy con số mock làm giá.
- **Dòng COVERAGE nhận:** REQ-I01–I05, REQ-B04c, D08b, D35c, D52e, STD-actions-registry-11d; ACT-segment.preview/create/update/delete, ACT-campaign.suggest/create/update/submit/send_test/approve/reject/pause/resume/cancel/delete; BP-4.4-marketing; BP-4.1-d/STD-api-envelope-2b phần campaigns; PRO-marketing-read/actions/analyze/wizupload/wiztone/detailexport/resend/rowai/recipacts; Q-030.
- **Parallel-safe with:** sequential; shares `packages/actions/src/index.ts` với015b/020b/023b/023c/030b/032b/036/042/042b/043/045b; `packages/core/src/ai/jobs/ai.jobs.module.ts` với023b/036/043/045b; shared API/core index, locales/Blueprint/parity/deviations có giao với020b/036/042/042b/042c/043. Hai chiều đã ghi trong12 TIP có giao file; mọi TIP đó trước037. Không mở song song với manifest chưa hoàn thiện.
- **Files touched:** C=create, M=modify, bảng dưới; chưa code cho đến câu A hoàn tất.
- **Caps UI overlap:** sequential, shares settings-apps.ts, accounts.service.ts, api/channels.ts, ChannelAssign types/ManageChannelDrawer với042b; settings locales với020b/042/042b/043. Hai chiều đã bổ sung,037 tích hợp sau.

| Op | File |
|---|---|
| M | `apps/worker/src/roles/jobs.module.ts` |
| M | `packages/core/src/notify/events/domain.rules.ts` |
| C | `packages/core/src/marketing/jobs/marketing-scheduler.module.ts` |
| C | `packages/core/src/marketing/events/campaign.rules.ts` |
| C | `packages/shared/src/marketing/events.ts` |
| M | `packages/actions/src/settings-apps.ts` |
| M | `packages/core/src/channels/services/accounts.service.ts` |
| M | `packages/shared/src/api/channels.ts` |
| M | `apps/web/src/features/settings/channel-types.ts` |
| M | `apps/web/src/features/settings/components/ManageChannelDrawer.tsx` |
| M | `apps/web/messages/vi/settings.json` |
| M | `apps/web/messages/en/settings.json` |
| M | `packages/db/prisma/tenant/marketing.prisma` |
| M | `packages/actions/src/marketing.ts` |
| M | `packages/actions/src/index.ts` |
| M | `packages/shared/src/api/index.ts` |
| M | `packages/shared/src/index.ts` |
| M | `packages/core/src/index.ts` |
| M | `packages/core/src/marketing/marketing.module.ts` |
| M | `packages/core/src/marketing/jobs/marketing.jobs.module.ts` |
| M | `packages/core/src/channels/jobs/send.processor.ts` |
| M | `packages/core/src/channels/services/send-queue.ts` |
| M | `packages/core/src/channels/public.ts` |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` |
| M | `packages/channels/src/zalo-personal/manifest.ts` |
| M | `apps/api/src/http/marketing/marketing.http.module.ts` |
| M | `apps/web/src/features/marketing/types.ts` |
| M | `apps/web/src/features/marketing/api.ts` |
| M | `apps/web/src/features/marketing/hooks/useWizard.ts` |
| M | `apps/web/src/features/marketing/components/WizardSteps.tsx` |
| M | `apps/web/src/features/marketing/components/AnalyzeModal.tsx` |
| M | `apps/web/src/features/marketing/components/CampaignDetail.tsx` |
| M | `apps/web/src/features/marketing/components/DetailTabs.tsx` |
| M | `apps/web/src/features/marketing/components/MarketingAiDrawer.tsx` |
| M | `apps/web/src/features/marketing/columns.tsx` |
| M | `apps/web/src/features/marketing/status.ts` |
| M | `apps/web/src/features/marketing/screens/MarketingScreen.tsx` |
| M | `apps/web/src/shared/api/mock/domains/marketing.ts` |
| M | `apps/web/messages/vi/marketing.json` |
| M | `apps/web/messages/en/marketing.json` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| M | `tools/parity/parity.manifest.ts` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| C | `packages/db/prisma/tenant/migrations/20261102003700_marketing/migration.sql` |
| C | `packages/actions/src/marketing-extras.ts` |
| C | `packages/shared/src/api/marketing.ts` |
| C | `packages/shared/src/marketing/state.ts` |
| C | `packages/shared/src/marketing/segment-filter.ts` |
| C | `packages/core/src/marketing/marketing.providers.ts` |
| C | `packages/core/src/marketing/public.ts` |
| C | `packages/core/src/marketing/actions/segment.handlers.ts` |
| C | `packages/core/src/marketing/actions/campaign-write.handlers.ts` |
| C | `packages/core/src/marketing/actions/campaign-approval.handlers.ts` |
| C | `packages/core/src/marketing/actions/campaign-control.handlers.ts` |
| C | `packages/core/src/marketing/actions/campaign-extras.handlers.ts` |
| C | `packages/core/src/marketing/services/segments.service.ts` |
| C | `packages/core/src/marketing/services/campaign-read.service.ts` |
| C | `packages/core/src/marketing/services/campaign-policy.ts` |
| C | `packages/core/src/marketing/services/recipient-snapshot.ts` |
| C | `packages/core/src/marketing/services/audience-import.ts` |
| C | `packages/core/src/marketing/services/recipient-export.ts` |
| C | `packages/core/src/marketing/repos/campaigns.repo.ts` |
| C | `packages/core/src/marketing/repos/recipients.repo.ts` |
| C | `packages/core/src/marketing/jobs/campaign-scheduler.ts` |
| C | `packages/core/src/marketing/jobs/campaign-dispatch.ts` |
| C | `packages/core/src/marketing/jobs/campaign-results.ts` |
| C | `packages/core/src/marketing/jobs/marketing.jobs.providers.ts` |
| C | `packages/core/src/marketing/events/campaign-attribution.ts` |
| C | `packages/core/src/marketing/ai/marketing-ai.service.ts` |
| C | `packages/core/src/marketing/ai/marketing-ai.jobs.ts` |
| C | `packages/core/src/channels/services/send-guards.ts` |
| C | `packages/core/src/channels/services/proactive-cap.ts` |
| C | `apps/api/src/http/marketing/marketing.controller.ts` |
| C | `apps/web/src/features/marketing/components/AudienceImport.tsx` |
| C | `apps/web/src/features/settings/components/ChannelRateFields.tsx` |
| C | `apps/web/src/features/marketing/components/RecipientActions.tsx` |
| C | `apps/web/src/features/marketing/hooks/useCampaignAnalysis.ts` |
| C | `packages/core/test/marketing-policy.test.ts` |
| C | `packages/core/test/segment-filter.test.ts` |
| C | `packages/core/test/marketing-dispatch.test.ts` |
| C | `packages/core/test/proactive-cap.test.ts` |
| C | `apps/api/test/integration/marketing.test.ts` |
| C | `apps/api/test/integration/marketing-contract.test.ts` |
| C | `apps/api/test/integration/marketing-concurrency.test.ts` |
| C | `apps/api/test/integration/marketing-analytics.test.ts` |
| C | `apps/web/e2e/http/marketing.spec.ts` |
| C | `coding-packs/reports/TIP-037-completion.md` |
| C | `apps/api/src/http/marketing/marketing-unsubscribe.controller.ts` |
| C | `apps/web/src/app/(public)/campaign/unsubscribe/page.tsx` |
| C | `apps/web/src/features/marketing/components/UnsubscribeConfirm.tsx` |
| C | `packages/core/src/marketing/services/unsubscribe-token.ts` |

## CONTEXT
- Working dir: AppChat_Ver2. Stack product/tech-stack.md + Blueprint/BUILDER-HANDOFF; no Docker, DB per workspace; các câu Owner+Member/Testcontainers cũ không thắng D27/native.
- Code41147cc: marketing.prisma, MarketingModule/MarketingJobsModule/MarketingHttpModule chỉ stub. packages/actions/src/marketing.ts có13 ActionDef nhưng chưa handler; segment CRUD chưa có ActionDef.
- FE marketing/api.ts cần /campaigns, /campaigns/:id, /campaigns/meta, /campaign-suggestions; list page/limit. types.ts có tuple Recipient thiếu contact_id, CampaignStatus thiếu approved.
- hooks/useWizard.ts:28-30 hard-code UPLOAD_VALID1180, contactId(i)=ct_n, import_xlsx; không được đưa sang HTTP. AnalyzeModal.tsx dùng setTimeout giả, WizardSteps chèn nội dung mẫu, export/resend/recipient actions đang giả.
- channels/services/send-queue.ts:22,45-55 có proactive/ref_id/BullMQ jobId, nhưng removeOnComplete chỉ giữ1000 job; không phải dedupe bền vững. SendResultSink fanout nuốt lỗi; crash sau provider accept có thể không có kết quả DB.
- channels/jobs/send.processor.ts:43-56 chốt cap khi mở worker, incr mỗi attempt, daily_cap lỗi final; zalo manifest không perDayProactive dù D35c mặc định200. campaign phải dùng hàng gửi chung account, không bypass limiter bằng SDK riêng.
- worker ROLE=channels đã import MarketingJobsModule, jobs/AI registration phải theo role, không tạo cùng processor2 lần. API marketing module đã wiring stub.
- Nguồn: Blueprint §2.2 marketing, §3.4, §4.4, §5, §6; D35/D52; REQ-I01–05; prototype3760–4230. Nếu REQ nói “Owner duyệt”, áp permission matrix Blueprint §3.5: campaign.approve cho Owner/manager; không hard-code role Owner để đổi quyền đã chốt.

## APPLICABLE STANDARDS
- actions/action-registry.md; events/outbox.md; api/response-envelope.md; authz/rbac-permissions.md.
- database/tenant-db.md; database/indexing.md; domain/state-machine.md; domain/concurrency.md; domain/money-time-numbering.md; domain/validation-defaults.md; domain/gap-filling.md.
- channels/omnichannel-adapter.md; integrations/provider-ports.md; ai/agent-gateway.md; ai/eval.md; ops/observability-security.md.
- ui/frontend-structure.md; ui/prototype-parity.md; ui/interaction-patterns.md; i18n/i18n.md; code/file-size-module-layout.md; code/testing.md; D59.

## Rà trước khi làm
1. Áp DC246/Q030; kiểm pricebook/provider thật, không tự thu tiền theo mock. Đọc Q-013/DC-073 cũ: D35 đã có200/ngày, không giữ vô hạn vì deferred note.
2. Rà gateway AI credit/run/step + approval, trusted internal actions045b và scope042c. Action catalog023b chỉ công bố handler thật; không gọi state transition bằng raw controller SQL.
3. Kiểm channels send retry/crash semantics và provider idempotency. Không hứa exactly-once khi provider không hỗ trợ; unknown outcome phải có trạng thái xử lý, không retry mù.
4. So mapping sender account email/Zalo: campaign hiện chỉ channel type, cần lựa chọn tài khoản cụ thể, quota/cap/identity phù hợp. Không gửi lạnh tới số điện thoại bất kỳ khi Zalo manifest proactive disallowed.
5. Rà file caps, workflow all waves theo dependency không theo sốTIP; AI/jobs/channels module wiring không vòng imports. Cập nhật manifest trước thêm fixture/tools ngoài phạm vi.

## TASK
Thực hiện trọn luồng từ chọn phân khúc/nhập danh sách, AI đề xuất hoặc tạo thủ công, duyệt snapshot, gửi có kiểm soát tới theo dõi kết quả. Mọi nút marketing đang giả phải có hành vi thật hoặc trạng thái capability không hỗ trợ được giải thích rõ, không toast thành công khi chưa làm.

### 1. Schema, scope, query và segments
- marketing.prisma: Segment(filter AST/is_dynamic/name/last_count/version/deleted_at), Campaign theo Blueprint + version/account_id/created_by/approved_version/content_hash/recipient_snapshot_hash/deleted_at; Recipient unique(campaign_id,contact_id) + delivery ref, variant, eligibility, status/error timestamps; Suggestion theo Blueprint + run_id/status; thêm append-only CampaignEvent và send-attempt/claim records phục vụ audit/dedupe. Tất cả[T], không workspace_id tenant/FK platform.
- Giữ các trạng thái campaign Blueprint gồm approved; defineFlow tập trung. Recipient có pending/skipped/sent/failed/replied/converted; delivery outcome unknown là field riêng để không nhầm failed chắc chắn. Click/open/delivered có evidence/capability, không dùng sent để bịa opened.
- Segment AST schema đóng: and/or giới hạn độ sâu/node; field allowlist tags, stage, source, group/tier, total_spent, last_order_at, interaction date, purchase product/count; typed operators và dates/VND string đúng chuẩn. Không rawSQL/expression input. Dynamic evaluate at preview/submit snapshot; manual IDs union dedupe, không cộng count hai lần.
- segment.create/update/delete qua Executor, campaign.manage, version/CAS, preview/undo nếu reversible; không xoá segment đang được draft tham chiếu mà không conflict/soft tombstone. segment.preview giữ contract count/reachable, cùng service GET/POST preview; không ghi suggestion/log business trong read action.
- Quyền marketing kiểm trước; recipient PII cần crm.view và CRM scope người gọi; không thấy contact thì không thêm qua explicit ID/file/segment. campaign.view không tự mở toàn CRM; custom-role crm.none cho audience rỗng/denied, không fallback all. Approved sender execution giới hạn snapshot đã được duyệt và quyền người duyệt hiện tại; revoke thì pause/review.
- GET /segments, /campaigns?page&limit&status&channel&q, /campaigns/meta, /campaigns/:id, /campaigns/:id/recipients, /campaign-suggestions; zod ở shared/api/marketing.ts. Route meta trước :id. Recipients phân trang riêng, detail chỉ trang đầu tương thích (không tải toàn campaign). Meta customers đổi từ tuple index thành ID-backed options; wizard lưu IDs thật.
- Campaign list stable created_at/id; equality status/channel trước sort, INCLUDE(code,name,est_recipients), partial deleted_at IS NULL. Recipient(campaign_id,status,id) INCLUDE(contact_id,sent_at); cooldown(contact_id,last_sent_at DESC); outbox/attempt(status,next_attempt_at,id); filters custom expression phải index phù hợp. Deferred IDs trước payload content/stats; EXPLAIN list, AST, audience/cooldown; không N+1 hay SELECT* wide scan.

### 2. Lifecycle, approval và immutable snapshot
- Draft → pending_approval qua submit, snapshot content/variables/account/schedule/union recipients/estimate/hash. approve chỉ pending/currentversion, campaign.approve, risk send+bulk, preview luôn cần human confirm. Source assistant/agent/task không tự approve; request người có quyền làm qua UI. Actor permission không tên role.
- Approve chốt approver/version/hash rồi approved→scheduled nếu giờ tương lai, approved→running khi scheduler claim. Không send ngay trong request. Sau duyệt không edit audience/content; muốn sửa clone thành draft, duyệt lại. Rejected sửa thành draft rồi submit lại, không sửa approved.
- pause running/scheduled; resume paused với cùng snapshot còn hợp lệ; cancel mọi trạng thái chưa terminal theoD52e; completed không cancel; delete chỉ draft/rejected/cancelled như action schema. Cancel/pause chặn chưa gửi, không thu hồi tin provider đã nhận.
- Undo create chỉ draft chưa side effect, submit chỉ khi chưa approve; CAS/version cả undo. Double approve/submit/cancel chạy đồng thời chỉ một transition. Idempotency-Key + unique snapshot/delivery refs, outbox sau commit.
- campaign.update thêm if_version optional tương thích, FE luôn gửi; action outputs giữ fields hiện tại + version/status/additive ID. Missing/foreign ID404; stale409, invalid transition409, validation422. Không làm useAction nuốt202.
- Send_test chỉ tới user đang đăng nhập đã có email/identity phù hợp, không lấy arbitrary recipient; subject/text render preview đúng snapshot. Có idempotency, thực sự gửi qua queue/cap, không cộng production recipient/stats/cooldown.

### 3. Audience và gửi an toàn
- Submit tạo snapshot từng contact đã được phép; số reachable loại deleted/opt-out/không endpoint/48h. Trước dispatch **kiểm lại** opt-out/endpoint/cooldown/current campaign status/approved hash. Audience không tự tăng sau approve vì segment vừa thay.
- Cooldown48h giữa **mọi campaign** theo contact trong cùng workspace (không chỉ cùng campaign). Lock/contact claim trong DB, tránh2 campaign cùng vượt48h. Recipient đã provider-accepted ghi last_sent_at; attempt unknown giữ reservation để không gửi chiến dịch khác trong48h; lỗi chắc chắn chưa gửi giải phóng. Kết quả skip_reason phân biệt.
- Unsubscribe: link opaque signed expiring token chỉ cho contact/recipient đúng workspace; GET hiện confirmation không ghi; POST qua Executor action campaign.unsubscribe (token verified server, không nhận contact_id tuỳ ý), chỉ đặt marketing_opt_out, không quyền đọc CRM. User unsub giữa approve/send phải loại ngay trước provider call. UI/code không log token. Không xin tài khoản thật hay gửi thư thử ngoài fixtures khi chưa cho phép.
- queue campaign-send trong ROLE=channels fanout batch, channel_account branch đi ChannelSendQueue/account worker để chia sẻ limiter với Inbox/follow-up.012c successor adds explicit tenant_mail sender branch through integrations durable queue/receipt, not a fabricated channel_account; all037 approval/recipient/suppression guards still apply. domain internal dispatch/result mutations qua trusted actions hoặc Executor orchestration, không raw job write không audit. Scheduler ROLE=jobs dùng outbox, Redis mất vẫn recover.
- Wiring cụ thể: MarketingJobsModule hiện chỉ import ở channels; thêm MarketingSchedulerModule riêng vào jobs.module.ts bằng một import/list-entry (đã ghi manifest), không kéo sender worker vào ROLE=jobs. Cập nhật comment scaffold “không sửa” cho extension đã được TIP này chỉ định, không sửa TIP001. Campaign rules + shared event schema dùng notify/realtime; import rules trong notify/events/domain.rules.ts để người duyệt nhận thông báo và marketing query được invalidate đúng topic.
- Channel pre-send guard registry (port chung không import marketing domain trong channels) reload recipient/approval/optout/cancel trước provider. DB claim dispatching và fencing/lease; callback result verify ref/domain. Provider outcome persisted/dedup độc lập job retention.
- **Không thể đảm bảo exactly-once với provider không có idempotency:** crash/timeout không biết đã gửi → unknown, không auto-retry/resend. Lỗi chắc chắn chưa gửi mới retry có backoff; nếu provider hỗ trợ idempotency dùng stable ref. UI hiển thị unknown và quy trình kiểm tra, không đổi unknown thành failed để gửi lại.
- Zalo default200 chủ động/ngày/account và jitter2–6s D35; override có cảnh báo rõ, không vô hạn ngầm. Cap ledger/reservation theo deliveryref không đếm retry đôi; giữ cap chung mọi producer proactive. Hết cap defer tới cửa sổ ngày tiếp theo, không failed-final toàn chiến dịch. Dùng Clock và bucket timezone được định nghĩa/test rõ; không dựa local timezone worker ngẫu nhiên.
- Nối daily_cap/rate_per_minute qua channel.update_settings/schema/readDTO/Channel drawer với channels.manage, integer hữu hạn dương; tăng trên200 hiện cảnh báo D35 trong preview. Settings đã đổi phải tác động worker đang mở trước lầnsend tiếp theo (không giữ snapshot open() cũ). Trích ChannelRateFields, không nhồi thêm logic vào drawer gần400 dòng.
- Định nghĩa internal ActionDef riêng trong marketing-extras: campaign.dispatch, campaign.record_delivery, campaign.record_metric, campaign.store_analysis; tất cả agentGrantable=false, input chỉ ref/job/event/run IDs được verify, trusted-source045b, không public caller tự gửi outcome/sent_at/userID. Handler ghi ledger/recipient/stats trong transaction Executor; provider call nằm ngoài transaction qua outbox/guard, không giữ DB lock chờ network.
- Sender reference cố định trong approved snapshot (channel_account trước012c;012c thêm tenant_mail connection+sender/config revisions); Zalo chỉ identity/thread liên hệ hợp lệ theo adapter (không suy số điện thoại=externalId), email sender configured. Credential expired/error thì pause/action-required; không tự đổi account sau duyệt. Adaptercap không cho cold proactive phải loại unreachable, không đổi capability để “gửi được”.
- Dừng graceful không nhận thêm job, drain claims; resume sau restart không reset cap/cooldown/approval. Error3/10min pause account hiện có vẫn hoạt động.

### 4. AI, Credit và biến nội dung
- campaign.suggest read trả suggestions cache thật; campaign.analyze action mới khởi tạo ai_run/job (write), campaign.draft_content action qua gateway cho tone/rewrite. Không gọi LLM từ GET hoặc dùng setTimeout giả. Các thao tác lưu suggestion/analysis qua trusted Executor action với idempotency.
- Bốn loại reactivation/upsell/conversion/aftercare dùng CDP scoped aggregate, gateway model/router/CreditMeter/run/steps; input PII tối thiểu, không truyền token/credentials/fullcontact list vào prompt. Output structured schema, filter AST/IDs phải server validate, invalid model output không publish/send.
- Gợi ý thời gian “ai_time” thành timestamp timezone rõ trong draft/preview; approve chốt timestamp, không LLM tự đổi lịch sau approve. Empty data/LLM error có state thật và Tạo thủ công luôn dùng được.
- Variables allowlist theo dữ liệu được phép, escape context email/text; thiếu giá trị fallback rõ trong preview, unknown variable422. AB text_b deterministic50/50 theo hash(campaign,contact), không tự đổi nội dung/chọn thắng rồi gửi đợt2 ngoài snapshot.
- Validate nội dung sau render theo maxTextLength/capability account (Zalo hiện2000 dù action chung4000); không silenttruncate/chẻ thành nhiều tin ngoài snapshot/cap. Email cần subject; schedule phải ISOoffset và tương lai ở Clock server; schedule đã qua khi approve cần human xác nhận lại thời điểm, không gửi bất ngờ.
- **DC246/Q030:** est_credits chỉ dự toán AI qua model price/ước lượng token có căn cứ, charge actual usage qua CreditMeter một lần. Số tin/người nhận hiển thị riêng, không nhân mockrate hoặc tạo send tariff. Không chạy AI thì AI Credit có thể0 với nhãn đúng, không suy ra provider email/Zalo miễn phí. Usage chưa xác định hiển thị range/unknown, không giá chính xác giả. Thiếu credit chặn AI đúngD09; gửi nội dung đã có vẫn theo channel/billing policy hiện hữu, không tự áp điều kiện AI cho thao tác không gọi model.
- Read/export data AI dùng quyền người ra lệnh, không đọc bản ghi bị scope/field filter 042c/045b loại. Live023b ca gợi ý/giọng/thu hồi quyền và không tự approve/send.

### 5. Import/export/resend và reporting
- campaign.audience_import input file_id (upload guard045b), preview mapping/valid-invalid-duplicate-owned rows; parse Excel/CSV bằng thư viện có sẵn, giới hạn size/rows; job>50. Reuse CRM import validation + crm.import khi tạo contact, không nested Executor; không reassign khách có owner, không tự opt-in lại khách unsub. Output persisted audience_batch_id/contact IDs thật, wizard không gửi import_xlsx/ct_n.
- campaign.recipient_export action read hoặc job export có quyền campaign.view + CRM scope; chính xác filter hiện tại, file authenticated, redaction/expiry, formula-injection escape, không public CSV. Detail button tải thật, thông báo job202 không success giả.
- campaign.resend_unread **tạo draft mới**, không gửi ngay. Chỉ recipient còn hợp lệ và chưa có read evidence; unknown provider capability phải ghi “chưa có xác nhận đọc”, không khẳng định chưa đọc. Dedupe/cooldown48h/optout và human approval vẫn áp; không bypass bằng resend.
- Recipient tuple thay DTO có contact_id/conversation_id và capability, view mở contact/conversation qua UiCommand; menu có action thực hợp lệ (view conversation/recipient status), không ellipsis inert. DòngAI mở assistant023c với campaign ref và quyền, không toast.
- Replied: inbound message liên kết đúng recipient/thread sau sent; duplicate event không tăng hai lần. Converted: nguồn order event có provenance, quy tắc attribution ghi rõ; không tự lấy mọi order khách từng mua. Đề xuất DC-240 last-touch campaign đã gửi trong7 ngày trước order, từng order một attribution, loại cancelled/refunded theo trạng thái đã chốt; số tiền stringVND, không sửa doanh số.
- Delivery/open/click chỉ ghi từ evidence provider/webhook/tracking thực có verify; unsupported trả capability false/null + UI “không có dữ liệu”, không dùng fake0 như measured0. Không claim Zalo read receipt nếu adapter không có.
- Stats numerator/denominator rõ: sent confirmed / eligible snapshot, skips separate, reply uniquecontact, conversion uniqueorder; AB stats cùng evidence. Campaign completed khi mọi recipient terminal (unknown hiển thị cần xử lý, không tự completed100%). Lịch sử event append-only, list/meta/detail nhất quán.

## ACCEPTANCE CRITERIA
1. **Segments/API:** Given two tenants + owned/shared/optout contacts và AST nested; When CRUD/preview/page/search; Then scope đúng, malformed/deep AST422, union count không trùng, ID pagination/meta chính xác, EXPLAIN có index/deferred join.
2. **Lifecycle:** Given draft/rejected/pending/approved/scheduled/running/paused/completed; When edit/submit/approve/reject/pause/resume/cancel/delete/undo; Then transitions đúng, human confirm bắt buộc, noauto-send, stale409, doubleapprove chỉ một snapshot.
3. **Recipient safety:** Given optout/48h/crosscampaign/changedscope/unreachable; When snapshot rồi dispatch; Then loại đúng trước send, two campaigns racing không cùng gửi contact, cancel/unsub sauenqueue chặn jobs chưa gọi provider.
4. **Delivery ambiguity:** Given duplicate job, deleted Redis history, restart, provider accepted then crash; When recover; Then dedupe durable, unknown không retry mù, definitive failure backoff, idempotent result không nhân stats/Credit. Không tuyên bố provider exactlyonce giả.
5. **Caps:** Given2 campaign + Inbox proactive cùng account; When quá200/ngày hoặc override, retry/delay/restart; Then cap chung không vượt, jitter2–6s ở prod, retry không đếm đôi, defer hôm sau; expired credentials pause không đổi sender.
6. **AI/Credit:** Given scopedCDP4 loại và realmodel; When analyze/tone/ai_time; Then structured validated suggestions/content, truejob states, AIcredit charged once, Q-030 tariff đúng quyết định, insufficientcredit chặn AI, noautopublish/send.
7. **Import/export:** Given XLSX/CSV invalid/duplicates/owned/unsub/formula rows; When preview/import/export; Then real IDs/batch counts, no owner takeover/optin resurrection, errors perrow, auth download không lộ khác tenant, no fake1180.
8. **Metrics/resend:** Given sent/unknown/unsupportedread/reply/order events duplicate; When stats/detail/resend; Then evidence-based metrics, unsupportednull, attribution provenance đúngDC-240 đã rà, resend draft+approval+48h, không trực tiếp gửi.
9. **UI:** Given loading/empty/error/forbidden/data; When wizard/customers by IDs/analyze/recipient menus/AIrow/detaildownload; Then actions thật, success chỉ sau server, DTOmockHTTP thống nhất, desktop1440/mobile390/keyboard/i18n/parity pass.
10. **Provider/security:** Given mock and real test accounts separately; When send_test and small approved fixture campaign; Then Zalo/email response Inbox link đúng, tokens/log redacted, unsubscribe verified token only, tenant/source forged denied. Thiếu provider phải ghi chưa nghiệm thu thật.

### Lệnh nghiệm thu — builder chạy thật
- `pnpm --filter @appchat/core exec vitest run test/marketing-policy.test.ts test/segment-filter.test.ts test/marketing-dispatch.test.ts test/proactive-cap.test.ts`.
- `pnpm --filter @appchat/api exec vitest run --config vitest.integration.config.ts test/integration/marketing.test.ts test/integration/marketing-contract.test.ts test/integration/marketing-concurrency.test.ts test/integration/marketing-analytics.test.ts`.
- `pnpm e2e marketing`; HTTP `pnpm --filter @appchat/web exec playwright test --config playwright.http.config.ts marketing.spec.ts` qua harness e2e:http cô lập.
- `pnpm parity marketing`, các trạng thái marketing trong manifest, `pnpm parity --done`, `pnpm i18n:check`; D59 lint/typecheck/unit/integration/depcheck/build của actions/shared/core/channels/api/web và fullE2E khi chốt.
- `pnpm ai:live` harness023b:4 kinds, tone/variables, refuseautoapprove, revokeduser. Thêm fixture nếu chưa có phải cập nhật manifest cả hai TIP trước sửa. Mock provider không thay9router hoặc gửi channel thật.
- Dán EXPLAIN, concurrency/fault output, kết quả từngAC, không pastecredentials. Không gửi broadcast thật tới khách production; dùng test recipients được phép.

## CONSTRAINTS
- DO NOT: đổi quyền/commerce/giá; giả sends/open/click/forecast; silent consent; raw job writes/LLM tools bypass Executor; autoapprove; retry unknown mù; chọn sender khác sau duyệt; mutate history stats không evidence.
- REUSE: ActionExecutor, CreditMeter, AIgateway/router, CRM validation, ChannelSendQueue, outbox/event consumer, storageport/uploadguard, useAction/UiCommand/tokens.
- Backend≤600 tách ở500, frontend≤400 screens orchestration; marketing.ts không nhồi toàn extras, test riêng; legacy overcap facade1–2 dòng. Không thư viện mới.
- Đây không phải module Báo cáo D19: reporting chỉ campaign + recipient export đang có prototype. Không mở SMS/ZaloOA/Facebook.
- Q030 đã đóng chính sách theo DC246; phần tiền chỉ đạt sau test ledger/estimate, không coi quyết định tài liệu là runtime PASS.

## Quality Gate: Self-Review
- Header/93-file manifest/context/standards/task10AC/constraints/checklist và bilateral declarations có.
- Q030 đã đóng; DC240 attribution kỹ thuật cần rà upstream trước build; toàn batch overlap/independent review chưa hoàn tất. Không báo implementation DONE.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà dependencies/manifest/role-wiring, Q-030 chốt, không source ngoài scope.
- [ ] AC1–10 chạy thật và có output từng ca; provider/model thật báo riêng, không mock thành nghiệm thu.
- [ ] Mọi ghi qua Executor; approval snapshot immutable, scope/cooldown/unsubscribe recheck trướcsend.
- [ ] Durable dedupe/cap/unknown recovery, no exactlyonce giả; audit/credit không nhân đôi.
- [ ] UI fakebuttons/IDs/timers đã bỏ, mockHTTPparity/mobile/i18n/D59 pass; EXPLAIN đủ.
- [ ] Commit tip/037-* → PRdev, status sạch, GitSHA report; COVERAGE parts/merge, không sửaTIPDONE.
