# Record AI entry points — source audit2026-11-02

Docs-only next-pack inventory, not implementation or assignment of uncovered obligations. Candidate TIP023g; no complete pack exists yet.

## Seven verified missing entries

| Obligation | Current exact source | Required integration |
|---|---|---|
| PRO-quotes-rowai | web/features/quotes/columns.tsx41–57, toast only | Carry quote UUID/current context into real scoped Assistant intent; opening panel is not task completion |
| PRO-contracts-rowai | web/features/contracts/columns.tsx57–72, toast only | Same for contract; no signature/approval shortcut |
| PRO-orders-rowai | web/features/orders/columns.tsx72–88, toast only | Same for order; current money/status rules and action receipt |
| PRO-calendar-rowai | web/features/calendar/components/ListView.tsx17–29, AiCell only hint/name | Pass actual appointment ID, not name; distinguish follow-up row and appointment row |
| PRO-tickets-rowpeek | web/features/tickets/columns.tsx54–67, toast only | Open current ticket AI tab/context and explicit suggestion request; no hidden ticket mutation |
| PRO-invoices-aiacts | web/features/invoices/components/DetailTabs.tsx169, string acts→toast | Treat string suggestion as untrusted display text, not executable action ID; verified invoice context and normal preview/approval |
| PRO-products-aiacts | web/features/products/components/DetailTabs.tsx177/181, toast only | Product-context combo proposal and campaign draft intent, never automatic stock/price/campaign activation |

Paths above use prefix apps/. All inspected directly in current checkout. ProductDrawer.tsx72 renders `<AiTab />` without product prop; exact manifest must include ProductDrawer and scoped prop wiring, not DetailTabs alone. InvoiceDrawer.tsx110 already passes invoice object, but do not send raw row JSON to model.

## Existing reusable contracts, not proof these buttons work

- TIP023c specification context carries route/entity/id/selection as hints and server resolves current permissions; `shared/assistant/useScreenAssistant` and `screen-context.ts`, core `assistant/genui/context.ts` are declared future seams. Context never authority; eight existing drawer surfaces do not automatically include invoice/product-specific entry points.
- TIP023d owns selected-agent routing, editable plans and truthful receipt-based progress. User-selected specialist restrictions cannot be dropped because invocation came from a record row.
- TIP023e owns current action discovery;003c private actions excluded;015c current source/privacy;045b current field projection;038b AI-first/manual import/export.
- Existing catalog actions expose product.search/get and CRUD but no dedicated combo suggestion action. Marketing campaign.suggest is existing aggregate suggestion listing, not necessarily a product-specific draft. Plan must explicitly choose bounded suggestion via existing Assistant pipeline and canonical confirmed product/campaign actions; never claim missing backend behavior already exists.

## Required next-pack decisions/acceptance

1. Shared record-intent controller/hook receives allowlisted entity/UUID/intent, no raw hidden rows or arbitrary action ID from display strings. Domain modules register context without shared→feature imports.
2. Opening generic “AI xử lý” must solicit/confirm a concrete task; no silent charge/send/assignment just from panel open. Explicit combo/suggestion click can request bounded read-only proposal with visible AI usage, then canonical writes require normal confirmation/approval.
3. Record switching/unmount/workspace switching must cancel local projection and drop stale result, preserve operation identity when deliberately resumed. Native current-scope checks before model/read/tool/output, not client-only visibility.
4. Actual result/receipt or explicit pending/unknown/failure; no success toast on enqueue, navigation or rendering proposal. Real model fixtures across all seven entries, mock/http UI, denied/private/revoked source cases and no-model manual actions.
5. Keep file tabs/bulk forwarding separate scoped packs; no coverage reassignment until exact manifest, tasks, measurable AC and independent review exist.

No runtime status changes. Remaining109 unowned obligations and seven-section/full-graph review still open.
