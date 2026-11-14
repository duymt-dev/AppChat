# TIP-023g — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `apps/web/src/features/quotes/columns.tsx` | Wire exact inert entry point to typed current record intent; no fake toast or arbitrary action string |
| M | `apps/web/src/features/contracts/columns.tsx` | Wire exact inert entry point to typed current record intent; no fake toast or arbitrary action string |
| M | `apps/web/src/features/orders/columns.tsx` | Wire exact inert entry point to typed current record intent; no fake toast or arbitrary action string |
| M | `apps/web/src/features/calendar/components/ListView.tsx` | Wire exact inert entry point to typed current record intent; no fake toast or arbitrary action string |
| M | `apps/web/src/features/tickets/columns.tsx` | Wire exact inert entry point to typed current record intent; no fake toast or arbitrary action string |
| M | `apps/web/src/features/invoices/components/DetailTabs.tsx` | Wire exact inert entry point to typed current record intent; no fake toast or arbitrary action string |
| M | `apps/web/src/features/invoices/components/InvoiceDrawer.tsx` | Wire exact inert entry point to typed current record intent; no fake toast or arbitrary action string |
| M | `apps/web/src/features/products/components/DetailTabs.tsx` | Wire exact inert entry point to typed current record intent; no fake toast or arbitrary action string |
| M | `apps/web/src/features/products/components/ProductDrawer.tsx` | Wire exact inert entry point to typed current record intent; no fake toast or arbitrary action string |
| M | `apps/web/src/features/quotes/components/QuoteAiDrawer.tsx` | Bind persistent existing drawer host to exact requested record and generation |
| M | `apps/web/src/features/quotes/hooks/useAssistantContext.ts` | Bind persistent existing drawer host to exact requested record and generation |
| M | `apps/web/src/features/contracts/components/ContractAiDrawer.tsx` | Bind persistent existing drawer host to exact requested record and generation |
| M | `apps/web/src/features/contracts/hooks/useAssistantContext.ts` | Bind persistent existing drawer host to exact requested record and generation |
| M | `apps/web/src/features/orders/components/OrderAiDrawer.tsx` | Bind persistent existing drawer host to exact requested record and generation |
| M | `apps/web/src/features/orders/hooks/useAssistantContext.ts` | Bind persistent existing drawer host to exact requested record and generation |
| M | `apps/web/src/features/calendar/components/CalendarAiDrawer.tsx` | Bind persistent existing drawer host to exact requested record and generation |
| M | `apps/web/src/features/calendar/hooks/useAssistantContext.ts` | Bind persistent existing drawer host to exact requested record and generation |
| M | `apps/web/src/features/tickets/components/TicketsAiDrawer.tsx` | Bind persistent existing drawer host to exact requested record and generation |
| M | `apps/web/src/features/tickets/hooks/useAssistantContext.ts` | Bind persistent existing drawer host to exact requested record and generation |
| M | `apps/web/src/shared/assistant/screen-context.ts` | Reuse023c canonical request/session/SSE and safe context; shared never imports feature |
| M | `apps/web/src/shared/assistant/useScreenAssistant.ts` | Reuse023c canonical request/session/SSE and safe context; shared never imports feature |
| M | `apps/web/src/shared/assistant/ScreenAssistantThread.tsx` | Reuse023c canonical request/session/SSE and safe context; shared never imports feature |
| M | `apps/web/src/shared/assistant/AssistantDock.tsx` | Reuse023c canonical request/session/SSE and safe context; shared never imports feature |
| M | `apps/web/src/shared/api/mock/domains/assistant.ts` | Reuse023c canonical request/session/SSE and safe context; shared never imports feature |
| M | `packages/shared/src/api/assistant.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/shared/src/api/index.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `apps/api/src/http/ai/assistant.controller.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/ai/assistant/assistant.service.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/ai/assistant/turn.service.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/ai/assistant/types.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/ai/assistant/genui/context.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/ai/assistant/genui/submit.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/ai/ai.module.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/ai/assistant/discovery/authority.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/kernel/privacy/inventory.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/kernel/privacy/cleanup.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/insights/public.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `packages/core/src/insights/services/follow-ups.ts` | Typed source/intent/current authority, bounded read-only proposals, existing receipt/selected-agent/history/privacy wiring |
| M | `apps/web/messages/vi/quotes.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/en/quotes.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/vi/contracts.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/en/contracts.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/vi/orders.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/en/orders.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/vi/calendar.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/en/calendar.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/vi/tickets.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/en/tickets.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/vi/invoices.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/en/invoices.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/vi/products.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/en/products.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/vi/assistant.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `apps/web/messages/en/assistant.json` | Entry intent/proposal/pending/error/permission UX strings; no hard-coded copy |
| M | `tools/parity/parity.manifest.ts` | Record-context states of existing surfaces plus embedded invoice/product assistant |
| C | `packages/shared/src/api/record-assistant.ts` | Closed entity/intent/request DTO; reference is never authority |
| C | `packages/core/src/ai/assistant/record-intent/registry.ts` | Bounded server record intent responsibility; no direct business writer/provider |
| C | `packages/core/src/ai/assistant/record-intent/context.ts` | Bounded server record intent responsibility; no direct business writer/provider |
| C | `packages/core/src/ai/assistant/record-intent/admission.ts` | Bounded server record intent responsibility; no direct business writer/provider |
| C | `packages/core/src/ai/assistant/record-intent/proposal.ts` | Bounded server record intent responsibility; no direct business writer/provider |
| C | `packages/core/src/ai/assistant/record-intent/projection.ts` | Bounded server record intent responsibility; no direct business writer/provider |
| C | `apps/web/src/shared/assistant/record-intent/types.ts` | Persistent scope-bound host and typed selection/confirmation/proposal, separate hooks/components |
| C | `apps/web/src/shared/assistant/record-intent/store.ts` | Persistent scope-bound host and typed selection/confirmation/proposal, separate hooks/components |
| C | `apps/web/src/shared/assistant/record-intent/useRecordAssistant.ts` | Persistent scope-bound host and typed selection/confirmation/proposal, separate hooks/components |
| C | `apps/web/src/shared/assistant/record-intent/RecordAssistantPanel.tsx` | Persistent scope-bound host and typed selection/confirmation/proposal, separate hooks/components |
| C | `apps/web/src/shared/assistant/record-intent/RecordIntentCard.tsx` | Persistent scope-bound host and typed selection/confirmation/proposal, separate hooks/components |
| C | `packages/core/test/record-ai-context.test.ts` | Current-source/mode/receipt/generation safety and source switch fixtures |
| C | `packages/core/test/record-ai-proposals.test.ts` | Current-source/mode/receipt/generation safety and source switch fixtures |
| C | `packages/core/test/record-ai-authority.test.ts` | Current-source/mode/receipt/generation safety and source switch fixtures |
| C | `packages/core/test/record-ai-receipts.test.ts` | Current-source/mode/receipt/generation safety and source switch fixtures |
| C | `apps/api/test/integration/record-ai-entrypoints.test.ts` | All seven buttons and both calendar row kinds, native/API/actual worker/mock/http/live acceptance |
| C | `apps/api/test/integration/record-ai-privacy.test.ts` | All seven buttons and both calendar row kinds, native/API/actual worker/mock/http/live acceptance |
| C | `apps/worker/test/integration/record-ai-composition.test.ts` | All seven buttons and both calendar row kinds, native/API/actual worker/mock/http/live acceptance |
| C | `apps/web/src/shared/assistant/record-intent/record-entrypoints.test.tsx` | All seven buttons and both calendar row kinds, native/API/actual worker/mock/http/live acceptance |
| C | `apps/web/e2e/record-ai.mock.spec.ts` | All seven buttons and both calendar row kinds, native/API/actual worker/mock/http/live acceptance |
| C | `apps/web/e2e/record-ai.http.spec.ts` | All seven buttons and both calendar row kinds, native/API/actual worker/mock/http/live acceptance |
| C | `fixtures/ai-eval/record-ai-entrypoints.json` | All seven buttons and both calendar row kinds, native/API/actual worker/mock/http/live acceptance |
| M | `packages/core/src/ai/runs/runner.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| M | `packages/core/src/ai/runs/run.store.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| M | `packages/core/src/ai/runs/runtime.providers.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| M | `packages/core/src/ai/runs/runs.service.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| M | `packages/core/src/ai/runs/run-detail.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| M | `packages/core/src/ai/runs/run-events.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| M | `packages/core/src/ai/assistant/sessions.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| M | `packages/core/src/ai/assistant/genui/stream.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| M | `packages/core/src/ai/privacy/inventory.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| M | `packages/core/src/ai/privacy/cleanup.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| M | `packages/core/src/kernel/consistency/operation-recovery.ts` | Explicit protected record-proposal mode/binding, generic reader suppression and recovery registration |
| C | `packages/core/src/ai/assistant/record-intent/publication.ts` | Current-authorized lease/fenced validated-record proposal publication |
| C | `packages/core/src/ai/assistant/record-intent/recovery.ts` | Revalidate existing private generation without another model call |
| C | `packages/db/prisma/tenant/record-proposal.prisma` | Runtime-only binding to existing request/root/attempt; no new business or charge ledger |
| C | `packages/db/prisma/tenant/migrations/20261102002370_record_proposal_publication/migration.sql` | Unique request/intent binding and partial validation recovery index |

## Future M provenance

- `apps/web/src/features/quotes/hooks/useAssistantContext.ts`: TIP-023c-generative-ui.md
- `apps/web/src/features/contracts/hooks/useAssistantContext.ts`: TIP-023c-generative-ui.md
- `apps/web/src/features/orders/hooks/useAssistantContext.ts`: TIP-023c-generative-ui.md
- `apps/web/src/features/calendar/hooks/useAssistantContext.ts`: TIP-023c-generative-ui.md
- `apps/web/src/features/tickets/hooks/useAssistantContext.ts`: TIP-023c-generative-ui.md
- `apps/web/src/shared/assistant/screen-context.ts`: TIP-023c-generative-ui.md
- `apps/web/src/shared/assistant/useScreenAssistant.ts`: TIP-023c-generative-ui.md
- `apps/web/src/shared/assistant/ScreenAssistantThread.tsx`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/context.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/submit.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/discovery/authority.ts`: TIP-023e-action-discovery.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md
- `packages/core/src/kernel/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/insights/public.ts`: TIP-038-insights-dashboard.md
- `packages/core/src/insights/services/follow-ups.ts`: TIP-038-insights-dashboard.md
- `packages/core/src/ai/runs/runtime.providers.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-detail.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-events.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/assistant/genui/stream.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/consistency/operation-recovery.ts`: TIP-045b-app-hardening.md
