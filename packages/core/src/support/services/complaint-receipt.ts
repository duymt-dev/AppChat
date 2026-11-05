// Ticket khiếu nại do agent tạo (TIP-022b D): MỘT receipt `(source_message_id, kind=agent_ticket)` mỗi tin khách nguồn, commit cùng
// transaction với ticket.create — model gọi tool ticket.create và consumer `ai.complaint_detected` chạy song song chỉ ra một ticket (bên
// thua đọc receipt và trả lại ticket đã có). Nguồn suy từ dòng dõi run / hội thoại phía server (`ai_run.input.source_message_id`), không từ
// JSON model; nguồn của hội thoại khác → từ chối. Người tạo ticket độc lập (UI / Trợ lý) không đi qua đây.
import { createHash } from 'node:crypto';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';

export interface AgentTicketBinding {
  sourceMessageId: string;
  conversationId: string;
  runId: string;
  agentId: string;
}

/** Ràng nguồn cho ticket.create của agent trong lượt trả lời: tin khách nguồn đã lưu ở run (hoặc run gốc khi chuyển agent). */
export async function agentTicketBinding(tx: TenantTx, ctx: Pick<ActionContext, 'actor' | 'runId' | 'servedConversationId'>, supplied: string | undefined): Promise<AgentTicketBinding | null> {
  if (ctx.actor.type !== 'agent' || !ctx.runId || !ctx.servedConversationId) return null;
  const run = await tx.aiRun.findUnique({ where: { id: ctx.runId }, select: { id: true, kind: true, input: true, conversationId: true, rootRunId: true } });
  if (!run || run.kind !== 'agent_reply' || run.conversationId !== ctx.servedConversationId) return null;
  let src = ((run.input ?? {}) as { source_message_id?: string | null }).source_message_id ?? null;
  if (!src && run.rootRunId !== run.id) {
    const root = await tx.aiRun.findUnique({ where: { id: run.rootRunId }, select: { input: true, conversationId: true } });
    if (root?.conversationId === run.conversationId) src = ((root.input ?? {}) as { source_message_id?: string | null }).source_message_id ?? null;
  }
  if (!src) return null;
  // Model đưa tin nguồn khác (hội thoại khác / tin bất kỳ) → từ chối, không tạo ticket gắn nhầm khách.
  if (supplied && supplied !== src) {
    const m = await tx.message.findUnique({ where: { id: supplied }, select: { conversationId: true } });
    if (!m || m.conversationId !== run.conversationId) throw new AppError('FORBIDDEN', 403, { source_message_id: 'foreign_source' });
  }
  return { sourceMessageId: src, conversationId: run.conversationId, runId: run.id, agentId: ctx.actor.id };
}

/** Băm ý định chuẩn — phát lại khác danh mục → CONFLICT thay vì ticket thứ hai. Tiêu đề không vào băm (model hay đổi chữ). */
export const intentHash = (category: string) => createHash('sha256').update(category.trim().toLowerCase()).digest('hex').slice(0, 32);

/**
 * Giành receipt trước khi tạo ticket (cùng transaction). Đã có receipt `created` → trả ticket đó (không tạo lần hai); khác băm → CONFLICT.
 * `INSERT … ON CONFLICT DO NOTHING` + khoá dòng: hai transaction song song — bên sau chờ bên trước commit rồi thấy `created`.
 */
export async function claimComplaint(tx: TenantTx, b: AgentTicketBinding, hash: string, now: Date): Promise<{ ticketId: string | null; status: string }> {
  await tx.$executeRaw`
    INSERT INTO ai_complaint_receipt (source_message_id, kind, conversation_id, run_id, agent_id, status, intent_hash, created_at, updated_at)
    VALUES (${b.sourceMessageId}::uuid, 'agent_ticket', ${b.conversationId}::uuid, ${b.runId}::uuid, ${b.agentId}, 'pending', ${hash}, ${now}, ${now})
    ON CONFLICT (source_message_id, kind) DO NOTHING`;
  const rows = await tx.$queryRaw<{ ticket_id: string | null; status: string; intent_hash: string }[]>`
    SELECT ticket_id::text, status, intent_hash FROM ai_complaint_receipt WHERE source_message_id = ${b.sourceMessageId}::uuid AND kind = 'agent_ticket' FOR UPDATE`;
  const r = rows[0]!;
  if (r.ticket_id) {
    if (r.intent_hash !== hash) throw new AppError('CONFLICT', 409, { source_message_id: 'complaint_receipt_mismatch' });
    return { ticketId: r.ticket_id, status: r.status };
  }
  return { ticketId: null, status: r.status };
}

export async function settleComplaint(tx: TenantTx, sourceMessageId: string, data: { status: 'created' | 'duplicate' | 'denied' | 'rejected'; ticketId?: string | null; detail?: string }, now: Date) {
  await tx.aiComplaintReceipt.updateMany({ where: { sourceMessageId, kind: 'agent_ticket' }, data: { status: data.status, ticketId: data.ticketId ?? null, detail: (data.detail ?? '').slice(0, 200), updatedAt: now } });
}
