// Ma trận invoice.file_attach (TIP-032d): happy (staging đã tải cho đúng đề nghị → kiểm cấu trúc cô lập → liên kết, revision +1, sự kiện) ·
// 403 cs (không invoice.manage) · scope: sales own đề nghị người khác → 404, đề nghị mình phụ trách → được · nguồn assistant: xem trước (mã đề nghị + tên tệp)
// rồi xác nhận · agent: agentGrantable, HTTP từ chối nguồn agent (chỉ worker) · idempotency cùng khoá → cùng biên nhận. Không undo (gỡ là action riêng).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setValidatorEntry } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { handle, seedParents, uploadFor, useBuiltValidator } from '../helpers/commerce-files-fixtures';

let m: Matrix;
let p: Awaited<ReturnType<typeof seedParents>>;
const rev = async (id: string) => (await m.seed('invoice.files_list', { invoice_id: id })).revision as number;

beforeAll(async () => {
  useBuiltValidator();
  m = await matrix('invoice.file_attach');
  p = await seedParents(m, '0909324001');
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await m?.close();
});

describe('invoice.file_attach', () => {
  it('happy: gắn staging của đúng đề nghị → biên nhận, revision +1, một sự kiện invoice.file_attached', async () => {
    const fid = await uploadFor(m, 'invoice', p.invoice.invoice_id);
    const r = await m.act({ invoice_id: p.invoice.invoice_id, source: handle(fid), if_revision: 0 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ file_id: fid, version: 1, revision: 1, reused: false });
    expect(await (await m.db()).outboxEvent.count({ where: { topic: 'invoice.file_attached' } })).toBe(1);
  });

  it('403: cs không có invoice.manage', async () => {
    expect((await m.act({ invoice_id: p.invoice.invoice_id, source: handle('0190f000-0000-7000-8000-00000000beef'), if_revision: 0 }, m.cs)).status).toBe(403);
  });

  it('scope: sales own → đề nghị người khác 404; đề nghị mình phụ trách gắn được', async () => {
    const r = await m.act({ invoice_id: p.invoice.invoice_id, source: handle('0190f000-0000-7000-8000-00000000beef'), if_revision: 1 }, m.sales);
    expect(r.status).toBe(404);
    const fid = await uploadFor(m, 'invoice', p.salesInvoice.invoice_id, m.sales);
    expect((await m.act({ invoice_id: p.salesInvoice.invoice_id, source: handle(fid), if_revision: 0 }, m.sales)).status).toBe(200);
  });

  it('nguồn assistant: xem trước mã đề nghị + tên tệp, xác nhận mới gắn', async () => {
    const fid = await uploadFor(m, 'invoice', p.invoice.invoice_id, undefined, 'phieu-giao.pdf');
    const { preview, done } = await m.confirm({ invoice_id: p.invoice.invoice_id, source: handle(fid), if_revision: await rev(p.invoice.invoice_id) });
    expect(preview).toMatchObject({ summary: `${p.invoice.code} · phieu-giao.pdf`, risk: 'write' });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.reused).toBe(false);
  });

  it('nguồn agent: cấp được cho agent (D51, quyền agent ∩ người ra lệnh ở worker); HTTP không nhận nguồn agent → 422', async () => {
    expect(m.def.agentGrantable).toBe(true);
    const r = await m.act({ invoice_id: p.invoice.invoice_id, source: handle('0190f000-0000-7000-8000-00000000beef'), if_revision: 0 }, undefined, { 'x-action-source': 'agent' });
    expect(r.status).toBe(422);
    expect(r.body.error.fields).toEqual({ 'x-action-source': 'invalid' });
  });

  it('idempotency: cùng khoá → cùng biên nhận, không gắn hai lần', async () => {
    const fid = await uploadFor(m, 'invoice', p.invoice.invoice_id, undefined, 'idem.pdf');
    const inp = { invoice_id: p.invoice.invoice_id, source: handle(fid), if_revision: await rev(p.invoice.invoice_id) };
    const a = await m.actWithKey('invoice-file-attach-idem', inp);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect((await m.actWithKey('invoice-file-attach-idem', inp)).body.data.result).toEqual(a.body.data.result);
  });

  it('trạng thái: revision lệch → 409 STALE_VERSION; nguồn artifact chưa cài → 422 rõ ràng', async () => {
    const fid = await uploadFor(m, 'invoice', p.invoice.invoice_id, undefined, 'stale.pdf');
    expect((await m.act({ invoice_id: p.invoice.invoice_id, source: handle(fid), if_revision: 0 })).body.error).toMatchObject({ code: 'STALE_VERSION' });
    const art = await m.act({ invoice_id: p.invoice.invoice_id, source: { kind: 'assistant_artifact_ref', artifact_id: fid, revision: 1 }, if_revision: 0 });
    expect(art.body.error.fields).toEqual({ source: 'artifact_copy_unavailable' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
