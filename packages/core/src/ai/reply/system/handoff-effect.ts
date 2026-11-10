// Hiệu ứng chuyển người của `inbox.system_agent_transition` (TIP-003c §4.7) — thân transaction cũ của turn-handoff.handoff: `ai_state=
// handoff` + lý do ngắn + nháp (giữ nháp người) + tóm tắt có cấu trúc (dựng NGOÀI transaction, đi kèm bản stage) + receipt lượt
// `finalized`; outbox `ai.handoff` qua kết quả handler (cùng transaction với action log + biên nhận trigger).
import { TenantSql, type TenantDb } from '@appchat/db';
import type { HandoffSummaryDto } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { OutboxEventInput } from '../../../kernel/outbox/outbox';
import { summaryChanged } from '../handoff-summary';
import type { StagedHandoff } from './sources';

type Conv = NonNullable<Awaited<ReturnType<TenantDb['conversation']['findUnique']>>>;
export type StagedWithSummary = StagedHandoff & { summary: HandoffSummaryDto; base: Record<string, unknown>; title: string };

export async function handoffEffect(tx: TenantTx, _ws: string, c: Conv, h: StagedHandoff, now: Date): Promise<OutboxEventInput[]> {
  const s = h as StagedWithSummary;
  const write = summaryChanged(c.handoffSummary ?? null, s.summary);
  await tx.conversation.update({
    where: { id: c.id },
    data: {
      aiState: 'handoff',
      handoffReason: h.text.slice(0, 300),
      // Người đã có nháp (tiếp quản giữa chừng) → giữ nháp người.
      ...(c.aiDraft ? {} : { aiDraft: h.draft?.slice(0, 4000) ?? null }),
      aiSuggestion: TenantSql.DbNull,
      ...(write ? { handoffSummary: { ...s.summary } } : {}),
    },
  });
  if (h.source) await tx.aiTurnReceipt.updateMany({ where: { conversationId: h.source.conversationId, sourceMessageId: h.source.sourceMessageId }, data: { answerPhase: 'finalized', ...(h.runId ? { runId: h.runId } : {}), updatedAt: now } });
  return [{ topic: 'ai.handoff', payload: { ...s.base, run_id: h.runId, agent_id: h.agent?.id ?? null, agent: h.agent?.name ?? '', reason: h.reason.slice(0, 40), title: s.title } }];
}
