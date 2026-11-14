// Ma trận doc_template.search (TIP-023b R2): happy (bỏ dấu, lọc loại, không trả HTML / tệp) · 403 (sales không có documents.manage) ·
// nguồn assistant. Mẫu chứng từ là cấu hình workspace, không có data scope. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let spa: string;

beforeAll(async () => {
  m = await matrix('doc_template.search');
  spa = (await m.seed('doc_template.create', { kind: 'contract', name: 'Hợp đồng dịch vụ spa', source: 'rich', body: '<p>{{customer.name}}</p>' })).template_id;
  await m.seed('doc_template.create', { kind: 'quote', name: 'Báo giá chuẩn', source: 'rich', body: '<p>{{customer.name}}</p>' });
}, 120_000);
afterAll(() => m?.close());

describe('doc_template.search', () => {
  it('happy: bỏ dấu, lọc loại, không trả HTML / tệp', async () => {
    const r = await m.act({ q: 'dich vu spa' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.templates).toEqual([{ id: spa, name: 'Hợp đồng dịch vụ spa', kind: 'contract', version: 1, is_default: expect.any(Boolean) }]);
    const quotes = (await m.act({ kind: 'quote' })).body.data.result.templates;
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes.every((t: { kind: string }) => t.kind === 'quote')).toBe(true);
  });

  it('403: sales không có documents.manage', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
