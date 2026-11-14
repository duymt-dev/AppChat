// Ma trận loyalty.adjust_points (TIP-036, risk money, undo 24h, agent ✗): preview Trợ lý có số dư trước / sau + lý do → xác nhận → hoàn tác
// ghi bù; CS không loyalty.adjust → 403; idempotency cùng khoá → một bút toán; hoàn tác khi điểm cộng đã bị dùng → 409. Luồng đủ: loyalty.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;

beforeAll(async () => {
  m = await matrix('loyalty.adjust_points');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Bù', phone: '0909362001' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('loyalty.adjust_points', () => {
  it('preview Trợ lý → xác nhận → hoàn tác', async () => {
    const { preview, done } = await m.confirm({ contact_id: lan, delta: 150, reason: 'compensation', note: 'Bù chậm' });
    expect(preview).toMatchObject({ risk: 'money', changes: [{ entity: 'loyalty_member', id: lan, before: { points: 0 }, after: { points: 150, reason: 'compensation' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: lan } })).pointsBalance).toBe(0n);
  });

  it('CS 403; idempotency cùng khoá → một bút toán', async () => {
    expect((await m.act({ contact_id: lan, delta: 10, reason: 'other' }, m.cs)).status).toBe(403);
    const a = await m.actWithKey('adj-same-key-1', { contact_id: lan, delta: 40, reason: 'promotion' });
    const b = await m.actWithKey('adj-same-key-1', { contact_id: lan, delta: 40, reason: 'promotion' });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await (await m.db()).loyaltyLedger.count({ where: { contactId: lan, delta: 40n } })).toBe(1);
  });

  it('trạng thái: điểm cộng đã bị trừ một phần → hoàn tác 409', async () => {
    const add = await m.act({ contact_id: lan, delta: 100, reason: 'promotion' });
    await m.act({ contact_id: lan, delta: -130, reason: 'order_error' });
    expect((await m.undo(add.body.data.action_log_id)).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
