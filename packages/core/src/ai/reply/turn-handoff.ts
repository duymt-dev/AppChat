// Ghi trạng thái lượt agent (tách từ reply.service — TIP-022b): đổi trạng thái AI kèm outbox `conversation.updated`, và chuyển người NGUYÊN
// TỬ qua action riêng `inbox.system_agent_transition` (TIP-003c) — `ai_state=handoff` + lý do ngắn + nháp + tóm tắt có cấu trúc (phiên
// bản theo lý do) + outbox `ai.handoff` + receipt lượt `finalized` trong cùng transaction. Thông báo chỉ mang lý do an toàn + link (không tóm tắt / PII).
import type { TenantDb, TenantDbResolver } from '@appchat/db';
import type { SystemOutput } from '@appchat/actions';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { runSystemAction } from '../../kernel/actions/system';
import { handoffTrigger, withHandoff } from './system/sources';
import type { StagedWithSummary } from './system/handoff-effect';
import { interpolate, serverMessages, type AgentIntent } from '@appchat/shared';
import type { KeyValueStore } from '../../kernel/redis';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import { RunStore } from '../runs/run.store';
import { buildHandoffSummary, nextSummaryVersion } from './handoff-summary';
import { inEventTransaction } from '../../kernel/outbox/transaction';

type Conv = NonNullable<Awaited<ReturnType<TenantDb['conversation']['findUnique']>>>;

export interface TurnDeps {
  kv: KeyValueStore;
  now: () => Date;
}

/** Chuyển người ghi qua action riêng (TIP-003c) — cần Executor + resolver. */
export interface HandoffDeps extends TurnDeps {
  executor: Pick<ActionExecutor, 'execute'>;
  tenants: Pick<TenantDbResolver, 'get'>;
}

export async function convEventBase(db: TenantDb, c: Conv) {
  const owner = c.contactId ? await db.contact.findUnique({ where: { id: c.contactId }, select: { ownerUserId: true, name: true } }) : null;
  return {
    base: { conversation_id: c.id, channel_account_id: c.channelAccountId, contact_id: c.contactId, assignee_user_id: c.assigneeUserId, contact_owner_user_id: owner?.ownerUserId ?? null, team_id: c.teamId },
    title: c.title ?? owner?.name ?? '',
  };
}

export async function setState(d: TurnDeps, db: TenantDb, ws: string, c: Conv, data: Parameters<TenantDb['conversation']['update']>[0]['data'], change: string) {
  const { base } = await convEventBase(db, c);
  await inEventTransaction(db, ws, async (tx) => {
    await tx.conversation.update({ where: { id: c.id }, data });
    await writeOutbox(tx, ws, [{ topic: 'conversation.updated', payload: { ...base, change } }], d.now());
  });
  await markDirty(d.kv, ws);
}

export type ReasonKey = keyof ReturnType<typeof serverMessages>['ai']['handoff'];

export const reasonText = (r: ReasonKey, vars: Record<string, string | number> = {}) =>
  interpolate(serverMessages('vi').ai.handoff[r], { detail: '', pct: 0, threshold: 0, ...vars });

export interface HandoffInput {
  agent: { id: string; name: string } | null;
  runId: string | null;
  reason: string;
  text: string;
  draft: string | null;
  intent?: AgentIntent | null;
  /** Ghi chú của model (needs_human / summary tool handoff) — đưa vào mục "chưa giải quyết". */
  note?: string | null;
  /** Lượt khách nguồn — receipt `finalized` cùng transaction. */
  source?: { conversationId: string; sourceMessageId: string } | null;
}

/** Chuyển sang người: không gửi, lưu nháp + tóm tắt, `ai_state=handoff`, event `ai.handoff` (thông báo `ai_escalate`). TIP-003c: ghi qua
 *  action riêng `inbox.system_agent_transition` theo ai_epoch hiện tại; tóm tắt dựng NGOÀI transaction. Trả true khi đã chuyển. */
export async function handoff(d: HandoffDeps, db: TenantDb, ws: string, c: Conv, h: HandoffInput & { onlyAutoActive?: boolean; eventRef?: string }): Promise<boolean> {
  const { base, title } = await convEventBase(db, c);
  const summary = await buildHandoffSummary(db, { conversationId: c.id, runId: h.runId, reason: h.reason, intent: h.intent ?? null, modelNote: h.note ?? null, now: d.now() }, nextSummaryVersion(c.handoffSummary));
  const cur = await db.conversation.findUnique({ where: { id: c.id }, select: { aiEpoch: true } });
  if (!cur) return false;
  const t = handoffTrigger(ws, { id: c.id, aiEpoch: cur.aiEpoch }, h.runId, h.eventRef);
  const staged: StagedWithSummary = { ...h, summary, base, title };
  const r = await withHandoff(t, staged, () => runSystemAction<SystemOutput>(d.executor, d.tenants, t));
  const applied = (r.data as { result: SystemOutput }).result.disposition === 'applied';
  if (h.runId) await new RunStore(db, d.now).finish(h.runId, 'handoff', { error: h.reason });
  return applied;
}
