// Mock lối vào Trợ lý theo bản ghi (TIP-023g): cùng hợp đồng server — cặp (thực thể, ý định) lạ → 422, bản ghi không có → 404, cùng
// request_id khác input → 409, gửi lại → cùng kết quả. Đề xuất combo / chiến dịch tất định từ dữ liệu sản phẩm của mock (không model).
// Khác server một điểm: id fixture của mock không phải UUID (`q_2041`) nên mock nhận mọi id an toàn ≤ 80 ký tự (DV ghi ở report 023g).
import { ApiRequestError, isRecordIntentPair, RECORD_ENTITIES, RECORD_INTENTS, type RecordEntity, type RecordIntentKind, type RecordProposalDto } from '@appchat/shared';
import calendarFixture from '../../../../../../../fixtures/prototype-parity/calendar.json';
import type { MockDb } from '../store';

interface Intent {
  entity: RecordEntity;
  entity_id: string;
  intent: RecordIntentKind;
  request_id: string;
  user_task?: string;
}

const ID = /^[A-Za-z0-9_-]{1,80}$/;
const proposals = new Map<string, { digest: string; dto: RecordProposalDto }>();

const exists = (db: MockDb, e: RecordEntity, id: string): boolean => {
  switch (e) {
    case 'quote': return db.quotes.quotes.some((x) => x.id === id);
    case 'contract': return db.contracts.contracts.some((x) => x.id === id);
    case 'order': return db.orders.orders.some((x) => x.id === id);
    case 'appointment': return db.calendar.appointments.some((x) => x.id === id);
    case 'follow_up': return calendarFixture.follow_ups.some((x) => x.id === id) && !db.calendar.follow_done.includes(id);
    case 'ticket': return db.tickets.tickets.some((x) => x.id === id);
    case 'invoice': return db.invoices.invoices.some((x) => x.id === id);
    case 'product': return db.products.products.some((x) => x.id === id);
  }
};

/** Kiểm như `parseRecordIntent` + đọc lại bản ghi của server. */
export function assertRecordIntent(db: MockDb, raw: unknown): Intent {
  const r = (raw ?? {}) as Partial<Intent>;
  const ok = RECORD_ENTITIES.includes(r.entity as RecordEntity) && RECORD_INTENTS.includes(r.intent as RecordIntentKind) && ID.test(String(r.entity_id ?? '')) && ID.test(String(r.request_id ?? ''));
  if (!ok) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'record_intent', fields: { record_intent: 'invalid' } });
  if (!isRecordIntentPair(r.entity!, r.intent!)) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'record_intent', fields: { record_intent: 'unsupported_pair' } });
  if (!exists(db, r.entity!, r.entity_id!)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'record' });
  return r as Intent;
}

function propose(db: MockDb, i: Intent): RecordProposalDto {
  const p = db.products.products.find((x) => x.id === i.entity_id)!;
  const base = { id: `rp_${i.request_id}`, request_id: i.request_id, run_id: `run_rp_${i.request_id}`, entity: i.entity, entity_id: i.entity_id, intent: i.intent, state: 'validated' as const };
  if (i.intent === 'product_campaign') {
    return { ...base, campaign: { title: `Ưu đãi ${p.name}`.slice(0, 160), goal: 'Tăng khách quay lại', channel: 'zalo', content: `Chào {ten}, ${p.name} đang có ưu đãi tuần này.`, audience_criteria: 'Khách đã mua dịch vụ tương tự trong 90 ngày' } };
  }
  const others = db.products.products.filter((x) => x.id !== p.id && x.status === 'active').slice(0, 2);
  const items = [p, ...others].map((x) => ({ product_id: x.id, qty: 1, name: x.name, price: x.price }));
  return { ...base, combo: { name: `Combo ${p.name}`.slice(0, 160), rationale: `Gói ${p.name} kèm sản phẩm hay mua cùng.`, items, unresolved: [] } };
}

export const recordAssistantPosts: Record<string, (db: MockDb, body: Record<string, unknown>) => unknown> = {
  '/assistant/record-proposals': (db, body) => {
    const i = assertRecordIntent(db, body);
    if (i.intent !== 'product_combo' && i.intent !== 'product_campaign') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'record_intent', fields: { record_intent: 'not_a_proposal' } });
    const digest = JSON.stringify([i.entity, i.entity_id, i.intent, (i.user_task ?? '').trim()]);
    const prev = proposals.get(i.request_id);
    if (prev) {
      if (prev.digest !== digest) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'request_id', fields: { request_id: 'mismatch' } });
      return prev.dto;
    }
    const dto = propose(db, i);
    proposals.set(i.request_id, { digest, dto });
    return dto;
  },
};
