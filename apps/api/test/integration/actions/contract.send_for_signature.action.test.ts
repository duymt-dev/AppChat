// Ma trận contract.send_for_signature (TIP-023b): gửi ký → kênh + nơi nhận (email chưa có chuỗi → cảnh báo) + hạn link dự tính; nháp → 409 ở preview.
// 403 sales (không có contract.sign) · id lạ 404. Undo: ActionDef không khai.
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
  m = await matrix('contract.send_for_signature');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  c = await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
  await (await m.db()).channelAccount.create({ data: { id: '0190f000-0000-7000-8000-0000000e0a12', type: 'email', name: 'cskh@spa.vn', externalId: 'cskh-hd@spa.vn', status: 'connected', settings: {} } });
}, 120_000);
afterAll(() => m?.close());

describe('contract.send_for_signature', () => {
  it('nháp → preview 409', async () => {
    expect((await m.act({ contract_id: C(), channel: 'email' }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ contract_id: C(), channel: 'email' as const }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ contract_id: C(), channel: 'email' as const }, contract_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    await setStatus('pending_signature');
    const { preview, done } = await m.confirm({ contract_id: C(), channel: 'email' });
    expect(preview).toMatchObject({ summary: `${c.code} · Liệu trình HIFU · Chị Lan HĐ · 18.000.000₫`, risk: 'send', changes: [{ entity: 'contract', id: C(), before: { sign_link_expires_at: null }, after: { channel: 'email', to: 'lan.hd@example.com' } }], warnings: ['new_email_thread'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(preview.changes[0].after.sign_link_expires_at).toBe(done.body.data.result.expires_at);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
