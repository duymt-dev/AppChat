# Zalo lifecycle planning audit — 2026-11-02

Documentation only; no source/runtime/provider call or native service/data change.

## Existing evidence

- Real installed zca-js2.2.0 transport exists; adapter currently retains last outbound msgId only and drops cliMsgId. SDK sendMessage result does not provide cliMsgId, while undo/addReaction require it. Message self events carry it and are currently disabled (selfListen:false).
- send.processor retries ordinary exceptions; send result fanout swallows consumer errors. Redis retention is not durable send dedupe. Current local recalledAt/reactions are not proof of remote action.
- History returns after requesting listener messages, discards sink failures, and incoming pipeline ignores two sync flags. Live message.received can trigger support SLA/reopen, notification and AI-task effects, so merely disabling agentReply would be insufficient.
- SDK group member API requires member IDs; invite link may be disabled; member mutation can be partial; listener history and group history expose different pagination limits. Types prove API availability, not provider permission or live success.

## Plan

TIP014b:134 exact paths,18 bilateral overlaps; after045b and before037/042 successors. Separate provider operations/refs/receipts, session fencing, history run, contact sync, UI status and native tests. Five future-M paths depend on030b/032b/045b. Basic group creation remains023b; remaining group UI025b.

- Durable command/part receipt, honest unknown/partial and no blind network retry.
- Self-event ref join is exact account/thread/msgId, never content/time matching. Missing/unsafe IDs unavailable; self metadata is not duplicate customer message.
- History emits dedicated safe refresh, no live lifecycle events; real downstream worker test protects ticket/SLA/notify/task state.
- Cancellation/read authority separated by message versus management kinds. Existing reaction input preserved through immutable desired-state preview/revision binding.
- Sync flags use match-only identity path; address book snapshot requires explicit existing CRM import permission/confirmation, no auto outreach/CRM dump.
- Immutable commerce file binding crosses quote/invoice/order/receipt/contract/appendix producers, not expiring URLs alone.

## Review and validation

Independent reviewer audit_blueprint_remainder reported2 high and2 medium contract findings. All four were patched and independently rechecked: no remaining blocker in this local review, not whole-goal PASS. Manifest/source existence, explicit future-M prerequisites, uniqueness, bilateral intersections, sections and whitespace checks run before commit. Runtime commands in TIP are future requirements, not reported as executed.

merge.py:1481 rows,207 unowned gaps; five previous gaps assigned plus provider-receipt atomic obligation added. Eight existing obligations now014b-owned, runtime states not promoted. CHỜ-TK live obligations retain the distinction from missing implementation.

Whole goal still incomplete: remaining supplemental TIPs,044/045/046 and seven-part/global independent review. Continue025b/022b/019b vertical seams; this checkpoint is not a stop condition.
