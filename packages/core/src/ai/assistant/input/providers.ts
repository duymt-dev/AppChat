// Facade đăng ký handler đầu vào Trợ lý (TIP-023f) — AiModule import danh sách này (1 dòng), không sửa ai.module.ts mỗi pha.
// TIP-032d: nguồn `assistant_artifact_ref` cho tệp đính kèm bản ghi đăng ký vào registry trung lập của kernel khi nạp module này.
import { AttachmentGetHandler, AttachmentPrepareHandler, AttachmentReadHandler, AttachmentRemoveHandler } from './actions';
import { registerAssistantArtifactSource } from './record-attachment-source';

registerAssistantArtifactSource();

export const ASSISTANT_INPUT_PROVIDERS = [AttachmentPrepareHandler, AttachmentRemoveHandler, AttachmentGetHandler, AttachmentReadHandler] as const;
