// API công khai của domain documents cho app / domain khác (TIP-029 / 030 / 032 render chứng từ).
export { DocRenderer, PDF_CONVERTER, RENDER_CONCURRENCY, type RenderTemplate } from './services/doc-renderer';
export { DocumentsReadService, type DocViewer } from './services/documents-read.service';
export { SofficeConverter, sofficePath, RENDER_TIMEOUT_MS, type PdfConverter } from './services/soffice';
export { businessData, sampleData } from './services/doc-data';
export { CONTRACT_KINDS, pickContractTemplate, type ContractKind } from './services/contract-template';
export { detectByRules, parseDetected, detectPrompt } from './services/detect';
export { openDocx, docxParagraphs, tagDocx, fillDocx, DOCX_MAX_BYTES } from './services/docx';
