// Ma trận contract.inspect_file (TIP-030b spec 2, 5, 7): đọc — đề xuất giá trị từ tệp PDF / DOCX đã tải lên; không ghi gì.
// 403 cs (không có contract.draft) · tệp của người khác → 422 forbidden · bytes không phải PDF / DOCX → unsupported_type · DOCX macro → macro.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { badDocx, badPdf, benignDocx, pdf } from '../../../../../fixtures/contracts/files/build-fixtures';
import { matrix, na, type Matrix, type Who } from '../helpers/action-matrix';

let m: Matrix;
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function upload(name: string, body: Buffer, mime: string, who?: Who) {
  const form = new FormData();
  form.set('purpose', 'document');
  form.set('file', new Blob([new Uint8Array(body)], { type: mime }), name);
  const r = await fetch(`${m.h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${who ? who.token : m.h.tokenFor(m.h.user)}` }, body: form });
  return ((await r.json()) as { data?: { file_id: string } }).data?.file_id as string;
}

beforeAll(async () => {
  m = await matrix('contract.inspect_file');
}, 120_000);
afterAll(() => m?.close());

describe('contract.inspect_file', () => {
  it('PDF / DOCX → đề xuất có nguồn; không tạo bản ghi', async () => {
    const f = await upload('hd.docx', benignDocx(), DOCX);
    const r = await m.act({ file_id: f });
    expect(r.status).toBe(200);
    expect(r.body.data.result).toMatchObject({ type: 'docx', extraction: 'ok', fields: { party_b: { value: 'Nguyễn Văn An' }, value: { value: '12500000' }, start_date: { value: '2026-12-01' } } });
    const p = await upload('hd.pdf', pdf({ pages: 3 }), 'application/pdf');
    expect((await m.act({ file_id: p })).body.data.result).toMatchObject({ type: 'pdf', pages: 3 });
    expect(await (await m.db()).contract.count()).toBe(0);
  });

  it('403 cs · tệp người khác → forbidden · .exe đổi đuôi / macro bị chặn ở cổng tải tệp · JavaScript bị từ chối', async () => {
    const f = await upload('hd.pdf', pdf(), 'application/pdf');
    expect((await m.act({ file_id: f }, m.cs)).status).toBe(403);
    expect((await m.act({ file_id: f }, m.sales)).body.error.fields).toEqual({ file_id: 'forbidden' });
    // TIP-045b: .exe đổi đuôi .pdf và gói có macro bị cổng tải tệp chặn trước khi có file_id.
    expect(await upload('x.pdf', badPdf.renamedExe(), 'application/pdf')).toBeUndefined();
    expect(await upload('m.docx', badDocx.macro(), DOCX)).toBeUndefined();
    expect((await m.act({ file_id: await upload('j.pdf', badPdf.javascript(), 'application/pdf') })).body.error.fields).toEqual({ file: 'active_content' });
    expect((await m.act({ file_id: 'not-a-uuid' })).body.error.fields).toEqual({ file_id: 'not_found' });
  });

  it('agent / Trợ lý gọi được (đọc, agentGrantable)', () => {
    expect(m.def).toMatchObject({ risk: 'read', agentGrantable: true, permission: 'contract.draft' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
