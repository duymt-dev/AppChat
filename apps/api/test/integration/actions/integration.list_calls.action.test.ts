// Ma trận integration.list_calls (TIP-012b P3 §5.1): integrations.manage, read, agentGrantable=false — log lệnh gọi (op, trạng thái,
// mã lý do, độ trễ) theo cursor, không thân request / dữ liệu khách. 403 sales; id lạ → 404; cursor hỏng → 422.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let conn = '';

beforeAll(async () => {
  m = await matrix('integration.list_calls');
  await m.seed('integration.connect', { provider: 'casso', fields: { webhook_secret: 'w', account_number: '9' }, mode: 'sandbox' });
  conn = (await (await m.db()).integrationConnection.findFirstOrThrow({ where: { connectorKey: 'casso' } })).id;
}, 120_000);
afterAll(() => m?.close());

describe('integration.list_calls', () => {
  it('Owner → trang log (biên nhận thăm dò sau kết nối); id lạ → 404; cursor hỏng → 422', async () => {
    const r = await m.act({ connection_id: conn, limit: 10 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.items.map((c: { op: string }) => c.op)).toContain('connection.probe');
    expect(r.body.data.result.items[0]).not.toHaveProperty('outcome');
    expect((await m.act({ connection_id: uuidv7() })).status).toBe(404);
    expect((await m.act({ connection_id: conn, cursor: 'xx' })).status).toBe(422);
  });

  it('403 sales', async () => {
    expect((await m.act({ connection_id: conn }, m.sales)).status).toBe(403);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
