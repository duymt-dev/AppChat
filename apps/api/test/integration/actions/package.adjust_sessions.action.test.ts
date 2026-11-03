// Ma trận package.adjust_sessions (TIP-023b): chỉnh tổng buổi → tổng / trạng thái trước / sau + lý do; dưới số đã dùng → 422 ở preview; undo trả
// tổng cũ. 403 kế toán · sales ngoài scope → 404 · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let pkg: string;
let expires: Date;

beforeAll(async () => {
  m = await matrix('package.adjust_sessions');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan TT', phone: '0909500001' })).contact_id;
  const db = await m.db();
  const prod = (await m.seed('product.create', { name: 'Liệu trình 10 buổi', type: 'package', price: '10000000', sessions: 10, valid_days: 90, tax_rate: 0 })).product_id;
  const order = await m.seed('order.create', { contact_id: lan, items: [{ product_id: prod, name: 'Liệu trình 10 buổi', qty: 1, unit_price: '10000000', tax_rate: 0 }] });
  pkg = uuidv7();
  expires = new Date(m.h.clock.now().getTime() + 30 * 86_400_000);
  await db.customerPackage.create({ data: { id: pkg, contactId: lan, productId: prod, orderId: order.order_id, name: 'Liệu trình 10 buổi', totalSessions: 10, usedSessions: 3, expiresAt: expires, status: 'active', createdAt: m.h.clock.now(), updatedAt: m.h.clock.now() } });
}, 120_000);
afterAll(() => m?.close());

describe('package.adjust_sessions', () => {
  it('403 kế toán · sales ngoài scope → 404 · id lạ 404 · dưới đã dùng → 422', async () => {
    expect((await m.act({ package_id: pkg, total_sessions: 8, reason: 'x' }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ package_id: pkg, total_sessions: 8, reason: 'x' }, m.sales)).status).toBe(404);
    expect((await m.act({ package_id: '0190f000-0000-7000-8000-00000000beef', total_sessions: 8, reason: 'x' })).status).toBe(404);
    expect((await m.act({ package_id: pkg, total_sessions: 2, reason: 'x' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ total_sessions: 'below_used' });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ package_id: pkg, total_sessions: 3, reason: ' Tặng bớt ' });
    expect(preview).toEqual({ summary: 'Liệu trình 10 buổi · Chị Lan TT', risk: 'write', changes: [{ entity: 'customer_package', id: pkg, before: { total: 10, status: 'active', reason: null }, after: { total: 3, status: 'exhausted', reason: 'Tặng bớt' } }] });
    expect(done.body.data.result.status).toBe('exhausted');
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).customerPackage.findUniqueOrThrow({ where: { id: pkg } })).totalSessions).toBe(10);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
