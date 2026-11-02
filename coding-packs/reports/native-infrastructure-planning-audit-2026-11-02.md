# Native infrastructure planning audit — 2026-11-02

Docs only; goal active. Full045 draft written from native-infrastructure-source-audit.

## Source-to-pack mapping
- Native host/DB roles/pooling/TLS: SPEC1,AC1/2/6; real source env/setup and current missinginfra.
- Deployment/runtime safety: SPEC2,AC3–5; actual API health absence, worker lifecycle,003b registry and045b context wrappers.
- Observability/trace/security: SPEC3,AC6–8/12; exact Blueprint11 thresholds/six dashboards, actual045b instrumentation dependency.
- Recovery: SPEC4,AC9–11; DB+file consistent point, offsitekeys,015c latestjournal and041 maintenance mapping; source and restorehosts distinct.

## Draft manifest and ledger
186 paths; exact M/C and bilateral checks generated. Five atomic Blueprint children added, BP11b assigned045/045b without status promotion. Existing045 owners remain pending implementation.

## Independent review
Requested two bounded read-only reviews: audit_blueprint_remainder on deploy/readiness/drain/monitoring, review_insights_billing on backup/restore/currentprivacy. Initial reviews found four concrete blockers. Draft corrections saved; independent recheck pending. No PASS/runtime/production claim.

## Open gates
Q006 real host/domain/offsite/MFA/notification/restore resources block only real acceptance, not writing remainingTIPs. Full seven-section coverage, orphan resolution,046 and whole semantic file/dependency audit remain open. No services/data changed.

## Review corrections awaiting recheck
- Deploy review: dynamic PgBouncer lifecycle lacked a reconciler/ack seam. Added production service/control protocol and041 adapter with exact files, generation receipts, old-pool drain and fail-closed activation (SPEC1.6/7,AC2).
- Deploy review: Inbox direct/timer sweep bypassed queue wrapper. Explicit module now admits/tracks timer/direct sweep and send-result callbacks, freezes before dependency closure; AC4 races the actual entrypoints.
- Deploy review: fixed-port PM2 rolling sequence could admit listening-but-unready candidate. Per-slot nginx remove/old-generation drain/replace/private-ready/re-add journal now explicit, with partial rollout recovery (SPEC2.8/9,AC4/5).
- Backup review: storage-delete lock did not freeze platform/tenant commits across clusters. SPEC4.5 now requires one maintenance barrier plus every router PAUSE/drain, denies direct app bypass, freezes topology and direct writers, then captures all points/files. No scope reduction to one cluster. Recovery rejects orphan/late helper results, owned RESUME only. AC9 must actually restore a raced two-cluster045b/041 operation.
- Verified upstream PAUSE transaction-drain, RESUME and RELOAD behavior against [PgBouncer admin documentation](https://www.pgbouncer.org/usage.html#pause-db); this is a technical mechanism reference, not a new product requirement. RELOAD alone does not guarantee simultaneous target cutover.
- Source inspection: inbox.jobs.module.ts36–49 bypasses wrapper today; direct pg clients currently in db/setup.ts39, provisioner.ts29/50/62, migrations.ts35/61. Future integrated direct writers still require inventory; no claim runtime admission implemented.

## Current static checks
`refresh-045.py`:186 exact paths/42 bilateral pairs. `validate-045.py`:10 required sections,186 paths,11 future M with creators,42 bilateral pairs,17 sole-owner rows. Scripts were temporary planning validators; no production source created. Full semantic graph and independent recheck remain open.

## Independent recheck result
- audit_blueprint_remainder: all three local deployment findings closed in planning; actual routing/Inbox/rolling seams and crosscut permit order checked, no remaining concrete blocker in bounded deltas.
- review_insights_billing: cross-cluster finding locally closed with common frozen cut, bypass denial, manifest writer coverage and fenced recovery. No additional concrete planning blocker in bounded recheck.
- Both explicitly exclude runtime/production acceptance. Pause availability, multi-cluster recovery and measured RPO/RTO still require implementation/native evidence. This report does not close whole-goal audit.

Final static checks before checkpoint commit: ledger regeneration1563 rows/88 unowned; whitespace check clean; explicit integration-header graph1168 edges/53 nodes acyclic (not full semantic graph proof).

## Small owner delta after infrastructure checkpoint
- BP-9-e: real nginx /healthz alias to /v1/health plus /readyz alias to actual readiness, negative dependency test distinguishes liveness from readiness (SPEC2.5,AC3/6).
- DEF-027-2: native fresh-clone + older-migrated fixture domain/outbox write under tenant_app, explicit grants/default-privileges test and no historical-root-cause overclaim (SPEC1.5,AC2).
- audit_blueprint_remainder independently rechecked these two saved deltas: existing manifest seams suffice, no additional concrete planning gap. No runtime acceptance. Ledger1563/86unowned, manifest remains186paths/11futureM/42pairs,19soleowner rows.
- Release046 and RAG model lifecycle source inventories saved separately; neither is a full new pack and neither changes owners yet.
