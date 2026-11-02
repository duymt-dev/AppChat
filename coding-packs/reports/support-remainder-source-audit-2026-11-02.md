# Support remainder source audit — 2026-11-02

Docs-only bounded source inventory. No owner reassignment or runtime acceptance.

## Category configuration

DC215 explicitly retains free-text category and prototype suggestions pending dedicated configuration. Source support/actions/ticket-create.handler.ts92 and ticket-edit.handlers.ts118 stores category text; shared action support.ts49/85 accepts text. tickets-read.service.ts165 queries distinct categories without current support scope, then181 unions prototype constants and used values. This may reveal category labels from hidden records; future configuration must not perpetuate unscoped metadata gathering.

DC-215 and DEF-034-2 remain unowned. A supplement must preserve free-text compatibility and historical labels, define bounded editable suggestions with canonical config actions/current permission, exact actual settings host, current scoped used-category suggestions and no automatic rewrite of ticket history. Do not assume sla.manage grants unrelated category configuration without checking approved permission semantics. Existing settings registry exposes org_sla, not a category screen.

## Ticket KPI trend

DEF-034-1 remains unowned. tickets-read.service.ts149–185 computes current scoped counts from all live tickets, but returns empty strings for all five trends. Header TicketsHeader.tsx107 only renders nonempty trend; no missing-data fiction. Original TIP034 report25 defers comparison until reporting exists.

Before writing a trend pack, reconcile038 metric definitions/time windows: current all-time status stock cannot be compared to arbitrary created-last-week flow and called equivalent. Define same cohort/timezone/current viewer scope, reproducible previous-point source and unknown/zero-denominator semantics; no invented historical snapshots. Must include actual TicketsHeader/meta DTO, scoped query/index and native fixed-Clock boundary tests. Whole support SLA/account policy is separate.

## Current branch of work

Booking card033c committed7f688f1. Ledger still1556/99 unowned. Q038/039 await deposit-specific policy; do not block unrelated source/pack work. Independent bounded audits now examine Commerce attachment/image/richtext gaps and bulk forward/assignment gaps; their findings will determine the next cohesive packs.

## Independent follow-up: stock trends are not event replay — 2026-11-02

Reviewer audit_remaining_requirements cross-checked038: its support.performance window metric does not define the five current ticket stock counts. Existing history is incomplete: ticket-flow.handlers33–43 undo has no inverse event;59/90 events omit full SLA before/after; ticket-create.handler123–134 hard-delete removes event history; support-system45–60 breach event is detection time, not crossing time;104–105/120 message mutation paths also lack complete history. Breach can change merely as Clock advances.

Smallest honest future supplement: actual complete per-ticket observation batches (ID/status/breach/observed_at/generation, no customer text), not invented old snapshots. Compare current surviving authorized cohort on both sides; newly created after baseline contributes prior0, pre-existing missing observation means unavailable. No historical-total claim or closed-in-window substitute; use absolute delta with explicit observation time and unavailable on missed/incomplete batch. Ticket page retains ticket.view, not an added insights.view gate.

Required seams: support/jobs/support.jobs.module.ts and ROLE jobs registration, support/trends snapshot/read/installer modules, typed schema/migration, tickets-read service/DTO/Header/mock/i18n and015c snapshot inventory/cleanup. Fixed Clock, atomic completion, retry/revoke/erase, skipped jobs, pause/reopen/undo/deadline and indexed100k queries need native evidence. Current locale trend is unconditional up-arrow (vi/en tickets.json14), so direction/unknown presentation must be replaced, not feed negative text to that label. No TIP owner assigned to DEF-034-1 by this source inventory.

Category config now has draft034b; independent source review supports existing settings.manage for configurable suggestions, separate from sla.manage, no closed taxonomy or retroactive rewrite. Its own planning review is still required.
