// Ma trận contract.create_appendix (TIP-030b F3 spec 12): chỉ hợp đồng đã ký (nháp → 409); 403 cs · sales ngoài scope → 404; preview Trợ lý →
// xác nhận; cùng request_key → cùng phụ lục (idempotency nghiệp vụ); content + file_id cùng lúc → 422. Luồng ký thật: contract-appendix.test.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { signedParent } from '../helpers/appendix-seed';

let m: Matrix;
let p: { contact: string; contract: string; code: string };

beforeAll(async () => {
  m = await matrix('contract.create_appendix');
  p = await signedParent(m, '0909310001');
}, 120_000);
afterAll(() => m?.close());

describe('contract.create_appendix', () => {
  it('403 cs · sales ngoài scope → 404 · hợp đồng nháp → 409 · hai nguồn → 422', async () => {
    const input = { contract_id: p.contract, title: 'PL', content: 'x', request_key: 'k-auth' };
    expect((await m.act(input, m.cs)).status).toBe(403);
    expect((await m.act(input, m.sales)).status).toBe(404);
    const draft = await m.seed('contract.create', { contact_id: p.contact, kind: 'service', title: 'Nháp', value: '1000' });
    expect((await m.act({ ...input, contract_id: draft.contract_id })).status).toBe(409);
    expect((await m.act({ ...input, file_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(422);
  });

  it('preview Trợ lý → xác nhận → PL-1; cùng request_key → cùng phụ lục', async () => {
    const input = { contract_id: p.contract, title: 'Bổ sung 2 buổi', content: 'Thêm 2 buổi', value_delta: '-500000', request_key: 'k1' };
    const { preview, done } = await m.confirm(input);
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'appendix', after: { contract: p.code, title: 'Bổ sung 2 buổi', value_delta: '-500000', source: 'content' } }] });
    const r = done.body.data.result;
    expect(r.code).toBe(`${p.code}/PL-1`);
    expect((await m.act(input)).body.data.result.appendix_id).toBe(r.appendix_id);
    expect((await (await m.db()).contractAppendix.findUniqueOrThrow({ where: { id: r.appendix_id } })).valueDelta).toBe(-500000n);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
