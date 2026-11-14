// Ma trận order.files_list (TIP-032d): happy (liên kết sống, metadata an toàn — không storage key / URL, revision, can_attach) · 403 cs
// (không order.view) · scope: sales own đơn người khác → 404, đơn được giao → thấy · nguồn assistant chạy ngay (risk read) · phân trang
// keyset limit / cursor. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setValidatorEntry } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { handle, seedParents, uploadFor, useBuiltValidator } from '../helpers/commerce-files-fixtures';

let m: Matrix;
let p: Awaited<ReturnType<typeof seedParents>>;
const files: string[] = [];

beforeAll(async () => {
  useBuiltValidator();
  m = await matrix('order.files_list');
  p = await seedParents(m, '0909323003');
  for (const name of ['mot.pdf', 'hai.pdf', 'ba.pdf']) {
    m.h.clock.advance(1000);
    const fid = await uploadFor(m, 'order', p.order.order_id, undefined, name);
    const revision = (await m.act({ order_id: p.order.order_id })).body.data.result.revision as number;
    await m.seed('order.file_attach', { order_id: p.order.order_id, source: handle(fid), if_revision: revision });
    files.push(fid);
  }
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await m?.close();
});

describe('order.files_list', () => {
  it('happy: mới nhất trước, metadata an toàn, revision + can_attach', async () => {
    const r = await m.act({ order_id: p.order.order_id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ revision: 3, can_attach: true, next_cursor: null });
    expect(r.body.data.result.files.map((f: { name: string }) => f.name)).toEqual(['ba.pdf', 'hai.pdf', 'mot.pdf']);
    expect(r.body.data.result.files[0]).toMatchObject({ file_id: files[2], mime: 'application/pdf', kind: 'user_attachment', version: 1, available: true, can_detach: true });
    expect(JSON.stringify(r.body)).not.toMatch(/storage|sig=|"url"/);
  });

  it('403: cs không có order.view', async () => {
    expect((await m.act({ order_id: p.order.order_id }, m.cs)).status).toBe(403);
  });

  it('scope: sales own → đơn người khác 404 (như không tồn tại); đơn được giao → thấy', async () => {
    const r = await m.act({ order_id: p.order.order_id }, m.sales);
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
    expect((await m.act({ order_id: p.salesOrder.order_id }, m.sales)).body.data.result).toMatchObject({ files: [], can_attach: true });
    expect((await m.act({ order_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('nguồn assistant: chạy ngay (risk read)', async () => {
    expect((await m.act({ order_id: p.order.order_id }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('phân trang keyset: limit 2 → cursor → trang cuối', async () => {
    const p1 = (await m.act({ order_id: p.order.order_id, limit: 2 })).body.data.result;
    expect(p1.files.map((f: { name: string }) => f.name)).toEqual(['ba.pdf', 'hai.pdf']);
    const p2 = (await m.act({ order_id: p.order.order_id, limit: 2, cursor: p1.next_cursor })).body.data.result;
    expect(p2).toMatchObject({ next_cursor: null });
    expect(p2.files.map((f: { name: string }) => f.name)).toEqual(['mot.pdf']);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
