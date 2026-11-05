// Ma trận package.search (TIP-023b R2): happy (liệu trình của khách, lọc trạng thái) · 403 (kế toán không có package.manage) · scope (khách
// ngoài scope crm → 404; sales own chỉ thấy gói từ đơn mình phụ trách; cs sales=none → rỗng) · nguồn assistant. Gói dựng ở DB trên đơn thật
// (sinh gói khi thu đủ đã kiểm ở payments test). Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let active: string;
let used: string;

beforeAll(async () => {
  m = await matrix('package.search');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan liệu trình', phone: '0909320101' })).contact_id;
  await m.seed('contact.add_collaborator', { contact_id: lan, user_id: m.sales.id, role: 'collaborator' });
  const p = (await m.seed('product.create', { name: 'Gói massage 5 buổi', type: 'package', price: '2000000', sessions: 5, valid_days: 90, tax_rate: 0 })).product_id;
  const order = async () => (await m.seed('order.create', { contact_id: lan, items: [{ product_id: p, name: 'Gói massage 5 buổi', qty: 1, unit_price: '2000000', tax_rate: 0 }] })).order_id as string;
  const [o1, o2] = [await order(), await order()];
  const db = await m.db();
  // Đơn thứ hai của sales: sales own thấy gói qua đơn mình; gói từ đơn của owner chỉ thấy nhờ quyền cộng tác trên khách.
  await db.order.update({ where: { id: o2 }, data: { ownerUserId: m.sales.id } });
  const pkg = async (orderId: string, o: { used: number; status: 'active' | 'exhausted' }) => {
    const id = uuidv7();
    await db.customerPackage.create({ data: { id, contactId: lan, productId: p, orderId, name: 'Gói massage 5 buổi', totalSessions: 5, usedSessions: o.used, status: o.status } });
    return id;
  };
  active = await pkg(o1, { used: 2, status: 'active' });
  used = await pkg(o2, { used: 5, status: 'exhausted' });
}, 120_000);
afterAll(() => m?.close());

const ids = (r: { body: { data: { result: { packages: { id: string }[] } } } }) => r.body.data.result.packages.map((x) => x.id);

describe('package.search', () => {
  it('happy: liệu trình của khách, lọc trạng thái', async () => {
    const r = await m.act({ contact_id: lan, status: 'active' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.packages).toEqual([{ id: active, name: 'Gói massage 5 buổi', used_sessions: 2, total_sessions: 5, expires_at: null, status: 'active' }]);
    expect(ids(await m.act({ contact_id: lan })).sort()).toEqual([active, used].sort());
  });

  it('403: kế toán không có package.manage', async () => {
    expect((await m.act({ contact_id: lan }, await m.h.member('accountant'))).status).toBe(403);
  });

  it('scope: khách lạ → 404; sales cộng tác thấy cả hai; cs (sales none) → rỗng', async () => {
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect(ids(await m.act({ contact_id: lan }, m.sales)).sort()).toEqual([active, used].sort());
    expect(ids(await m.act({ contact_id: lan }, m.cs))).toEqual([]);
  });

  it('nguồn agent / assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({ contact_id: lan }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ contact_id: lan, limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
