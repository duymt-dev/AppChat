// Lịch sử cơ hội (TIP-026c §1.3): `contact_opportunity_event` chỉ thêm (không UPDATE / DELETE) + timeline khách (ref contact_opportunity,
// tham số chỉ là khoá an toàn — không tiền / nội dung). `contact_id` = khách lúc ghi (đọc theo họ). Export qua crm/public cho Call Center sau.
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { writeTimeline, type TimelineKey } from '../services/timeline.service';

export type OpportunityEventKind = 'created' | 'stage' | 'value' | 'owner' | 'lost' | 'reopened' | 'linked' | 'unlinked' | 'ai_suggested' | 'ai_applied';
export type Actor = { type: string; id: string | null };

export interface OpportunityEventIn {
  opportunityId: string;
  contactId: string;
  kind: OpportunityEventKind;
  from?: string | null;
  to?: string | null;
  ref?: { type: string; id: string } | null;
  params?: Record<string, string | number | boolean | null>;
  actor: Actor;
  at: Date;
}

/** Mốc timeline khách cho từng loại lịch sử (loại không lên timeline → không có khoá). */
const TIMELINE: Partial<Record<OpportunityEventKind, TimelineKey>> = {
  created: 'opportunity_created',
  stage: 'opportunity_stage',
  lost: 'opportunity_lost',
  reopened: 'opportunity_reopened',
  owner: 'opportunity_owner',
};

/** Ghi một dòng lịch sử (+ timeline khách nếu loại đó hiện trên dòng thời gian). Actor agent: `actor_id` = id agent, không giả user. */
export async function recordOpportunityEvent(tx: TenantTx, e: OpportunityEventIn): Promise<string> {
  const id = uuidv7(e.at.getTime());
  await tx.contactOpportunityEvent.create({
    data: {
      id,
      opportunityId: e.opportunityId,
      contactId: e.contactId,
      kind: e.kind,
      fromStage: e.from ?? null,
      toStage: e.to ?? null,
      refType: e.ref?.type ?? null,
      refId: e.ref?.id ?? null,
      params: e.params ?? {},
      actorType: e.actor.type,
      actorId: e.actor.id,
      createdAt: e.at,
    },
  });
  const key = TIMELINE[e.kind];
  if (key) {
    const params: Record<string, string> = {};
    if (e.from) params.from = e.from;
    if (e.to) params.to = e.to;
    if (typeof e.params?.reason === 'string') params.reason = e.params.reason;
    await writeTimeline(tx, { contactId: e.contactId, type: 'contact_opportunity', key, params, actor: e.actor, ref: { type: 'contact_opportunity', id: e.opportunityId }, at: e.at });
  }
  return id;
}

/** Sự kiện outbox tối thiểu (id + khách + version) — không tiền / tên. */
export const opportunityEvent = (topic: string, contactId: string, id: string, version: number, extra: Record<string, string> = {}) => ({
  topic,
  payload: { contact_id: contactId, activity_id: id, version, ...extra },
});
