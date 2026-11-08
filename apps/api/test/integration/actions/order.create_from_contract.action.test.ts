// Ma trận order.create_from_contract (TIP-023b): từ hợp đồng đã ký → một dòng "tên hợp đồng × giá trị" (không có báo giá nguồn) + mã hợp đồng; chưa ký →
// 409 ở preview. 403 cs · id lạ 404 · undo xoá đơn.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let serum: string;
let contract: { contract_id: string; code: string };

beforeAll(async () => {
  m = await matrix('order.create_from_contract');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐH', phone: '0909490001' })).contact_id;
  serum = (await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, stock: 3, low_stock_threshold: 2 })).product_id;
  await m.seed('order.create', { contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 2, unit_price: '600000', tax_rate: 10 }] });
  contract = await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000' });
}, 120_000);
afterAll(() => m?.close());

describe('order.create_from_contract', () => {
  it('403 cs · id lạ 404 · chưa ký → 409', async () => {
    expect((await m.act({ contract_id: contract.contract_id }, m.cs)).status).toBe(403);
    expect((await m.act({ contract_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({ contract_id: contract.contract_id }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    // Đã ký cần PDF cuối (contract_signed_chk) — dựng tệp giả; luồng ký thật kiểm ở contracts.test.
    const db = await m.db();
    const f = await db.file.create({ data: { id: '0190f000-0000-7000-8000-0000000f11e6', storageKey: 'matrix/order-contract.pdf', name: 'hd.pdf', mime: 'application/pdf', size: 1n, purpose: 'document', confirmed: true } });
    await db.contract.update({ where: { id: contract.contract_id }, data: { status: 'signed', signedFileId: f.id, signedSha256: 'x'.repeat(64) } });
    const { preview, done } = await m.confirm({ contract_id: contract.contract_id });
    expect(preview).toEqual({ summary: 'Chị Lan ĐH · 18.000.000₫', risk: 'write', changes: [{ entity: 'order', after: { contact: 'Chị Lan ĐH', owner: 'Chủ Spa', source: 'contract', from: contract.code, items: 1, total: '18000000' } }] });
    const id = done.body.data.result.order_id;
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    // TIP-032c: hoàn tác tạo = huỷ giữ lịch sử (không xoá đơn).
    expect((await db.order.findUniqueOrThrow({ where: { id } })).status).toBe('cancelled');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
