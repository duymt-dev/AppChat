# TIP-030b exact file manifest

155 paths. M=modify existing; C=create absent.023c kernel file-access guard is reused, not duplicated. Parity1405-line legacy file may only import/re-export new module in1-2 lines. Other new logic stays in bounded domain modules; tests separate.

| Mode | Path | Purpose |
|---|---|---|
| M | `packages/actions/src/contracts.ts` | Existing facade/runtime/UI wiring |
| M | `packages/actions/src/documents.ts` | Existing facade/runtime/UI wiring |
| M | `packages/actions/src/index.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/index.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/contracts/contracts.module.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/contracts/public.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/contracts/actions/contract-write.handlers.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/contracts/actions/contract-approval.handlers.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/contracts/services/contract-doc.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/contracts/services/contract-view.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/contracts/services/contracts-read.service.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/contracts/services/contract-write.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/contracts/services/contract-deps.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/contracts/jobs/contracts.jobs.module.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/documents/services/template-store.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/documents/actions/doc-template.handlers.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/documents/services/soffice.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/documents/documents.module.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/documents/public.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/ai/ai.module.ts` | Existing facade/runtime/UI wiring |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Existing facade/runtime/UI wiring |
| M | `packages/ai/src/prompts/index.ts` | Existing facade/runtime/UI wiring |
| M | `packages/ai/src/index.ts` | Existing facade/runtime/UI wiring |
| M | `packages/db/prisma/tenant/contracts.prisma` | Existing facade/runtime/UI wiring |
| M | `packages/db/prisma/tenant/documents.prisma` | Existing facade/runtime/UI wiring |
| M | `packages/shared/src/api/contracts.ts` | Existing facade/runtime/UI wiring |
| M | `packages/shared/src/api/documents.ts` | Existing facade/runtime/UI wiring |
| M | `packages/shared/src/api/index.ts` | Existing facade/runtime/UI wiring |
| M | `packages/shared/src/index.ts` | Existing facade/runtime/UI wiring |
| M | `apps/api/src/http/contracts/contracts.http.module.ts` | Existing facade/runtime/UI wiring |
| M | `apps/api/src/http/contracts/contracts.controller.ts` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/contracts/components/DetailTabs.tsx` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/contracts/components/ContractFormModal.tsx` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/contracts/components/ContractDrawer.tsx` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/contracts/hooks/useContractForm.ts` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/contracts/api.ts` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/contracts/types.ts` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/contracts/ui-commands.ts` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/contracts/screens/ContractsScreen.tsx` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/inbox/components/Attachments.tsx` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/inbox/components/MessageBubble.tsx` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/inbox/ui-commands.ts` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/settings/components/DocTemplatesSection.tsx` | Existing facade/runtime/UI wiring |
| M | `apps/web/src/features/settings/components/RichTemplateModal.tsx` | Existing facade/runtime/UI wiring |
| M | `tools/parity/parity.manifest.ts` | Existing facade/runtime/UI wiring |
| C | `packages/actions/src/contract-files.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/actions/src/contract-appendix.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/shared/src/api/contract-files.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/shared/src/api/contract-appendix.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/files/source.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/files/attachment-source.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/files/artifact-store.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/files/extraction.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/files/draft-content.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/files/suggestions.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/files/read.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/actions/contract-file.handlers.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/actions/contract-draft.handler.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/actions/contract-suggestion.handler.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/appendix.module.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/write.handlers.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/approval.handlers.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/send.handlers.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/public.handlers.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/read.service.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/signing.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/tokens.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/events.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/artifacts.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/contracts/appendix/expiry.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/documents/services/contract-template.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/documents/security/document-guard.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/documents/security/docx-container.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/documents/security/pdf-inspection.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/src/documents/security/render-isolation.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/ai/src/prompts/contract-files.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/db/prisma/tenant/contract-appendix-signing.prisma` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/db/prisma/tenant/migrations/20261102003020_contract_files/migration.sql` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/api/src/http/contracts/contract-files.controller.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/api/src/http/contracts/appendix-sign.controller.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/components/files/ContractFilesTab.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/components/files/ContractSourceStep.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/components/files/ExtractionPreview.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/components/files/AiSuggestions.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/components/appendix/AppendixTab.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/components/appendix/AppendixForm.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/components/appendix/AppendixApproval.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/screens/AppendixSignScreen.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/hooks/useContractSource.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/hooks/useContractSuggestions.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/hooks/useAppendixSign.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/inbox/components/AttachmentContractMenu.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/inbox/hooks/useAttachmentContract.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/app/(public)/sign/appendix/[token]/page.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/test/contract-file-source.test.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/test/contract-file-extraction.test.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/test/contract-draft-suggestions.test.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/test/contract-appendix-sign.test.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/test/document-container-security.test.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `packages/core/test/contract-template-kind.test.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/api/test/integration/contract-files.test.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/api/test/integration/contract-appendix.test.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/worker/test/integration/contract-draft-tools.test.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/components/files/ContractSourceStep.test.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/contracts/components/files/AiSuggestions.test.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/src/features/inbox/hooks/useAttachmentContract.test.tsx` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/e2e/contract-files.spec.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `apps/web/e2e/http/contract-files.spec.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `tools/parity/modules/contract-files.ts` | Bounded contract files/appendix domain module or dedicated test |
| C | `fixtures/ai-eval/contract-files.json` | Bounded contract files/appendix domain module or dedicated test |
| C | `fixtures/contracts/files/README.md` | Bounded contract files/appendix domain module or dedicated test |
| C | `fixtures/contracts/files/build-fixtures.ts` | Bounded contract files/appendix domain module or dedicated test |
| M | `apps/web/messages/vi/actions.json` | Localized contract file/appendix/AI feedback |
| M | `apps/web/messages/vi/contracts.json` | Localized contract file/appendix/AI feedback |
| M | `apps/web/messages/vi/inbox.json` | Localized contract file/appendix/AI feedback |
| M | `apps/web/messages/vi/settings.json` | Localized contract file/appendix/AI feedback |
| M | `apps/web/messages/en/actions.json` | Localized contract file/appendix/AI feedback |
| M | `apps/web/messages/en/contracts.json` | Localized contract file/appendix/AI feedback |
| M | `apps/web/messages/en/inbox.json` | Localized contract file/appendix/AI feedback |
| M | `apps/web/messages/en/settings.json` | Localized contract file/appendix/AI feedback |
| C | `apps/api/test/integration/actions/contract.inspect_file.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.create_from_attachment.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.attach_file.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.draft_from_content.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.resolve_suggestion.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.create_appendix.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.appendix_update.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.appendix_submit.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.appendix_approve_and_sign.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.appendix_send.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.appendix_request_changes.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.appendix_public_otp.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.appendix_public_sign.action.test.ts` | Action matrix and negative permission/state coverage |
| C | `apps/api/test/integration/actions/contract.appendix_public_decline.action.test.ts` | Action matrix and negative permission/state coverage |
| M | `apps/web/src/shared/api/mock/domains/contracts.ts` | Mock or server feedback extension |
| M | `apps/web/src/shared/api/mock/domains/doc-templates.ts` | Mock or server feedback extension |
| M | `packages/shared/src/i18n/server/vi/sales.ts` | Mock or server feedback extension |
| M | `packages/shared/src/i18n/server/en/sales.ts` | Mock or server feedback extension |
| C | `packages/core/src/contracts/files/parse-worker.ts` | Isolated bounded document parsing worker |
| C | `packages/core/src/contracts/appendix/public.service.ts` | Token-authorized executor adapter and read facade |
| C | `packages/core/src/contracts/appendix/owner-otp.handler.ts` | Existing Owner step-up policy for appendix signing |
| C | `apps/api/test/integration/actions/contract.appendix_owner_otp.action.test.ts` | Owner step-up action matrix |
| M | `packages/core/src/documents/services/documents-read.service.ts` | Include contract_kind in existing list DTO |
| M | `apps/web/src/features/settings/components/DocxWizard.tsx` | Contract type in DOCX template wizard |
| C | `packages/core/src/contracts/actions/contract-draft-prepare.handler.ts` | Explicit metered read utility creates proposal, separate from business preview |
| C | `packages/core/src/contracts/appendix/capability.ts` | Private unforgeable context capability for public token executor |
| C | `packages/core/test/appendix-public-capability.test.ts` | Reject forged public API actor/token capabilities |
| C | `apps/api/test/integration/actions/contract.prepare_draft.action.test.ts` | Proposal utility action matrix |
| C | `tools/sandbox/render-linux.sh` | Native restricted-user network-isolated renderer launcher |
| C | `tools/sandbox/render-windows.ps1` | Native restricted-token AppContainer renderer launcher, hidden process |
| C | `tools/sandbox/README.md` | Provisioned identities/ACLs and fail-closed validation |
| C | `packages/core/test/render-isolation.test.ts` | Native network/filesystem/process-tree isolation conformance |
| M | `apps/web/src/features/settings/types.ts` | Local template subtype interface |
| M | `packages/core/src/ai/assistant/catalog.ts` | Hide public appendix internal actions from all assistant discovery |
| C | `packages/core/test/appendix-catalog.test.ts` | Discovery and direct invocation fail closed |
| C | `apps/web/src/features/settings/components/ContractKindSelect.tsx` | Amend (F1): ô chọn loại hợp đồng dùng chung cho mẫu rich + DOCX (giữ RichTemplateModal / DocxWizard dưới trần) |
| M | `apps/api/test/integration/documents.test.ts` | Amend (F1): index mặc định chia nhóm (chung / theo loại hợp đồng) thay index kind-only của 028 |
| C | `packages/core/src/contracts/actions/contract-create.ts` | Amend (F1): insertContract / undoCreate dùng chung cho contract.create + create_from_attachment (giữ contract-write.handlers dưới trần) |
| C | `apps/web/src/features/contracts/styles/source.styles.ts` | Amend (F1): style bước nguồn tệp / bảng đề xuất (token) |
| C | `apps/web/src/features/contracts/hooks/useContractFiles.ts` | Amend (F1): query tab Tệp + tải tệp có kiểm scope + gắn tệp (attach_file) |
| M | `apps/web/src/shared/api/mock/domains/contracts-actions.ts` | Amend (F1): mock inspect_file / attach_file / create_from_attachment + contract.create { source } |
| M | `apps/web/src/shared/api/mock/mock-transport.ts` | Amend (F1): route GET /contracts/:id/files, tải tệp mock, ghi tên tệp đã upload cho guard giả |
| M | `apps/api/test/integration/setup.ts` | Amend (F1): chuyển RENDER_ISOLATION_LAUNCHER / _WINDOWS_MODE vào env test (DOCX cô lập) |
| M | `packages/core/src/inbox/public.ts` | Amend (F1): xuất writableConversation — kiểm scope hội thoại trước khi đọc tệp đính kèm |
| C | `packages/actions/src/contract-draft.ts` | Amend (F2): schema contract.prepare_draft / draft_from_content / resolve_suggestion (giữ sales-schemas dưới trần) |
| M | `packages/actions/src/sales-schemas.ts` | Amend (F2): draftLine / draftSuggestion dùng chung |
| C | `packages/db/prisma/tenant/migrations/20261102003021_contract_ai_draft/migration.sql` | Amend (F2): bảng contract_draft_proposal + trigger bất biến + cột contract.draft_proposal_id / ai_suggestions |
| C | `packages/ai/src/prompts/contract-draft.vi.md` | Amend (F2): prompt soạn nháp (thay `prompts/contract-files.ts` — theo mẫu `.md` + registry hiện có) |
| C | `packages/ai/src/prompts/contract-draft.en.md` | Amend (F2): như trên, bản en |
| C | `packages/ai/test/contract-draft-prompt.test.ts` | Amend (F2): registry khớp file .md, luật cốt lõi |
| M | `packages/ai/src/testing/mock-model.ts` | Amend (F2): kịch bản model giả `# SOẠN NHÁP HỢP ĐỒNG` cho integration / E2E http |
| M | `packages/core/src/sales/public.ts` | Amend (F2): xuất visibleQuote — kiểm báo giá nguồn trước khi gọi model |
| M | `packages/core/src/sales/quotes/services/quote-draft.ts` | Amend (F2, ai:live): matchCatalog không nhân số nằm trong tên gói ("… 10 buổi") thành số lượng |
| C | `packages/core/test/quote-draft-match.test.ts` | Amend (F2): test matchCatalog số trong tên / số lượng thật |
| M | `packages/core/test/assistant-coverage.test.ts` | Amend (F2): miễn trừ proposal_id / suggestion_id (id phiên, không có mã người dùng nói) |
| C | `apps/web/src/features/contracts/components/draft/AiDraftPanel.tsx` | Amend (F2): khung soạn AI trong form tạo (thay vị trí `components/files/`) |
| C | `apps/web/src/features/contracts/components/draft/AiSuggestions.tsx` | Amend (F2): thay `components/files/AiSuggestions.tsx` (đúng nhóm draft) |
| C | `apps/web/src/features/contracts/components/draft/AiSuggestions.test.tsx` | Amend (F2): thay `components/files/AiSuggestions.test.tsx` |
| C | `apps/web/src/features/contracts/hooks/useContractDraft.ts` | Amend (F2): hook hai bước prepare → draft_from_content, request_key theo nội dung |
| C | `apps/web/src/features/contracts/styles/draft.styles.ts` | Amend (F2): style khung soạn / khối gợi ý (token) |
| C | `apps/web/src/shared/api/mock/domains/contracts-draft.ts` | Amend (F2): mock hai bước + cổng trình duyệt (không import store / contracts — tránh vòng depcheck) |
| M | `apps/api/test/integration/helpers/action-matrix.ts` | Amend (F2): `credit(n)` nạp ví cho test action gọi model |
| M | `apps/api/package.json` | Amend (F2): devDependency `@types/pdf-parse` 1.1.5 (cùng bản core) cho test AC3 đọc chữ PDF |
| M | `pnpm-lock.yaml` | Amend (F2): khoá devDependency trên |
| M | `tools/ai-live/src/cases.ts` | Amend (F2): category `contract`, ô `contract` / `expect.contract` |
| M | `tools/ai-live/src/runner.ts` | Amend (F2): chuyển ca contract sang contract-judge |
| M | `tools/ai-live/src/cli.ts` | Amend (F2): cổng suite contract-files 4/4 |
| C | `tools/ai-live/src/contract-judge.ts` | Amend (F2): chấm ca AI soạn hợp đồng (giá danh mục, ngoài danh mục, gợi ý, không gửi / ký, mẫu không đổi) |
| C | `tools/ai-live/test/contract-judge.test.ts` | Amend (F2): test bộ chấm |
| C | `coding-packs/reports/ai-live-contract-files-2026-11-03.md` | Amend (F2): báo cáo ai:live model thật 4/4 |
| C | `coding-packs/reports/ai-live-contract-files-2026-11-03.json` | Amend (F2): dữ liệu báo cáo trên |
| M | `apps/web/src/features/contracts/components/SignForm.tsx` | Amend (F3): `SignForm<V>` generic + `api` / `devOtp` tuỳ chọn — dùng chung cho trang ký phụ lục (một khối ký, không nhân bản) |
| M | `apps/web/src/features/contracts/index.ts` | Amend (F3): xuất `AppendixSignScreen` cho route `(public)/sign/appendix/[token]` |
| M | `packages/actions/src/reads/contracts.ts` | Amend (F3): `contract.get` trả `appendices[]` (≤ 50: id, code, title, status, version) — đường tra phụ lục cho Trợ lý / coverage |
| M | `packages/core/src/contracts/actions/contract-read.handlers.ts` | Amend (F3): handler `contract.get` đọc phụ lục |
| M | `packages/shared/src/contracts/contract-state.ts` | Amend (F3): `APPENDIX_FLOW` dùng chung server ↔ mock |
| C | `packages/db/prisma/tenant/migrations/20261102003022_contract_appendix_signing/migration.sql` | Amend (F3): cột phụ lục + 3 bảng ký phụ lục + CHECK / unique / index INCLUDE + trigger append-only |
| C | `packages/core/src/contracts/appendix/access.ts` | Amend (F3): visible / lock / CAS trạng thái phụ lục (tách khỏi handler — trần dòng) |
| C | `apps/api/test/integration/helpers/appendix-seed.ts` | Amend (F3): seed hợp đồng đã ký + phụ lục cho integration / matrix |
| C | `apps/web/src/features/contracts/hooks/useAppendices.ts` | Amend (F3): danh sách + 7 action phụ lục (bên cạnh `useAppendixSign.ts` của trang công khai) |
| C | `apps/web/src/features/contracts/styles/appendix.styles.ts` | Amend (F3): style tab / form / duyệt phụ lục (token) |
| C | `apps/web/src/shared/api/mock/domains/contracts-appendix.ts` | Amend (F3): mock phụ lục + trang ký công khai (không import store / contracts — tránh vòng depcheck) |
| C | `apps/web/src/shared/api/mock/contracts-appendix-shape.test.ts` | Amend (F3): shape mock ↔ schema chung + luồng APPENDIX_FLOW |
