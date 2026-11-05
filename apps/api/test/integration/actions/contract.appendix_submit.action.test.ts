// Ma trận contract.appendix_submit (TIP-030b F3 spec 13): nháp → pending_approval + thông báo người có contract.sign; 403 cs; trình lại → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { draftAppendix, signedParent } from '../helpers/appendix-seed';

let m: Matrix;
let a: { appendix_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contract.appendix_submit');
  const p = await signedParent(m, '0909310003');
  a = await draftAppendix(m, p.contract);
}, 120_000);
afterAll(() => m?.close());

describe('contract.appendix_submit', () => {
  it('403 cs · id lạ → 404', async () => {
    expect((await m.act({ appendix_id: a.appendix_id }, m.cs)).status).toBe(403);
    expect((await m.act({ appendix_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → pending_approval + notify; trình lại → 409', async () => {
    const { preview, done } = await m.confirm({ appendix_id: a.appendix_id });
    expect(preview.changes[0]).toMatchObject({ entity: 'appendix', before: { status: 'draft' }, after: { status: 'pending_approval' } });
    expect(done.body.data.result.status).toBe('pending_approval');
    const ev = await (await m.db()).outboxEvent.findFirstOrThrow({ where: { topic: 'notify.requested' }, orderBy: { createdAt: 'desc' } });
    expect(ev.payload).toMatchObject({ kind: 'contract_approval', params: { code: a.code } });
    expect((await m.act({ appendix_id: a.appendix_id })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
