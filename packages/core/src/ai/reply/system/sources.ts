// Nguồn trigger + verifier của `inbox.system_agent_transition` (TIP-003c §1.3, §4.7): thế hệ = ai_epoch của hội thoại lúc quyết định
// (người tiếp quản / đổi chế độ tăng epoch → handler trả no_effect dưới khoá). assign_current_agent ← biên nhận lượt đã lưu (agent của
// lượt), transfer_agent ← bước `transfer_to_agent` đã lưu của run, handoff ← run (hoặc sự kiện hết Credit). Lý do / nháp / tóm tắt của
// handoff giữ trong tiến trình đúng lúc gọi — không qua input / action log.
import type { TenantDb } from '@appchat/db';
import type { AgentIntent } from '@appchat/shared';
import { AppError } from '@appchat/shared';
import { stableTriggerId, type SystemSourceKind, type SystemTrigger } from '../../../kernel/actions/system';

export const AGENT_SYSTEM_ACTOR = 'agent-reply';
const ACTION = 'inbox.system_agent_transition';
export type AgentOp = 'assign_current_agent' | 'transfer_agent' | 'handoff';

function trigger(ws: string, op: AgentOp, convId: string, kind: SystemSourceKind, ref: string, epoch: number): SystemTrigger {
  const gen = String(epoch);
  const t = stableTriggerId(kind, ref, ACTION, op, convId, gen, op);
  return { workspaceId: ws, actionId: ACTION, sourceKind: kind, sourceRef: ref, targetId: convId, generation: gen, milestone: op, input: { trigger_id: t, entity_id: convId, operation: op }, actor: AGENT_SYSTEM_ACTOR, idempotencyKey: `system:${t}` };
}

export const assignTrigger = (ws: string, c: { id: string; aiEpoch: number }, sourceMessageId: string) => trigger(ws, 'assign_current_agent', c.id, 'event', `turn:${sourceMessageId}`, c.aiEpoch);
export const transferTrigger = (ws: string, c: { id: string; aiEpoch: number }, runId: string) => trigger(ws, 'transfer_agent', c.id, 'accepted_operation', `run:${runId}`, c.aiEpoch);
/** `eventRef` (không run — vd. `credits.exhausted:<event>`) → nguồn `event`; có run → nguồn là run. */
export const handoffTrigger = (ws: string, c: { id: string; aiEpoch: number }, runId: string | null, eventRef = 'credit') =>
  runId ? trigger(ws, 'handoff', c.id, 'accepted_operation', `run:${runId}`, c.aiEpoch) : trigger(ws, 'handoff', c.id, 'event', eventRef, c.aiEpoch);

export async function verifyAgentTransition(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as { trigger_id?: string; entity_id?: string; operation?: string };
  const op = String(i.operation) as AgentOp;
  if (t.milestone !== op || i.entity_id !== t.targetId || i.trigger_id !== stableTriggerId(t.sourceKind, t.sourceRef, ACTION, op, t.targetId, t.generation, t.milestone ?? ''))
    throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  if (!(await db.conversation.findUnique({ where: { id: t.targetId }, select: { id: true } }))) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  if (t.sourceRef.startsWith('run:')) {
    const run = await db.aiRun.findUnique({ where: { id: t.sourceRef.slice(4) }, select: { conversationId: true } });
    if (!run || run.conversationId !== t.targetId) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  } else if (op === 'assign_current_agent') {
    const r = await db.aiTurnReceipt.findUnique({ where: { conversationId_sourceMessageId: { conversationId: t.targetId, sourceMessageId: t.sourceRef.slice(5) } }, select: { agentId: true } });
    if (!r?.agentId) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  } else if (op !== 'handoff' || t.sourceKind !== 'event') throw new AppError('CONFLICT', 409, { trigger: 'stale' });
}

/** Nội dung chuyển người do lượt / consumer quyết định — chỉ sống trong lời gọi. */
export interface StagedHandoff {
  agent: { id: string; name: string } | null;
  runId: string | null;
  reason: string;
  text: string;
  draft: string | null;
  intent?: AgentIntent | null;
  note?: string | null;
  source?: { conversationId: string; sourceMessageId: string } | null;
  /** Hết Credit: chỉ hội thoại auto đang rảnh / chạy (không đè trạng thái người). */
  onlyAutoActive?: boolean;
}

const held = new Map<string, StagedHandoff>();

export async function withHandoff<T>(t: SystemTrigger, h: StagedHandoff, fn: () => Promise<T>): Promise<T> {
  held.set(t.idempotencyKey!, h);
  try {
    return await fn();
  } finally {
    held.delete(t.idempotencyKey!);
  }
}

export function takeHandoff(key: string | undefined): StagedHandoff | null {
  if (!key) return null;
  const h = held.get(key) ?? null;
  held.delete(key);
  return h;
}
