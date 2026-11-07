# Runtime integrity planning audit — 2026-11-02

## Scope and evidence

Docs-only câu A, prioritized Zalo↔CRM↔Commerce↔AI. Added TIP019b and exact manifest; no source/runtime/provider/native service changes. Completed019–023 TIP files remain unchanged; completion reports get supplemental pointers only.

Source audit found independent-run budgets in delegate/consult/transfer, missing trusted parent on translate/agent utilities/template detection/quote draft, query embedding tokens discarded, and crash windows between platform wallet charge, tenant step and counter increments. Current terminal mapping calls failure/cancel/handoff done; no scoped run-detail or durable run.step wiring. File:line evidence in TIP CONTEXT and retained COVERAGE rows; original single-run unit tests are not proof of tree/crash behavior.

## Planned contract

- Durable one-provider-attempt/root admission, ancestor limits and positive wallet check per attempt; **soft guard**, not hard spending ceiling or numerical overshoot guarantee.
- Stable original-price usage receipts and cross-DB recovery through045b; logical-group cumulative ceil preserves existing ingest rounding, not separate per-batch surcharges. Known-denied charge stays terminal, no debt/automatic collection on later topup; unknown stays explicit/quarantined if provider cannot furnish evidence.
- Utility generation, query embedding and memory summaries join trusted root; background ingest/summary has explicit independent operation. No SDK/network inside action transaction, no new reranker.
- Persist transfer/depth/tool-loop/step state across approval/restart; child waits integrate023c waiting_external/finalizer,045b operation continuation and032b accepted-job semantics. No terminal SSE/history merely because child queued.
- Current-scope run detail/steps/children, after-commit run.step/run.done, real result drawer and distinct failure/cancel/handoff/waiting states. Owner expiry notification uses current recipient/receipt, not stale broad permission broadcast.

## Independent review and corrections

Reviewer `/root/audit_remaining_requirements` audited code, then written pack. Six findings addressed:
1. Missing future memory summary lineage seams → handlers/summary/summary-consumer in manifest and explicit foreground/background rules.
2. Missing explicit wallet>0 for each actual embedding/fallback dispatch → gate/AC updated.
3. Missing023c request-ledger/finalizer integration → five future-M files, waiting_external typed reason and no false terminal SSE.
4. Unnamed temporary live runner → reuse023b-owned `pnpm ai:live --cases`, not imaginary --suite/root script.
5. Per-attempt rounding would inflate multi-batch ingest → cumulative exact logical-group cost/ceil delta, unique settlement ordinal, zero-delta receipt and terminal-denial rule.
6. Unknown provider usage cannot promise eventual recovery → explicit quarantine/cancel, immutable late settlement revisions and DC251 standard clarification for uncertain timeout vs definite rejection.

Independent recheck confirmed all six fixes; identified one remaining wording conflict between cancellation-with-accounting_pending and a blanket no-terminal promise. Corrected to prohibit success terminal while unresolved, allow exactly-once cancelled/failed/handoff, and accounting-only updates afterwards without resumed effects. No other local blocker found in bounded recheck; no whole-goal PASS. Planning review cannot substitute for native/live implementation evidence.

## Validation executed

- `python -X utf8 C:/Users/PC/AppData/Local/Temp/validate-019b.py`: PASS sections10,127 unique exact paths,14 future M with predecessor C proof,21 bilateral full-path overlap pairs,14 owned IDs.
- `python -X utf8 tools/obligations/merge.py`:1486 rows;552 ĐẠT,41 CHỜ-TK,344 MỘT PHẦN,331 CHƯA,118 GIẢ,34 NGOÀI,66 QUY-TẮC; **165 unowned gaps** (A16/B10/C20/D14/E37/F39/G29).
- Four overclaims downgraded: STD-ai-gateway-6, BP-5.1-d/e/h. Two bounded obligations added. Owner assignment does not promote runtime state.
- `git diff --check`: PASS. API integration command explicitly uses test:integration; worker existing test includes its test/integration paths. Live command only exists after023b prerequisite is implemented.
- No runtime/native/LLM tests run: this is a documentation phase. Code acceptance requires AC1–10 plus D59 and final044 gate.

## Remaining goal work

Continue012b real provider adapters,026b CRM and other supplemental packs;044–046; seven-part audit, whole-graph/current manifests and independent cross-check. BP-4.6-b still has events outside this bounded owner. A committed local checkpoint is not a stop condition or permission to code câu B.
