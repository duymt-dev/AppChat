// TIP-026b / 026c mock cùng hợp đồng server: 360 có `activities` khớp activitySummarySchema (thẻ cơ hội = opportunityCardSchema); GET trang
// khớp activityPageSchema + cursor; CAS lệch → 409; done lặp không tăng version; cơ hội: xem contact-opportunities-shape.test.ts.
import { beforeEach, describe, expect, it } from 'vitest';
import { activityPageSchema, activitySummarySchema, ApiRequestError } from '@appchat/shared';
import { activityHandlers, activityPage, activitySummary, seedActivities, type ActivityStore } from './domains/contact-activities';

type Db = { s: ActivityStore; role: 'owner' | 'cs'; seq: number };
let db: Db;
const h = activityHandlers<Db>({ store: (d) => d.s, role: (d) => d.role as never, writable: () => {}, nextId: (d, p) => `${p}_${++d.seq}` });
const run = <K extends keyof typeof h>(k: K, i: unknown) => (h[k].execute as (d: Db, x: unknown) => Record<string, unknown>)(db, i);
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return (e as ApiRequestError).status;
  }
  return 200;
};

beforeEach(() => {
  db = { s: seedActivities(), role: 'owner', seq: 0 };
});

describe('mock hoạt động CRM', () => {
  it('tóm tắt + trang khớp schema; cursor đi hết không trùng', () => {
    expect(activitySummarySchema.parse(activitySummary(db.s, 'owner', 'ct_lan', true)).opportunity.current?.amount_vnd).toBe('48000000');
    for (let i = 0; i < 35; i++) run('contact.add_comment', { contact_id: 'ct_lan', body: `b${i}` });
    const p1 = activityPageSchema.parse(activityPage(db.s, 'owner', 'ct_lan', { kind: 'comments' }));
    const p2 = activityPage(db.s, 'owner', 'ct_lan', { kind: 'comments', cursor: p1.next_cursor! });
    expect(new Set([...p1.items, ...p2.items].map((x) => x.id)).size).toBe(36);
    expect(p2.next_cursor).toBeNull();
    expect(code(() => activityPage(db.s, 'owner', 'ct_lan', { kind: 'notes', cursor: p1.next_cursor! }))).toBe(400);
  });

  it('CAS 409; done lặp giữ version; undo trả trạng thái', () => {
    expect(code(() => run('contact_task.set_state', { task_id: 'tk_lan_3', if_version: 9, state: 'done' }))).toBe(409);
    const i = { task_id: 'tk_lan_3', if_version: 1, state: 'done' };
    expect(run('contact_task.set_state', i).version).toBe(2);
    expect(run('contact_task.set_state', { task_id: 'tk_lan_3', state: 'done' }).version).toBe(2);
    (h['contact_task.set_state'].undo as (d: Db, x: unknown) => void)(db, i);
    expect(db.s.tasks.find((t) => t.id === 'tk_lan_3')!.state).toBe('open');
  });

  it('thẻ cơ hội 360° khớp schema: Tư vấn / Demo 50%, dự báo 24tr; CSKH tiền VẮNG + amount_hidden', () => {
    const o = activitySummarySchema.parse(activitySummary(db.s, 'owner', 'ct_lan', true)).opportunity.current!;
    expect([o.stage, o.probability, o.forecast_vnd]).toEqual(['demo', 50, '24000000']);
    const cs = activitySummary(db.s, 'cs', 'ct_lan', true).opportunity.current!;
    expect('amount_vnd' in cs).toBe(false);
    expect(cs.amount_hidden).toBe(true);
  });
});
