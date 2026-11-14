// Ma trận order.file_detach (TIP-032d): happy (đánh dấu gỡ, version +1, revision +1, tệp giữ nguyên, một sự kiện) · 403 cs · scope: sales
// own đơn người khác → 404 · nguồn assistant: xem trước (rủi ro delete, cảnh báo tệp vẫn giữ) rồi xác nhận · idempotency · trạng thái: đã gỡ /
// version lệch → 409, liên kết của đơn khác → 404. Không undo (gắn lại cần tải mới).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setValidatorEntry } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { handle, seedParents, uploadFor, useBuiltValidator } from '../helpers/commerce-files-fixtures';

let m: Matrix;
let p: Awaited<ReturnType<typeof seedParents>>;

/** Gắn một tệp mới vào đơn (qua executor) → attachment_id. */
async function attached(orderId: string, name: string, who?: Matrix['sales']) {
  const fid = await uploadFor(m, 'order', orderId, who, name);
  const revision = (await m.seed('order.files_list', { order_id: orderId }, who)).revision as number;
  return (await m.seed('order.file_attach', { order_id: orderId, source: handle(fid), if_revision: revision }, who)) as { attachment_id: string; file_id: string };
}

beforeAll(async () => {
  useBuiltValidator();
  m = await matrix('order.file_detach');
  p = await seedParents(m, '0909323002');
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await m?.close();
});

describe('order.file_detach', () => {
  it('happy: gỡ → revision +1, tệp giữ nguyên, sự kiện order.file_detached', async () => {
    const a = await attached(p.order.order_id, 'go.pdf');
    const r = await m.act({ order_id: p.order.order_id, attachment_id: a.attachment_id, if_version: 1 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ attachment_id: a.attachment_id, revision: 2 });
    const db = await m.db();
    expect(await db.orderAttachment.findUniqueOrThrow({ where: { id: a.attachment_id } })).toMatchObject({ version: 2, detachedBy: m.h.user });
    expect(await db.file.count({ where: { id: a.file_id } })).toBe(1);
    expect(await db.outboxEvent.count({ where: { topic: 'order.file_detached' } })).toBe(1);
  });

  it('403: cs không có order.manage', async () => {
    const a = await attached(p.order.order_id, 'cs.pdf');
    expect((await m.act({ order_id: p.order.order_id, attachment_id: a.attachment_id, if_version: 1 }, m.cs)).status).toBe(403);
  });

  it('scope: sales own → đơn người khác 404; đơn được giao gỡ được', async () => {
    const a = await attached(p.order.order_id, 'owner.pdf');
    expect((await m.act({ order_id: p.order.order_id, attachment_id: a.attachment_id, if_version: 1 }, m.sales)).status).toBe(404);
    const s = await attached(p.salesOrder.order_id, 'sales.pdf', m.sales);
    expect((await m.act({ order_id: p.salesOrder.order_id, attachment_id: s.attachment_id, if_version: 1 }, m.sales)).status).toBe(200);
  });

  it('nguồn assistant: xem trước delete + cảnh báo tệp vẫn giữ, xác nhận mới gỡ', async () => {
    const a = await attached(p.order.order_id, 'tro-ly.pdf');
    const { preview, done } = await m.confirm({ order_id: p.order.order_id, attachment_id: a.attachment_id, if_version: 1 });
    expect(preview).toMatchObject({ summary: `${p.order.code} · tro-ly.pdf`, risk: 'delete', warnings: ['file_kept'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('idempotency: cùng khoá → cùng kết quả, không gỡ hai lần', async () => {
    const a = await attached(p.order.order_id, 'idem.pdf');
    const inp = { order_id: p.order.order_id, attachment_id: a.attachment_id, if_version: 1 };
    const first = await m.actWithKey('order-file-detach-idem', inp);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect((await m.actWithKey('order-file-detach-idem', inp)).body.data.result).toEqual(first.body.data.result);
  });

  it('trạng thái: version lệch → 409; đã gỡ → 409; liên kết đơn khác → 404', async () => {
    const a = await attached(p.order.order_id, 'stale.pdf');
    expect((await m.act({ order_id: p.order.order_id, attachment_id: a.attachment_id, if_version: 2 })).body.error).toMatchObject({ code: 'STALE_VERSION', fields: { if_version: 'changed' } });
    expect((await m.act({ order_id: p.order.order_id, attachment_id: a.attachment_id, if_version: 1 })).status).toBe(200);
    expect((await m.act({ order_id: p.order.order_id, attachment_id: a.attachment_id, if_version: 2 })).body.error.fields).toEqual({ attachment_id: 'detached' });
    const other = await attached(p.order.order_id, 'khac.pdf');
    expect((await m.act({ order_id: p.salesOrder.order_id, attachment_id: other.attachment_id, if_version: 1 })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
