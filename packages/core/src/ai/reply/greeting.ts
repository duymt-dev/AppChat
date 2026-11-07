// Lượt khách bền + lời chào tự động (TIP-022b B). Receipt lượt (`ai_turn_receipt`, khoá = hội thoại + tin khách nguồn) ghi TRƯỚC lời chào:
// agent đã chọn + nguồn gán, pha lời chào (none / pending / acknowledged / unknown), pha câu trả lời (pending / finalized). Phục hồi dựa vào
// receipt + tin khách nguồn còn chờ — KHÔNG dựa hướng tin cuối (lời chào là tin ra nhưng không làm xong lượt).
// Lời chào là chữ cấu hình của doanh nghiệp (không phải lệnh cho model): chỉ bật tường minh (`greeting_enabled`), chỉ chế độ auto, hội thoại
// 1-1 trực tiếp mới, chưa có người phục vụ, trong giờ, chưa từng chào; gửi tối đa MỘT lần (unique tin `purpose = greeting` / hội thoại) qua
// `message.send` (policy + receipt kênh 014b). Kết quả gửi chưa rõ → không gửi lại.
import type { TenantDb } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ToolExecutor } from '../../kernel/actions/executor';
import { agentAuthz } from '../agents/agent-authz';
import type { TurnLease } from './turn-lease';

type Conv = NonNullable<Awaited<ReturnType<TenantDb['conversation']['findUnique']>>>;
export type Receipt = NonNullable<Awaited<ReturnType<TenantDb['aiTurnReceipt']['findUnique']>>>;

/** Tin khách nguồn của lượt: tin khách live mới nhất (không phải lịch sử / ghi chú). */
export async function sourceMessage(db: TenantDb, conversationId: string) {
  return db.message.findFirst({
    where: { conversationId, direction: 'in', deletedAt: null, origin: 'live', kind: { notIn: ['note', 'system'] } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true, body: true, createdAt: true },
  });
}

/** Còn cần trả lời: có tin khách nguồn mà receipt lượt chưa `finalized` VÀ không có tin người / agent thường (không phải lời chào) sau nó. */
export async function pendingSource(db: TenantDb, conversationId: string) {
  const src = await sourceMessage(db, conversationId);
  if (!src) return null;
  const r = await db.aiTurnReceipt.findUnique({ where: { conversationId_sourceMessageId: { conversationId, sourceMessageId: src.id } } });
  if (r?.answerPhase === 'finalized') return null;
  const answered = await db.message.findFirst({
    where: { conversationId, direction: 'out', deletedAt: null, purpose: null, createdAt: { gt: src.createdAt } },
    select: { id: true },
  });
  return answered ? null : { src, receipt: r };
}

/** Ghi / đọc receipt lượt (dưới fence lượt): đã có thì giữ agent đã chọn (không đổi giữa lượt). */
export async function openReceipt(db: TenantDb, conversationId: string, sourceMessageId: string, turn: TurnLease, pick: { agentId: string | null; version: number | null; source: 'auto' | 'manual' | 'transfer'; reason: string }, now: Date): Promise<Receipt> {
  const key = { conversationId_sourceMessageId: { conversationId, sourceMessageId } };
  const cur = await db.aiTurnReceipt.findUnique({ where: key });
  if (cur) {
    if (cur.fence >= turn.fence) return cur;
    return db.aiTurnReceipt.update({ where: key, data: { fence: turn.fence, updatedAt: now } });
  }
  return db.aiTurnReceipt.upsert({
    where: key,
    create: { conversationId, sourceMessageId, fence: turn.fence, agentId: pick.agentId, agentVersion: pick.version, bindingSource: pick.source, bindingReason: pick.reason.slice(0, 80), createdAt: now, updatedAt: now },
    update: {},
  });
}

