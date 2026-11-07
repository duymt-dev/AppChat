# Event protocol planning audit — 2026-11-02

Docs-only TIP003b. No source implementation, migration, DB/service/port change or runtime acceptance.

## Scope and source
94 exact M/C paths,11 future M with creator provenance,33 exact bilateral file intersections,6 owned obligations,10 measurable AC. Baseline25 direct-writer files plus Executor/undo and9 known019b event/usage seams. Source report event-integrity-source-audit-2026-11-02.md remains the current/future consumer matrix.

Foundation: typed aggregate identity, bounded transaction collector and one sorted terminal sequence flush, separate relay/dispatch/head/receipt fences, durable expected-registry snapshots, recoverable at-least-once wakeups and conservative legacy cohort activation. No per-provider exactly-once or global crossentity order promise.003c/006b domain adapters follow foundation; whole standard4/5 and system-state4 remain unowned until concrete packs. Runtime activation remains blocked until actual adapters/readiness/cutover pass.

## Independent review corrections
- review_insights_billing found missing relay/head/dispatch schema fields and ambiguous counters. Explicit state machines, tokens/generations/leases/attempts/indexes now separate each role; input_digest added to receipt.
- Same reviewer found actually emitted workspace.ready and tag.created missing EVENT_SCHEMAS. Explicit schema/aggregate/no-domain-subscriber baseline dispositions and exhaustive handler-returned producer tests added. STD-events-outbox3 downgraded from ĐẠT to MỘT PHẦN and assigned003b rather than retaining false evidence.
- audit_blueprint_remainder found lock-order ambiguity. Producers never access dispatch head; lazy dispatcher head starts1. All claim/effect/takeover/recovery follow head→dispatch→sorted receipts→canonical domain roots→terminal sequence allocation. AC adds producer/consumer same-aggregate emission/takeover barriers.
- Same reviewer found known019b producers absent from exact manifest. Added run-events, usage-settlement/receipts/recovery, run.store/runner, credit-meter/wallet/usage-receipt, explicit run.step/run.done identity with root-event watermark separate from kernel sequence. CrossDB receipt remains platform authoritative.
- Same reviewer found registry_version insufficient after deployment changes. Durable immutable EventRegistryVersion, retention while referenced, readiness across all outstanding versions and N→N+1 restart test added. No retroactive new consumer effect or silently dropped obligation.
- Both reviewers independently rechecked their findings closed locally; no remaining concrete blocker identified within that review scope. This is not a whole-goal audit or runtime proof.

## Executed documentation checks
- Exact M/C existence/future creator and uniqueness validation:94 paths/11 futureM.
- Exact bilateral intersection validation:33 pairs, both headers contain every shared path.
- Required10 TIP sections;6 owned ledger IDs match header;10AC with future commands.
- merge.py regenerated COVERAGE:1546 rows,114 unowned gaps; ĐẠT544/CHỜ-TK41/MỘT PHẦN378/CHƯA365/GIẢ118/NGOÀI34/QUY-TẮC66.
- git diff --check passes. Commands inside TIP remain future implementation requirements, not executed test evidence.

## Continue, not completion
Write exact003c private system-action adapters and006b projection/delivery/task fanout repairs from source matrix, then remaining114 gaps, all seven unfinished review sections and whole-graph/independent audit. A local reviewed TIP and clean checkpoint do not satisfy the six goal conditions.
