// Ma trận conversation.create_group (TIP-023b SPEC D): risk send → Trợ lý xem trước (tên nhóm · tài khoản · thành viên + cảnh báo mời khách);
// kết quả chỉ là `queued` + request bền + outbox, không có conversation_id. 403 sales (không có inbox.manage) · hội thoại ngoài scope 404 ·
// kênh không có createGroup (webchat) 422 · khác tài khoản 422 · tạm dừng 409 · idempotency (một request). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let zalo: string;
let a: { id: string };
let b: { id: string };
let web: { id: string };
const SRC = { 'x-action-source': 'assistant' };

beforeAll(async () => {
  m = await matrix('conversation.create_group');
  a = await m.conv({ title: 'Chị Lan', channel: 'zalo_personal' });
  zalo = (await m.conv({ title: 'Anh Hùng', channel: 'zalo_personal' })).account;
  b = { id: (await (await m.db()).conversation.findFirstOrThrow({ where: { title: 'Anh Hùng' } })).id };
  web = await m.conv({ title: 'Khách web' });
}, 120_000);
afterAll(() => m?.close());

describe('conversation.create_group', () => {
  it('403 sales · id lạ → 404 · webchat không có createGroup → 422 · khác tài khoản → 422', async () => {
    const i = { channel_account_id: zalo, name: 'Khách VIP', conversation_ids: [a.id, b.id] };
    expect((await m.act(i, m.sales)).status).toBe(403);
    expect((await m.act({ ...i, conversation_ids: [a.id, '0190f000-0000-7000-8000-00000000beef'] }, undefined, SRC)).status).toBe(404);
    const webAcc = (await (await m.db()).conversation.findUniqueOrThrow({ where: { id: web.id } })).channelAccountId;
    expect((await m.act({ ...i, channel_account_id: webAcc, conversation_ids: [web.id] }, undefined, SRC)).body.error.fields).toEqual({ channel_account_id: 'create_group_unsupported' });
    expect((await m.act({ ...i, conversation_ids: [a.id, web.id] }, undefined, SRC)).body.error.fields).toEqual({ conversation_ids: `other_account:${web.id}` });
  });

  it('preview Trợ lý → xác nhận: queued, request bền + outbox, không có hội thoại nhóm', async () => {
    const { preview, done } = await m.confirm({ channel_account_id: zalo, name: ' Khách VIP tháng 11 ', conversation_ids: [a.id, b.id] });
    expect(preview).toEqual({
      summary: 'Khách VIP tháng 11 · zalo_personal · 2',
      risk: 'send',
      count: 2,
      changes: [{ entity: 'conversation', after: { kind: 'group', name: 'Khách VIP tháng 11', channel_account: 'zalo_personal', members: ['Chị Lan', 'Anh Hùng'] } }],
      warnings: ['invites_customers'],
    });
    const r = done.body.data.result;
    expect(r).toEqual({ request_id: expect.any(String), status: 'queued' });
    const t = await m.db();
    expect(await t.conversationGroupRequest.findUniqueOrThrow({ where: { id: r.request_id } })).toMatchObject({ status: 'queued', name: 'Khách VIP tháng 11', conversationId: null, attemptedAt: null });
    expect(await t.outboxEvent.count({ where: { topic: 'channel.group_requested', payload: { path: ['request_id'], equals: r.request_id } } })).toBe(1);
    expect(await t.conversation.count({ where: { kind: 'group' } })).toBe(0);
  });

  it('idempotency: cùng khoá → một request', async () => {
    const i = { channel_account_id: zalo, name: 'Nhóm idem', conversation_ids: [a.id] };
    const r1 = await m.actWithKey('grp-idem', i);
    expect((await m.actWithKey('grp-idem', i)).body.data.result).toEqual(r1.body.data.result);
    expect(await (await m.db()).conversationGroupRequest.count({ where: { name: 'Nhóm idem' } })).toBe(1);
  });

  it('tài khoản tạm dừng → 409', async () => {
    const t = await m.db();
    await t.channelAccount.update({ where: { id: zalo }, data: { pausedAt: m.h.clock.now() } });
    expect((await m.act({ channel_account_id: zalo, name: 'X', conversation_ids: [a.id] }, undefined, SRC)).body.error.fields).toEqual({ channel_account_id: 'paused' });
    await t.channelAccount.update({ where: { id: zalo }, data: { pausedAt: null } });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
