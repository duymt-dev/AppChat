// Consumer `support.ai-complaint` (TIP-022b D): `ai.complaint_detected` (lượt agent auto bàn giao vì khiếu nại) → kiểm lại agent đang chạy
// + grant `ticket.create` HIỆN HÀNH của phiên bản đang chạy + hội thoại còn đó → gọi `ticket.create` qua Executor với actor agent (nguồn
// `agent`, run + hội thoại đang phục vụ của lượt) — không bao giờ Owner hệ thống. Không grant → receipt `denied` + trạng thái thiếu quyền ở
// tóm tắt (bàn giao trung thực vẫn giữ). Cần duyệt → receipt giữ `pending` kèm id duyệt; từ chối / hết hạn → không ticket. Idempotency-Key
// tất định theo tin nguồn — event trùng / chạy lại không tạo ticket thứ hai; ticket do model tạo trước → đọc lại receipt, không gọi lần hai.
// Phụ thuộc port Executor + event có kiểu, không import AiModule (tránh vòng module).
import { aiComplaintEvent, AppError } from '@appchat/shared';
import { registry } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { EventConsumer } from '../../kernel/events/consumer';

export const AI_COMPLAINT_CONSUMER = 'support.ai-complaint';
const TICKET_PERMISSION = registry.find((a) => a.id === 'ticket.create')!.permission;

/** Grant hiện hành: agent còn sống + đang chạy + phiên bản đang chạy có tool ticket.create. */
async function currentGrant(db: TenantDb, agentId: string): Promise<{ id: string; toolIds: string[] } | null> {
  const a = await db.aiAgent.findUnique({ where: { id: agentId }, select: { id: true, status: true, deletedAt: true, publishedVersion: true } });
  if (!a || a.deletedAt || a.status !== 'active' || !a.publishedVersion) return null;
  const v = await db.aiAgentVersion.findUnique({ where: { agentId_version: { agentId: a.id, version: a.publishedVersion } }, select: { config: true } });
  const tools = ((v?.config ?? {}) as { tools?: string[] }).tools ?? [];
  return tools.includes('ticket.create') ? { id: a.id, toolIds: tools } : null;
}

/** Tiêu đề / mô tả an toàn từ tóm tắt bàn giao (không từ JSON model tuỳ ý). */
async function ticketInput(db: TenantDb, conversationId: string, sourceMessageId: string) {
  const c = await db.conversation.findUnique({ where: { id: conversationId }, select: { channelType: true, handoffSummary: true, contactId: true } });
  if (!c) return null;
  const s = (c.handoffSummary ?? {}) as { request?: string };
  const src = await db.message.findUnique({ where: { id: sourceMessageId }, select: { body: true, conversationId: true } });
  if (!src || src.conversationId !== conversationId) return null;
  const text = (s.request || src.body || '').trim();
  const channel = (['zalo_personal', 'webchat', 'email'] as const).find((x) => x === c.channelType) ?? 'webchat';
  return { title: (text.split('\n')[0] || 'Khiếu nại').slice(0, 120), description: text.slice(0, 2000), channel, category: 'Khiếu nại', priority: 'high' as const, source_message_id: sourceMessageId };
}

export const aiComplaintConsumer = (executor: Pick<ActionExecutor, 'execute'>, authzOf: (agent: { id: string; toolIds: string[] }) => ActionContext['authz']): EventConsumer => ({
  name: AI_COMPLAINT_CONSUMER,
  topics: ['ai.complaint_detected'],
  async handle(e, db) {
    const p = aiComplaintEvent.parse(e.payload);
    const done = await db.aiComplaintReceipt.findUnique({ where: { sourceMessageId_kind: { sourceMessageId: p.source_message_id, kind: 'agent_ticket' } } });
    if (done && done.status !== 'pending') return;
    const grant = await currentGrant(db, p.agent_id);
    if (!grant) {
      await db.aiComplaintReceipt.upsert({
        where: { sourceMessageId_kind: { sourceMessageId: p.source_message_id, kind: 'agent_ticket' } },
        create: { sourceMessageId: p.source_message_id, conversationId: p.conversation_id, runId: p.run_id, agentId: p.agent_id, status: 'denied', intentHash: '', detail: 'missing_ticket_grant' },
        update: { status: 'denied', detail: 'missing_ticket_grant' },
      });
      return;
    }
    const input = await ticketInput(db, p.conversation_id, p.source_message_id);
    if (!input) return;
    const ctx: ActionContext = {
      workspaceId: e.workspaceId,
      source: 'agent',
      actor: { type: 'agent', id: grant.id },
      runId: p.run_id,
      servedConversationId: p.conversation_id,
      idempotencyKey: `agent-ticket:${p.source_message_id}`,
      authz: authzOf(grant),
    };
    if (!ctx.authz.permissions.has(TICKET_PERMISSION as never)) return;
    try {
      const out = await executor.execute(ctx, 'ticket.create', input);
      if (out.status === 202 && out.data.status === 'approval_required') {
        await db.aiComplaintReceipt.updateMany({ where: { sourceMessageId: p.source_message_id, kind: 'agent_ticket' }, data: { approvalId: out.data.approval_id } });
      }
    } catch (err) {
      // Trùng ticket mở (cần người chọn) / hết quyền / sai trạng thái: receipt đã ghi trong handler hoặc giữ pending — không ép gộp.
      if (err instanceof AppError) return;
      throw err;
    }
  },
});
