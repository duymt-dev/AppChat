# Sales Agent behavior planning audit — 2026-11-02

Docs only. Goal remains active; no code/provider/native service or data changes.

## Source-to-pack coverage
- COM-2-8 -> TIP022c SPEC3, AC5–7: granted catalog/stock reads, stock applicability/combos, bounded real alternatives, current publication grounding.
- COM-3-11 -> SPEC1–2, AC1–4: exact source/customer/quote, separate fixed70% pre-effect estimate, handler transaction receipt and current approval/resume/lineage guard.
- 044 owns only regression/eval children, never the missing runtime implementation. Both parent statuses remain MỘT PHẦN.
- Actual source reviewed: agent.runtime38/73–89; reply.service131/171; catalog read handlers/search repo and action schemas; quote-decide43/63/85; quote-access; approval resume.022b templates/045b fences/019b lineage/015f roots/032c guards reconciled.

## Manifest and quality gate
-83 exact paths;10 future M. Predecessors:022b template-revisions,045b send-fence/operation-continuation,023b quote preview/pending-action,015c AI privacy inventory/cleanup,020c draft hook,014b provider-event/operation-service.
-39 intersecting pending TIP pairs explicitly sequential on BOTH headers. New TIP integrates after them;044 is subsequent release consumer (no file intersection).
-10 sections/10 AC; each source obligation mapped to runtime seam and native/live evidence. Source-body functional and security checks are required beyond this syntactic validation.
- Original TIP022 unchanged; completion report appendix only. Native/unit/live commands are builder requirements, NOT executed now.

## Independent review
Read-only audit_remaining_requirements found three concrete gaps; corrected and rechecked:
1. Manual Copilot/Use/Edit send bypassed reply orchestrator -> server sales-plan attached to020c opaque draft generation; message/outbound/provider dispatch validates current stock via neutral Catalog port in caller transaction, no nested Executor/model. Edited human text never silently rewritten, explicit manual/external copy boundary disclosed.
2. Unique source+revision+quote allowed replay to a different quote -> unique source+revision seals target/intent before execution and keeps consumed/rejected/expired binding; multi-decision source requests distinct confirmations. Added quoteA-consumed→quoteB-new replay negative.
3. Vague operator exception -> exact authenticated023b confirmation receipt, concrete turn/meta-tools/delegate/task/pending/continuation storage and propagation. Model labels/commander ID alone not authority; approval restart preserves exact binding.
Follow-up source-lock review: contact roots before conversation/messages/quote/receipt; actual local/provider/ACK writers share fence; delete undo included and cannot revive invalidated evidence. Reviewer reports no remaining concrete blocker in this bounded recheck, not full-system/runtime proof.

## Executed documentation checks
- validate-022c.py:10 sections,83 unique exact M/C paths,10 future M with creator,39 bilateral intersections,2 sole-owned parents; fixture command present.
- Explicit header integration graph:1126 edges/52 nodes acyclic. Scope is explicit header edges ONLY; not full semantic dependency acceptance.
- Ledger merge:1558 rows/89 unowned; statuses unchanged541 ĐẠT/41 CHỜ-TK/389 MỘT PHẦN/369 CHƯA/118 GIẢ/34 NGOÀI/66 QUY-TẮC.
- Whitespace diff check required before commit; no production unit/native/live test claimed.

## Unfinished global scope
Seven full COVERAGE sections, remaining owner gaps,045/046 and whole-graph/full independent review are still open. Neither this pack nor a commit completes the goal.
