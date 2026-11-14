# CRM360 activity planning audit — 2026-11-02

Scope: câu A, docs only. TIP026b completes existing360 controls, not CRM lifecycle/erasure. No production code, DB, service, provider or real-model execution changed.

## Source findings and ownership

- contact360.ts:44–54: blank deal, tasks[], older notes relabeled comments. Overview360.tsx:121 / ExtraCards.tsx:18,35: buttons without handlers. No manual-task/opportunity tables/actions.026b defines actual records, notes/comments distinction, current scope and source provenance; not fabricated commerce state or ai_task.
- Blueprint639 contact.add_note absent.026b uses canonical ActionExecutor,24h guarded undo and existing grant semantics; new task/opportunity writes are not automatically agent-grantable.
- crm-read.service.ts:24/82–97 and contacts.repo.ts:83: first50 cards only.026b cursor column pages, shared filters/counts, deferred join and≤2authorized custom fields.
- profile-layout.handlers.ts:47–50 and ProfileLayoutEditor.tsx:59–66: no CAS, concurrent full-tab writes per keystroke.026b version trigger and serialized draft; existing default fallback preserved.
- New CRM datasets receive AI-first CSV/XLSX mapping/preview/confirmed commit and real downloads through038b, full manual fallback, no direct SQL or audit spoofing. DC253 records bounded prototype completion under delegation.

## Independent review and corrections

Existing reviewer audit_blueprint_remainder independently inspected source/TIP/manifest. Two HIGH planning findings:

1. Missing closed timeline union/schema writer seam. Corrected explicit types/keys/ref IDs, generic payload without note body or money, current-authorized timeline/CSV ref projection and canary tests. Added exact timeline writer,015b summary and025b timeline adapter paths.
2. Child dataset selector not bound across persisted TransferPlan and runner. Corrected immutable dataset/schema-version column + migration, row kind/hash/confirmation binding, dispatch from persisted identity, old-plan fail-closed migration, artifact metadata and tests. Added planner/validation/AIplanner/runner/artifacts/actions/schema/FE types/hooks.

Recheck confirmed both findings closed at planning level, no new local blocker. Exact-ID activity reads and future015d quote-lineage boundary clarified. This is not full-goal or runtime PASS.

## Actual validation

- Preflight computed intersections before authoring; declared bilateral sequential order with all23 shared predecessors.
- Local validator: **146 unique exact M/C paths,25 future M,23 bilateral pairs,11 owned COVERAGE IDs,10 mandatory sections — PASS**. Future M names resolve to existing pending creator manifests; C paths do not duplicate another creator.
- `python -X utf8 tools/obligations/merge.py`: **1496 rows,150 unowned gaps**. Statuses: ĐẠT551 / CHỜ-TK41 / MỘT PHẦN351 / CHƯA335 / GIẢ118 / NGOÀI34 / QUY-TẮC66. Five existing gaps assigned, six child obligations added; no runtime status promoted.
- `git -c core.safecrlf=false diff --check`: PASS. Only documentation and generated COVERAGE changed. Future AC commands are specified, not reported run.

## Still required

015d must own source-audited transfer approval/immutable sales attribution/merge relation handling/deletion/restore/Q021;015c privacy has separate retention/anti-resurrection inventory. These are not hidden inside026b.012c tenant mail, further supplemental TIPs,044–046, seven-part coverage completion and whole dependency/overlap review remain. Continue after this checkpoint; commit does not complete the goal.

## Subsequent boundary clarification (015d planning)

Ownership transfer is015d only; merge/delete/restore015e, privacy015c and forwardingQ021 remain separate unowned work until their packs exist. The earlier remaining-work paragraph reserved015d too broadly; it is not a claim these lifecycle gaps are now covered.026b retains its original146 paths; the later015d pair adds a24th sequential intersection.
