// Dịch bản nháp trước khi gửi (TIP-025b §F.3) — chỉ ĐỀ XUẤT: kết quả hiện xem trước, người bấm xác nhận rồi mới gửi bằng message.send.
// Không cấp cho agent; model chạy không tool (cổng nháp hạn chế 023c).
import { z } from 'zod';
import { TRANSLATE_DRAFT_MAX, TRANSLATE_TARGETS, draftTranslationSchema } from '@appchat/shared';
import { defineAction } from './define';

export const aiTranslateDraft = defineAction({
  id: 'ai.translate_draft',
  module: 'ai',
  title: 'actions.ai.translate_draft.title',
  description: 'Translate the reply draft of a conversation into the target language for preview (does not send). Example: {"conversation_id":"c_lan","text":"Dạ em chào chị","to":"en","draft_revision":3}',
  input: z.object({ conversation_id: z.string().min(1), text: z.string().trim().min(1).max(TRANSLATE_DRAFT_MAX), to: z.enum(TRANSLATE_TARGETS), draft_revision: z.number().int().min(0) }),
  output: draftTranslationSchema,
  permission: 'inbox.reply',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});
