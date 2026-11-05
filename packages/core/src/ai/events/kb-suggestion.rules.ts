// Luật event hàng chờ học từ hội thoại (TIP-043, Blueprint §2.3 `kb.suggestion_created`): thông báo `ai_review` (biến thể `kb`) cho người
// có `kb.manage`, link tới hàng chờ trong Dữ liệu RAG — chỉ số lượng, không hỏi–đáp / PII. WS `kb.suggestion` làm mới hàng chờ khi tạo /
// duyệt / từ chối (chỉ id + trạng thái).
import { kbSuggestionApprovedEvent, kbSuggestionCreatedEvent, kbSuggestionRejectedEvent } from '@appchat/shared';
import { registerNotificationRule, registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

export const KB_REVIEW_LINK = '/settings/rag_data?nav=review';

registerNotificationRule('kb.suggestion_created', 'kb.suggestion_created', (e) => {
  const p = kbSuggestionCreatedEvent.parse(e.payload);
  return [{ kind: 'ai_review', to: { permission: 'kb.manage' }, params: { variant: 'kb', count: p.suggestion_ids.length }, link: KB_REVIEW_LINK }];
});

registerRealtimeRule('kb.suggestion_created', 'kb.suggestion_created', (e) => {
  const p = kbSuggestionCreatedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'kb.suggestion', data: { ids: p.suggestion_ids, status: 'pending' }, require: { permission: 'kb.manage' } }];
});

registerRealtimeRule('kb.suggestion_approved', 'kb.suggestion_approved', (e) => {
  const p = kbSuggestionApprovedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'kb.suggestion', data: { ids: [p.suggestion_id], status: 'approved', source_id: p.source_id }, require: { permission: 'kb.manage' } }];
});

registerRealtimeRule('kb.suggestion_rejected', 'kb.suggestion_rejected', (e) => {
  const p = kbSuggestionRejectedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'kb.suggestion', data: { ids: [p.suggestion_id], status: 'rejected' }, require: { permission: 'kb.manage' } }];
});
