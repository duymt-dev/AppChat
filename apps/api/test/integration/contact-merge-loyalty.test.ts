// TIP-015e §3.5 (AC4, AC5) trên Postgres thật: điểm theo họ khách sau gộp — sổ giữ id gốc (không chép / cộng bút toán), số dư bản chính =
// số dư cả họ; đổi điểm trên đề nghị của bản PHỤ (id gốc) trừ FIFO qua lô cả họ, ghi vào bản chính; hết hạn lô của bản phụ một lần (không
// gia hạn, không hết hạn đôi); lịch sử thành viên bản chính thấy bút toán bản phụ. Hoàn tác gộp khi chưa có ghi sổ nào sau gộp → tách lại số
// dư đúng; có ghi sổ sau gộp → 409, không đổi gì. Bất biến: points_balance gốc = Σ remaining lô cả họ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionExecutor, expireLoyalty } from '@appchat/core';
import { matrix, type Matrix } from './helpers/action-matrix';
import { call } from './setup';

let m: Matrix;
let serum: string;

const ok = (id: string, input: unknown) => m.seed(id, input);
const customer = async (name: string, phone: string, points: number) => {
  const id = (await ok('contact.create', { full_name: name, phone })).contact_id as string;
  if (points) await ok('loyalty.adjust_points', { contact_id: id, delta: points, reason: 'promotion' });
  return id;
};
async function famBalance(root: string, ids: string[]) {
  const db = await m.db();
  const c = await db.contact.findUniqueOrThrow({ where: { id: root }, select: { pointsBalance: true } });
  const lots = await db.loyaltyLedger.aggregate({ where: { contactId: { in: ids }, remaining: { gt: 0 } }, _sum: { remaining: true } });
  expect(lots._sum.remaining ?? 0n).toBe(c.pointsBalance);
  return Number(c.pointsBalance);
}
async function invoiceOf(contact: string, total: string) {
  const o = (await ok('order.create', { contact_id: contact, items: [{ product_id: serum, name: 'Serum', qty: 1, unit_price: total, tax_rate: 0 }] })).order_id as string;
  await ok('order.confirm', { order_id: o });
  return (await ok('invoice.create', { order_id: o, contact_id: contact, kind: 'installment', amount: total })).invoice_id as string;
}

beforeAll(async () => {
  m = await matrix('contact.merge');
  serum = (await ok('product.create', { name: 'Dịch vụ điểm họ', type: 'service', price: '100000' })).product_id;
}, 240_000);
afterAll(() => m?.close());

describe('gộp khách — điểm theo họ', () => {
  it('số dư họ, đổi điểm đề nghị bản phụ trừ FIFO cả họ, lịch sử họ; hoàn tác 409 sau ghi sổ', async () => {
    const p = await customer('Chị Hoa Chính', '0909840001', 300);
    const s = await customer('Chị Hoa Phụ', '0909840002', 500);
    const inv = await invoiceOf(s, '200000');
    const db = await m.db();
    const ledgerBefore = await db.loyaltyLedger.count({ where: { contactId: { in: [p, s] } } });

    const { done } = await m.confirm({ group_ids: [`${p}~${s}`] });
    expect(done.status).toBe(200);
    // Không chép / cộng bút toán; số dư gốc = cả họ.
    expect(await db.loyaltyLedger.count({ where: { contactId: { in: [p, s] } } })).toBe(ledgerBefore);
    expect(await famBalance(p, [p, s])).toBe(800);

    // Đề nghị bản phụ (id gốc) đổi 700 điểm = 70.000đ → FIFO qua lô cả họ, bút toán ghi vào bản chính.
    const r = await ok('payment.redeem_points', { invoice_id: inv, points: 700 });
    expect(r.balance_after).toBe(100);
    expect(await famBalance(p, [p, s])).toBe(100);
    expect(await db.loyaltyLedger.count({ where: { contactId: p, kind: 'redeem' } })).toBe(1);
    expect((await db.contact.findUniqueOrThrow({ where: { id: s } })).pointsBalance).toBe(500n); // cache bản phụ: lịch sử, không đọc để tiêu

    const hist = (await (await call(m.h, `/loyalty/members/${p}/ledger?limit=50`)).json()) as { data: unknown[] };
    expect(hist.data.length).toBe(await db.loyaltyLedger.count({ where: { contactId: { in: [p, s] } } }));

    // Có ghi sổ sau gộp → hoàn tác gộp 409, không đổi gì.
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(409);
    expect((await db.contact.findUniqueOrThrow({ where: { id: s } })).mergedIntoId).toBe(p);
  });

  it('hoàn tác gộp sạch → số dư tách lại đúng; lô bản phụ hết hạn đúng một lần, không gia hạn', async () => {
    const p = await customer('Anh Lâm Chính', '0909840003', 200);
    const s = await customer('Anh Lâm Phụ', '0909840004', 400);
    const db = await m.db();
    const { done } = await m.confirm({ group_ids: [`${p}~${s}`] });
    expect(await famBalance(p, [p, s])).toBe(600);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await famBalance(p, [p])).toBe(200);
    expect(await famBalance(s, [s])).toBe(400);

    // Gộp lại rồi cho lô bản phụ quá hạn: hết hạn đúng lô, ghi vào bản chính, chạy lại không hết hạn đôi.
    await m.confirm({ group_ids: [`${p}~${s}`] });
    const lot = await db.loyaltyLedger.findFirstOrThrow({ where: { contactId: s, remaining: { gt: 0 } } });
    await db.loyaltyLedger.update({ where: { id: lot.id }, data: { expiresAt: new Date(m.h.clock.now().getTime() - 1000) } });
    const sweep = { executor: m.h.app.get(ActionExecutor, { strict: false }), now: () => m.h.clock.now() };
    await expireLoyalty(db, m.h.ws, sweep);
    await expireLoyalty(db, m.h.ws, sweep);
    expect(await db.loyaltyLedger.count({ where: { kind: 'expire', refId: lot.id } })).toBe(1);
    expect((await db.loyaltyLedger.findUniqueOrThrow({ where: { id: lot.id } })).remaining).toBe(0n);
    expect(await famBalance(p, [p, s])).toBe(200);
  });
});
