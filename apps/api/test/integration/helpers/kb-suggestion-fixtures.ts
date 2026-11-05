// Dựng đề xuất tri thức pending cho ma trận `kb.suggestion.*` (TIP-043): hội thoại đóng (khách hỏi, nhân viên đáp) + `kb.suggestion.propose`
// qua executor nguồn system (actor `system:kb-suggest`) — luồng đề xuất thật kiểm ở kb-suggestions.test.ts.
import { ActionExecutor, KB_SUGGEST_ACTOR, uuidv7 } from '@appchat/core';
import type { Matrix } from './action-matrix';

export async function pendingSuggestion(m: Matrix, question = 'Đổi lịch hẹn được không?'): Promise<string> {
  const c = await m.conv({ body: question });
  const db = await m.db();
  await db.conversation.update({ where: { id: c.id }, data: { status: 'closed' } });
  const answer = uuidv7();
  m.h.clock.advance(1000);
  await db.message.create({ data: { id: answer, conversationId: c.id, channelAccountId: c.account, direction: 'out', senderType: 'user', body: 'Dạ đổi trước 24 giờ, miễn phí ạ.', status: 'delivered', createdAt: m.h.clock.now() } });
  const ctx = { workspaceId: m.h.ws, source: 'system' as const, actor: { type: 'system' as const, id: KB_SUGGEST_ACTOR }, authz: { isOwner: true } as never };
  const r = await m.h.app.get(ActionExecutor, { strict: false }).execute(ctx, 'kb.suggestion.propose', {
    conversation_id: c.id,
    cutoff_message_id: answer,
    run_id: null,
    pairs: [{ question, answer: 'Đổi trước 24 giờ, miễn phí.', source_message_ids: [c.message, answer] }],
  });
  return (r.data as { result: { created: string[] } }).result.created[0]!;
}
