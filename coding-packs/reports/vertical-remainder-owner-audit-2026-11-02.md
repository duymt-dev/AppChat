# Vertical remainder owner audit — 2026-11-02

Independent audit_remaining_requirements read-only review; parent checked key source seams. Suggested future ownership, not owner assignment or runtime acceptance. Current ledger145 gaps counts obligations, not145 independent features. Existing valid TIP coverage may be under-recorded; reconcile individually with tasks/AC.

| Priority | Cohesive missing pack | Concrete IDs / source |
|---|---|---|
|P0|033b booking operations/package360|D52d,PRO-settings-booking,DEF-033-1,DV-015,REQ-G07e,COM-6-10; shared/booking/appointment-state.ts expired terminal; missing settings/read-action/360 integration, not just032b grant/reminder|
|P0|023d Assistant interactions/utility|REQ-E03d/E04b/E11b,DEF-023-4,ACT-ai.detect_intent/extract_info/score_lead/summarize; ComposerPopovers selection only UI, assistant/api sendTurn; missing action definitions. Must reuse019b budget/023b authority|
|P0|Kernel event integrity supplement|STD-events-outbox-4/5/6 and system STD-domain-state-4; consumer.ts19–20 receipt outside handler transaction, events.runner.ts concurrency8 without entity order. Needs actual durable consumer contract, not test-only046|
|P1|034b support configuration/KPI/AI entry|DC215,DEF-034-1/2,PRO-tickets-rowpeek; tickets-read categories from data and empty trend|
|P1|017b web widget|REQ-B05c,DC086,DEF-017-2/3,PRO-settings-widgetacts; webchat handlers/settings WidgetSection/AiBox/Preview/public realtime|
|P1|027b catalog/media/stock master|REQ-F05b,F07b-3,COM-4b-5,PRO-products-files/richtext;032b partial catalog owner, media/stockmaster needs exact scope|
|P1|Identity/settings security|PRO-settings-security; registry security only audit, need actual2FA/password/lockout owner, not infra-only045|
|P1|OpenAPI contract|REQ-N03b,STD-api-envelope-10b; noSwagger/OpenAPI in api/src. Could be explicit bounded046 slice with generation/schema/auth contracts, not generic finaltest row|

## Proper final-wave boundaries
044 owns replay/live harness, suites/scoring/model evidence, not missing utilities or UI implementation.045 owns native infra/provision/nginx/processes/backup/observability/deploy; trace ties to045b app instrumentation.046 owns finalperformance/query-count/WCAG/mobile/parity/i18n/errorboundary/buildsmoke/CI/regression; lazy drawers/dirtyforms/OpenAPI/rerank/reembed need explicit implementation slices/paths, not blanket acceptance.

## Seven-part work still open
Action permission/undo matrix, event payloads, interaction patterns/prototype subpanels and K1–K12 risk evidence need atomic audits. Existing B11 hours/greeting022b, some032b package rules and025b ownership prose may lag implementation plans. Do not upgrade status or allocate all leftovers to046 just to reachzero.
