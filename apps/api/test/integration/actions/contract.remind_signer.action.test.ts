// Ma trận contract.remind_signer (TIP-023b): nhắc ký → hội thoại đã gửi + hạn link còn hiệu lực; link hết hạn → 409 ở preview.
// 403 cs (không có contract.draft) · sales own → 404 · id lạ 404. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { contract_id: string; code: string };
let lan: string;
const C = () => c.contract_id;
/** Dựng trạng thái ở DB (Duyệt & ký cần OTP + LibreOffice — đã kiểm ở contract.approve_and_sign / contracts.test). */
const setStatus = async (status: string, data: Record<string, unknown> = {}) => (await m.db()).contract.update({ where: { id: C() }, data: { status: status as never, ...data } });

beforeAll(async () => {
  m = await matrix('contract.remind_signer');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  c = await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
  await setStatus('pending_signature');
  await (await m.db()).channelAccount.create({ data: { id: '0190f000-0000-7000-8000-0000000e0a13', type: 'email', name: 'cskh@spa.vn', externalId: 'cskh-hd2@spa.vn', status: 'connected', settings: {} } });
  await m.seed('contract.send_for_signature', { contract_id: c.contract_id, channel: 'email' });
}, 120_000);
afterAll(() => m?.close());

describe('contract.remind_signer', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ contract_id: C() }, m.cs)).status).toBe(403);
    expect((await m.act({ contract_id: C() }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ contract_id: C() }, contract_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; link hết hạn → 409', async () => {
    const { preview, done } = await m.confirm({ contract_id: C() });
    expect(preview).toMatchObject({ summary: `${c.code} · Liệu trình HIFU · Chị Lan HĐ`, risk: 'send', changes: [{ entity: 'message', after: { channel: 'email' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    await (await m.db()).contractSignToken.updateMany({ where: { contractId: C() }, data: { expiresAt: new Date(0) } });
    expect((await m.act({ contract_id: C() }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ sign_link: 'expired' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
