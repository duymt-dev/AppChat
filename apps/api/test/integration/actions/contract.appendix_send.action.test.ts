// Ma trận contract.appendix_send (TIP-030b F3 spec 15): sau khi Owner ký phụ lục — link ký một lần gắn phụ lục + version + digest vào hội
// thoại Zalo của khách; phát lại → link cũ hết hiệu lực; 403 sales; nháp → 409; khách chưa nhắn Zalo → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { draftAppendix, ownerSigned, signedParent, zaloOf } from '../helpers/appendix-seed';

let m: Matrix;
let p: { contact: string; contract: string };

beforeAll(async () => {
  m = await matrix('contract.appendix_send');
  p = await signedParent(m, '0909310007');
}, 120_000);
afterAll(() => m?.close());

describe('contract.appendix_send', () => {
  it('nháp → 409 · 403 sales', async () => {
    const d = await draftAppendix(m, p.contract);
    expect((await m.act({ appendix_id: d.appendix_id, channel: 'zalo_personal' })).body.error.code).toBe('INVALID_TRANSITION');
    expect((await m.act({ appendix_id: d.appendix_id, channel: 'zalo_personal' }, m.sales)).status).toBe(403);
  });

  it('chưa nhắn Zalo → 409; có hội thoại → token gắn version + digest; gửi lại → token cũ hết hiệu lực', async () => {
    const a = await ownerSigned(m, p.contract);
    expect((await m.act({ appendix_id: a.appendix_id, channel: 'zalo_personal' })).status).toBe(409);
    await zaloOf(m, p.contact);
    const { preview, done } = await m.confirm({ appendix_id: a.appendix_id, channel: 'zalo_personal' });
    expect(preview).toMatchObject({ risk: 'send', changes: [{ after: { channel: 'zalo_personal' } }] });
    expect(done.body.data.result.sign_url).toContain('/sign/appendix/');
    const db = await m.db();
    const row = await db.contractAppendix.findUniqueOrThrow({ where: { id: a.appendix_id } });
    const t1 = await db.appendixSignToken.findFirstOrThrow({ where: { appendixId: a.appendix_id } });
    expect(t1).toMatchObject({ appendixVersion: 1, documentHash: row.fileSha256, usedAt: null });
    await m.seed('contract.appendix_send', { appendix_id: a.appendix_id, channel: 'zalo_personal' });
    expect((await db.appendixSignToken.findUniqueOrThrow({ where: { id: t1.id } })).usedAt).not.toBeNull();
  }, 120_000);

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
