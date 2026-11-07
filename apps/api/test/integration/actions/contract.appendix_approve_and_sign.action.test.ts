// Ma trận contract.appendix_approve_and_sign (TIP-030b F3 spec 16): Owner ký bằng OTP của chính phụ lục (OTP sai đếm lượt), PDF trang phụ
// lục render thật + đóng băng digest → pending_signature; 403 sales; nháp → 409; OTP dùng một lần; preview Trợ lý risk money.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { PNG, draftAppendix, otpIn, signedParent } from '../helpers/appendix-seed';

let m: Matrix;
let a: { appendix_id: string };
let owner: string;

beforeAll(async () => {
  m = await matrix('contract.appendix_approve_and_sign');
  owner = (await m.h.platform.user.findUniqueOrThrow({ where: { id: m.h.user } })).email;
  const p = await signedParent(m, '0909310006');
  a = await draftAppendix(m, p.contract);
}, 120_000);
afterAll(() => m?.close());

describe('contract.appendix_approve_and_sign', () => {
  it('nháp → 409 · 403 sales · chưa xin OTP → OTP_INVALID', async () => {
    const input = { appendix_id: a.appendix_id, if_version: 1, otp: '123456', signature_png: PNG };
    expect((await m.act(input)).body.error.code).toBe('INVALID_TRANSITION');
    await m.seed('contract.appendix_submit', { appendix_id: a.appendix_id });
    expect((await m.act(input, m.sales)).status).toBe(403);
    expect((await m.act(input)).body.error.code).toBe('OTP_INVALID');
  });

  it('OTP sai → còn lượt; đúng → pending_signature + digest; OTP dùng lại → từ chối', async () => {
    await m.seed('contract.appendix_owner_otp', { appendix_id: a.appendix_id });
    const otp = otpIn(m.h.mail.last(owner)?.text)!;
    const bad = await m.act({ appendix_id: a.appendix_id, if_version: 1, otp: otp === '000000' ? '111111' : '000000', signature_png: PNG });
    expect(bad.body.error).toMatchObject({ code: 'OTP_INVALID', message: '4' });
    const ok = await m.act({ appendix_id: a.appendix_id, if_version: 1, otp, signature_png: PNG });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect(ok.body.data.result).toEqual({ appendix_id: a.appendix_id, status: 'pending_signature', version: 1 });
    const db = await m.db();
    const row = await db.contractAppendix.findUniqueOrThrow({ where: { id: a.appendix_id } });
    expect(row.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    expect((await db.file.findUniqueOrThrow({ where: { id: row.fileId! } })).sha256).toBe(row.fileSha256);
    expect((await m.act({ appendix_id: a.appendix_id, if_version: 1, otp, signature_png: PNG })).status).toBe(409);
  }, 120_000);

  it('preview Trợ lý → risk money, cảnh báo OTP email', async () => {
    const p2 = await signedParent(m, '0909310016');
    const b = await draftAppendix(m, p2.contract);
    await m.seed('contract.appendix_submit', { appendix_id: b.appendix_id });
    const pv = await m.act({ appendix_id: b.appendix_id, if_version: 1, otp: '123456', signature_png: PNG }, undefined, { 'x-action-source': 'assistant' });
    expect(pv.body.data.preview).toMatchObject({ risk: 'money', warnings: ['e_signature:otp_email'] });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
