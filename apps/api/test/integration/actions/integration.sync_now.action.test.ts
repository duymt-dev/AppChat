// Ma trận integration.sync_now (TIP-012b P3 §4.2): integrations.manage, write, agentGrantable=false. Owner → accepted (biên nhận
// queued) / unsupported khi adapter không kéo; 403 sales (không quyền, không biên nhận); Trợ lý → preview (write); kết nối lạ → 404.
// Luồng đầy đủ (gộp lượt, kéo + webhook hội tụ, đổi khoá huỷ lượt cũ): integration-detail.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let conn = '';

beforeAll(async () => {
  m = await matrix('integration.sync_now');
  await m.seed('bank_feed.connect', { provider: 'casso', fields: { webhook_secret: 'w', account_number: '8007041027107', api_key: 'k' } });
  conn = (await (await m.db()).integrationConnection.findFirstOrThrow({ where: { connectorKey: 'casso' } })).id;
}, 120_000);
afterAll(() => m?.close());

describe('integration.sync_now', () => {
  it('Owner → accepted + biên nhận queued; kết nối lạ → 404', async () => {
    const r = await m.act({ connection_id: conn });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ status: 'accepted', call: { op: 'bank.pull', status: 'queued' } });
    expect((await m.act({ connection_id: uuidv7() })).status).toBe(404);
  });

  it('403 sales — không tạo biên nhận', async () => {
    const db = await m.db();
    const before = await db.integrationCallLog.count({ where: { op: 'bank.pull' } });
    expect((await m.act({ connection_id: conn }, m.sales)).status).toBe(403);
    expect(await db.integrationCallLog.count({ where: { op: 'bank.pull' } })).toBe(before);
  });

  it('Trợ lý → preview_required (write), không agentGrantable', async () => {
    const r = await m.act({ connection_id: conn }, undefined, { 'x-action-source': 'assistant' });
    expect(r.body.data.status).toBe('preview_required');
    expect(m.def.agentGrantable).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
