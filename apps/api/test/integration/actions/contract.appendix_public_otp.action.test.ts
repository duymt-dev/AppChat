// Ma trận contract.appendix_public_otp (TIP-030b F3 spec 15): action nội bộ của trang ký công khai phụ lục (xin OTP) — chỉ chạy qua bộ chuyển token với capability
// niêm phong. Gọi thẳng /actions bằng Owner / sales / nguồn Trợ lý → 403 (permission `self` + agentGrantable=false không phải rào chắn duy
// nhất); qua trang công khai (POST /v1/public/appendix-sign/:token/…) chạy qua executor. Token chéo / replay / song song: contract-appendix.test.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { ownerSigned, signedParent, zaloOf } from '../helpers/appendix-seed';

let m: Matrix;
let a: { appendix_id: string };
let token: string;
const pub = (path: string, body: unknown) =>
  fetch(`${m.h.base}/v1/public/appendix-sign/${token}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: (await r.json()) as any })); // eslint-disable-line @typescript-eslint/no-explicit-any

beforeAll(async () => {
  m = await matrix('contract.appendix_public_otp');
  const p = await signedParent(m, '0909310008');
  a = await ownerSigned(m, p.contract);
  await zaloOf(m, p.contact);
  const url = (await m.seed('contract.appendix_send', { appendix_id: a.appendix_id, channel: 'zalo_personal' })).sign_url as string;
  token = url.slice(url.indexOf('/sign/appendix/') + 15);
}, 180_000);
afterAll(() => m?.close());

describe('contract.appendix_public_otp', () => {
  it('gọi thẳng /actions: Owner · sales · Trợ lý → 403 (không capability)', async () => {
    expect((await m.act({ appendix_id: a.appendix_id })).status).toBe(403);
    expect((await m.act({ appendix_id: a.appendix_id }, m.sales)).status).toBe(403);
    expect((await m.act({ appendix_id: a.appendix_id }, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
  });

  it('qua trang công khai (token) → chạy qua executor, action_log nguồn system', async () => {
    const r = await pub('otp', {});
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const log = await (await m.db()).actionLog.findFirstOrThrow({ where: { actionId: 'contract.appendix_public_otp' }, orderBy: { createdAt: 'desc' } });
    expect(log).toMatchObject({ source: 'system', actorType: 'system' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
