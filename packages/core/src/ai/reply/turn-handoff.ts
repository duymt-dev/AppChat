// Ghi trạng thái lượt agent (tách từ reply.service — TIP-022b): đổi trạng thái AI kèm outbox `conversation.updated`, và chuyển người NGUYÊN
// TỬ — `ai_state=handoff` + lý do ngắn + nháp + tóm tắt có cấu trúc (phiên bản theo lý do) + outbox `ai.handoff` + receipt lượt `finalized`
// trong cùng transaction. Thông báo chỉ mang lý do an toàn + link (không tóm tắt / PII).
import { TenantSql, type TenantDb } from '@appchat/db';
import { interpolate, serverMessages, type AgentIntent } from '@appchat/shared';
import type { KeyValueStore } from '../../kernel/redis';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import { RunStore } from '../runs/run.store';
import { buildHandoffSummary, nextSummaryVersion, summaryChanged } from './handoff-summary';
import { inEventTransaction } from '../../kernel/outbox/transaction';

type Conv = NonNullable<Awaited<ReturnType<TenantDb['conversation']['findUnique']>>>;

export interface TurnDeps {
  kv: KeyValueStore;
  now: () => Date;
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

/** Chuyển sang người: không gửi, lưu nháp + tóm tắt, `ai_state=handoff`, event `ai.handoff` (thông báo `ai_escalate`). */
export async function handoff(d: TurnDeps, db: TenantDb, ws: string, c: Conv, h: HandoffInput) {
  const { base, title } = await convEventBase(db, c);
  const now = d.now();
  const summary = await buildHandoffSummary(db, { conversationId: c.id, runId: h.runId, reason: h.reason, intent: h.intent ?? null, modelNote: h.note ?? null, now }, nextSummaryVersion(c.handoffSummary));
  await inEventTransaction(db, ws, async (tx) => {
    const cur = await tx.conversation.findUnique({ where: { id: c.id }, select: { handoffSummary: true, aiDraft: true } });
    const write = summaryChanged(cur?.handoffSummary ?? null, summary);
    await tx.conversation.update({
      where: { id: c.id },
      data: {
        aiState: 'handoff',
        handoffReason: h.text.slice(0, 300),
        // Người đã có nháp (tiếp quản giữa chừng) → giữ nháp người.
        ...(cur?.aiDraft ? {} : { aiDraft: h.draft?.slice(0, 4000) ?? null }),
        aiSuggestion: TenantSql.DbNull,
        ...(write ? { handoffSummary: { ...summary } } : {}),
      },
    });
    if (h.source) await tx.aiTurnReceipt.updateMany({ where: { conversationId: h.source.conversationId, sourceMessageId: h.source.sourceMessageId }, data: { answerPhase: 'finalized', ...(h.runId ? { runId: h.runId } : {}), updatedAt: now } });
    await writeOutbox(tx, ws, [{ topic: 'ai.handoff', payload: { ...base, run_id: h.runId, agent_id: h.agent?.id ?? null, agent: h.agent?.name ?? '', reason: h.reason.slice(0, 40), title } }], now);
  });
  await markDirty(d.kv, ws);
  if (h.runId) await new RunStore(db, d.now).finish(h.runId, 'handoff', { error: h.reason });
}
