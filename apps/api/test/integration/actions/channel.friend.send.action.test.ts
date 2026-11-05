// Ma trận channel.friend.send (TIP-014b E — DC nới DC-247): gửi MỘT lời mời kết bạn (inbox.manage, risk send, agentGrantable false). Chỉ
// nguồn `ui` (người bấm xác nhận cảnh báo rủi ro trên web): Trợ lý → 403 kể cả xem trước. Sales (thiếu inbox.manage) → 403. Người lạ → 422;
// đã gửi → 409; trần / ngày (friend_daily_cap) → 429; lời nhắn > 150 → 422. Thành công → 202 + nhật ký gửi.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let acc: string;

let known: string;

beforeAll(async () => {
  m = await matrix('channel.friend.send');
  acc = await account(m, 'zalo_personal', 'Zalo Gửi', { settings: { friend_daily_cap: 2 } });
  const db = await m.db();
  known = '9401';
  for (const ext of [known, '9402', '9403']) {
    const conv = (await m.conv({ channel: 'zalo_personal' })).id;
    await db.conversation.update({ where: { id: conv }, data: { channelAccountId: acc, externalThreadId: ext, kind: 'direct' } });
  }
}, 120_000);
afterAll(() => m?.close());

describe('channel.friend.send', () => {
  it('agentGrantable false · Trợ lý → 403 · sales → 403 (thiếu inbox.manage)', async () => {
    expect(m.def).toMatchObject({ agentGrantable: false, risk: 'send', permission: 'inbox.manage' });
    expect((await m.act({ channel_account_id: acc, external_id: known }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ source: 'human_only' });
    expect((await m.act({ channel_account_id: acc, external_id: known }, m.sales)).status).toBe(403);
  });

  it('người lạ → 422 · lời nhắn > 150 → 422', async () => {
    expect((await m.act({ channel_account_id: acc, external_id: '9499' })).body.error.fields).toEqual({ external_id: 'unknown_identity' });
    expect((await m.act({ channel_account_id: acc, external_id: known, message: 'x'.repeat(151) })).status).toBe(422);
  });

  it('202 + nhật ký gửi; đã gửi → 409; trần 2 / ngày → 429; idempotency', async () => {
    const r = await m.actWithKey('fr-send', { channel_account_id: acc, external_id: known, message: 'Chào anh' });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect((await m.actWithKey('fr-send', { channel_account_id: acc, external_id: known, message: 'Chào anh' })).body.data).toEqual(r.body.data);
    const db = await m.db();
    expect(await db.channelFriendSendLog.count({ where: { channelAccountId: acc } })).toBe(1);
    await db.channelFriend.update({ where: { channelAccountId_externalId: { channelAccountId: acc, externalId: known } }, data: { state: 'outgoing', opStatus: 'confirmed' } });
    expect((await m.act({ channel_account_id: acc, external_id: known })).body.error.fields).toEqual({ external_id: 'already_requested' });
    expect((await m.act({ channel_account_id: acc, external_id: '9402' })).status).toBe(202);
    const capped = await m.act({ channel_account_id: acc, external_id: '9403' });
    expect(capped.status).toBe(429);
    expect(capped.body.error.fields).toEqual({ channel_account_id: 'friend_daily_cap' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
