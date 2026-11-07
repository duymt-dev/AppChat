// Ma trận custom_field.define (TIP-023b): preview Trợ lý (định nghĩa mới) → xác nhận · trùng nhãn không dấu → 409 · 403 (sales không có
// crm.fields_manage) · gọi lặp cùng khoá idempotency. Scope: cấu hình workspace. Undo: không khai; trạng thái: không có.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const input = { entity: 'contact', label: 'Size áo', type: 'picklist', options: 'S / M / L' } as const;

beforeAll(async () => {
  m = await matrix('custom_field.define');
}, 120_000);
afterAll(() => m?.close());

describe('custom_field.define', () => {
  it('preview Trợ lý → xác nhận → có định nghĩa', async () => {
    const { preview, done } = await m.confirm(input);
    expect(preview).toEqual({ summary: 'contact · Size áo', risk: 'config', changes: [{ entity: 'custom_field', after: input }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await (await m.db()).customFieldDef.count({ where: { entity: 'contact', key: done.body.data.result.key } })).toBe(1);
  });

  it('403 sales · trùng nhãn → 409 · idempotency', async () => {
    expect((await m.act({ ...input, label: 'Khác' }, m.sales)).status).toBe(403);
    expect((await m.act({ ...input, label: 'size AO' })).status).toBe(409);
    const a = await m.actWithKey('cf-define-idem', { ...input, label: 'Màu yêu thích' });
    expect((await m.actWithKey('cf-define-idem', { ...input, label: 'Màu yêu thích' })).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
