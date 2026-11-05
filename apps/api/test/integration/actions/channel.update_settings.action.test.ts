// Ma trận channel.update_settings (TIP-023b): cấu hình tài khoản kênh (risk config) → trước / sau chỉ trường đổi; agent lạ / tài khoản lạ →
// 404 ở preview. 403 sales (không có channels.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let acc: string;

beforeAll(async () => {
  m = await matrix('channel.update_settings');
  acc = await account(m, 'zalo_personal', 'Zalo Cửa hàng');
}, 120_000);
afterAll(() => m?.close());

describe('channel.update_settings', () => {
  it('403 sales · agent lạ / tài khoản lạ → 404', async () => {
    const src = { 'x-action-source': 'assistant' };
    expect((await m.act({ channel_account_id: acc, patch: { ai_mode: 'off' } }, m.sales)).status).toBe(403);
    expect((await m.act({ channel_account_id: acc, patch: { agent_id: '0190f000-0000-7000-8000-00000000beef' } }, undefined, src)).body.error.fields).toEqual({ agent_id: 'not_found' });
    expect((await m.act({ channel_account_id: '0190f000-0000-7000-8000-00000000beef', patch: {} }, undefined, src)).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ channel_account_id: acc, patch: { name: 'Zalo CSKH', ai_mode: 'off', assign_mode: 'least_busy', greeting: 'Chào bạn' } });
    expect(preview).toEqual({
      summary: 'Zalo Cửa hàng',
      risk: 'config',
      changes: [{ entity: 'channel_account', id: acc, before: { name: 'Zalo Cửa hàng', ai_mode: 'auto', assign_mode: 'round_robin', greeting: '' }, after: { name: 'Zalo CSKH', ai_mode: 'off', assign_mode: 'least_busy', greeting: 'Chào bạn' } }],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).channelAccount.findUniqueOrThrow({ where: { id: acc } })).name).toBe('Zalo CSKH');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
