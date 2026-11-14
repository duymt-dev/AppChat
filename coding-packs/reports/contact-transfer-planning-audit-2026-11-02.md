# Contact ownership transfer planning audit — 2026-11-02

Scope: câu A, docs only; TIP015d and DC254. No application code, native service, database or provider execution changed.

## Source findings and bounded ownership
- contact-owner.handlers.ts:81–120 returns zero quote/appointment counts while a later sales consumer mutates quote.ownerUserId. Atomic contact/conversation/eligible quote/upcoming appointment transaction replaces asynchronous mutation, via neutral registered ports rather than circular CRM→Sales/Booking imports.
- policy.ts:9–14 permits AI writes without D32 approval. Declarative trusted-source policy now mandates actual approval; requester/approver/recipient and current contact authority checked at preview/decision/consume/commit.
- Quote owner is immutable creation attribution under COMMERCE8b; separate operational assigned_user_id with its own assignment revision, current-scope reads and labeled export columns. No retrospective attribution guess, KPI rewrite or permission grants. Contract/order equivalents remain unowned032c.
- owner-move.ts assignment/event mismatch and field-only undo expose stale AI/ABA. Forward transfer and guarded all-or-conflict undo advance fences/revisions; appointment staff/time/resources remain unchanged.
- crm-notify.ts recipient-only, actor skip and persisted contact name/link violate both-party/current-scope needs. Ref-based notice binding projects current authority at history/WS/mail dispatch, no queued PII fallback.
- Nine owned IDs in TIP header. Three earlier overclaims downgraded: REQ-F01b-3 owned015d; broader REQ-F01b-7/COM-8b-6 remain unowned rather than falsely covered.

## Independent review and corrections
Existing reviewer audit_blueprint_remainder inspected source/design/manifest, then independently rechecked:
1. HIGH missing root-lock writers: added appointment create, conversation assign/bulk/undo, canonical025b mutations, email conversation create, quote-send. Mandatory post-lock contact reread and contact-before-child order; barrier tests prevent stale-owner children.
2. HIGH approval reads leaked raw title/summary/input: domain SQL visibility before pagination and current projection now wired to actual reader/controller/public facade, Inbox and GenUI history/refs/stream/provenance. Bulk requires all selected contacts; canary tests cover retained action permissions but revoked contact access.
3. MEDIUM no-op result contradicted receipt requirement: explicit transferred/skipped union, null transfer_id and zero moved counts; stable invocation idempotency, no transfer receipt or undo link. Executor must suppress server undo_until too, not only hide UI.
4. ABA counters clarified: conversation assignment_revision native trigger plus turn fence; appointment existing version increments on transfer and undo.
Recheck confirmed all local findings closed at planning level; no new local blocker. Not whole-goal or runtime PASS.

## Actual validation
- Preflight recomputed all intersections before adding manifest paths and bilateral sequential declarations.
- Local validator: **161 unique exact M/C paths,16 future M,24 bilateral pairs,9 owned COVERAGE IDs,10 mandatory sections — PASS**. Future M has predecessor creator provenance; new C paths do not conflict with another creator.
- `python -X utf8 tools/obligations/merge.py`: **1501 rows /149 unowned gaps**; ĐẠT548, CHỜ-TK41, MỘT PHẦN358, CHƯA336, GIẢ118, NGOÀI34, QUY-TẮC66. No runtime status promoted.
- `git -c core.safecrlf=false diff --check`: PASS. Only documentation and generated ledger changed. AC commands are future execution requirements, not tests run during planning.

## Continue, not stop
015e merge/delete/restore,015c privacy,032c contract/order attribution,012c tenant mail, forwardingQ021, remaining seven-part audit and all pending TIPs/whole graph/independent review still required. Mail source audit saved separately, not a completed012c TIP. This checkpoint is not a goal stop condition.
