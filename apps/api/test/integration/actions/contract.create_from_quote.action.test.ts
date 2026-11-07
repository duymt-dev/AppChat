// Ma trận contract.create_from_quote (TIP-023b): từ báo giá đã chốt → khách + người làm + tiêu đề từ dòng + giá trị = tổng báo giá + mã báo giá;
// báo giá chưa chốt → 409; đã có hợp đồng → preview báo `existing:<mã>`. 403 cs · id lạ 404 · undo xoá mềm + gỡ liên kết báo giá.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let quote: { quote_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contract.create_from_quote');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
  quote = await m.seed('quote.create', { contact_id: lan, items: [{ name: 'HIFU nâng cơ', qty: 2, unit_price: '1500000', tax_rate: 8 }] });
}, 120_000);
afterAll(() => m?.close());

describe('contract.create_from_quote', () => {
  it('403 cs · id lạ 404 · báo giá chưa chốt → 409', async () => {
    expect((await m.act({ quote_id: quote.quote_id }, m.cs)).status).toBe(403);
    expect((await m.act({ quote_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({ quote_id: quote.quote_id }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('preview Trợ lý → xác nhận → lần hai báo hợp đồng sẵn có → undo', async () => {
    await (await m.db()).quote.update({ where: { id: quote.quote_id }, data: { status: 'accepted' } });
    const { preview, done } = await m.confirm({ quote_id: quote.quote_id });
    expect(preview).toEqual({ summary: 'Chị Lan HĐ · HIFU nâng cơ · 3.240.000₫', risk: 'write', changes: [{ entity: 'contract', after: { contact: 'Chị Lan HĐ', owner: 'Chủ Spa', kind: 'service', title: 'HIFU nâng cơ', value: '3240000', quote: `${quote.code} · L1` } }] });
    const code = done.body.data.result.code;
    const again = await m.act({ quote_id: quote.quote_id }, undefined, { 'x-action-source': 'assistant' });
    expect(again.body.data.preview).toEqual({ summary: `${code} · HIFU nâng cơ`, risk: 'write', changes: [], warnings: [`existing:${code}`] });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).contract.count({ where: { quoteId: quote.quote_id } })).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
