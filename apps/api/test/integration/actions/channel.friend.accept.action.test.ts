// Ma trận channel.friend.accept (TIP-014b E — DC nới DC-247): nhận MỘT lời mời kết bạn tới (inbox.reply, risk write,
// agentGrantable false). Chỉ nguồn `ui`: Trợ lý / nguồn khác → 403 human_only (kể cả xem trước). Không có lời mời → 409; kênh không có bạn bè
// (email) → 422; tài khoản tạm dừng → 409; id lạ → 404. Thành công → 202 job_accepted + lệnh queued (chưa đổi state tới khi ACK).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let acc: string;

beforeAll(async () => {
  m = await matrix('channel.friend.accept');
  acc = await account(m, 'zalo_personal', 'Zalo Bạn bè');
  await (await m.db()).channelFriend.create({ data: { channelAccountId: acc, externalId: '9301', state: 'incoming', incomingAt: m.h.clock.now(), updatedAt: m.h.clock.now() } });
  await (await m.db()).channelFriend.create({ data: { channelAccountId: acc, externalId: '9302', state: 'incoming', incomingAt: m.h.clock.now(), updatedAt: m.h.clock.now() } });
}, 120_000);
afterAll(() => m?.close());

describe('channel.friend.accept', () => {
  it('agentGrantable false · Trợ lý → 403 human_only · cs (có inbox.reply) chạy được', async () => {
    expect(m.def.agentGrantable).toBe(false);
    const r = await m.act({ channel_account_id: acc, external_id: '9301' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status).toBe(403);
    expect(r.body.error.fields).toEqual({ source: 'human_only' });
    expect((await m.act({ channel_account_id: acc, external_id: '9302' }, m.cs)).status).toBe(202);
  });

  it('id lạ → 404 · email → 422 · tạm dừng → 409 · không có lời mời → 409', async () => {
    expect((await m.act({ channel_account_id: '0190f000-0000-7000-8000-00000000beef', external_id: '9301' })).status).toBe(404);
    const mail = await account(m, 'email', 'Hộp thư');
    expect((await m.act({ channel_account_id: mail, external_id: '9301' })).body.error.fields).toEqual({ channel_account_id: 'friends_unsupported' });
    const paused = await account(m, 'zalo_personal', 'Zalo dừng', { paused: true });
    expect((await m.act({ channel_account_id: paused, external_id: '9301' })).body.error.fields).toEqual({ channel_account_id: 'not_running' });
    expect((await m.act({ channel_account_id: acc, external_id: '9399' })).body.error.fields).toEqual({ external_id: 'no_incoming_request' });
  });

  it('202 + lệnh queued; state chưa đổi tới khi ACK; lệnh mở → 409; idempotency', async () => {
    const r = await m.actWithKey('fr-accept', { channel_account_id: acc, external_id: '9301' });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(r.body.data).toMatchObject({ status: 'job_accepted', status_url: `/v1/settings/channels/${acc}/friends/9301` });
    expect((await m.actWithKey('fr-accept', { channel_account_id: acc, external_id: '9301' })).body.data).toEqual(r.body.data);
    const f = await (await m.db()).channelFriend.findUniqueOrThrow({ where: { channelAccountId_externalId: { channelAccountId: acc, externalId: '9301' } } });
    expect(f).toMatchObject({ state: 'incoming', op: 'accept', opStatus: 'queued' });
    expect((await m.act({ channel_account_id: acc, external_id: '9301' })).body.error.fields).toEqual({ external_id: 'operation_pending' });
    // Sau ACK nhà cung cấp state mới là 'friend' (kiểm ở integration channel-friends).
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
