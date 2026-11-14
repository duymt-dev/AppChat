// Port chuyển phụ trách — hội thoại (TIP-015d §2.4, §2.7). Chạy trong transaction chuyển khách (khách đã khoá trước). Ứng viên: hội thoại
// của khách chưa lưu trữ / chưa ẩn, trạng thái open | pending | snoozed, đang gán khác người nhận (hoặc còn agent). Chuyển cho NGƯỜI:
// gán người nhận + nhóm mới, bỏ agent, auto → copilot (như người tiếp quản — không còn agent trả lời tự động), `ai_epoch + 1` + nhả lượt
// agent đang giữ (lượt cũ mất quyền ghi / gửi); tin agent còn `pending` bị huỷ, tin đã đặt chỗ gửi giữ nguyên (đang gửi — không hứa thu
// hồi). Trigger `assignment_revision` tăng; biên nhận ghi số sau chuyển. Hoàn tác: đúng id đã ghi, revision phải khớp, epoch tăng tiếp.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { OwnershipApplied, OwnershipMove, OwnershipPort, OwnershipReceipt } from '../../kernel/ownership/ports';

type Row = { id: string; channel_account_id: string; title: string | null; assignee_user_id: string | null; assignee_agent_id: string | null; team_id: string | null };
type After = { id: string; assignment_revision: number };

const assigned = (contactId: string, owner: string | null, c: { id: string; channelAccountId: string; title: string | null; contactName: string }, assignee: string | null, agent: string | null, team: string | null) => ({
  topic: 'conversation.assigned',
  payload: { conversation_id: c.id, channel_account_id: c.channelAccountId, contact_id: contactId, assignee_user_id: assignee, contact_owner_user_id: owner, team_id: team, assignee_agent_id: agent, by_user_id: null, auto: true, title: c.title ?? c.contactName },
});

/** Huỷ tin agent chưa đặt chỗ gửi của các hội thoại (set-based) — tin đã đặt chỗ / đang gửi giữ nguyên. */
async function dropPendingAgentSends(tx: TenantTx, ids: string[]) {
  await tx.$executeRaw`
    WITH o AS (
      UPDATE outbox_message ob SET status = 'dead', last_error = 'owner_transfer'
      FROM message m WHERE m.id = ob.message_id AND m.conversation_id = ANY(${ids}::uuid[]) AND ob.turn_fence IS NOT NULL AND ob.status = 'pending'
      RETURNING ob.message_id)
    UPDATE message SET status = 'failed', error = 'owner_transfer' WHERE id IN (SELECT message_id FROM o)`;
}

export const conversationOwnershipPort: OwnershipPort = {
  domain: 'conversation',

  async apply(tx: TenantTx, m: OwnershipMove): Promise<OwnershipApplied> {
    const rows = await tx.$queryRaw<Row[]>`
      SELECT id, channel_account_id, title, assignee_user_id, assignee_agent_id, team_id FROM conversation
      WHERE contact_id = ${m.contactId}::uuid AND archived_at IS NULL AND hidden_at IS NULL AND status IN ('open', 'pending', 'snoozed')
        AND (assignee_user_id IS DISTINCT FROM ${m.toUserId}::uuid OR assignee_agent_id IS NOT NULL)
      ORDER BY id FOR UPDATE`;
    if (!rows.length) return { receipts: [], events: [] };
    const ids = rows.map((r) => r.id);
    await dropPendingAgentSends(tx, ids);
    const after = await tx.$queryRaw<After[]>`
      UPDATE conversation SET assignee_user_id = ${m.toUserId}::uuid, assignee_agent_id = NULL, team_id = ${m.toTeamId}::uuid,
        ai_mode = CASE WHEN ai_mode = 'auto' THEN 'copilot'::ai_mode ELSE ai_mode END,
        ai_state = CASE WHEN ai_state = 'running' THEN 'idle'::ai_state ELSE ai_state END,
        ai_epoch = ai_epoch + 1, ai_turn_until = NULL, ai_turn_owner = NULL, updated_at = ${m.cutoff}
      WHERE id = ANY(${ids}::uuid[]) RETURNING id, assignment_revision`;
    const rev = new Map(after.map((a) => [a.id, a.assignment_revision]));
    return {
      receipts: rows.map((r) => ({ entityId: r.id, beforeUserId: r.assignee_user_id, beforeAgentId: r.assignee_agent_id, beforeTeamId: r.team_id, afterTeamId: m.toTeamId, afterRevision: rev.get(r.id)! })),
      events: rows.map((r) => assigned(m.contactId, m.toUserId, { id: r.id, channelAccountId: r.channel_account_id, title: r.title, contactName: m.contactName }, m.toUserId, null, m.toTeamId)),
    };
  },

  async undo(tx: TenantTx, receipts: readonly OwnershipReceipt[]) {
    if (!receipts.length) return { events: [] };
    const ids = [...receipts].map((r) => r.entityId).sort();
    const cur = await tx.$queryRaw<{ id: string; assignment_revision: number; channel_account_id: string; title: string | null; contact_id: string | null; archived_at: Date | null }[]>`
      SELECT id, assignment_revision, channel_account_id, title, contact_id, archived_at FROM conversation WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
    const byId = new Map(cur.map((c) => [c.id, c]));
    for (const r of receipts) {
      const c = byId.get(r.entityId);
      if (!c || c.assignment_revision !== r.afterRevision) throw new AppError('CONFLICT', 409, { conversation: 'changed' });
    }
    const vals = Prisma.join(receipts.map((r) => Prisma.sql`(${r.entityId}::uuid, ${r.beforeUserId}::uuid, ${r.beforeAgentId ?? null}::text, ${r.beforeTeamId ?? null}::uuid)`));
    // Trả người / agent / nhóm cũ với epoch MỚI (không khôi phục epoch cũ, không đổi lại chế độ AI).
    await tx.$executeRaw`
      UPDATE conversation c SET assignee_user_id = v.u, assignee_agent_id = v.a, team_id = v.t, ai_epoch = c.ai_epoch + 1, ai_turn_until = NULL, ai_turn_owner = NULL
      FROM (VALUES ${vals}) AS v(id, u, a, t) WHERE c.id = v.id`;
    const k = await tx.contact.findUnique({ where: { id: cur[0]!.contact_id! }, select: { id: true, ownerUserId: true, name: true } });
    return {
      events: receipts.map((r) => {
        const c = byId.get(r.entityId)!;
        return assigned(k!.id, k!.ownerUserId, { id: c.id, channelAccountId: c.channel_account_id, title: c.title, contactName: k!.name }, r.beforeUserId, r.beforeAgentId ?? null, r.beforeTeamId ?? null);
      }),
    };
  },
};
