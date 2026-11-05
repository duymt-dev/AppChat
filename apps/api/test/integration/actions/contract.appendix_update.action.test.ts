// Ma trận contract.appendix_update (TIP-030b F3 spec 13): chỉ nháp, CAS if_version (cũ → 409 kèm version hiện tại), version +1 làm token /
// OTP cũ hết hiệu lực; 403 cs; trình duyệt rồi → INVALID_TRANSITION.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { draftAppendix, signedParent } from '../helpers/appendix-seed';

let m: Matrix;
let a: { appendix_id: string };

beforeAll(async () => {
  m = await matrix('contract.appendix_update');
  const p = await signedParent(m, '0909310002');
  a = await draftAppendix(m, p.contract);
}, 120_000);
afterAll(() => m?.close());

describe('contract.appendix_update', () => {
  it('403 cs · version cũ → 409', async () => {
    expect((await m.act({ appendix_id: a.appendix_id, if_version: 1, patch: { title: 'x' } }, m.cs)).status).toBe(403);
    expect((await m.act({ appendix_id: a.appendix_id, if_version: 9, patch: { title: 'x' } })).body.error.fields).toEqual({ version: '1' });
  });

  it('preview Trợ lý → xác nhận → version 2; OTP cũ bị xoá; sau trình duyệt → 409', async () => {
    const db = await m.db();
    await db.appendixSigner.create({ data: { id: '0190f000-0000-7000-8000-0000000a0001', appendixId: a.appendix_id, party: 'business', appendixVersion: 1, otpHash: 'h', otpExpiresAt: new Date(Date.now() + 60_000) } });
    const { preview, done } = await m.confirm({ appendix_id: a.appendix_id, if_version: 1, patch: { title: 'Bổ sung 3 buổi', value_delta: null } });
    expect(preview.changes[0]).toMatchObject({ entity: 'appendix', after: { title: 'Bổ sung 3 buổi', value_delta: null } });
    expect(done.body.data.result).toEqual({ appendix_id: a.appendix_id, status: 'draft', version: 2 });
    expect((await db.appendixSigner.findFirstOrThrow({ where: { appendixId: a.appendix_id } })).otpHash).toBeNull();
    await m.seed('contract.appendix_submit', { appendix_id: a.appendix_id });
    expect((await m.act({ appendix_id: a.appendix_id, if_version: 2, patch: { title: 'y' } })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
