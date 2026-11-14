// TIP-026c mock cùng hợp đồng server: thẻ / trang / drawer khớp schema; probability / quote_id → 422 field_removed; update đổi giai đoạn →
// use_set_stage; won thiếu chứng từ → 422; Thua bắt buộc lý do, báo giá đã gửi → rejected; Mở lại → Đủ điều kiện; ghi tiền thiếu quote.create → 403.
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiRequestError, opportunityDetailSchema, opportunityPageSchema } from '@appchat/shared';
import { openSummaryOf, seedOpportunities, type OppStore } from './domains/contact-opportunities';
import { opportunityHandlers, opportunityRoute } from './domains/contact-opportunity-actions';

type Db = { s: OppStore; role: 'owner' | 'cs'; seq: number };
let db: Db;
const ctx = { store: (d: Db) => d.s, role: (d: Db) => d.role as never, writable: () => {}, visible: () => true, canEdit: () => true, nextId: (d: Db, p: string) => `${p}_${++d.seq}` };
const h = opportunityHandlers<Db>(ctx);
const run = <K extends keyof typeof h>(k: K, i: unknown) => (h[k].execute as (d: Db, x: unknown) => Record<string, unknown>)(db, i);
const fail = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    const x = e as ApiRequestError;
    return [x.status, x.error.fields];
  }
  return [200];
};

beforeEach(() => {
  db = { s: seedOpportunities(), role: 'owner', seq: 0 };
});

describe('mock cơ hội', () => {
  it('trang + drawer khớp schema; tóm tắt mở cho cột Khách hàng', () => {
    const res = opportunityRoute('/contacts/ct_lan/opportunities', ctx)!(db) as { data: unknown[]; next_cursor: null };
    const page = opportunityPageSchema.parse({ items: res.data, next_cursor: res.next_cursor });
    expect(page.items.map((x) => x.stage)).toEqual(['demo', 'lost', 'won']);
    const d = opportunityDetailSchema.parse(opportunityRoute('/opportunities/op_lan_3', ctx)!(db));
    expect(d.chain.order.docs.map((x) => x.code)).toEqual(['DH-1120']);
    expect(openSummaryOf(db.s, 'owner', 'kh_1002')).toEqual({ count: 2, top_stage: 'quote', amount_vnd: '85000000' });
  });

  it('field_removed / use_set_stage / won_needs_document / 403 tiền', () => {
    expect(fail(() => run('contact_opportunity.create', { contact_id: 'ct_lan', title: 'x', probability: 40 }))).toEqual([422, { probability: 'field_removed' }]);
    expect(fail(() => run('contact_opportunity.update', { opportunity_id: 'op_lan_1', patch: { stage: 'won' } }))).toEqual([422, { 'patch.stage': 'use_set_stage' }]);
    expect(fail(() => run('contact_opportunity.set_stage', { opportunity_id: 'op_lan_1', stage: 'won' }))).toEqual([422, { stage: 'won_needs_document' }]);
    db.role = 'cs';
    expect(fail(() => run('contact_opportunity.create', { contact_id: 'ct_lan', title: 'x', amount_vnd: '1' }))[0]).toBe(403);
  });

  it('Thua: báo giá đã gửi → rejected; Mở lại → Đủ điều kiện', () => {
    const r = run('contact_opportunity.mark_lost', { opportunity_id: 'op_1002_1', lost_reason: 'price' });
    expect(r).toMatchObject({ stage: 'lost', rejected_quote_ids: ['q_0398'] });
    expect(db.s.docs.find((x) => x.id === 'q_0398')!.status).toBe('rejected');
    expect(run('contact_opportunity.reopen', { opportunity_id: 'op_1002_1' })).toMatchObject({ stage: 'qualified' });
  });
});
