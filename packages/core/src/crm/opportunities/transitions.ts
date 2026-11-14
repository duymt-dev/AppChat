// Luật chuyển cơ hội theo chứng từ (TIP-026c §3.1, COMMERCE §8, DC-901) — producer gọi TRONG transaction của mình, SAU khi đã khoá họ khách
// (`lockStageFamily*`) và chứng từ; ở đây mới khoá cơ hội (`lockOpportunity`, id tăng dần). Thua / Đã mua không bị luật tự động đổi (trừ
// "huỷ / từ chối" đưa won về Đàm phán). Event lặp lại (gửi lại báo giá, retry outbox) → no-op ổn định. Trả event outbox.
import { OPEN_QUOTE_STATUSES, interpolate, isOpportunityClosed, nextOpportunityStage, opportunityRank, serverMessages, type OpportunityStage } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { liveDocuments } from './links';
import { lockOpportunity, type OpportunityRecord } from './locks';
import { opportunityEvent, recordOpportunityEvent, type Actor, type OpportunityEventKind } from './history';
import { recomputeContactStage } from './stage-sync';

type Events = { topic: string; payload: Record<string, unknown> }[];
type Ref = { type: string; id: string };
const DAY_MS = 86_400_000;

/** Đổi giai đoạn có điều kiện (id + version đã khoá) + MỘT dòng lịch sử (`stage`, hoặc `lost` / `reopened`) + event. Cùng giai đoạn → []. */
export async function moveOpportunity(
  tx: TenantTx,
  o: OpportunityRecord,
  to: OpportunityStage,
  m: { actor: Actor; now: Date; ref?: Ref | null; data?: Record<string, unknown>; kind?: OpportunityEventKind; params?: Record<string, string | boolean> },
): Promise<Events> {
  if (o.stage === to) return [];
  const closedAt = isOpportunityClosed(to) ? m.now : null;
  await tx.contactOpportunity.update({ where: { id: o.id, version: o.version }, data: { stage: to, closedAt, stageChangedAt: m.now, updatedAt: m.now, version: { increment: 1 }, ...m.data } });
  await recordOpportunityEvent(tx, { opportunityId: o.id, contactId: o.contactId, kind: m.kind ?? 'stage', from: o.stage, to, ref: m.ref ?? null, params: m.params, actor: m.actor, at: m.now });
  const from = o.stage;
  o.version += 1;
  o.stage = to;
  o.closedAt = closedAt;
  return [opportunityEvent('contact_opportunity.stage_changed', o.contactId, o.id, o.version, { from, to })];
}

const open = (o: OpportunityRecord | undefined): o is OpportunityRecord => !!o && !o.archivedAt && !isOpportunityClosed(o.stage);

/** Nâng cơ hội mở lên `to` nếu đang thấp hơn (không bao giờ hạ). */
async function raise(tx: TenantTx, o: OpportunityRecord, to: OpportunityStage, actor: Actor, now: Date, ref: Ref): Promise<Events> {
  return opportunityRank(o.stage) < opportunityRank(to) ? moveOpportunity(tx, o, to, { actor, now, ref }) : [];
}

export interface QuoteFacts {
  id: string;
  code: string;
  contactId: string;
  opportunityId: string | null;
  total: bigint;
  opportunitySyncValue: boolean;
  opportunityFollowUp: boolean;
}

/** quote.send: cơ hội → Báo giá; cờ sync → giá trị = tổng báo giá; cờ theo dõi → việc "Theo dõi phản hồi báo giá" +2 ngày cho người phụ trách. */
export async function onQuoteSent(tx: TenantTx, q: QuoteFacts, a: { actor: Actor; now: Date; locale: string }): Promise<Events> {
  const [o] = await lockOpportunity(tx, [q.opportunityId]);
  if (!open(o)) return [];
  const ref = { type: 'quote', id: q.id };
  const events = await raise(tx, o, 'quote', a.actor, a.now, ref);
  if (q.opportunitySyncValue && o.amountVnd !== q.total) {
    await tx.contactOpportunity.update({ where: { id: o.id }, data: { amountVnd: q.total, updatedAt: a.now, version: { increment: 1 } } });
    await recordOpportunityEvent(tx, { opportunityId: o.id, contactId: o.contactId, kind: 'value', ref, params: { synced: true }, actor: a.actor, at: a.now });
    o.version += 1;
  }
  // Một việc theo dõi mỗi báo giá (gửi lại / retry không nhân việc).
  const title = interpolate(serverMessages(a.locale).crm.opportunity.followUp, { code: q.code });
  if (q.opportunityFollowUp && !(await tx.contactTask.findFirst({ where: { contactId: q.contactId, title, state: 'open' }, select: { id: true } }))) {
    await tx.contactTask.create({
      data: { id: uuidv7(a.now.getTime()), contactId: q.contactId, title, description: '', dueAt: new Date(a.now.getTime() + 2 * DAY_MS), assigneeUserId: o.ownerUserId, actorType: 'system', createdAt: a.now, updatedAt: a.now },
    });
  }
  return [...events, ...(await recomputeContactStage(tx, q.contactId, { allowLower: false, actor: a.actor, now: a.now }))];
}

