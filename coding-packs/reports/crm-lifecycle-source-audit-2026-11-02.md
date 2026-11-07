# CRM lifecycle source audit — 2026-11-02

Docs-only source findings, independently reviewed by audit_blueprint_remainder. No code/native services/DB changes. This is not a written015e/015f implementation pack or runtime acceptance.

## Merge integrity and authorization
- contact-merge.handler.ts:49–53 reads roots without lock/version;68–78 unions collaborators and makes source owner a target collaborator without D32 justification.94–109 inverse moves IDs, deletes tags/ACL and clears filled fields without checking after-state/current authority.
- Reject self/cycles/repeated sources/overlapping pair chains; root lock ascending and exact version-bound preview required. Do not silently union ACL or turn source edit rights into target document access.
- Receipt must account for every relation and current version/fingerprint; inverse all-or-conflict, never restore revoked grants, forgotten memory or modified facts.
-015b already owns memory cap50/dedupe/lossless7day receipt.026b adds manual tasks/opportunities and comments; future merge must explicitly integrate them.

## Complete relation inventory to design
- Identity, ACL and pending access requests: pending permission decisions cannot move to target and later grant access without new consent.
- Tags/notes/comments/memory/timeline: preserve author/source, use015b memory receipt, no history destruction.
-026b activities/source refs and quote links; Inbox direct conversation and group participant contact IDs.
- Quotes/contracts/orders, invoices/customer_payment/customer_package and package_usage lineage. Preserve immutable owner, issued bytes, ledger and financial receipt provenance.
- Booking/support and036 loyalty ledger/redemption/caches. Do not blindly sum balances then replay ledger again.
-015d ownership receipts;032c edit inverses;038b immutable import plans/artifacts;045b cached history/current authority. An alias is not an authorization grant.
- Critical consumer: booking/services/appointment-write.ts:42–44 matchingPackage uses exact contact ID; alias only in360 would leave old packages unusable. Package grant/timeline and ticket/booking writers also use source IDs.
- Contracts/orders/invoices list/detail/access/insights require both valid association and current document authority.032c explicitly denies inverses after merge; do not silently reinterpret old receipts through aliases.

## Delete/restore and inbound safety
- contact-write.handlers.ts:155–166 soft-deletes without standard dependency guard; inverse only clears deletedAt. Create undo:54 and contact-io.handlers.ts:120 hard-delete without lifecycle guards.
- validation-defaults requires block for open orders/contracts or debt, preserve conversation history with deleted-customer label, restore30days. Need explicit current finance/status predicate and lock protocol shared by create/reopen/conversion, not check-then-delete race.
- identity.service.ts:29–53 resolves known deleted contact to null, then may create replacement and upsert identity onto it. Soft delete must not implicitly recreate/repoint identity on next inbound message.
- Inbox read.service.ts:154–167 fetches name without deletedAt; view.ts:49 exposes old name rather than deleted marker. Message ingestion should preserve message/history without claiming customer restored or running stale CRM-enriched AI behavior.
- Restore needs version/generation, current authority,30day clock, uniqueness and identity ownership checks; reject merged/erased records. No automatic purge after30days absent retention policy. Privacy015c remains separate.

## UI and ownership
- DedupeModal.tsx NO_MATCH regex fabricates search results; mergeSelected submits all returned groups rather than an actual selection. Backend duplicateGroups caps500 candidates and computes hardcoded scores; these are heuristics, not measured AI confidence.
- Candidate ownership: PRO-customers-dedupe, STD-domain-validate-3a; ACT-contact.merge and REQ-F03a are overclaimed and downgraded to MỘT PHẦN/unowned until an actual pack exists.023b keeps generic action preview, not lifecycle implementation.
- Planned cohesive split:015e merge/dedupe/lineage;015f soft-delete/restore/identity-after-delete;015c privacy. Exact manifests, dependencies, decisions and local independent review still must be written. No owner assignment by a filename reservation.

## Validation and continuation
Ledger regeneration and diff whitespace check only. Continue authoring bounded packs and seven-part audit; checkpoint is not a stop condition.
