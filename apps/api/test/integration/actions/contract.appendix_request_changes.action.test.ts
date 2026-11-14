// Ma trận contract.appendix_request_changes (TIP-030b F3 spec 13): pending_approval → draft + lý do vào nhật ký phụ lục; cs (không có
// contract.review) → 403; nháp → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { draftAppendix, signedParent } from '../helpers/appendix-seed';

let m: Matrix;
let a: { appendix_id: string };

beforeAll(async () => {
  m = await matrix('contract.appendix_request_changes');
  const p = await signedParent(m, '0909310004');
  a = await draftAppendix(m, p.contract);
}, 120_000);
afterAll(() => m?.close());

describe('contract.appendix_request_changes', () => {
  it('nháp → 409 · 403 cs', async () => {
    expect((await m.act({ appendix_id: a.appendix_id })).body.error.code).toBe('INVALID_TRANSITION');
    expect((await m.act({ appendix_id: a.appendix_id }, m.cs)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận → draft, lý do ghi nhật ký', async () => {
    await m.seed('contract.appendix_submit', { appendix_id: a.appendix_id });
    const { preview, done } = await m.confirm({ appendix_id: a.appendix_id, reason: ' Sai số buổi ' });
    expect(preview.changes[0]).toMatchObject({ after: { status: 'draft', reason: 'Sai số buổi' } });
    expect(done.body.data.result.status).toBe('draft');
    const e = await (await m.db()).appendixSignatureEvent.findFirstOrThrow({ where: { appendixId: a.appendix_id, type: 'changes_requested' } });
    expect(e.meta).toEqual({ reason: 'Sai số buổi' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
