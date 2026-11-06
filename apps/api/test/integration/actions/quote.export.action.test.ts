// Ma trận quote.export (TIP-038 pha 3): happy (≤ 50 dòng → 200 + link tải) · 403 thiếu quyền xem · ngoài scope (Sales own không thấy bản ghi
// của Owner → 0 dòng) · nguồn assistant (thẻ xác nhận có số dòng) · agent không được cấp · idempotency (cùng khoá → cùng việc). Luồng
// > 50 dòng / tải / 410 / worker: list-exports.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let seq = 0;
let code = '';
const seed = async (m: Matrix): Promise<string> => {
  const db = await m.db();
  const k = uuidv7();
  await db.contact.create({
    data: { id: k, code: `KH-MX${++seq}`, name: 'Khách ma trận', source: 'manual', ownerUserId: m.h.user },
  });
  const id = uuidv7();
  await db.quote.create({
    data: {
      id,
      code: `BG-MX${seq}`,
      rootQuoteId: id,
      contactId: k,
      ownerUserId: m.h.user,
      status: 'sent',
      total: 1_000_000n,
    },
  });
  return `BG-MX${seq}`;
};

beforeAll(async () => {
  m = await matrix('quote.export');
  code = await seed(m);
}, 120_000);
afterAll(() => m?.close());

describe('quote.export', () => {
  it('happy: Owner xuất báo giá theo bộ lọc → 200, một dòng, link tải có hạn', async () => {
    const r = await m.act({ q: code });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({
      rows: 1,
      download_url: expect.stringMatching(/^\/v1\/data-jobs\/.+\/download$/),
      expires_at: expect.any(String),
    });
  });

  it('403 thiếu quyền xem; ngoài scope → 0 dòng (không lộ bản ghi người khác)', async () => {
    const who = m.cs;
    expect((await m.act({ q: code }, who)).status).toBe(403);
    const r = await m.act({ q: code }, m.sales);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.rows).toBe(0);
  });

  it('nguồn assistant: thẻ xác nhận có số dòng; idempotency cùng khoá → cùng việc', async () => {
    const { preview, done } = await m.confirm({ q: code });
    expect(preview).toMatchObject({ risk: 'write', count: 1 });
    expect(done.status).toBe(200);
    const key = uuidv7();
    const a = await m.actWithKey(key, { q: code });
    const b = await m.actWithKey(key, { q: code });
    expect(b.body.data.result.job_id).toBe(a.body.data.result.job_id);
  });

  it('không cấp cho agent; ô không áp dụng có lý do', () => {
    expect(m.def).toMatchObject({ risk: 'write', agentGrantable: false });
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
