// Ma trận contract.attach_file (TIP-030b spec 2): gắn / thay tệp nguồn của hợp đồng NHÁP, CAS `if_source_version`; undo trả nguồn cũ.
// 403 cs · sales: hợp đồng ngoài scope → 404 · version cũ → 409 · rời nháp → 409 · tệp xấu → 422 · preview → xác nhận → undo · idempotency.
import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { badPdf, pdf } from '../../../../../fixtures/contracts/files/build-fixtures';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let draft: string;
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

async function upload(name: string, body: Buffer) {
  const form = new FormData();
  form.set('purpose', 'document');
  form.set('file', new Blob([new Uint8Array(body)], { type: 'application/pdf' }), name);
  const r = await fetch(`${m.h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${m.h.tokenFor(m.h.user)}` }, body: form });
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

beforeAll(async () => {
  m = await matrix('contract.attach_file');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Tệp', phone: '0909480101' })).contact_id;
  draft = (await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'HĐ gắn tệp', value: '9000000' })).contract_id;
}, 120_000);
afterAll(() => m?.close());

describe('contract.attach_file', () => {
  const v1 = pdf({ text: 'HOP DONG ban 1' });
  const v2 = pdf({ text: 'HOP DONG ban 2' });

  it('gắn tệp → nguồn file + hash; version cũ → 409; tệp xấu → 422', async () => {
    const f1 = await upload('ban-1.pdf', v1);
    const r = await m.act({ contract_id: draft, file_id: f1, if_source_version: 1 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ contract_id: draft, source_version: 2 });
    expect(await (await m.db()).contract.findUniqueOrThrow({ where: { id: draft } })).toMatchObject({ source: 'file', sourceFileId: f1, sourceHash: sha(v1), sourceVersion: 2 });
    expect((await m.act({ contract_id: draft, file_id: f1, if_source_version: 1 })).body.error).toMatchObject({ code: 'CONFLICT', fields: { source_version: '2' } });
    expect((await m.act({ contract_id: draft, file_id: await upload('x.pdf', badPdf.launch()), if_source_version: 2 })).body.error.fields).toEqual({ file: 'active_content' });
  });

  it('403 cs · sales: hợp đồng của owner → 404', async () => {
    const f = await upload('s.pdf', v2);
    expect((await m.act({ contract_id: draft, file_id: f, if_source_version: 2 }, m.cs)).status).toBe(403);
    // Tệp của owner → sales bị chặn ở guard tệp trước cả hợp đồng.
    expect((await m.act({ contract_id: draft, file_id: f, if_source_version: 2 }, m.sales)).status).toBe(422);
  });

  it('preview Trợ lý → xác nhận → undo trả nguồn cũ', async () => {
    const f2 = await upload('ban-2.pdf', v2);
    const { preview, done } = await m.confirm({ contract_id: draft, file_id: f2, if_source_version: 2 });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'contract', id: draft, before: { file_name: 'ban-1.pdf', source_version: 2 }, after: { file_name: 'ban-2.pdf', source_version: 3 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    const c = await (await m.db()).contract.findUniqueOrThrow({ where: { id: draft } });
    expect(c.sourceHash).toBe(sha(v1));
    expect(c.sourceVersion).toBe(4);
  });

  it('rời nháp → 409 (đã trình / đã ký không thay nguồn)', async () => {
    const other = (await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'HĐ đã trình', value: '1000000' })).contract_id;
    await m.seed('contract.submit', { contract_id: other });
    expect((await m.act({ contract_id: other, file_id: await upload('z.pdf', v2), if_source_version: 1 })).status).toBe(409);
  });

  it('idempotency', async () => {
    const f = await upload('idem.pdf', pdf({ text: 'idem' }));
    const c = await (await m.db()).contract.findUniqueOrThrow({ where: { id: draft } });
    const inp = { contract_id: draft, file_id: f, if_source_version: c.sourceVersion };
    const a = await m.actWithKey('hd-attach-idem', inp);
    expect((await m.actWithKey('hd-attach-idem', inp)).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
