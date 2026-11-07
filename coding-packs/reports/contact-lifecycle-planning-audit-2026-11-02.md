# Contact lifecycle planning audit — 2026-11-02

Docs only. TIP015f + exact manifest184 paths,26 future M,26 bilateral intersections,7 owned COVERAGE IDs. DC256. No source/runtime/native service or data changes; no provider acceptance.

## Source-backed scope
- contact-write.handlers create inverse hard-deletes; delete has no business dependency guard and inverse only clears deletedAt. contact-io inverse hard-deletes batch.
- identity.service recreates/rebinds known deleted identity; Inbox projection retains CRM name instead of deleted marker. order-import is another identity caller.
- Guarded contact delete/restore uses current writable authority, generation,30day TTL, root locks and seven domain ports. Historical financial settlement remains retained; new entitlement requires live contact. No changes to COMMERCE money/state laws.
- Inbound messages retained with tombstone marker, no CRM enrichment/agent resurrection. External new orders get private durable blocked receipts with bounded runtime validation, honest counts and recoverable cursor. Restore permits later authorized sync, not automatic order creation inside restore.
- Pristine create/import undo soft-deletes only all-or-conflict after current dependencies; no cascaded destruction. AI fences cover context/approval/provider reservation/current projections. AI-first actual CSV/XLSX regressions via038b; manual same domain path.

## Independent findings and recheck
Two independent reviewers inspected code/TIP/manifest. All local findings corrected and rechecked:
1. Appointment/ticket/other relation writers must share contact-first lock; count-under-lock alone is insufficient. Added exact seams and barrier tests, including derived ticket source context.
2. Inbox mock lifecycle scenarios missing. Added actual mock module, deleted/unavailable/current event/cache assertions while retaining real messages.
3. Trash visibility insufficient for restore. Added writable CRM scope, deny-none-first and watcher-only denial.
4. Seven ports absent in some worker roots. Added read-port-only composition and real API/ai/jobs/channels root imports; no wrong-role processors or CRM↔Sales cycle.
5. Package extension/adjustment/undo can reopen entitlement. Added canonical contact/order/package locks and new-entitlement versus historical-correction policy.
6. ExternalOrder interface is not runtime schema. Added bounded normalizer, canonical hash/date/money checks, poll nullable event ref and failed-item cursor semantics.
Both reviewers found no remaining concrete blocker in this local scope. This is not whole-goal review or runtime PASS.

## Actual validation
- Local Python checker: sections10; exactpaths184; futureM26; bilateral26; owners7 — PASS.
- python -X utf8 tools/obligations/merge.py:1511 rows;148 unowned gaps. States546 ĐẠT /41 CHỜ-TK /370 MỘT PHẦN /336 CHƯA /118 GIẢ /34 NGOÀI /66 QUY-TẮC.
- git diff --check: PASS (line-ending warnings only).
- No runtime tests executed: planned implementation/native barriers/AI/provider/file/parity acceptance remain future gates.

## Continue, not stop
015e merge/dedupe/lineage and015c privacy still unwritten;012c tenant mail,044–046 and remaining seven-part/whole-graph independent review remain. Checkpoint does not satisfy active goal.
