// Ma trận contract.extend_sign_link (TIP-023b): gia hạn link → hạn trước / sau + cảnh báo báo khách; chưa gửi → 409 ở preview.
// 403 cs · sales own → 404 · id lạ 404. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { contract_id: string; code: string };
let lan: string;
const C = () => c.contract_id;
const row = async () => (await m.db()).contract.findUniqueOrThrow({ where: { id: C() } });
/** Dựng trạng thái ở DB (Duyệt & ký cần OTP + LibreOffice — đã kiểm ở contract.approve_and_sign / contracts.test). */
const setStatus = async (status: string, data: Record<string, unknown> = {}) => (await m.db()).contract.update({ where: { id: C() }, data: { status: status as never, ...data } });

beforeAll(async () => {
  m = await matrix('contract.extend_sign_link');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  c = await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
  await setStatus('pending_signature');
  await (await m.db()).channelAccount.create({ data: { id: '0190f000-0000-7000-8000-0000000e0a13', type: 'email', name: 'cskh@spa.vn', externalId: 'cskh-hd2@spa.vn', status: 'connected', settings: {} } });
  await m.seed('contract.send_for_signature', { contract_id: c.contract_id, channel: 'email' });
}, 120_000);
afterAll(() => m?.close());

describe('contract.extend_sign_link', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ contract_id: C(), days: 3 }, m.cs)).status).toBe(403);
    expect((await m.act({ contract_id: C(), days: 3 }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ contract_id: C(), days: 3 }, contract_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const old = (await row()).signLinkExpiresAt!;
    const { preview, done } = await m.confirm({ contract_id: C(), days: 3 });
    expect(preview).toMatchObject({ summary: `${c.code} · Liệu trình HIFU · Chị Lan HĐ`, risk: 'send', changes: [{ entity: 'contract', id: C(), before: { sign_link_expires_at: old.toISOString() }, after: { sign_link_expires_at: expect.any(String) } }], warnings: ['notify_customer'] });
    expect(preview.changes[0].after.sign_link_expires_at).toBe(done.body.data.result.expires_at);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
