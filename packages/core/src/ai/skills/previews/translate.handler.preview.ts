// Preview ai.translate (TIP-023b R2.8): tin sẽ dịch (đọc theo scope inbox như execute — ngoài scope → 404) + ngôn ngữ đích. Chỉ đọc —
// không gọi model, không trừ credit; cảnh báo `uses_credit` vì execute chạy một run consult.
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, aiTranslate } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { line, preview } from '../../../kernel/actions/preview-kit';
import { visibleConversation } from '../../../inbox/services/access';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function translatePreview(ctx: ActionContext, i: ActionInput<typeof aiTranslate>, tx: TenantTx): Promise<ActionPreview> {
  const c = await visibleConversation(tx, ctx.authz, i.conversation_id);
  const m = UUID.test(i.message_id) ? await tx.message.findUnique({ where: { id: i.message_id }, select: { conversationId: true, body: true, deletedAt: true, recalledAt: true } }) : null;
  if (!m || m.conversationId !== c.id || m.deletedAt || m.recalledAt) throw new AppError('NOT_FOUND', 404, { message_id: 'not_found' });
  return preview('read', line(m.body.slice(0, 80), i.to ?? 'auto'), { warnings: ['uses_credit'] });
}
