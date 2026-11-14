// Ma trận package.list_for_contact (TIP-033b §1.3): happy (liệu trình của khách — total / used / remaining / trạng thái, lọc trạng thái,
// không số tiền) · quyền crm.view (KHÔNG cần package.manage — kế toán không có package.manage vẫn đọc được; người ngoài bị từ chối) · scope (khách lạ → 404; sales cộng tác thấy cả hai
// gói qua quyền theo khách; cs sales=none → rỗng) · trang (limit + next_cursor) · agentGrantable nhưng không tự cấp · nguồn assistant.
// Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let active: string;
let used: string;

beforeAll(async () => {
  m = await matrix('package.list_for_contact');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan gói đọc', phone: '0909330101' })).contact_id;
  await m.seed('contact.add_collaborator', { contact_id: lan, user_id: m.sales.id, role: 'collaborator' });
  const p = (await m.seed('product.create', { name: 'Gói gội 6 buổi', type: 'package', price: '1800000', sessions: 6, valid_days: 90, tax_rate: 0 })).product_id;
  const order = async () => (await m.seed('order.create', { contact_id: lan, items: [{ product_id: p, name: 'Gói gội 6 buổi', qty: 1, unit_price: '1800000', tax_rate: 0 }] })).order_id as string;
  const [o1, o2] = [await order(), await order()];
  const db = await m.db();
  const pkg = async (orderId: string, o: { used: number; status: 'active' | 'exhausted' }) => {
    const id = uuidv7();
    await db.customerPackage.create({ data: { id, contactId: lan, productId: p, orderId, name: 'Gói gội 6 buổi', totalSessions: 6, usedSessions: o.used, status: o.status } });
    return id;
  };
  active = await pkg(o1, { used: 2, status: 'active' });
  used = await pkg(o2, { used: 6, status: 'exhausted' });
}, 120_000);
afterAll(() => m?.close());

type R = { body: { data: { result: { packages: { id: string }[]; next_cursor: string | null } } } };
const ids = (r: R) => r.body.data.result.packages.map((x) => x.id);

describe('package.list_for_contact', () => {
  it('happy: total / used / remaining / trạng thái, lọc trạng thái, không số tiền', async () => {
    const r = await m.act({ contact_id: lan, status: 'active' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.packages).toEqual([expect.objectContaining({ id: active, name: 'Gói gội 6 buổi', total: 6, used: 2, remaining: 4, status: 'active', expires_at: null })]);
    expect(JSON.stringify(r.body)).not.toMatch(/price|amount/);
    expect(ids(await m.act({ contact_id: lan })).sort()).toEqual([active, used].sort());
  });

  it('từ chối: người ngoài workspace (mọi vai trò hệ thống đều có crm.view — cổng quyền giữ nguyên, không đòi package.manage)', async () => {
    const outsider = { id: 'x', token: m.h.tokenFor('0190f000-0000-7000-8000-00000000dead') };
    expect([401, 403, 404]).toContain((await m.act({ contact_id: lan }, outsider)).status);
    expect((await m.act({ contact_id: lan }, await m.h.member('accountant'))).status).toBe(200);
  });

  it('scope: khách lạ → 404; sales cộng tác thấy cả hai; cs (sales none) → rỗng', async () => {
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect(ids(await m.act({ contact_id: lan }, m.sales)).sort()).toEqual([active, used].sort());
    expect(ids(await m.act({ contact_id: lan }, m.cs))).toEqual([]);
  });

  it('trang: limit 1 → next_cursor → gói còn lại; limit > 100 bị từ chối', async () => {
    const p1 = (await m.act({ contact_id: lan, limit: 1 })) as R;
    const p2 = (await m.act({ contact_id: lan, limit: 1, cursor: p1.body.data.result.next_cursor })) as R;
    expect([...ids(p1), ...ids(p2)].sort()).toEqual([active, used].sort());
    expect(p2.body.data.result.next_cursor).toBeNull();
    expect((await m.act({ contact_id: lan, limit: 101 })).status).toBe(422);
  });

  it('nguồn assistant chạy ngay; agentGrantable (không tự cấp mẫu agent)', async () => {
    expect((await m.act({ contact_id: lan }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect([m.def.agentGrantable, m.def.permission]).toEqual([true, 'crm.view']);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
