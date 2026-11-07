// Ma trận channel.reconnect (TIP-023b): quét lại QR (risk config) → trạng thái → connecting + cảnh báo quét; kênh không đăng nhập QR (email) →
// 409, id lạ → 404 ở preview. 403 sales (không có channels.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let zalo: string;
let mail: string;

beforeAll(async () => {
  m = await matrix('channel.reconnect');
  zalo = await account(m, 'zalo_personal', 'Zalo Cửa hàng', { status: 'expired' });
  mail = await account(m, 'email', 'Hộp thư');
}, 120_000);
afterAll(() => m?.close());

describe('channel.reconnect', () => {
  it('403 sales · id lạ → 404 · email → 409', async () => {
    const src = { 'x-action-source': 'assistant' };
    expect((await m.act({ channel_account_id: zalo }, m.sales)).status).toBe(403);
    expect((await m.act({ channel_account_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, src)).status).toBe(404);
    expect((await m.act({ channel_account_id: mail }, undefined, src)).status).toBe(409);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ channel_account_id: zalo });
    expect(preview).toEqual({ summary: 'Zalo Cửa hàng', risk: 'config', changes: [{ entity: 'channel_account', id: zalo, before: { status: 'expired' }, after: { status: 'connecting' } }], warnings: ['scan_qr'] });
    expect(done.body.data.result).toEqual({ channel_account_id: zalo, status: 'connecting' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
