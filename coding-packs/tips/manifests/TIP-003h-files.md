# TIP-003h — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/shared/src/sales/payment-state.ts` | customer_payment |
| C | `packages/shared/src/sales/package-state.ts` | customer_package |
| C | `packages/shared/src/inbox/conversation-state.ts` | conversation |
| C | `packages/shared/src/channels/account-state.ts` | channel_account |
| C | `packages/shared/src/ai/agent-state.ts` | ai_agent |
| C | `packages/shared/src/ai/kb-source-state.ts` | kb_source |
| C | `packages/shared/src/ai/approval-state.ts` | approval_request |
| C | `packages/shared/src/state/flows.test.ts` | Unit 7 flow |
| M | `packages/shared/src/index.ts` | Export |
| M | `packages/core/src/ai/approvals/approval.handlers.ts` | assertTransition |
| M | `packages/core/src/ai/agents/agent.handlers.ts` | assertTransition |
| M | `packages/core/src/inbox/actions/conversation-state.handlers.ts` | assertTransition |
| M | `packages/core/src/channels/services/control.ts` | assertTransition |
| C | `apps/api/test/integration/state-flows.test.ts` | 409 sai trạng thái |
