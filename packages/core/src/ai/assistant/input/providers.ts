// Facade đăng ký handler đầu vào Trợ lý (TIP-023f) — AiModule import danh sách này (1 dòng), không sửa ai.module.ts mỗi pha.
import { AttachmentGetHandler, AttachmentPrepareHandler, AttachmentReadHandler, AttachmentRemoveHandler } from './actions';

export const ASSISTANT_INPUT_PROVIDERS = [AttachmentPrepareHandler, AttachmentRemoveHandler, AttachmentGetHandler, AttachmentReadHandler] as const;
