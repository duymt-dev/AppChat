// Ma trận campaign.audience_import (TIP-037, write, agent ✗): CSV (tên, SĐT, email) → lô id khách thật; dry_run chỉ đếm, không ghi lô;
// preview Trợ lý (số dòng hợp lệ) → xác nhận; sales / cs → 403; tệp người khác → 422 forbidden; idempotency cùng khoá → một lô. Khớp /
// trùng / huỷ nhận / khách người khác: marketing-contract.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
let phone: string;
const CSV = () => ['Tên,SĐT,Email', `A,${phone},`, 'Mới,0911222444,'].join('\n');

async function upload(token: string) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([new Uint8Array(Buffer.from(CSV()))], { type: 'text/csv' }), 'ds.csv');
  const r = await fetch(`${x.m.h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': x.m.h.ws, authorization: `Bearer ${token}` }, body: form });
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}
const batches = async () => (await x.m.db()).campaignAudienceBatch.count();

beforeAll(async () => {
  x = await mkMatrix('campaign.audience_import');
  const k = await x.mk.contact();
  phone = (await (await x.m.db()).contact.findUniqueOrThrow({ where: { id: k } })).phone!;
}, 120_000);
afterAll(() => x?.close());

describe('campaign.audience_import', () => {
  it('dry_run chỉ đếm (không lô); preview Trợ lý → xác nhận → lô 2 khách (1 khớp, 1 tạo mới)', async () => {
    const file = await upload(x.m.h.tokenFor(x.m.h.user));
    const dry = await x.m.act({ file_id: file, dry_run: true });
    expect(dry.status, JSON.stringify(dry.body)).toBe(200);
    expect(dry.body.data.result).toMatchObject({ batch_id: null, rows: 2, valid: 2, created: 0 });
    expect(await batches()).toBe(0);
    const { preview, done } = await x.m.confirm({ file_id: file });
    expect(preview).toMatchObject({ risk: 'write', count: 2 });
    expect(done.body.data.result).toMatchObject({ valid: 2, created: 1 });
    expect(await batches()).toBe(1);
  });

  it('sales / cs 403; tệp người khác → 422 forbidden; idempotency cùng khoá → một lô', async () => {
    const file = await upload(x.m.h.tokenFor(x.m.h.user));
    expect((await x.m.act({ file_id: file }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ file_id: file }, x.m.cs)).status).toBe(403);
    const mgr = await x.m.h.member('manager');
    expect((await x.m.act({ file_id: file, dry_run: true }, mgr)).body.error.fields).toEqual({ file_id: 'forbidden' });
    const n = await batches();
    await x.m.actWithKey('cmp-imp-key', { file_id: file });
    await x.m.actWithKey('cmp-imp-key', { file_id: file });
    expect(await batches()).toBe(n + 1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
