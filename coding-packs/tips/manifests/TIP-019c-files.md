# TIP-019c — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/actions/src/ai-utilities.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/actions/src/index.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/shared/src/ai/utility-schemas.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/shared/src/ai/utility-evidence.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/shared/src/api/ai-utilities.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/shared/src/api/index.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/shared/src/index.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/core/src/ai/ai.module.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/src/ai/skills/utility.providers.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/src/ai/skills/utility.handlers.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/src/ai/skills/utility-run.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/src/ai/skills/utility-result.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/src/ai/skills/utility-sources.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/src/ai/skills/sources/conversation.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/src/ai/skills/sources/contact.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/src/ai/skills/utility-prompts.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/src/ai/skills/utility-output.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/core/src/ai/assistant/catalog.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/core/src/ai/agents/agent-tools.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/core/src/ai/agents/agent.runtime.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/core/src/index.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/api/src/http/ai/utility-results.controller.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/api/src/http/ai/ai.http.module.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/src/features/assistant/components/Composer.tsx` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/src/features/assistant/components/ComposerPopovers.tsx` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/src/features/assistant/hooks/useAssistantChat.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/src/features/inbox/components/AgentToolsMenu.tsx` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/web/src/shared/ai-utilities/types.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/web/src/shared/ai-utilities/commands.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/web/src/shared/ai-utilities/components/UtilityMenu.tsx` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/web/src/shared/ai-utilities/components/UtilityForm.tsx` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/web/src/shared/ai-utilities/components/UtilityResult.tsx` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/web/src/shared/ai-utilities/hooks/useUtility.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/web/src/shared/ai-utilities/index.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/web/src/shared/api/mock/domains/ai-utilities.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/actions/test/ai-utilities.test.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/shared/src/ai/utility-schemas.test.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/shared/src/ai/utility-evidence.test.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/test/ai-utilities.test.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/test/ai-utilities-authority.test.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/test/ai-utilities-lineage.test.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `packages/core/test/ai-utilities-composition.test.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/api/test/integration/ai-utilities.test.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/web/e2e/ai-utilities.spec.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `apps/web/e2e/http/ai-utilities.spec.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `fixtures/ai-eval/ai-utilities.json` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `fixtures/ai-eval/ai-utilities-inputs.json` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| C | `tools/parity/modules/ai-utilities.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `tools/parity/parity.manifest.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/messages/vi/actions.json` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/messages/vi/assistant.json` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/messages/vi/inbox.json` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/shared/src/i18n/server/vi/ai.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/messages/en/actions.json` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/messages/en/assistant.json` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/messages/en/inbox.json` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `packages/shared/src/i18n/server/en/ai.ts` | Canonical read-only utility contract/source authority, metered runtime, registered UI/results or dedicated evidence |
| M | `apps/web/src/features/inbox/components/Composer.tsx` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| M | `apps/web/src/features/inbox/components/ComposerPopovers.tsx` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| C | `apps/web/src/features/inbox/components/InboxUtilityHost.tsx` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| C | `apps/web/src/shared/ai-utilities/components/UtilityHost.tsx` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| C | `apps/web/src/shared/ai-utilities/api.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| C | `packages/db/prisma/tenant/ai-utilities.prisma` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| C | `packages/db/prisma/tenant/migrations/20261109020000_ai_utilities/migration.sql` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| C | `packages/core/src/ai/skills/utility-operations.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| C | `packages/core/src/ai/skills/utility-recovery.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| M | `packages/core/src/ai/runs/runner.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| M | `packages/core/src/ai/runs/run.store.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| M | `packages/core/src/ai/runs/runs.service.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| M | `packages/core/src/ai/runs/run-detail.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| M | `packages/core/src/ai/runs/run-events.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| M | `packages/core/src/ai/runs/runtime.providers.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| M | `packages/core/src/ai/assistant/sessions.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| M | `packages/core/src/ai/assistant/genui/stream.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |
| C | `packages/core/test/ai-utilities-publication.test.ts` | Protected utility publication/recovery or persistent current-context UI host; dedicated verification |

| C | `packages/ai/src/testing/mock-utility.ts` | Model giả kỹ năng tiện ích (AI_ENGINE=mock): JSON đúng khuôn + bằng chứng offset thật cho integration / E2E (thêm khi làm P1) |
| M | `packages/ai/src/testing/mock-model.ts` | Rẽ nhánh echoScript sang mock-utility (1 dòng) |
| C | `packages/core/src/ai/skills/sources/types.ts` | Kiểu SourceChunk dùng chung nguồn (tránh vòng import) |
| M | `packages/core/src/crm/public.ts` | Export `inSameFamily` cho nguồn score_lead (hội thoại thuộc họ khách) |
| M | `packages/core/src/kernel/actions/tip-owners.ts` | 4 action → TIP 019c |
| C | `packages/core/src/ai/skills/utility-revalidate.ts` | Kiểm lại một operation sau sự cố bằng validator + nguồn hiện tại (thêm khi làm P2) |
| C | `packages/core/src/ai/skills/utility-validators.ts` | Dựng validator theo action từ tham số đã lưu — tách khỏi handlers để tránh vòng import runtime.providers ↔ runner (thêm khi làm P2) |
| M | `packages/core/src/billing/jobs/billing.jobs.module.ts` | Đăng ký `AiUtilityRecoveryInstaller` cạnh `AiUsageRecoveryInstaller` (ROLE=jobs, 1 dòng) |
| M | `apps/api/src/openapi/document.ts` | Schema `data` có kiểu cho GET /v1/ai-utilities/{runId}/result (không thêm x-untyped) |
| C | `apps/api/test/integration/ai-utility-results.test.ts` | Integration: GET kết quả có scope, idempotency, khôi phục 4 nhánh |
| M | `apps/api/test/integration/ai-run-detail.test.ts` | result_text null cho run kỹ năng tiện ích |

## Future M provenance

- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md
- `packages/core/src/ai/runs/run-detail.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-events.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/runtime.providers.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/stream.ts`: TIP-023c-generative-ui.md
