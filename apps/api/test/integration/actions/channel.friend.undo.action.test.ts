// Ma trận channel.friend.undo (TIP-014b E): thu hồi lời mời đã gửi (inbox.manage, risk write, agentGrantable false). Chỉ nguồn `ui`;
// sales → 403; không có lời mời đi → 409; thành công → 202 + lệnh queued.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let acc: string;

beforeAll(async () => {
  m = await matrix('channel.friend.undo');
  acc = await account(m, 'zalo_personal', 'Zalo Thu hồi');
  await (await m.db()).channelFriend.create({ data: { channelAccountId: acc, externalId: '9501', state: 'outgoing', updatedAt: m.h.clock.now() } });
}, 120_000);
afterAll(() => m?.close());

describe('channel.friend.undo', () => {
  it('Trợ lý → 403 · sales → 403 · không có lời mời đi → 409', async () => {
    expect(m.def.agentGrantable).toBe(false);
    expect((await m.act({ channel_account_id: acc, external_id: '9501' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act({ channel_account_id: acc, external_id: '9501' }, m.sales)).status).toBe(403);
    expect((await m.act({ channel_account_id: acc, external_id: '9599' })).body.error.fields).toEqual({ external_id: 'no_outgoing_request' });
  });

  it('202 + lệnh queued; idempotency', async () => {
    const r = await m.actWithKey('fr-undo', { channel_account_id: acc, external_id: '9501' });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect((await m.actWithKey('fr-undo', { channel_account_id: acc, external_id: '9501' })).body.data).toEqual(r.body.data);
    expect(await (await m.db()).channelFriend.findUniqueOrThrow({ where: { channelAccountId_externalId: { channelAccountId: acc, externalId: '9501' } } })).toMatchObject({ op: 'undo', opStatus: 'queued', state: 'outgoing' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