export async function finalizeReceipt(db: TenantDb, r: Pick<Receipt, 'conversationId' | 'sourceMessageId'>, runId: string | null, now: Date) {
  await db.aiTurnReceipt.updateMany({ where: { conversationId: r.conversationId, sourceMessageId: r.sourceMessageId }, data: { answerPhase: 'finalized', ...(runId ? { runId } : {}), updatedAt: now } });
}

export interface GreetingGate {
  enabled: boolean;
  text: string;
  inHours: boolean;
}

/** Lời chào đủ điều kiện cho hội thoại này? (chỉ quyết định; gửi ở `sendGreeting`). */
export async function wantsGreeting(db: TenantDb, c: Conv, g: GreetingGate): Promise<boolean> {
  if (!g.enabled || !g.text.trim() || !g.inHours) return false;
  if (c.aiMode !== 'auto' || c.kind !== 'direct' || c.assigneeUserId) return false;
  // Đã chào / đã có người hoặc agent trả lời trong hội thoại / có tin lịch sử (hội thoại cũ nhập về) → không chào.
  const prior = await db.message.findFirst({ where: { conversationId: c.id, OR: [{ direction: 'out' }, { origin: 'history' }] }, select: { id: true } });
  return !prior;
}

/**
 * Gửi lời chào một lần: pha `pending` ghi trước (CAS từ `none`), gửi qua `message.send` với mục đích nội bộ ràng run + tin nguồn; thành
 * công → `acknowledged`; lỗi mạng / kết quả chưa rõ → `unknown` (không gửi lại). Đã `pending` từ lần chạy trước (crash) mà có tin chào →
 * coi như đã gửi; chưa có tin → `unknown` (không đoán) — câu trả lời thường vẫn chạy dưới cùng fence.
 */
export async function sendGreeting(db: TenantDb, executor: ToolExecutor, ws: string, c: Conv, r: Receipt, agent: { id: string; toolIds: string[] }, runId: string, text: string, turn: TurnLease, now: Date): Promise<Receipt['greetingPhase']> {
  if (r.greetingPhase !== 'none') return r.greetingPhase === 'pending' ? settlePending(db, r, now) : r.greetingPhase;
  const claimed = await db.aiTurnReceipt.updateMany({ where: { conversationId: r.conversationId, sourceMessageId: r.sourceMessageId, greetingPhase: 'none' }, data: { greetingPhase: 'pending', runId, updatedAt: now } });
  if (claimed.count !== 1) return 'unknown';
  const ctx: ActionContext = {
    workspaceId: ws,
    source: 'agent',
    actor: { type: 'agent', id: agent.id },
    runId,
    servedConversationId: c.id,
    agentTurn: { fence: turn.fence, epoch: turn.epoch },
    outboundPurpose: { kind: 'greeting', runId, sourceMessageId: r.sourceMessageId },
    idempotencyKey: `agent-greeting:${c.id}`,
    authz: agentAuthz({ id: agent.id, toolIds: [...agent.toolIds, 'message.send'] }),
  };
  let phase: 'acknowledged' | 'unknown' = 'unknown';
  try {
    phase = (await executor.execute(ctx, 'message.send', { conversation_id: c.id, text: text.slice(0, 1000) })).status === 200 ? 'acknowledged' : 'unknown';
  } catch {
    phase = 'unknown';
  }
  await db.aiTurnReceipt.updateMany({ where: { conversationId: r.conversationId, sourceMessageId: r.sourceMessageId, greetingPhase: 'pending' }, data: { greetingPhase: phase, updatedAt: now } });
  return phase;
}

async function settlePending(db: TenantDb, r: Receipt, now: Date): Promise<'acknowledged' | 'unknown'> {
  const phase = r.greetingMessageId ? 'acknowledged' : 'unknown';
  await db.aiTurnReceipt.updateMany({ where: { conversationId: r.conversationId, sourceMessageId: r.sourceMessageId, greetingPhase: 'pending' }, data: { greetingPhase: phase, updatedAt: now } });
  return phase;
}
