// Ma trận channel.disconnect (TIP-023b): ngắt tài khoản (risk delete) → loại · tên · trạng thái + cảnh báo giữ lịch sử, tài khoản cuối của
// loại kênh; đã ngắt / id lạ → 404 ở preview. 403 sales (không có channels.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let a: string;
let b: string;

beforeAll(async () => {
  m = await matrix('channel.disconnect');
  a = await account(m, 'zalo_personal', 'Zalo 1');
  b = await account(m, 'zalo_personal', 'Zalo 2');
}, 120_000);
afterAll(() => m?.close());

describe('channel.disconnect', () => {
  it('403 sales · id lạ → 404', async () => {
    expect((await m.act({ channel_account_id: a }, m.sales)).status).toBe(403);
    expect((await m.act({ channel_account_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; tài khoản cuối → cảnh báo; đã ngắt → 404', async () => {
    const { preview, done } = await m.confirm({ channel_account_id: a });
    expect(preview).toEqual({ summary: 'Zalo 1', risk: 'delete', changes: [{ entity: 'channel_account', id: a, before: { type: 'zalo_personal', name: 'Zalo 1', status: 'connected' } }], warnings: ['history_kept'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.confirm({ channel_account_id: b })).preview.warnings).toEqual(['history_kept', 'last_account:zalo_personal']);
    expect((await m.act({ channel_account_id: a }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
