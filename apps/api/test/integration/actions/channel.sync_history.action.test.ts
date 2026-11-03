// Ma trận channel.sync_history (TIP-023b): lịch sử đồng bộ (risk write) → số ngày trước / sau + cảnh báo đồng bộ khi tài khoản đang chạy; id
// lạ → 404 ở preview. 403 sales (không có channels.manage). Idempotency theo khoá. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let acc: string;

beforeAll(async () => {
  m = await matrix('channel.sync_history');
  acc = await account(m, 'zalo_personal', 'Zalo Cửa hàng');
}, 120_000);
afterAll(() => m?.close());

describe('channel.sync_history', () => {
  it('403 sales · id lạ → 404', async () => {
    expect((await m.act({ channel_account_id: acc, history_days: 7 }, m.sales)).status).toBe(403);
    expect((await m.act({ channel_account_id: '0190f000-0000-7000-8000-00000000beef', history_days: 7 }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ channel_account_id: acc, history_days: 7 });
    expect(preview).toEqual({ summary: 'Zalo Cửa hàng', risk: 'write', changes: [{ entity: 'channel_account', id: acc, before: { history_days: 30 }, after: { history_days: 7 } }], warnings: ['sync:7'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('idempotency', async () => {
    const r = await m.actWithKey('csh-idem', { channel_account_id: acc, history_days: 90 });
    expect((await m.actWithKey('csh-idem', { channel_account_id: acc, history_days: 90 })).body.data).toEqual(r.body.data);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
