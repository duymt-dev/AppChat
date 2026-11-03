// Ma trận invoice.resolve_bank_match (TIP-023b): gán giao dịch "Cần đối soát" → giao dịch + đề nghị đã thu / trạng thái trước / sau; giao dịch đã xử
// lý → 409; undo gỡ khoản thu. 403 sales (không có payment.record) · bank_tx lạ 404. Giao dịch dựng ở DB (webhook kiểm ở payments.test).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let o: { order_id: string; code: string };
let inv: { invoice_id: string; code: string };
let bt: string;

beforeAll(async () => {
  m = await matrix('invoice.resolve_bank_match');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan TT', phone: '0909500001' })).contact_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '2000000', tax_rate: 0 }] });
  inv = await m.seed('invoice.create', { order_id: o.order_id, contact_id: lan, kind: 'full', amount: '2000000' });
  const db = await m.db();
  // Feed thật qua bank_feed.connect (adapter SePay mock); giao dịch "Cần đối soát" dựng ở DB (webhook kiểm ở payments.test).
  const feed = (await m.seed('bank_feed.connect', { provider: 'sepay', fields: { api_key: 'sk_tenant', account_number: '0071000123456' } })).feed_id;
  bt = uuidv7();
  await db.bankTx.create({ data: { id: bt, feedId: feed, externalId: 'FT-9', amount: 700000n, content: 'CK KHONG MA', accountNo: '0071000123456', occurredAt: m.h.clock.now(), status: 'needs_review', reason: 'missing_code', createdAt: m.h.clock.now() } });
}, 120_000);
afterAll(() => m?.close());

describe('invoice.resolve_bank_match', () => {
  it('403 sales · bank_tx lạ 404', async () => {
    expect((await m.act({ bank_tx_id: bt, invoice_id: inv.invoice_id }, m.sales)).status).toBe(403);
    expect((await m.act({ bank_tx_id: '0190f000-0000-7000-8000-00000000beef', invoice_id: inv.invoice_id })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo; giao dịch đã xử lý → 409', async () => {
    const { preview, done } = await m.confirm({ bank_tx_id: bt, invoice_id: inv.invoice_id });
    expect(preview).toEqual({
      summary: `${inv.code} · Chị Lan TT · 700.000₫`,
      risk: 'money',
      changes: [
        { entity: 'bank_tx', id: bt, before: { status: 'needs_review' }, after: { status: 'resolved', provider: 'sepay', reference: 'FT-9', amount: '700000' } },
        { entity: 'invoice', id: inv.invoice_id, before: { paid: '0', status: 'draft' }, after: { paid: '700000', status: done.body.data.result.status } },
      ],
    });
    expect((await m.act({ bank_tx_id: bt, invoice_id: inv.invoice_id }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ bank_tx_id: 'resolved' });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).bankTx.findUniqueOrThrow({ where: { id: bt } })).status).toBe('needs_review');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
