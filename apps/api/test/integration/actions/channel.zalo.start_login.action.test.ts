// Ma trận channel.zalo.start_login (TIP-023b): thêm tài khoản Zalo cá nhân (risk config) → tài khoản mới + cảnh báo quét QR; confirm → tài
// khoản `connecting` (QR do worker — kiểm ở channels test). 403 sales (không có channels.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('channel.zalo.start_login');
  await teamPlan(m);
}, 120_000);
afterAll(() => m?.close());

describe('channel.zalo.start_login', () => {
  it('403 sales', async () => {
    expect((await m.act({ label: 'X' }, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ label: 'Zalo bán hàng' });
    expect(preview).toEqual({ summary: 'Zalo bán hàng', risk: 'config', changes: [{ entity: 'channel_account', after: { type: 'zalo_personal', name: 'Zalo bán hàng' } }], warnings: ['scan_qr'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const id = done.body.data.result.channel_account_id;
    expect((await (await m.db()).channelAccount.findUniqueOrThrow({ where: { id } })).status).toBe('connecting');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
