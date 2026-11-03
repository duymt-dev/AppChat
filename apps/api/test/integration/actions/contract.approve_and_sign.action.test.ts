// Ma trận contract.approve_and_sign (TIP-023b): Duyệt & ký (risk money) → trạng thái + giá trị + cảnh báo ký điện tử bằng OTP email của
// chính Owner; preview không kiểm OTP / không render. Xác nhận với OTP thật (MemoryMailProvider) + LibreOffice thật → pending_signature.
// 403 sales (không có contract.sign) · id lạ 404 · OTP sai → 422 OTP_INVALID. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { call } from '../setup';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { contract_id: string; code: string };
let ownerEmail: string;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const C = () => c.contract_id;

beforeAll(async () => {
  m = await matrix('contract.approve_and_sign');
  ownerEmail = (await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } })).email;
  const lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  c = await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
  await m.seed('contract.submit', { contract_id: c.contract_id });
}, 120_000);
afterAll(() => m?.close());

describe('contract.approve_and_sign', () => {
  it('403 sales · id lạ 404 · OTP sai 422', async () => {
    expect((await m.act({ contract_id: C(), otp: '000000', signature_png: PNG }, m.sales)).status).toBe(403);
    expect((await m.act({ contract_id: '0190f000-0000-7000-8000-00000000beef', otp: '000000', signature_png: PNG })).status).toBe(404);
    expect((await call(m.h, `/contracts/${C()}/sign-otp`, {})).status).toBe(200);
    expect((await m.act({ contract_id: C(), otp: '000000', signature_png: PNG })).body.error.code).toBe('OTP_INVALID');
  });

  it('preview Trợ lý → xác nhận (OTP email của Owner)', async () => {
    expect((await call(m.h, `/contracts/${C()}/sign-otp`, {})).status).toBe(200);
    const otp = /\b(\d{6})\b/.exec(m.h.mail.last(ownerEmail)?.text ?? '')![1]!;
    const { preview, done } = await m.confirm({ contract_id: C(), otp, signature_png: PNG });
    expect(preview).toEqual({
      summary: `${c.code} · Liệu trình HIFU · Chị Lan HĐ · 18.000.000₫`,
      risk: 'money',
      changes: [{ entity: 'contract', id: C(), before: { status: 'pending_approval', signed_by: null }, after: { status: 'pending_signature', signed_by: 'business' } }],
      warnings: ['e_signature:otp_email'],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).contract.findUniqueOrThrow({ where: { id: C() } })).status).toBe('pending_signature');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
