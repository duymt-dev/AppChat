// Ma trận contact_opportunity.export (TIP-026b §5): happy (≤ 50 dòng → 200 + link tải) · 403 thiếu crm.export · ngoài scope (Sales own không thấy
// khách của Owner → 0 dòng) · nguồn assistant (thẻ xác nhận có số dòng) · agent không được cấp · idempotency (cùng khoá → cùng việc).
// Tệp thật / cột tiền theo quyền / nhập lại: contact-activity-transfer.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';

beforeAll(async () => {
  m = await matrix('contact_opportunity.export');
  const db = await m.db();
  const id = uuidv7();
  await db.contact.create({ data: { id, code: `KH-MX${id.slice(-6)}`, name: 'Khách ma trận', source: 'manual', ownerUserId: m.h.user } });
  await db.contactOpportunity.create({ data: { id: uuidv7(), contactId: id, title: 'Gói A', amountVnd: 15000000n, createdBy: m.h.user } });
  contact = id;
}, 120_000);
afterAll(() => m?.close());

describe('contact_opportunity.export', () => {
  it('happy: Owner xuất theo khách → 200, một dòng, link tải có hạn', async () => {
    const r = await m.act({ contact_id: contact });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ rows: 1, download_url: expect.stringMatching(/^\/v1\/data-jobs\/.+\/download$/), expires_at: expect.any(String) });
  });

  it('403 thiếu crm.export; ngoài scope → 0 dòng (không lộ bản ghi người khác)', async () => {
    const who = await m.h.member('cs');
    expect((await m.act({ contact_id: contact }, who)).status).toBe(403);
    const r = await m.act({ contact_id: contact }, m.sales);
    expect([403, 200]).toContain(r.status);
    if (r.status === 200) expect(r.body.data.result.rows).toBe(0);
  });

  it('nguồn assistant: thẻ xác nhận có số dòng; idempotency cùng khoá → cùng việc', async () => {
    const { preview, done } = await m.confirm({ contact_id: contact });
    expect(preview).toMatchObject({ risk: 'write', count: 1 });
    expect(done.status).toBe(200);
    const key = uuidv7();
    const a = await m.actWithKey(key, { contact_id: contact });
    const b = await m.actWithKey(key, { contact_id: contact });
    expect(b.body.data.result.job_id).toBe(a.body.data.result.job_id);
  });

  it('không cấp cho agent; ô không áp dụng có lý do', () => {
    expect(m.def).toMatchObject({ risk: 'write', agentGrantable: false });
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
