// Ma trận channel.sync_contacts (TIP-014b D3): đồng bộ danh bạ (risk write, channels.manage, không cho agent) → 202 job_accepted + status_url
// `/v1/settings/channels/:id/contact-syncs/:syncId`; preview ghi lần đồng bộ + cảnh báo ảnh chụp riêng 24 giờ. 403 sales (không có
// channels.manage). Email (không có danh bạ phía kênh) → 422; tài khoản tạm dừng → 409; id lạ → 404. Idempotency theo khoá.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let acc: string;

beforeAll(async () => {
  m = await matrix('channel.sync_contacts');
  acc = await account(m, 'zalo_personal', 'Zalo Danh bạ');
}, 120_000);
afterAll(() => m?.close());

describe('channel.sync_contacts', () => {
  it('403 sales · id lạ → 404 · email → 422 · tạm dừng → 409', async () => {
    expect((await m.act({ channel_account_id: acc }, m.sales)).status).toBe(403);
    expect((await m.act({ channel_account_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    const mail = await account(m, 'email', 'Hộp thư');
    expect((await m.act({ channel_account_id: mail })).body.error.fields).toEqual({ channel_account_id: 'contacts_unsupported' });
    const paused = await account(m, 'zalo_personal', 'Zalo dừng', { paused: true });
    const r = await m.act({ channel_account_id: paused });
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toEqual({ channel_account_id: 'not_running' });
  });

  it('preview Trợ lý → xác nhận → 202 + lần đồng bộ queued; không tạo khách', async () => {
    const db = await m.db();
    const before = await db.contact.count();
    const { preview, done } = await m.confirm({ channel_account_id: acc });
    expect(preview).toMatchObject({ summary: 'Zalo Danh bạ', risk: 'write', warnings: ['contacts_private_24h'] });
    expect(done.status, JSON.stringify(done.body)).toBe(202);
    expect(done.body.data).toMatchObject({ status: 'job_accepted', status_url: `/v1/settings/channels/${acc}/contact-syncs/${done.body.data.job_id}` });
    expect(await db.channelContactSync.findUniqueOrThrow({ where: { id: done.body.data.job_id } })).toMatchObject({ channelAccountId: acc, status: 'queued' });
    expect(await db.contact.count()).toBe(before);
  });

  it('idempotency; lần mới thay lần còn queued', async () => {
    const r = await m.actWithKey('csc-idem', { channel_account_id: acc });
    expect((await m.actWithKey('csc-idem', { channel_account_id: acc })).body.data).toEqual(r.body.data);
    const r2 = await m.act({ channel_account_id: acc });
    const db = await m.db();
    expect((await db.channelContactSync.findUniqueOrThrow({ where: { id: r.body.data.job_id } })).status).toBe('superseded');
    expect((await db.channelContactSync.findUniqueOrThrow({ where: { id: r2.body.data.job_id } })).status).toBe('queued');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
