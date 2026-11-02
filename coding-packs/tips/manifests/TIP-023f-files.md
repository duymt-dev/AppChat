# TIP-023f — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/actions/src/assistant-input.ts` | Canonical bounded attachment preparation/read and private artifact contract |
| C | `packages/shared/src/api/assistant-input.ts` | Canonical bounded attachment preparation/read and private artifact contract |
| C | `packages/db/prisma/tenant/assistant-input.prisma` | Canonical bounded attachment preparation/read and private artifact contract |
| C | `packages/db/prisma/tenant/migrations/20261102002360_assistant_input/migration.sql` | Canonical bounded attachment preparation/read and private artifact contract |
| C | `packages/core/src/ai/assistant/input/actions.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/artifact-store.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/prepare.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/parse-worker.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/parse-bounds.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/email.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/images.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/hydrate.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/read.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/providers.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/queue.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/core/src/ai/assistant/input/processor.ts` | Single input artifact/parsing/hydration responsibility; source-fenced |
| C | `packages/channels/src/email/parse-upload.ts` | Bounded MIME or model-input adapter with standalone tests |
| C | `packages/channels/test/parse-upload.test.ts` | Bounded MIME or model-input adapter with standalone tests |
| C | `packages/ai/src/gateway/input-parts.ts` | Bounded MIME or model-input adapter with standalone tests |
| C | `packages/ai/test/input-parts.test.ts` | Bounded MIME or model-input adapter with standalone tests |
| C | `apps/web/src/features/assistant/components/AttachmentTray.tsx` | Extracted accessible input component |
| C | `apps/web/src/features/assistant/components/AttachmentPreview.tsx` | Extracted accessible input component |
| C | `apps/web/src/features/assistant/components/InputSourcePicker.tsx` | Extracted accessible input component |
| C | `apps/web/src/features/assistant/components/VoiceInput.tsx` | Extracted accessible input component |
| M | `apps/web/src/features/assistant/hooks/useAssistantAttachments.ts` | Bounded browser input lifecycle hook |
| C | `apps/web/src/features/assistant/hooks/useAssistantCapture.ts` | Bounded browser input lifecycle hook |
| C | `apps/web/src/features/assistant/hooks/useAssistantDictation.ts` | Bounded browser input lifecycle hook |
| C | `apps/web/src/features/assistant/input-types.ts` | Local typed draft/recognition/artifact states |
| M | `packages/actions/src/index.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/shared/src/api/assistant.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/shared/src/api/index.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/shared/src/index.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/channels/src/index.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/ai.module.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/assistant.service.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/assistant-prompt.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/types.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/turn.service.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/catalog.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/sessions.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/genui/attachments.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/genui/request-store.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/genui/submit.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/genui/resume.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/assistant/delegate.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/agents/agent.runtime.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/approvals/resume.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/runs/runner.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/runs/run.store.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/runs/run-detail.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/runs/run-events.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/runs/runtime.providers.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/privacy/inventory.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/ai/privacy/cleanup.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/privacy/services/source-catalog.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/privacy/services/read-catalog.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/privacy/services/write-catalog.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/core/src/index.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/api/src/http/ai/assistant.controller.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/ai/src/gateway/types.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/ai/src/gateway/engine.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/ai/src/gateway/messages.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/ai/src/router/router.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `packages/ai/src/index.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/src/features/assistant/components/Composer.tsx` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/src/features/assistant/components/ComposerPopovers.tsx` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/src/features/assistant/components/ChatThread.tsx` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/src/features/assistant/assistant-store.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/src/features/assistant/hooks/useAssistantChat.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/src/features/assistant/api.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/src/features/assistant/types.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/src/shared/assistant/attachment-extensions.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/src/shared/media/screen-capture.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/messages/vi/assistant.json` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/messages/en/assistant.json` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/messages/vi/actions.json` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `apps/web/messages/en/actions.json` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| M | `tools/parity/parity.manifest.ts` | Extend existing/predecessor input, media, privacy, vision or composition seam; legacy facade only |
| C | `packages/actions/test/assistant-input.test.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `packages/core/test/assistant-input.test.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `packages/core/test/assistant-input-privacy.test.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `packages/core/test/assistant-input-parsing.test.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `packages/core/test/assistant-input-resume.test.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `packages/ai/test/vision-routing.test.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `apps/api/test/integration/assistant-input.test.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `apps/worker/test/integration/assistant-input-composition.test.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `apps/web/src/features/assistant/hooks/useAssistantAttachments.test.tsx` | Standalone future input/parity/live evidence; not claimed executed |
| C | `apps/web/src/features/assistant/hooks/useAssistantDictation.test.tsx` | Standalone future input/parity/live evidence; not claimed executed |
| C | `apps/web/src/features/assistant/hooks/useAssistantCapture.test.tsx` | Standalone future input/parity/live evidence; not claimed executed |
| C | `apps/web/e2e/assistant-input.spec.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `apps/web/e2e/http/assistant-input.spec.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `tools/parity/modules/assistant-input.ts` | Standalone future input/parity/live evidence; not claimed executed |
| C | `fixtures/ai-eval/assistant-input.json` | Standalone future input/parity/live evidence; not claimed executed |
| C | `packages/core/src/ai/assistant/input/document-parts.ts` | Actual PDF page/paragraph provenance and bounded parsing |
| C | `packages/core/src/ai/assistant/input/table-parts.ts` | Truthful CSV line/record and XLSX sheet/cell provenance |
| C | `packages/core/src/ai/assistant/input/recovery.ts` | Artifact-backed durable scan, lease/fence and abandoned purge |
| C | `packages/core/src/ai/assistant/input/installer.ts` | ROLEai recovery/purge registration |
| C | `packages/core/src/ai/assistant/input/sandbox.ts` | Native isolated process launch and bounded IPC |
| C | `apps/worker/src/parser-main.ts` | Packaged sterile parse process entry |
| M | `apps/worker/tsup.config.ts` | Emit standalone parser entry and smoke-visible assets |
| C | `infra/parser/linux/run.sh` | Native constrained systemd/cgroup sandbox launcher |
| C | `infra/parser/windows/run.ps1` | Hidden noninteractive native sandbox launcher |
| C | `infra/parser/windows/build.ps1` | Compile OS helper with installed PowerShell/Add-Type, no new package |
| C | `infra/parser/windows/Launcher.cs` | Bounded native process launch |
| C | `infra/parser/windows/JobLimits.cs` | Windows hard process/job resident memory and tree termination |
| C | `infra/parser/windows/AppContainer.cs` | No-network restricted filesystem profile |
| C | `infra/parser/README.md` | Native provision/profile gate and negative-test instructions |
| C | `apps/web/src/shared/api/mock/domains/assistant-input.ts` | Mock artifact actions/read and Assistant envelope |
| C | `apps/web/src/shared/api/mock/assistant-input-store.ts` | Bounded scoped ephemeral mock upload/draft state |
| M | `apps/web/src/shared/api/mock/mock-transport.ts` | Upload byte-store facade integration |
| M | `apps/web/src/shared/api/mock/routes.ts` | Mock input read routing facade |
| M | `apps/web/src/shared/api/mock/domains/assistant.ts` | Attachment-only request/history envelope facade |
| M | `packages/ai/src/router/providers.ts` | Per-model capability contract |
| M | `packages/core/src/ai/router/provider.store.ts` | Validated route capability projection |
| M | `packages/actions/src/platform-admin.ts` | Model route/probe vision capability schema |
| M | `packages/shared/src/api/platform-admin.ts` | Typed per-route vision metadata |
| M | `packages/core/src/platform/actions/model.handlers.ts` | Trusted route config capability writes |
| M | `packages/core/src/platform/services/config-validation.ts` | Validate route capability and revision |
| M | `packages/core/src/platform/services/config-read.ts` | Route capability safe metadata |
| M | `packages/core/src/platform/services/provider-probe.ts` | Explicit bounded exact-model image probe |
| M | `apps/web/src/features/platform-admin/components/ModelRoutesPanel.tsx` | Current model route vision capability control |
| M | `apps/web/messages/vi/platform-admin.json` | Vision config labels |
| M | `apps/web/messages/en/platform-admin.json` | Vision config labels |
| C | `apps/worker/test/integration/parser-sandbox.test.ts` | Native OS negative network/memory/filesystem and bundled entry smoke |
| C | `apps/web/src/shared/api/mock/assistant-input.test.ts` | Mock upload/prepare/attachment-only/history contract |

## Future M provenance

- `apps/web/src/features/assistant/hooks/useAssistantAttachments.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/attachments.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/request-store.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/submit.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/resume.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/runs/run-detail.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-events.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/runtime.providers.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/source-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/read-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/write-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md
- `apps/web/src/shared/assistant/attachment-extensions.ts`: TIP-023c-generative-ui.md
- `apps/web/src/shared/media/screen-capture.ts`: TIP-025b-inbox-vertical.md
- `packages/shared/src/api/platform-admin.ts`: TIP-040-platform-admin.md
- `packages/core/src/platform/actions/model.handlers.ts`: TIP-040-platform-admin.md
- `packages/core/src/platform/services/config-validation.ts`: TIP-040-platform-admin.md
- `packages/core/src/platform/services/config-read.ts`: TIP-040-platform-admin.md
- `packages/core/src/platform/services/provider-probe.ts`: TIP-040-platform-admin.md
- `apps/web/src/features/platform-admin/components/ModelRoutesPanel.tsx`: TIP-040-platform-admin.md
- `apps/web/messages/vi/platform-admin.json`: TIP-040-platform-admin.md
- `apps/web/messages/en/platform-admin.json`: TIP-040-platform-admin.md
