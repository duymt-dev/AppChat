# Commerce card/deposit source inventory — 2026-11-02

Independent bounded review by audit_blueprint_remainder, checked against current sources/approved Commerce. No owner reassignment or runtime acceptance yet.

## Appointment to order card: COM-4-4

COMMERCE-DECISIONS86 requires suggestion in Calendar, Inbox AND Assistant, explicit human/agent confirmation, no card for purchased-package appointment. This is not P2 booking deposit.

- booking/actions/appointment-flow.handlers.ts100 returns suggest_order when no package/no order.
- calendar/components/AppointmentDrawer.tsx35–43,132 handles only transient Calendar response. Reload/Inbox/Assistant need durable current projection.
- sales/orders/actions/order-from-appointment.handler.ts27–54 already locks appointment, requires done/no package, creates one-line order at current product price and returns existing order on retry.
- packages/actions/src/booking-config.ts80 already registers canonical action; do not invent a second create-order action.

Proposed separate pack: current eligible projection by appointment/version/contact/conversation, shared extracted card and023c registry/confirmation, actual Inbox+Assistant hosts, same Calendar behavior. Preview price/source versions must be bound/revalidated, not silently repriced at confirm. Reuse033b locks,032c CAS/undo,015e/f contact lifecycle. Tests three hosts/reload/package-linked negative/two-client single order/no automatic creation/changed price or state/undo.

## Order deposits: COM-4-7/8

COMMERCE90 permits amount OR percent and recommends deposit for product.deposit, high order value or no-show history.

- orders.ts24,109 only amount; order-edit.handlers103–104,145–151 validates amount≤total and updates payment status.
- orders/hooks/useOrderForm47–51 uses amount only and JS Number comparison.
- catalog.prisma63 already has Product.deposit BigInt; no new fake product field.
-032b package eligibility,032c integrity,033b booking and023g row AI explicitly do not settle these semantics.

IMPORTANT parent source correction: standards/domain/money-time-numbering.md16 already requires percentage deposits/installments rounded DOWN to đồng, last installment gets remainder. Do not ask to override it or borrow billing half-up. Remaining unclear details are percentage basis/precision/recompute versus snapshot, high-value threshold/config, quantity/multiple product deposit aggregation and no-show history window. Suggestion is not automatic mutation or permission to inspect private history. Resolve only genuinely unspecified policy without changing approved rules.

Proposed separate pack: action create/update/set_deposit and FE/GenUI/import-export roundtrip share exact decimal-safe mode semantics, bound preview/CAS, evidence-backed recommendation with no mutation before confirm, current history authorization. Exact manifest still to assemble including032c edit controls and038b adapters. No pack assigned until full task/AC/gates exist.
