// Ma trận integration.form_schema (TIP-023c G3, DEF-012-1): trường form theo manifest (bí mật / tuỳ chọn), "Sắp có" → testable false,
// provider lạ → 404; 403 sales (không có integrations.manage). Undo / idempotency / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('integration.form_schema');
}, 120_000);
afterAll(() => m?.close());

describe('integration.form_schema', () => {
  it('happy: trường theo manifest, không giá trị credential', async () => {
    const r = await m.act({ provider: 'sepay' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({
      provider: 'sepay',
      name: 'SePay',
      status: 'ga',
      auth_kind: 'api_key',
      fields: [
        { key: 'api_key', secret: true, optional: false, type: 'string' },
        { key: 'account_number', secret: false, optional: false, type: 'string' },
      ],
      testable: true,
    });
    expect((await m.act({ provider: 'kiotviet' })).body.data.result).toMatchObject({ status: 'coming_soon', fields: [], testable: false });
  });

  it('403 sales · provider lạ → 404', async () => {
    expect((await m.act({ provider: 'sepay' }, m.sales)).status).toBe(403);
    expect((await m.act({ provider: 'nope' })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
