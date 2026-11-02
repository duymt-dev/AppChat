# Requirements/Commerce owner reconciliation — 2026-11-02

Read-only independent bounded review by audit_blueprint_remainder of part-req-ae.md, part-req-fn.md and part-decisions-commerce.md. No whole-row unowned candidate had sufficient existing task+AC+exact manifest evidence. No runtime status or owner changed.

## Keep gaps explicit

| IDs | Missing scope, not already covered |
|---|---|
| COM-4-4 | Appointment create-order card in Inbox AND Assistant;033b slot/package work and generic023c drawer are not enough |
| COM-4-7/8 | Percent deposit input and deposit suggestions;032b package grant-after-deposit and032c CAS integrity do not implement these semantics |
| REQ-F01b-6,COM-8b-5,DC-081 | Owner availability/absence/out-of-shift fallback;042b explicitly excludes shift policy and preserves old owner |
| REQ-D17c | Delegated/Cowork KB scope intersect current caller, including propagation and negative tests;020b folder visibility alone is not it |
| COM-8-7 | Manual stage wins24h;015e canonical lineage and shared stage-rules path do not provide override AC |
| REQ-F07b-3,COM-4b-5 | Connection stock_master selection and inventory movement authority; bank/marketplace edit packs are not this feature |
| REQ-A02d/A05f | Two-level onboarding taxonomy and phone invitations |
| REQ-B04a/B05c,DC-086 | Zalo risk disclosure, widget logo/multiple widgets |
| REQ-B06b | Gmail OAuth keeps Q016 gate, not blanket email adapter completion |
| REQ-C10a/E09c | Snooze/custom-time and correction-send/undo boundaries need exact UI/actions/AC |
| REQ-F05b | Product image lifecycle |
| DC-110 | RAG PPTX/OCR;023f explicitly excludes OCR/automatic KB learning |
| REQ-N03b/N10d,DC-029 | OpenAPI, automated WCAG and mobile notification delivery |
| DC-215,D28c,D48 | Ticket category configuration, storage capability, Research/Web-search locked/negative tests |

## Composite rows need careful split, not blanket assignment

- REQ-M03b: SePay/Casso can be assigned012b and tenant SMTP sender012c after explicit atomic row split and traceability; storage remains unowned, internal notification mail is not automatically012c. Current composite row kept unchanged in this pass.
- REQ-B11d:042b explicit assignment is covered; SLA-per-account is not. Do not assign entire composite row042b.

## Supplemental ordering check executed

Parsed explicit `integrate A before B` declarations from current TIP files:660 distinct directed edges,40 nodes, all40 topologically ordered, zero cycle/dependent leftovers. This proves only that explicit integration-header edges are acyclic. It does NOT prove complete semantic dependencies, every file intersection, missing044–046 packs or all activation gates. Full goal graph audit remains required.

Keep all109 remaining unowned rows visible until concrete plans or valid approved exclusions exist. Next vertical source inventory is record-ai-entrypoints-source-audit-2026-11-02.md; no implementation or native changes in this pass.