/** quote.mark_accepted: cơ hội → Đàm phán. */
export async function onQuoteAccepted(tx: TenantTx, q: Pick<QuoteFacts, 'id' | 'contactId' | 'opportunityId'>, actor: Actor, now: Date): Promise<Events> {
  const [o] = await lockOpportunity(tx, [q.opportunityId]);
  if (!open(o)) return [];
  const events = await raise(tx, o, 'negotiation', actor, now, { type: 'quote', id: q.id });
  return [...events, ...(await recomputeContactStage(tx, q.contactId, { allowLower: false, actor, now }))];
}

/**
 * quote.mark_rejected (không qua mark_lost) / quote.expire: cơ hội đang Báo giá / Đàm phán mà không còn báo giá mở → Tư vấn / Demo. Từ chối
 * → nhắc người phụ trách cơ hội ghi lý do Thua (không tự đặt Thua). Giai đoạn khách tính lại (allowLower) ở closeLost của producer.
 */
export async function onQuoteClosed(tx: TenantTx, q: Pick<QuoteFacts, 'id' | 'code' | 'opportunityId'>, kind: 'rejected' | 'expired', actor: Actor, now: Date): Promise<Events> {
  const [o] = await lockOpportunity(tx, [q.opportunityId]);
  if (!open(o) || (o.stage !== 'quote' && o.stage !== 'negotiation')) return [];
  const others = await tx.quote.count({ where: { opportunityId: o.id, id: { not: q.id }, deletedAt: null, status: { in: [...OPEN_QUOTE_STATUSES] } } });
  if (others) return [];
  const events = await moveOpportunity(tx, o, 'demo', { actor, now, ref: { type: 'quote', id: q.id } });
  if (kind === 'rejected' && o.ownerUserId) {
    events.push({ topic: 'notify.requested', payload: { kind: 'opportunity_lost_reason', to: { user_ids: [o.ownerUserId] }, params: { code: q.code, title: o.title.slice(0, 200) }, link: `/customers?c=${o.contactId}` } });
  }
  return events;
}

/** contract.signed (qua báo giá nguồn) / order.create*: cơ hội → Đã mua + closed_at. Thua giữ nguyên (luật tự động không mở lại). */
export async function onDocumentWon(tx: TenantTx, opportunityId: string | null, ref: Ref, actor: Actor, now: Date): Promise<Events> {
  const [o] = await lockOpportunity(tx, [opportunityId]);
  if (!open(o)) return [];
  return moveOpportunity(tx, o, 'won', { actor, now, ref });
}

/** contract.declined / link ký hết hạn / order.cancel: cơ hội won không còn hợp đồng ký và không còn đơn chưa huỷ → Đàm phán, closed_at null. */
export async function onDocumentUndone(tx: TenantTx, opportunityId: string | null, ref: Ref, actor: Actor, now: Date): Promise<Events> {
  const [o] = await lockOpportunity(tx, [opportunityId]);
  if (!o || o.archivedAt || o.stage !== 'won') return [];
  const live = await liveDocuments(tx, o.id);
  if (live.order || live.signed) return [];
  const events = await moveOpportunity(tx, o, 'negotiation', { actor, now, ref });
  return [...events, ...(await recomputeContactStage(tx, o.contactId, { allowLower: false, actor, now }))];
}

/** appointment.complete: lịch hẹn gắn cơ hội Lead / Đủ điều kiện / Tư vấn → KHÔNG đổi giai đoạn; ghi gợi ý AI "bước kế" lên thẻ. */
export async function onAppointmentDone(tx: TenantTx, appt: { id: string; opportunityId: string | null }, actor: Actor, now: Date): Promise<void> {
  const [o] = await lockOpportunity(tx, [appt.opportunityId]);
  if (!open(o) || !['lead', 'qualified', 'demo'].includes(o.stage)) return;
  const to = nextOpportunityStage(o.stage);
  if (!to) return;
  await recordOpportunityEvent(tx, { opportunityId: o.id, contactId: o.contactId, kind: 'ai_suggested', from: o.stage, to, ref: { type: 'appointment', id: appt.id }, params: { reason: 'appointment_done' }, actor, at: now });
}
