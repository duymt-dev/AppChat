// Ma trận channel.lookup_user (TIP-014b E): tra MỘT SĐT (inbox.manage, risk write — ghi nhật ký tra + tính trần, agentGrantable false).
// Chỉ nguồn `ui`; sales → 403; số hỏng → 422; trần 30 / ngày → 429; thành công → 202 + dòng tra queued hạn 24 giờ; không tạo khách;
// action log không chứa SĐT (khoá PII chung REDACT_KEYS).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let acc: string;

beforeAll(async () => {
  m = await matrix('channel.lookup_user');
  acc = await account(m, 'zalo_personal', 'Zalo Tra');
}, 120_000);
afterAll(() => m?.close());

describe('channel.lookup_user', () => {
  it('Trợ lý → 403 · sales → 403 · số hỏng → 422 · email → 422', async () => {
    expect(m.def.agentGrantable).toBe(false);
    expect((await m.act({ channel_account_id: acc, phone: '0912345678' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act({ channel_account_id: acc, phone: '0912345678' }, m.sales)).status).toBe(403);
    expect((await m.act({ channel_account_id: acc, phone: '1234567890' })).body.error.fields).toEqual({ phone: 'invalid' });
    const mail = await account(m, 'email', 'Hộp thư');
    expect((await m.act({ channel_account_id: mail, phone: '0912345678' })).body.error.fields).toEqual({ channel_account_id: 'friends_unsupported' });
  });

  it('202 + dòng tra queued hạn 24 giờ; không tạo khách; log không có SĐT; idempotency', async () => {
    const db = await m.db();
    const before = await db.contact.count();
    const r = await m.actWithKey('lk-1', { channel_account_id: acc, phone: '0912 345 678' });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect((await m.actWithKey('lk-1', { channel_account_id: acc, phone: '0912 345 678' })).body.data).toEqual(r.body.data);
    const row = await db.channelUserLookup.findUniqueOrThrow({ where: { id: r.body.data.job_id } });
    expect(row).toMatchObject({ status: 'queued', phone: '0912345678' });
    expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBe(86_400_000);
    expect(await db.contact.count()).toBe(before);
    const log = await db.actionLog.findFirstOrThrow({ where: { actionId: 'channel.lookup_user' }, orderBy: { createdAt: 'desc' } });
    expect(JSON.stringify(log)).not.toMatch(/0912 ?345 ?678/);
  });

  it('trần 30 / ngày → 429', async () => {
    const db = await m.db();
    const used = await db.channelUserLookup.count({ where: { channelAccountId: acc } });
    for (let i = used; i < 30; i++) await db.channelUserLookup.create({ data: { id: crypto.randomUUID(), channelAccountId: acc, actorId: m.h.user, phone: '0900000000', status: 'not_found', expiresAt: m.h.clock.now(), createdAt: m.h.clock.now() } });
    const r = await m.act({ channel_account_id: acc, phone: '0912345679' });
    expect(r.status).toBe(429);
    expect(r.body.error.fields).toEqual({ channel_account_id: 'lookup_daily_cap' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
