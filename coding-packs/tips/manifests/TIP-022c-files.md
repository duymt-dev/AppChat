# TIP-022c — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/ai/agents/agent.runtime.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/ai/agents/templates.seed.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/ai/agents/template-revisions.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/ai/reply/reply.service.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/ai/reply/reply-tools.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/ai/reply/reply-context.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/ai/reply/send-fence.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/ai/approvals/resume.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/ai/ai.module.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/kernel/actions/action-context.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/sales/quotes/previews/quote-decide.handlers.preview.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/ai/privacy/inventory.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/core/src/ai/privacy/cleanup.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/ai/src/prompts/index.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/ai/src/prompts/agent-reply.vi.md` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/ai/src/prompts/agent-reply.en.md` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/ai/src/reply/output.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/ai/src/index.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/shared/src/i18n/server/vi/ai.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/shared/src/i18n/server/en/ai.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/shared/src/i18n/server/vi/sales.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| M | `packages/shared/src/i18n/server/en/sales.ts` | Existing facade/runtime, canonical quote guard, template or current privacy integration; future M from declared predecessor |
| C | `packages/core/src/ai/sales-behavior/types.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/ai/sales-behavior/orchestrator.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/ai/sales-behavior/source.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/ai/sales-behavior/quote-intent.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/ai/sales-behavior/admission.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/ai/sales-behavior/stock.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/ai/sales-behavior/alternatives.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/ai/sales-behavior/response.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/ai/sales-behavior/response-check.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/ai/sales-behavior/receipts.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/ai/sales-behavior/privacy.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/sales/quotes/services/customer-intent-guard.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/sales/quotes/decisions/accept.handler.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/sales/quotes/decisions/reject.handler.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/sales/quotes/decisions/revision.handler.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/sales/quotes/decisions/shared.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/src/kernel/actions/customer-intent.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/ai/src/reply/sales-plan.ts` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/ai/src/prompts/sales-intent.vi.md` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/ai/src/prompts/sales-intent.en.md` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/ai/src/prompts/sales-response-check.vi.md` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/ai/src/prompts/sales-response-check.en.md` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/db/prisma/tenant/ai-sales-behavior.prisma` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/db/prisma/tenant/migrations/20261102002230_ai_sales_behavior/migration.sql` | Bounded sales intent/stock grounding module, canonical effect guard, schema or versioned prompt; no second business writer |
| C | `packages/core/test/sales-intent-admission.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `packages/core/test/sales-stock-grounding.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `packages/core/test/sales-response-check.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `packages/core/test/sales-intent-provenance.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `packages/core/test/sales-behavior-privacy.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `packages/core/test/sales-template-tools.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `packages/ai/test/sales-plan.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `packages/ai/test/sales-prompt-runtime.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `apps/api/test/integration/sales-customer-intent.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `apps/api/test/integration/sales-intent-races.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `apps/worker/test/integration/sales-behavior-recovery.test.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `apps/web/e2e/http/sales-agent-behavior.spec.ts` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| C | `fixtures/ai-eval/sales-agent-behavior.json` | Dedicated native/UI/live acceptance evidence; not executed in documentation phase |
| M | `packages/core/src/inbox/actions/message.handlers.ts` | Canonical manual AI-draft send revalidation; facade-only when over cap |
| M | `packages/core/src/inbox/services/outbound.ts` | Keep validated sales draft evidence on durable outgoing receipt |
| M | `packages/core/src/channels/jobs/send.processor.ts` | Recheck source/stock receipt at actual dispatch reservation |
| M | `packages/db/prisma/tenant/inbox.prisma` | Extend existing020c draft-binding metadata with protected sales-plan reference |
| M | `apps/web/src/features/inbox/hooks/useAiDraftBinding.ts` | Preserve opaque sales draft reference on existing use/edit/send controls |
| M | `packages/core/src/ai/assistant/turn.service.ts` | Authenticated pending command provenance and confirmed exact action |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Do not infer operator authority from model tool input |
| M | `packages/core/src/ai/assistant/delegate.ts` | Inherit immutable commander confirmation/source lineage |
| M | `packages/core/src/ai/assistant/pending-action.ts` | Persist exact target/input/quote snapshot and authenticated confirmation receipt |
| M | `packages/core/src/ai/tasks/task.runner.ts` | Rehydrate only existing exact source or confirmed commander receipt |
| M | `packages/core/src/ai/approvals/operation-continuation.ts` | Preserve consumed confirmation identity through approval/restart |
| M | `packages/core/src/catalog/actions/read.handlers.ts` | Extract shared transaction-aware authorized stock observation; do not nest Executor |
| M | `packages/core/src/catalog/catalog.module.ts` | Register neutral stock-publication port without importing AiModule |
| C | `packages/core/src/catalog/services/sales-stock-observation.ts` | Read-only current authorized product/stock graph projection in caller transaction |
| C | `packages/core/src/kernel/actions/sales-publication.ts` | Domain-neutral publication/draft evidence port; no kernel-to-AI import |
| C | `packages/core/src/ai/sales-behavior/command-provenance.ts` | Confirmed exact operator decision binding, never natural language privilege classifier |
| C | `packages/core/test/sales-command-provenance.test.ts` | Explicit Assistant/delegate/task versus pasted customer text and restart tests |
| C | `apps/web/src/features/inbox/hooks/useAiDraftBinding.sales.test.ts` | Opaque reference use/edit/send and switch/discard regressions |
| C | `apps/api/test/integration/sales-draft-publication.test.ts` | Real manual draft send/stock race and no hidden user-text rewrite |
| M | `packages/core/src/channels/operations/provider-event.ts` | Actual inbound recall/source-disposition writer participates in same root/conversation/message lock order |
| M | `packages/core/src/channels/operations/operation-service.ts` | Provider ACK source disposition routes through same locked writer |
| M | `packages/core/src/inbox/public.ts` | Expose bounded pure source-fence helper without AiModule imports |
| C | `packages/core/src/inbox/services/customer-source-fence.ts` | Existing CRM family-before-conversation ordering and exact source revision read; shared with source writers |

## Future M provenance

- `packages/core/src/ai/agents/template-revisions.ts`: TIP-022b-agent-channel-behavior.md
- `packages/core/src/ai/reply/send-fence.ts`: TIP-045b-app-hardening.md
- `packages/core/src/sales/quotes/previews/quote-decide.handlers.preview.ts`: TIP-023b-assistant-coverage.md
- `packages/core/src/ai/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `apps/web/src/features/inbox/hooks/useAiDraftBinding.ts`: TIP-020c-kb-effective-scope.md
- `packages/core/src/ai/assistant/pending-action.ts`: TIP-023b-assistant-coverage.md
- `packages/core/src/ai/approvals/operation-continuation.ts`: TIP-045b-app-hardening.md
- `packages/core/src/channels/operations/provider-event.ts`: TIP-014b-zalo-lifecycle.md
- `packages/core/src/channels/operations/operation-service.ts`: TIP-014b-zalo-lifecycle.md
