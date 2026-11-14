// Ma trận order.file_attach (TIP-032d): happy (staging đã tải cho đúng đơn → kiểm cấu trúc cô lập → liên kết, revision +1, sự kiện) ·
// 403 cs (không order.manage) · scope: sales own đơn người khác → 404, đơn được giao → được · nguồn assistant: xem trước (mã đơn + tên tệp)
// rồi xác nhận · agent: agentGrantable, HTTP từ chối nguồn agent (chỉ worker) · idempotency cùng khoá → cùng biên nhận. Không undo (gỡ là action riêng).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setValidatorEntry } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { handle, seedParents, uploadFor, useBuiltValidator } from '../helpers/commerce-files-fixtures';

let m: Matrix;
let p: Awaited<ReturnType<typeof seedParents>>;
const rev = async (id: string) => (await m.seed('order.files_list', { order_id: id })).revision as number;

beforeAll(async () => {
  useBuiltValidator();
  m = await matrix('order.file_attach');
  p = await seedParents(m, '0909323001');
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await m?.close();
});

describe('order.file_attach', () => {
  it('happy: gắn staging của đúng đơn → biên nhận, revision +1, một sự kiện order.file_attached', async () => {
    const fid = await uploadFor(m, 'order', p.order.order_id);
    const r = await m.act({ order_id: p.order.order_id, source: handle(fid), if_revision: 0 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ file_id: fid, version: 1, revision: 1, reused: false });
    expect(await (await m.db()).outboxEvent.count({ where: { topic: 'order.file_attached' } })).toBe(1);
  });

  it('403: cs không có order.manage', async () => {
    expect((await m.act({ order_id: p.order.order_id, source: handle('0190f000-0000-7000-8000-00000000beef'), if_revision: 0 }, m.cs)).status).toBe(403);
  });

  it('scope: sales own → đơn người khác 404; đơn được giao gắn được', async () => {
    const r = await m.act({ order_id: p.order.order_id, source: handle('0190f000-0000-7000-8000-00000000beef'), if_revision: 1 }, m.sales);
    expect(r.status).toBe(404);
    const fid = await uploadFor(m, 'order', p.salesOrder.order_id, m.sales);
    expect((await m.act({ order_id: p.salesOrder.order_id, source: handle(fid), if_revision: 0 }, m.sales)).status).toBe(200);
  });

  it('nguồn assistant: xem trước mã đơn + tên tệp, xác nhận mới gắn', async () => {
    const fid = await uploadFor(m, 'order', p.order.order_id, undefined, 'phieu-giao.pdf');
    const { preview, done } = await m.confirm({ order_id: p.order.order_id, source: handle(fid), if_revision: await rev(p.order.order_id) });
    expect(preview).toMatchObject({ summary: `${p.order.code} · phieu-giao.pdf`, risk: 'write' });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.reused).toBe(false);
  });

  it('nguồn agent: cấp được cho agent (D51, quyền agent ∩ người ra lệnh ở worker); HTTP không nhận nguồn agent → 422', async () => {
    expect(m.def.agentGrantable).toBe(true);
    const r = await m.act({ order_id: p.order.order_id, source: handle('0190f000-0000-7000-8000-00000000beef'), if_revision: 0 }, undefined, { 'x-action-source': 'agent' });
    expect(r.status).toBe(422);
    expect(r.body.error.fields).toEqual({ 'x-action-source': 'invalid' });
  });

  it('idempotency: cùng khoá → cùng biên nhận, không gắn hai lần', async () => {
    const fid = await uploadFor(m, 'order', p.order.order_id, undefined, 'idem.pdf');
    const inp = { order_id: p.order.order_id, source: handle(fid), if_revision: await rev(p.order.order_id) };
    const a = await m.actWithKey('order-file-attach-idem', inp);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect((await m.actWithKey('order-file-attach-idem', inp)).body.data.result).toEqual(a.body.data.result);
  });

  it('trạng thái: revision lệch → 409 STALE_VERSION; artifact ref không phải artifact của người gọi (id tệp tải lên) → 404, không sao chép', async () => {
    const fid = await uploadFor(m, 'order', p.order.order_id, undefined, 'stale.pdf');
    expect((await m.act({ order_id: p.order.order_id, source: handle(fid), if_revision: 0 })).body.error).toMatchObject({ code: 'STALE_VERSION' });
    const art = await m.act({ order_id: p.order.order_id, source: { kind: 'assistant_artifact_ref', artifact_id: fid, revision: 1 }, if_revision: 0 });
    expect(art.status).toBe(404);
    expect(art.body.error.fields).toEqual({ artifact_id: 'not_found' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
