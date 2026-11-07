// Ma trận integration.get (TIP-012b P3 §5.1): integrations.manage, read, agentGrantable=false — cùng reader với GET
// /v1/integrations/connections/:id (Trợ lý thấy đúng trạng thái biên nhận). Không bí mật; 403 sales; id lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let conn = '';

beforeAll(async () => {
  m = await matrix('integration.get');
  await m.seed('integration.connect', { provider: 'casso', fields: { webhook_secret: 'wh_SECRET', account_number: '9', api_key: 'ak_SECRET' }, mode: 'sandbox' });
  conn = (await (await m.db()).integrationConnection.findFirstOrThrow({ where: { connectorKey: 'casso' } })).id;
}, 120_000);
afterAll(() => m?.close());

describe('integration.get', () => {
  it('Owner (ui / assistant) → chi tiết sandbox, không bí mật; id lạ → 404', async () => {
    const r = await m.act({ connection_id: conn }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ id: conn, mode: 'sandbox', health: 'sandbox' });
    expect(JSON.stringify(r.body)).not.toMatch(/SECRET/);
    expect((await m.act({ connection_id: uuidv7() })).status).toBe(404);
  });

  it('403 sales', async () => {
    expect((await m.act({ connection_id: conn }, m.sales)).status).toBe(403);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
