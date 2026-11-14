// Ma trận channel.pause (TIP-023b): tạm dừng tài khoản (risk config) → tạm dừng trước / sau + cảnh báo ngừng nhận tin; id lạ → 404 ở
// preview. 403 sales (không có channels.manage). Undo: ActionDef không khai (đảo lại bằng channel.resume).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let acc: string;

beforeAll(async () => {
  m = await matrix('channel.pause');
  acc = await account(m, 'zalo_personal', 'Zalo Cửa hàng');
}, 120_000);
afterAll(() => m?.close());

describe('channel.pause', () => {
  it('403 sales · id lạ → 404', async () => {
    expect((await m.act({ channel_account_id: acc }, m.sales)).status).toBe(403);
    expect((await m.act({ channel_account_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ channel_account_id: acc });
    expect(preview).toEqual({ summary: 'Zalo Cửa hàng', risk: 'config', changes: [{ entity: 'channel_account', id: acc, before: { paused: false }, after: { paused: true } }], warnings: ['stops_receiving'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).channelAccount.findUniqueOrThrow({ where: { id: acc } })).pausedAt).not.toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
