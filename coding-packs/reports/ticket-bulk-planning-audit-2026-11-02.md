# Ticket bulk planning audit — 2026-11-02

Docs only; no production code, model/provider calls, native service/data changes.

## Source evidence

Independent audit_blueprint_remainder confirmed support/actions/ticket-edit.handlers73–98 runs one transaction, silently skips closed rows and allows combined assignment/priority.33–35/101–103 restore all snapshots without after-state guard. support-system45/59/75/96/120 has writers without version bump. BulkBar57–64 clears selection on truthy result. Public undo.service19–37 and ActionLogScreen40/useAction52 cannot represent partial undo safely.

## Planned repair

79 exact paths /15 future M /46 bilateral pairs /1 owned standard row /8 AC. Preserve max200/current permissions/non-agent grant, atomic combined item, <=50 inline and51+045b jobs, durable per-ID receipts/current projection, real CSV/XLSX outcomes. Native trigger increments ticket version exactly once across ORM/raw SQL/system/undo. Private item and undo actions reuse003c/045b trusted lineage.

Neutral undo-action registry prevents unsafe legacy transaction path;409 UNDO_REQUIRES_ACTION is handled by actual toast/audit shared canonical action helper, with preview and truthful partial result. Single-record undo response stays compatible. No claim agent assignment means model processing.

## Independent correction rechecked

Reviewer found HIGH: undo could seal only completed children while forward retry/in-flight work later committed, falsely marking parent undone. Fixed: terminal or cancel+fully drained gate, shared parent admission/retry lock/CAS at confirmation, immutable changed-success receipt-set digest, forward generation sealed into undoing, no subsequent admission/retry. Concurrent undo converges on same generation; recovery never shrinks cohort. Parent undone requires sealed set undone and no forward effect still possible. AC6 covers running/cancelled-inflight/retry/dual-undo/crash barriers. Reviewer rechecked closure, no residual in bounded finding.

Executed structural validator PASS10sections/79paths/15futureM/46pairs/1owner; obligations merge1556rows/91unowned, statuses unchanged. Builder commands are future native/live gates, not executed tests. Stock trends and remaining six goal gates remain open.
