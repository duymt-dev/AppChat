# TIP-041 — Archive, restore và xoá workspace an toàn

## HEADER
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 041 before051.
- **Parallel-safe with TIP-051b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before051b.
- **Parallel-safe with TIP-051c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 041 before051c.
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/notify/catalog.ts`; integrate 041 before049.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before049d.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `packages/db/src/lifecycle/restore.ts`; integrate 041 before035d.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 041 before048.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 041 before048b.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before048c.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before048e.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 041 before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 041 before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before048h.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before047b.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`, `packages/shared/src/notify/catalog.ts`; integrate 041 before047c.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before047d.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 041 before026c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before032e.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before006d.
- **Parallel-safe with TIP-004c (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/identity.http.module.ts`; integrate 041 before004c.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate 041 before003e.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 041 before003f.
- **Parallel-safe with TIP-003g (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/sessions.ts`; integrate 041 before003g.
- **Parallel-safe with TIP-003h (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 041 before003h.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/identity/identity.module.ts`, `packages/db/prisma/platform/identity.prisma`; integrate 041 before004b.
- **Parallel-safe with TIP-006c (coverage-closure manifest):** sequential, shares `packages/db/src/tenant-resolver.ts`; integrate 041 before006c.
- **Parallel-safe with TIP-011b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/onboarding.json`, `apps/web/messages/vi/onboarding.json`, `apps/web/src/features/settings/components/GeneralSection.tsx`, `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 041 before011b.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/GeneralSection.tsx`; integrate 041 before013b.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/identity/identity.module.ts`; integrate 041 before013c.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before014c.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before017b.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before018b.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 041 before031b.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before031c.
- **Parallel-safe with TIP-020e (RAG model lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 041 before020e.
- **Parallel-safe with TIP-045 (Native infrastructure manifest):** sequential, shares `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/channels/jobs/sessions.ts`, `packages/core/src/identity/jobs/tenant-provision.processor.ts`, `packages/core/src/identity/lifecycle/lifecycle.providers.ts`, `packages/core/src/identity/lifecycle/recovery.ts`, `packages/core/src/identity/lifecycle/restore-request.ts`, `packages/core/src/index.ts`, `packages/db/src/index.ts`, `packages/db/src/lifecycle/archive.ts`, `packages/db/src/lifecycle/operation-lock.ts`, `packages/db/src/lifecycle/pg-process.ts`, `packages/db/src/lifecycle/restore.ts`, `packages/db/src/provisioner.ts`; integrate 041 before045.
- **Parallel-safe with TIP-022c (Sales agent behavior manifest):** sequential, shares `packages/core/src/kernel/actions/action-context.ts`; integrate 041 before022c.
- **Parallel-safe with TIP-034d (Ticket stock manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before034d.
- **Parallel-safe with TIP-034c (Ticket bulk manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before034c.
- **Parallel-safe with TIP-034b (Support categories manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before034b.
- **Parallel-safe with TIP-027b (Product media manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before027b.
- **Parallel-safe with TIP-032d (Commerce files manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 041 before032d.
- **Parallel-safe with TIP-033c (Appointment order manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 041 before033c.
- **Parallel-safe with TIP-020d (RAG citations manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/api/index.ts`; integrate 041 before020d.
- **Parallel-safe with TIP-020c (KB scope manifest):** sequential, shares `packages/core/src/kernel/actions/action-context.ts`; integrate 041 before020c.
- **Parallel-safe with TIP-023g (Record AI manifest):** sequential, shares `packages/shared/src/api/index.ts`; integrate 041 before023g.
- **Parallel-safe with TIP-030c (Parent signing manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 041 before030c.
- **Parallel-safe with TIP-006b (Event delivery manifest):** sequential, shares `packages/core/src/index.ts`; integrate 041 before006b.
- **Parallel-safe with TIP-003c (System actions manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/sessions.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate 041 before003c.
- **Parallel-safe with TIP-003b (Event protocol manifest):** sequential, shares `packages/core/src/channels/jobs/sessions.ts`, `packages/core/src/identity/jobs/tenant-provision.processor.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/shared/src/index.ts`; integrate 041 before003b.
- **Parallel-safe with TIP-023f (Assistant input manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before023f.
- **Parallel-safe with TIP-023e (Action discovery manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before023e.
- **Parallel-safe with TIP-023d (Assistant plans manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before023d.
- **Parallel-safe with TIP-015c (Privacy manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/identity/lifecycle/owner-export.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/core/src/kernel/actions/authorizer.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/db/src/lifecycle/restore.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before015c.
- **Parallel-safe with TIP-019c (AI utilities manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before019c.
- **Parallel-safe with TIP-033b (Booking operations manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before033b.
- **Parallel-safe with TIP-012c (Tenant mail manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before012c.
- **Parallel-safe with TIP-015e (Contact merge manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before015e.
- **Parallel-safe with TIP-015f (Contact lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before015f.
- **Parallel-safe with TIP-032c (Commerce edit manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 041 before032c.
- **Parallel-safe with TIP-015d (CRM ownership manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`, `packages/shared/src/notify/catalog.ts`; integrate 041 before015d.
- **Parallel-safe with TIP-026b (CRM activity manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before026b.
- **Parallel-safe with TIP-012b (Bank integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before012b.
- **Parallel-safe with TIP-019b (Runtime integration manifest):** sequential, shares `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before019b.
- **Parallel-safe with TIP-025b (Inbox integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before025b.
- **Parallel-safe with TIP-022b (agent behavior manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 022b before041.
- **Parallel-safe with TIP-014b (Zalo lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/sessions.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 014b before041.
- **Parallel-safe with TIP-032b (accepted foundation manifest):** sequential, shares `apps/api/src/http/kernel/actions.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`, `packages/shared/src/notify/catalog.ts`; integrate 032b before041.
- **Parallel-safe with TIP-045b (hardening manifest):** sequential, shares `apps/api/src/http/identity/identity.http.module.ts`, `apps/api/src/http/kernel/actions.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/identity/identity.module.ts`, `packages/core/src/identity/jobs/identity.jobs.module.ts`, `packages/core/src/identity/jobs/tenant-provision.processor.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/core/src/kernel/actions/authorizer.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/db/prisma/platform/identity.prisma`, `packages/db/src/tenant-resolver.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`, `packages/shared/src/notify/catalog.ts`; integrate 045b before041. Recompute for later TIPs.
- **Parallel-safe with TIP-030b (contract files manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 030b before041. Recompute when incomplete manifests expand.
- **Parallel-safe with TIP-023c (genui revised manifest):** sequential, shares `apps/api/src/http/kernel/actions.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 023c before041. Recompute when remaining manifests expand.
- **Parallel-safe with TIP-023c (genui exact manifest):** sequential, shares `apps/api/src/http/kernel/actions.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate TIP-023c before TIP-041. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/sessions.ts`, `packages/core/src/identity/identity.module.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`; integrate TIP-023b before TIP-041.
- **Parallel-safe with TIP-023b (public API wiring):** sequential, shares `packages/core/src/index.ts`, `packages/shared/src/index.ts`, `packages/shared/src/api/index.ts`; integrate TIP-023b before TIP-041.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/sessions.ts`, `packages/core/src/identity/identity.module.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`; integrate TIP-023b before TIP-041. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `apps/api/src/http/kernel/actions.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`, `packages/shared/src/notify/catalog.ts`; integrate TIP-032b before TIP-041. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-015b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate TIP-015b before TIP-041. Recompute after incomplete manifests expand.
- TIP-ID: TIP-041; Project: AppChat V2; Module: workspace-lifecycle; Priority: P1; Estimated: XL.
- **Parallel-safe with TIP-020b (bilateral audit 2026-11-02):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 020b before041.
- **Parallel-safe with TIP-036 (bilateral audit 2026-11-02):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before041.
- **Parallel-safe with TIP-037 (bilateral audit 2026-11-02):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 037 before041.
- **Parallel-safe with TIP-038 (bilateral audit 2026-11-02):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 038 before041.
- **Parallel-safe with TIP-042 (bilateral audit 2026-11-02):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/identity/identity.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 042 before041.
- **Parallel-safe with TIP-042b (bilateral audit 2026-11-02):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 042b before041.
- **Parallel-safe with TIP-042c (bilateral audit 2026-11-02):** sequential, shares `coding-packs/plans/BLUEPRINT.md`; integrate 042c before041.
- **Parallel-safe with TIP-043 (bilateral audit 2026-11-02):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 043 before041.
- Depends on:002/004/006/009/011/014;045b platform context/outbox/security;040 admin suspend;039 billing;038b owner logical export. Integrate sau040/038b vàpendingTIP chungfile, trước045 deployment gate/046.
- **Dòng COVERAGE nhận:** REQ-A09a/A09b; D23; ACT-admin.workspace.archive/restore; DEF-003-1; PRO-settings-dangerzone; REQ-M01c chỉphần nguyhiểm (logo tách owner riêng, khôngclaim cảdòng).
- **Parallel-safe with:** sequential, shares actions/coreindexes, identity/platformmodule/resolver/settingslocales/Blueprint với cácpendingTIP; metadata hai chiều tính trước tạo. Platform receipt/executor reuse040/045b, không thêm đườngghi.
- **Files touched:** M/C dưới; chỉdocs câuA, không chạy dump/drop trên demo.
- M tương lai duy nhất: `apps/web/src/features/platform-admin/screens/AdminScreen.tsx` do040 tạo trước041; không tạo bản thay thế nếu040 chưa tích hợp. Manifest hiện78 file; các file lifecycle mới chia theo trách nhiệm, không gom vào một handler lớn.

| Op | File |
|---|---|
| C | `packages/core/src/identity/mail-provider.module.ts` |
| M | `packages/shared/src/notify/catalog.ts` |
| M | `packages/shared/src/i18n/server/vi/notify.ts` |
| M | `packages/shared/src/i18n/server/en/notify.ts` |
| M | `apps/web/src/features/platform-admin/screens/AdminScreen.tsx` |
| C | `packages/core/src/identity/lifecycle/step-up.ts` |
| C | `packages/core/src/identity/lifecycle/freeze-requests.ts` |
| C | `packages/core/src/identity/lifecycle/delivery.ts` |
| C | `packages/core/src/identity/lifecycle/notification.rules.ts` |
| C | `packages/core/src/identity/lifecycle/mail-templates.ts` |
| C | `apps/web/src/features/platform-admin/components/LifecycleRequestsPanel.tsx` |
| C | `apps/web/src/features/platform-admin/hooks/useLifecycleRequests.ts` |
| C | `packages/db/src/lifecycle/operation-lock.ts` |
| M | `apps/api/src/http/kernel/request-actor.ts` |
| M | `apps/api/src/http/kernel/actions.controller.ts` |
| M | `packages/core/src/kernel/actions/action-context.ts` |
| M | `packages/core/src/kernel/actions/authorizer.ts` |
| C | `packages/core/src/kernel/actions/workspace-lifecycle-context.ts` |
| C | `apps/api/src/http/identity/lifecycle-actor.ts` |
| M | `packages/core/src/identity/identity.module.ts` |
| M | `packages/core/src/kernel/actions/executor.ts` |
| M | `apps/api/src/http/identity/identity.http.module.ts` |
| M | `packages/shared/src/index.ts` |
| M | `packages/shared/src/api/index.ts` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| C | `packages/core/src/identity/lifecycle/activity-consumer.ts` |
| C | `packages/core/src/kernel/actions/activity-event.ts` |
| C | `packages/shared/src/events/workspace-activity.ts` |
| M | `packages/db/src/index.ts` |
| M | `packages/db/src/provisioner.ts` |
| M | `packages/db/src/tenant-resolver.ts` |
| M | `packages/db/prisma/platform/identity.prisma` |
| M | `packages/actions/src/index.ts` |
| M | `packages/core/src/index.ts` |
| M | `packages/core/src/identity/services/workspaces.service.ts` |
| M | `packages/core/src/identity/jobs/identity.jobs.module.ts` |
| M | `packages/core/src/identity/jobs/tenant-provision.processor.ts` |
| M | `packages/core/src/platform/platform.module.ts` |
| M | `packages/core/src/channels/jobs/sessions.ts` |
| M | `apps/api/src/http/identity/session.controller.ts` |
| M | `apps/web/src/features/onboarding/components/OnboardingGate.tsx` |
| M | `apps/web/src/features/settings/components/GeneralSection.tsx` |
| M | `apps/web/messages/vi/settings.json` |
| M | `apps/web/messages/en/settings.json` |
| M | `apps/web/messages/vi/onboarding.json` |
| M | `apps/web/messages/en/onboarding.json` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| C | `packages/actions/src/workspace-lifecycle.ts` |
| C | `packages/shared/src/api/workspace-lifecycle.ts` |
| C | `packages/db/prisma/platform/workspace-lifecycle.prisma` |
| C | `packages/db/prisma/platform/migrations/20261102004100_workspace_lifecycle/migration.sql` |
| C | `packages/db/src/lifecycle/pg-process.ts` |
| C | `packages/db/src/lifecycle/archive-storage.ts` |
| C | `packages/db/src/lifecycle/archive.ts` |
| C | `packages/db/src/lifecycle/restore.ts` |
| C | `packages/core/src/identity/lifecycle/lifecycle.module.ts` |
| C | `packages/core/src/identity/lifecycle/lifecycle.providers.ts` |
| C | `packages/core/src/identity/lifecycle/types.ts` |
| C | `packages/core/src/identity/lifecycle/actions.ts` |
| C | `packages/core/src/identity/lifecycle/activity.ts` |
| C | `packages/core/src/identity/lifecycle/stats.ts` |
| C | `packages/core/src/identity/lifecycle/archive-scan.ts` |
| C | `packages/core/src/identity/lifecycle/jobs.ts` |
| C | `packages/core/src/identity/lifecycle/restore-request.ts` |
| C | `packages/core/src/identity/lifecycle/delete.ts` |
| C | `packages/core/src/identity/lifecycle/owner-export.ts` |
| C | `packages/core/src/identity/lifecycle/recovery.ts` |
| C | `apps/api/src/http/identity/lifecycle.controller.ts` |
| C | `apps/web/src/features/onboarding/components/RestoringCard.tsx` |
| C | `apps/web/src/features/settings/components/WorkspaceDangerModal.tsx` |
| C | `apps/web/src/features/settings/hooks/useWorkspaceLifecycle.ts` |
| C | `packages/db/test/lifecycle.test.ts` |
| C | `packages/core/test/workspace-lifecycle.test.ts` |
| C | `apps/api/test/integration/workspace-lifecycle.test.ts` |
| C | `apps/web/e2e/http/workspace-lifecycle.spec.ts` |
| C | `coding-packs/reports/TIP-041-completion.md` |

## CONTEXT
- Workspace D:/CODING/AppChat_Ver2; nativePostgres16, pg_dump/pg_restore binaries, NestJS/BullMQ, Storage port. KhôngDocker.
- Blueprint §2.0: free archiveInactiveDays90, cảnhbáo14ngày; activity=max login/inbound/outbound/action; archive giữvôhạn tới delete, deletionbackup30ngày; restore<2phút free; adminarchive/restore luônpreview.
- `db/src/provisioner.ts:27–65` chỉprovision/drop, khôngdump/checksum/restore. `identity/jobs/tenant-provision.processor.ts:37–55` nonactive cóthểprovision+setactive; phải chặn archived/restoring/deleting, không vô tình tạoDBrỗng thayarchive.
- `db/src/tenant-resolver.ts:47–50` cached dbStatus;040 xử lý suspendaccess. `identity/services/workspaces.service.ts:136–143` coi nonprovisioningnotready làfailed; chưaUIrestoring.
- platformidentity đã archivedAt/archiveKey; workspaceStats cóschema ởops nhưng khôngprooftạischeduler. GeneralSection:149 nguyhiểm chỉtoast.
- Storagehiện put/get buffers, không streamingarchive; không đọc cảDBdumpvàoRAM. Archive là backupkỹthuật cósecret, khôngđược đưa choOwner nhưlogicalexport.
- Thuậtngữ freeze/suspend ≠ archive/drop; phảigiữ phânbiệt. Không điều chỉnh quyềnOwner thànhplatformadmin.

## APPLICABLE STANDARDS
Đọc standards/database/tenant-db,indexing; actions/action-registry; events/outbox; ops/observability-security; authz/rbac-permissions; api/response-envelope; domain/state-machine,concurrency,validation-defaults,gap-filling; integrations/provider-ports; ui/interaction-patterns,frontend-structure,prototype-parity; i18n/i18n; code/testing,file-size-module-layout; workflow/git-flow-ci.

## Rà trước khi làm
1. Rà clusterregistry/dbhost/dbname vàpermissionsprovisioner/migrator; khôngđược dùngsuperuser chung hoặcDROP name từuserinput.041 không thaypgsetup production;045 provisioning grants cótestintegration.
2. Xácđịnhplatformreceipt/lock/actioncontext đã045b/040 tíchhợp. Các thao tác restore/ownerdelete phải chạy khi tenantkhôngmởđược; platformaudit làauthority.
3. Đối chiếu wiring activity đã chốt ở Task 1 với hook sau045b: `executor.ts` → `activity-event.ts` → outbox → `activity-consumer.ts`; `identity.module.ts` nạp lifecycle module ở API/jobs. Không thay activity bằng timestamp lúc consumer retry; không quét mọi DB không giới hạn.
4. Khônglogicalexport raw pg_dump: reuse038b data/artifacts, loại credentials/password/auditsecret. Noautoarchive paid/trial vì thấpcredit.
5. Hợp đồng archive encryption thuộc041: streaming AES-256-GCM, nonce ngẫu nhiên không tái sử dụng, envelope version/key_id/checksum/size, key ring inject từ cấu hình bí mật045b; giữ key cũ tới khi không còn manifest tham chiếu. Không hard-code key hoặc đưa key vào archive.045 chỉ provision secret/grants/storage và runbook rotation/restore theo hợp đồng này, không là dependency thiết kế ngược. Restore drill dùng fixture riêng, process args không in password.

## TASK
### 1. Durable lifecycle state machine và activity
- Platform WorkspaceLifecycleJob (id,workspace_id,operation,generation,status,step,expectedversion,leaseexpires,attempts,error,started/finished); ArchiveManifest(key,workspace_id,db_name/schema_version,checksum,size,encryption_key_id,created_at,retention_kind,expires_at); unique activeoperation/workspace, idempotencyreceipt. Không chỉRedisjobretention.
- currentstate CAS: active→archiving→archived; archived→restoring→active; active/archived/suspended→deleting→tombstone. Restore/archive/delete đồngthời mộtwinner, stalejob khôngđègenerationmới.
- **Nguồn activity và wiring cụ thể:** `SessionsService.start` chỉ có lastLoginAt của user, không được áp timestamp đó cho mọi workspace của họ. Khi OnboardingGate mở workspace đã xác thực, gọi action platform `workspace.open` qua useAction/Executor; server kiểm membership hiện tại, ghi mốc mở workspace và yêu cầu restore nếu cần trong cùng platform transaction. GET session/provisioning chỉ đọc. Refresh token, polling và healthcheck không tính là mở workspace; một idempotency key cho mỗi lần mở, không tạo vòng lặp render → action.
- `kernel/actions/activity-event.ts` tạo sự kiện activity tối thiểu (workspace, action_log_id, occurred_at, actor/source; không input/result/PII), được executor ghi cùng transaction thành công. Loại trừ chính activity/maintenance/stats/archive jobs để không tự giữ workspace sống; action nghiệp vụ của user hoặc agent vẫn tính. Platform actions dùng bridge045b, không giả transaction hai DB. Replay idempotency không sinh activity mới.
- `activity-consumer.ts` đăng ký các topic `message.received`, `message.sent`, action activity; đọc timestamp gốc từ message/outbox bằng primary key khi payload hiện tại thiếu timestamp, không dùng thời điểm delivery. Cập nhật platform bằng GREATEST và receipt unique event_id/consumer trong cùng transaction; event cũ/retry không kéo dài tuổi workspace. Nếu bridge lag hoặc timestamp không xác định, scan bỏ qua workspace và cảnh báo, không suy ra inactive rồi DROP.
- Trước quiesce, khoá eligibility generation và đọc lại activity/plan; sau drain phải kiểm lần cuối các action/message đã commit và outbox chưa phản ánh ở platform. Có activity mới hoặc pending unknown → huỷ archive an toàn. Test race hành động xảy ra giữa scan và quiesce; không chỉ test đơn luồng.
- Nightstats bounded platformworkspaces active, tenant counts read-only, last_active=max đúng3nguồn, khôngresetactivity vìstatsjob/healthcheck tựchạy. Đăngnhập mộtmember đượcgắnworkspacethựcđãmở, khôngmọiworkspace màusercó.
- archive eligibility dựa currentplan archiveInactiveDays, trial/paidnull loại, grace/lastActive timestamp; unknownactivity khôngcoi epoch→drop. Cảnhbáo Owner14ngày email+notify idempotentwindow, activity/planchange cancelwarningeligibility.
- Internal scheduler/actions trusted source, audit+outbox; khôngGET mutate trực tiếp. Mởworkspacearchived tạo restore-request action serverauthenticatedmembership, coalesce multipleusers, status polling + workspace.ready.

### 2. Archive protocol: backup phải tốt trước DROP
- **Fencing external operations:** `operation-lock.ts` giữ PostgreSQL session advisory lock theo workspace trên dedicated maintenance connection tới **cluster chứa tenant theo registry dbHost**, không mặc định cluster platform và không transaction pool. Mỗi cluster có một maintenance database chuẩn cố định cho mọi worker (advisory lock có phạm vi database); mapping workspace/cluster/dbname không được đổi khi operation đang chạy. Lấy target-cluster lock trước, sau đó CAS generation/operation ở platform và đọc lại mapping/status trước từng bước. Mọi provision/restore/delete/archive dùng cùng lock; lease hết hạn chưa đủ cho takeover nếu lock còn giữ. DROP/CREATE DATABASE chỉ thực hiện trên chính connection đang giữ target lock; không dùng subprocess DROP hay pooled connection khác. Mất target connection/lock hoặc không đọc được platform generation → không phát lệnh destructive, abort dump/restore child, không tiếp tục trên kết nối tự reconnect. Worker mới chỉ chạy khi lấy được lock và đã dừng/quarantine process cũ; không song song restore vào cùng database name. CAS status là lớp bổ sung, không thay lock. Cluster/host không nằm trong registry allowlist hoặc chưa có maintenance config phải fail closed. Test cả tenant ở cluster khác platform, stale worker sau takeover không DROP DB generation mới và không đụng database trùng tên ở cluster sai.
- Freeze/quiesce tenant: blocknewactions/AI/send040, draininflight bounded, disconnectchannel leases/IMAP, widgetoffline. Heartbeat/lease handoff race phảitest. Chưaquiesce được → khôngdump/drop.
- Spawn pg_dump -Fc bằng execFile/argv, dbname từvalidatedregistry, hostallowlist, secrets env/PGPASSFILE permissionrestricted; khôngshellconcat. Stream output tới encryptedarchive storage path, checksumsstream; ghi manifestd durable vàreadbackchecksum.
- pg_restore -l kiểmcatalog theoBlueprint; thêm isolatedrestore-smoke trênfixture test gate, khôngclaim -l đủprovesrestoredata. Chỉdrop sauupload/readback/hash/catalogverify+manifestcommit, registryrecord vẫnđủrecover.
- Drop xácminh targetdb_name==tenantDbName(workspaceid), khôngplatform/template/postgres; privilege scoped provisionerpg_signal_backend đủchoownconnections, khôngbroadkillcluster. Retryafterdrop khôngprovisionempty vàmarkactive.
- Failure **trước DROP** giữDB, rollbackstatusactive nếuDBverifiedintact, cảnhbáo vàreconnect khiappropriate. Failure **sau DROP** khôngthểlàmtheo“đặtactive” literal: giữarchived/recoveryneeded dựamanifest, restorejobrecovery; khôngdốiDBcòn. Ghi deviationtechnical giải quyếtcrashwindow khôngđổibusinesspolicy.
- Archivedbackup indefinite; normalfilestorage liênquan phải giữ/reference-manifest, khônggarbagecollect vìtenantDBdropped. Encryptatrest vàkeyretention đủrestore, khônglogsecrets.

### 3. Restore an toàn
- **Member lifecycle context (không phải admin context):** `request-actor.ts` có nhánh xác thực JWT + workspace UUID + membership active chỉ từ platform; không gọi AuthzResolver.resolve vì hàm đó mở tenant trước cả nhánh Owner. `lifecycle-actor.ts` tạo capability server-only ràng buộc actor/workspace/action, không giả AuthzContext toàn quyền. ActionsController chỉ chọn nhánh này cho allowlist cố định `workspace.open`, `workspace.delete`, `workspace.freeze_request`; action open chỉ ghi activity/khởi động restore khi trạng thái cho phép. Action delete/freeze_request kiểm Owner trực tiếp từ workspace.ownerUserId và xác thực mới khi cần, không dựa tên role.
- Context khai báo phân biệt trong `action-context.ts` và helper `workspace-lifecycle-context.ts`, authorizer/executor kiểm action trùng capability trước mọi dispatch. Vẫn cùng ActionExecutor, preview/policy/receipt/audit/platform outbox045b; không raw POST thứ hai. Bất kỳ action khác (CRM/export/admin.*) phải đi đường quyền bình thường; không dùng membership-only để đọc dữ liệu tenant. Không cho header/client source tự tạo capability. HTTP đọc trạng thái lifecycle dùng cùng kiểm membership platform, không mở tenant. Server kiểm membership/Owner lại khi confirm và khi nhận restore request; đã suspended/deleting/tombstone thì open không tự resume/restore.
- Currentmembership hoặcplatformadmin mớirequest; untrustedpublicvisitor khôngtriggerrestore. Singlejob/generation. CreateemptyverifiedtargetDB, pg_restore roles/ownership policy, grant apppermissions, tenant-migrate currentversion, seedidempotentmissing, integritychecks.
- KhôngdùngTenantProvisioner.provision(template) rồiđèrestore, khôngrestore vàoDBactivecódata. Partialrestore giữrestoring/failedretrycontrolled, dọnchỉDBtạmđúngjobgeneration; khôngdeleteoriginalarchive.
- Đặtactive sauallchecks+migrations, publishworkspace.ready platformbridge vàinvalidateallprocesses; frontend“Đangkhôiphục”, progressstep/retry/error, khôngonboardingdeclareremindtrial hoặcresetwallet.
- Channel expiredsession yêu cầuQR, khôngassumeautologin. Archiveđãrestore giữ theoapprovedretention, khôngpurgeđểtiếtkiệm tùyý.
- Benchmark <120s freefixture kíchthướcghi rõ, timeoutkhôngfalseactive. Táchthời gianqueue/dumpdownload/restore/migration; largerworkspace SLAreported khôngclaim tấtcả<2phút bằngemptyDB.

### 4. Owner danger zone và delete
- **Step-up cụ thể:** thêm `workspace.delete_challenge` vào allowlist membership-only nhưng yêu cầu Owner, source human UI/API. `step-up.ts` tạo challenge platform gắn user/workspace/operation/delete-preview-hash/expected-version, TTL5 phút, OTP email riêng purpose delete_workspace; lưu hash có server secret, tối đa5 lần thử/challenge và rate limit5 challenge/15 phút/user+workspace. Không dùng OTP đăng nhập hoặc token workspace khác. `workspace.delete` consume challenge và ghi delete job/receipt trong cùng platform transaction sau khi xác minh OTP, Owner và preview còn khớp; replay với cùng idempotency trả kết quả cũ, key khác không tiêu lại challenge. Không nhận OTP vào model, không log plaintext; modal dùng ô bí mật và lỗi hết hạn/thử quá mức/preview thay đổi yêu cầu challenge mới.
- **Freeze request durable:** `workspace.freeze_request` input reason≤500, preview+confirm, unique pending request/workspace, status pending/approved/rejected/cancelled, requester/time/version, audit platform. LifecycleController GET danh sách chỉ platform admin (IDs-first `(status,created_at,id)`), panel LifecycleRequestsPanel gắn AdminScreen040; dùng `admin.workspace.freeze_decide` với request_id/if_version/decision/reason qua Executor. Approve tạo durable intent gọi suspend040, chỉ đánh approved sau suspend xác nhận; retry dùng cùng request id, không tự gọi action trong DB transaction đang giữ lock. Reject không đổi trạng thái workspace. Owner đọc được kết quả yêu cầu của workspace; UI không báo thành công trước durable receipt. Admin permissions vẫn kiểm lại ở mọi bước; nếu workspace deleted/revoked requester thì request thành cancelled với lý do.
- Áp đềxuấttối thiểuquyền: Owner freeze = gửi yêu cầuplatformadmin, khôngtựarchive/suspend; admin xửlý040. Ownerexport = logicalscopedbusinessdata+allowedfiles038b, khôngrawDBbackup. Ownerdelete explicitworkspaceidentity+freshreauth/OTP+preview consequences, servercheckexactowner; khôngdùngsettings.manage thayOwner.
- Workspace.delete platformoperation đủauthorizer hiện hữu, không cầntenantlog. Khônggrantagent/assistant quyềndelete; assistantchỉhướngdẫn humanconfirmation. Revokeuser/ownershipbetweenpreviewconfirm fail.
- Deletionbackup30ngày encrypted, tách archivedbackupindefinite. Workspaceactive dumpverified nhưarchive, archived reuseverifiedmanifest chuyểnretentiontombstone. DROP idempotent rồi revoke routing/memberships/sessions/access; giữminimalplatformtombstone/backupmanifest/job đểrecovery/purge, không orphanarchive vìxoáregistry trướcmanifest.
- Billingpaidexpired giữ30daydata theo039 khôngđồngnghĩa auto-deletetenant: chỉexplicitdelete ởđây; freeinactivearchive90 khácpolicy. Khôngxoábillingfinancialaudit/logs theoownerdelete nếuretentionbắtbuộc, UI nêu rõretaineddata.
- Purge chỉbackupdeletion khi now>=expires_at, nohold/reference, securepathallowlist; jobreplay khôngpurgeactivearchive. Khôngcommandbatchcomputedpathra ngoàiarchive root.
- Khi delete, enumerate **mọi** archive generation và attachment reference của workspace, không chỉ archive_key hiện tại. Tất cả chuyển deletion retention expires_at=deleted_at+30ngày trong transaction tombstone, trừ legal hold có lý do/authority/audit. Shared object chỉ xoá khi không còn reference hợp lệ; hold không âm thầm kéo dài toàn workspace. AC07 phải có archive→restore→archive→delete với hai generation, shared file và hold; sau hạn không còn bản indefinite bị bỏ quên.
- Logo trongREQM01c khôngthuộclifecycle, gánsupplementalsettings đểkhôngẩnloophole.

### 5. Wiring, query/index/UI
- **DI mail không vòng:** tách factory MAIL_PROVIDER/IDENTITY_ENV cần cho mail từ identity.module.ts sang `mail-provider.module.ts`, export token; cả IdentityModule và LifecycleModule import MailProviderModule. Không để child LifecycleModule inject provider chỉ khai báo ở parent IdentityModule, không import ngược IdentityModule. Giữ nguyên lựa chọn provider và console/test guard hiện tại; không tạo mail client thứ hai với cấu hình khác. Integration boot cả API và worker ROLE=jobs xác nhận delivery/step-up resolve được provider, không chỉ unit instantiate bằng tay.
- **Delivery rõ ràng:** cảnh báo14 ngày là lifecycle transactional notice, không marketing unsubscribe. `delivery.ts` giữ platform delivery receipt/outbox riêng theo workspace/window/channel; email dùng MAIL_PROVIDER via MailProviderModule, nội dung vi/en tại mail-templates.ts. `notification.rules.ts` đăng ký kind archive_warning với catalog/server locale manifest, tạo tenant notification khi DB còn active; gửi ready sau restore/invalidation, không mở tenant notification lúc DB đã DROP. Trạng thái lỗi/recovery lưu platform và trả qua lifecycle status polling cho user có membership/admin. Email thất bại retry bounded có last_error/next_attempt; acceptance kiểm provider accepted và persisted in-app notice, không coi enqueue là delivered. Không gia hạn deadline từ mỗi retry; cảnh báo chưa giao thành công thì không archive theo lịch, hiện admin cảnh báo để xử lý. Preference marketing không tắt cảnh báo mất truy cập; không gửi PII/secret/archive key qua mail. `workspace.ready` dùng realtime emitter sau restore active và scope membership hiện tại; polling là fallback nếu offline, không mất state vì socket thất bại.
- Tenantqueue dispatcher duy nhất xửlýprovision/archive/restore/delete theojobname; khôngđặtworkerschỉreturn jobkhác nhưdone. Provisionguard active/provisioning only, archived/deletingreject.
- StateAPI platform-only trảjobsteps/errorredacted, khôngdump paths/credentials. RESTread/no mutation, actionrequestsameExecutor. Adminbuttons040 gọi041 khihandlerready.
- Owner DangerModal vàRestoringCard táchfile, i18nvi/en, UI khôngtoast“đãgửi” khichưa durablepersist. Authzguard serverclient, mobile/keyboard/retryfocus.
- Index jobs(workspace_id,generation)unique, jobs(status,next_attempt_at,id)partialpending; manifest(workspace_id,created_at desc,id) INCLUDE(checksum,retention_kind,expires_at), stats(last_active_at,workspace_id), eligibleplans equalityfirst. IDs-firstscan/deferredjoin choarchivecandidates, EXPLAIN boundedbatch, khônglistalltenantconnections.
- Wiring: `identity.module.ts` import lifecycle module; `identity.jobs.module.ts` đăng ký dispatcher/scheduler; `identity.http.module.ts` đăng ký LifecycleController và service export qua core index. Shared DTO/event export từ shared index/api index; action title/error vi/en trong actions.json. Module lifecycle chỉ phụ thuộc kernel/platform services, không import ngược IdentityModule gây vòng DI. Executor chỉ gọi helper activity độc lập, không import identity domain. Nếu045b đã tách executor, cập nhật exact manifest theo file thực trước code, không tạo đường thực thi thứ hai.

## ACCEPTANCE CRITERIA
1. **AC01 eligibility:** Given free89/90ngày,paid/trial,unknownactivity,warning14ngày; When scan/replay/planchange; Then chỉeligiblearchive, mộtwarning/window, newactivitycancel, paidkhôngarchive.
2. **AC02 archiveproof:** Given fixtureDB+attachments; When archive; Then quiesced, encryptedstream/checksum/-l/manifest trướcDROP, archivedaccessiblemetadata khôngrawdownload.
3. **AC03 crashmatrix:** Given failuresbeforedump/upload/checksum/drop/registrycommit; When retry; Then trướcDROP DBnguyên+activeverified, sauDROP khôngfalseactive, exactgenerationrecover, khôngdropplatform/template.
4. **AC04 restore:** Given archived schemaold+manymembersopen; When request; Then1job, actualdata/filesrestore+migrate/currentroles, readyonlyafterchecks, wallet/trialkhôngreset.
5. **AC05 performance:** Given declaredfreefixture; When measuredrestore; Then<120s hoặc báoFAIL/PARTIAL cómeasure, khôngclaimSLA từDBrỗng.
6. **AC06 delete:** Given Owner/nonOwner/revokedOwner/archivedworkspace; When preview/OTP/confirm; Then rolecheckfresh, only exact Owner allowed; platform-admin status alone does not authorize workspace.delete, encryptedbackup30ngày,tombstonedaccess, noagentdelete.
7. **AC07 purge/export:** Given indefinitearchive vsdeletedexpiry, foreignpath/tenantfile; When purge/export; Then khôngpurgeindefinite/live, onlyexpiredcorrectkey, logicalexportkhôngsecrets, deniedrequestkhôngartifact.
8. **AC08 jobs/UI:** Given concurrentprovision/restore/archive, unavailableDB,channelsqueued; When dispatch/UI; Then khôngemptyreprovision/joblost/queuedoutboundsend, state/progress/retry thật vi/en/mobile, realQRreconnect nếuexpired.

**AC04/06 bắt buộc thêm matrix HTTP:** Given tenant DB đã DROP, user còn membership hoặc vừa bị revoke; When open/status/delete/freeze_request và thử contact.search/admin.workspace.restore bằng cùng headers; Then chỉ allowlist đúng quyền chạy được mà không gọi tenant resolver; revoke bị từ chối, nonOwner không delete/freeze, không mint quyền admin; suspended không tự mở lại. Đo spy resolver kết hợp integration DB thật, không chỉ mock toàn bộ actor.

### Lệnh builder (chưa chạy ởpha docs)
```powershell
pnpm --filter @appchat/db exec vitest run test/lifecycle.test.ts
pnpm --filter @appchat/core exec vitest run test/workspace-lifecycle.test.ts
pnpm --filter @appchat/api exec vitest run test/integration/workspace-lifecycle.test.ts
pnpm --filter @appchat/web exec playwright test e2e/http/workspace-lifecycle.spec.ts
pnpm i18n:check
pnpm parity --done
```
Test harness native thực pg_dump/restore/drop chỉephemeraltenant allowlist, environmentexplicitopt-in vànegativeplatformnameguards. Khôngchạy destructivecommands trênworkspace thật. D59 trướccommit+chốtTIP; providerchanneltestthiếuaccount ghiCHỜ-TK.

## CONSTRAINTS
- Khôngdrop trướcverifiedarchive, khôngrawbackupchouser, khôngautoarchivepaid hoặcautodelete90days.
- Reuse040 quiesce/access,045b platformbridge/secrets,038b logicalexport; noOwneradminprivilege.
- Sourcefiles backend<600/tách500, FE<400, testsriêng; chỉdocs ởcâuA.
- No destructivetest/demo/serviceschanges; reportSHA vàevidence trungthực.

## BUILDER-CHECKLIST
- [ ] Exactmanifest/hooks/dispatcher/retention vàleastprivilege reviewed.
- [ ] AC01–08 nativeproof vàfaultmatrix, negativeDROPguard, SQLplans.
- [ ] UIrestore/error/Ownercontrols/parity/mobile, signedoffPD nếuneeded.
- [ ] Completionreport/COVERAGE runtimeactual; D59, cleanSHA/PRdev.
