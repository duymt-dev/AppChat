// Ma trận contract.appendix_owner_otp (TIP-030b F3 spec 16): step-up OTP riêng của phụ lục — gửi email người ký, băm trên appendix_signer
// business gắn version hiện tại; 403 sales (không contract.sign); nháp → 409; nguồn Trợ lý → 403 (không thẻ xác nhận cho step-up).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { draftAppendix, otpIn, signedParent } from '../helpers/appendix-seed';

let m: Matrix;
let a: { appendix_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contract.appendix_owner_otp');
  const p = await signedParent(m, '0909310005');
  a = await draftAppendix(m, p.contract);
}, 120_000);
afterAll(() => m?.close());

describe('contract.appendix_owner_otp', () => {
  it('nháp → 409 · 403 sales · Trợ lý → 403', async () => {
    expect((await m.act({ appendix_id: a.appendix_id })).body.error.code).toBe('INVALID_TRANSITION');
    await m.seed('contract.appendix_submit', { appendix_id: a.appendix_id });
    expect((await m.act({ appendix_id: a.appendix_id }, m.sales)).status).toBe(403);
    expect((await m.act({ appendix_id: a.appendix_id }, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
  });

  it('UI → mã qua email (che địa chỉ), băm gắn version 1; mã không lưu thô', async () => {
    const r = await m.act({ appendix_id: a.appendix_id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.sent_to).toMatch(/•••/);
    const owner = (await m.h.platform.user.findUniqueOrThrow({ where: { id: m.h.user } })).email;
    const otp = otpIn(m.h.mail.last(owner)?.text)!;
    expect(m.h.mail.last(owner)?.subject).toContain(a.code);
    const s = await (await m.db()).appendixSigner.findFirstOrThrow({ where: { appendixId: a.appendix_id, party: 'business' } });
    expect(s).toMatchObject({ appendixVersion: 1, otpChannel: 'email' });
    expect(s.otpHash).not.toContain(otp);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
