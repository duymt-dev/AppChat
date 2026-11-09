// Ma trận contact.merge (TIP-015e §2, bulk → preview): cặp `<chính>~<phụ>` → bản phụ gộp vào bản chính (identity / ghi chú / việc / cơ hội
// dời, trường trống được lấp), biên nhận + hoàn tác có điều kiện. Cặp sai / chồng chéo → 422; khách ngoài quyền sửa (Sales own) → 404;
// phiên bản lệch → 409 STALE_VERSION; khác người phụ trách → 409 acl_mismatch (không gộp quyền).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let dup: string;

beforeAll(async () => {
  m = await matrix('contact.merge');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Gộp', phone: '0909570001' })).contact_id;
  dup = (await m.seed('contact.create', { full_name: 'Chị Lan Gộp', phone: '0909570002', email: 'lan.gop@khach.vn' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.merge', () => {
  it('cặp sai / chồng chéo → 422 · sales ngoài quyền → 404 · phiên bản lệch → 409', async () => {
    const src = { 'x-action-source': 'assistant' };
    expect((await m.act({ group_ids: ['sai'] }, undefined, src)).status).toBe(422);
    expect((await m.act({ group_ids: [`${lan}~${dup}`, `${dup}~${lan}`] }, undefined, src)).status).toBe(422);
    expect((await m.act({ group_ids: [`${lan}~${dup}`] }, m.sales)).status).toBe(404);
    const stale = await m.act({ group_ids: [`${lan}~${dup}`], expected_versions: { [lan]: 999 } }, undefined, src);
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_VERSION');
  });

  it('preview Trợ lý → xác nhận → undo (biên nhận dùng một lần)', async () => {
    const codes = Object.fromEntries((await (await m.db()).contact.findMany({ where: { id: { in: [lan, dup] } }, select: { id: true, code: true } })).map((c) => [c.id, c.code]));
    const { preview, done } = await m.confirm({ group_ids: [`${lan}~${dup}`] });
    expect(preview).toMatchObject({
      summary: '1',
      risk: 'write',
      count: 1,
      changes: [
        { entity: 'contact', id: dup, before: { code: codes[dup], name: 'Chị Lan Gộp' }, after: { merged_into: codes[lan] } },
        { entity: 'contact', id: lan, before: { email: null }, after: { email: 'lan.gop@khach.vn' } },
      ],
    });
    expect(done.body.data.result).toEqual({ merged: 1 });
    expect((await (await m.db()).contactMergeReceipt.count({ where: { primaryId: lan, state: 'merged' } }))).toBe(1);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    const db = await m.db();
    expect((await db.contact.findUniqueOrThrow({ where: { id: dup } })).deletedAt).toBeNull();
    expect((await db.contact.findUniqueOrThrow({ where: { id: lan } })).email).toBeNull();
    expect((await m.undo(done.body.data.action_log_id)).status).toBeGreaterThanOrEqual(400);
  });

  it('bulk: gọi từ UI cũng phải qua preview kèm số bản ghi', async () => {
    const r = await m.act({ group_ids: [`${lan}~${dup}`] });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(r.body.data.preview.count).toBe(1);
  });
});
