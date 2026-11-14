# Commerce edit integrity planning audit — 2026-11-02

Scope: câu A, docs only, TIP032c/DC255. No code, database/native-service or provider changes; no runtime tests claimed.

## Source audit and boundary
- contract-write.handlers.ts:129–144 and order-edit.handlers.ts:34,63,117 mutate creation attribution on edit/undo. COMMERCE8b requires immutable owner; COMMERCE4b still allows operational responsible-person edits, especially marketplace orders.032c separates assigned_user_id and preserves existing creation/conversion attribution sources and KPI.
- Deposit undo restores unrelated note/shipping/custom/owner; shipping and contract inverses lack after-version/current scope.032c uses conservative final-version receipts, field-specific inverses, current authority and retained compensating audit.
- Create inverses can remove subsequently edited records. Orders cannot be hard-deleted under validation standard; pristine create undo becomes retained canonical cancellation with existing order.cancel permission, not a new grant. Actual signatures/send intents/dependencies prevent inverse; initial created audit remains valid history, not a signature dependency.
- Parent row version differs from030b signing source version and015d quote commercial revision. Native parent trigger covers direct writers; explicit child-source/item writers advance parent in the same transaction. Existing financial rules stay032b/036.
- AI-first and manual038b files use canonical create/export contracts with both fields clearly labeled, no roundtrip assignment/attribution overwrite. Live8cases and actual artifact parsing required later.
- Six owned obligations: two previously unowned attribution requirements, four bounded concurrency/assignment/inverse children. Broad other-domain concurrency remains unowned rather than falsely closed.

## Independent review and corrections
Existing reviewer review_insights_billing independently audited actual source and the drafted TIP, then rechecked these blockers:
1. Proposed updated_at indexes did not match actual created_at ordering. Corrected both status and statusless assigned indexes, retaining established list order.
2. Order forms had only create mode. Added explicit editId/state, Drawer entry, separate bounded OrderEditModal, feature export and single global CrmFormsHost mount; create/global-prefill remains separate. Exact store/screen/command/host paths declared.
3.030b child source/suggestion paths were missing from revision integration. Added four exact future writer paths and canonical parent-version hook/barrier tests.
4. Clarified initial created/created_from_quote audit does not block pristine create inverse; real signature/token/send/approval intent does.
Independent recheck: no remaining local planning blocker. Not whole-goal or runtime PASS.

## Actual documentation validation
- Computed intersections before writing; **112 unique exact M/C paths,17 future M,25 bilateral sequential pairs,6 owned IDs,10 mandatory sections — PASS**. Creator provenance verified; no conflicting new C paths.
- `python -X utf8 tools/obligations/merge.py`: **1505 rows /147 unowned gaps**. ĐẠT548 / CHỜ-TK41 / MỘT PHẦN362 / CHƯA336 / GIẢ118 / NGOÀI34 / QUY-TẮC66. No runtime promotion.
- `git -c core.safecrlf=false diff --check`: PASS. Corrected PowerShell stdin encoding damage in newly generated text and prior015d planning report; source files untouched.
- Listed D59/native/AI/parity commands are future acceptance, not tests run now.

## Continue
015e merge/delete/restore,015c privacy,012c mail, remaining gaps and seven-part/whole-graph/independent audit still required. Checkpoint commit is not a stopping condition.
