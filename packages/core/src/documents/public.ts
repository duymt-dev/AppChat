// API công khai của domain documents cho app / domain khác (TIP-029 / 030 / 032 render chứng từ).
export { DocRenderer, PDF_CONVERTER, RENDER_CONCURRENCY, type RenderTemplate } from './services/doc-renderer';
export { DocumentsReadService, type DocViewer } from './services/documents-read.service';
export { docChecklist, type ChecklistTemplate } from './services/doc-checklist';
export { SofficeConverter, sofficePath, RENDER_TIMEOUT_MS, type PdfConverter } from './services/soffice';
export { businessData, sampleData } from './services/doc-data';
export { CONTRACT_KINDS, pickContractTemplate, type ContractKind } from './services/contract-template';
export { detectByRules, parseDetected, detectPrompt } from './services/detect';
export { openDocx, docxParagraphs, tagDocx, fillDocx, DOCX_MAX_BYTES } from './services/docx';
// Guard tệp hợp đồng tải lên + đổi DOCX cô lập (TIP-030b spec 5–6).
export { CONTRACT_DOCX, CONTRACT_PDF, CONTRACT_UPLOAD_RULE, guardContractFile, inspectContractBytes, type GuardedDocument } from './security/document-guard';
export { PDF_LIMITS } from './security/pdf-inspection';
export { DOCX_LIMITS } from './security/docx-container';
export { ISOLATED_CONVERTER, LauncherConverter, isolationLauncher, type IsolatedConverter } from './security/render-isolation';
// TIP-028b: render chứng từ phát hành qua queue `doc-render` — domain chủ đăng ký kind, action ghi yêu cầu trong transaction.
export { registerRenderKind, renderKindOf, type RenderKind, type RenderJobRow, type RenderedFile, type PublishOutcome } from './render/kinds';
export { requestRender, retryRender, renderStates, type RenderState } from './render/request';
export { RENDER_ATTEMPTS, runRender, renderErrorCode, type RenderJob, type RenderRunResult } from './render/runner';
