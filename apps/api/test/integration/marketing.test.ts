// TIP-037 — Marketing trên Postgres 16 thật (AC1–3): phân khúc AST đóng (lồng / sai 422, union không trùng, scope CRM người gọi, tenant
// khác cô lập, stale 409, đang dùng 409); vòng đời nháp → gửi duyệt (snapshot + lý do loại) → duyệt (người có campaign.approve, luôn xác
// nhận, Trợ lý chỉ xem trước) → quét scheduler nhận lô → kết quả kênh; sửa sau gửi duyệt 409, duyệt đôi 409, hoàn tác gửi duyệt, từ chối →
// sửa → nháp, tạm dừng / tiếp tục / huỷ (người nhận chưa gọi kênh → skipped cancelled), hẹn giờ chờ tới giờ; an toàn người nhận: huỷ nhận
// tin / khoá 48 giờ giữa hai chiến dịch / tài khoản hết hạn → tạm dừng, không đổi tài khoản; trang huỷ nhận tin công khai chỉ token ký.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { campaignDetailSchema, campaignDtoSchema, segmentDtoSchema } from '@appchat/shared';
import { parseEncKey, reserveRecipient, unsubToken, uuidv7 } from '@appchat/core';
import { env, startApi, type Harness } from './setup';
import { Mk, json } from './helpers/marketing-fixtures';

let h: Harness;
let h2: Harness;
let mk: Mk;
let zalo: string;
let marketer: { id: string; token: string };
let approver: { id: string; token: string };
const VIP = { field: 'group', op: 'in', value: ['vip'] } as const;
const iso = (ms: number) => new Date(ms).toISOString().replace('Z', '+00:00');

beforeAll(async () => {
  [h, h2] = await Promise.all([startApi(), startApi()]);
  mk = new Mk(h);
  zalo = await mk.account('zalo_personal', 'Zalo bán hàng');
  const role = async (name: string, permissions: string[], crm: string) =>
    (await mk.act('role.create', { name, permissions, data_scope: { inbox: 'own', crm, sales: 'own', booking: 'own', support: 'own', insights: 'own' } })).body.data.result.key as string;
  marketer = await h.member(await role('Marketer', ['crm.view', 'campaign.view', 'campaign.manage'], 'own'));
  approver = await h.member(await role('Duyệt chiến dịch', ['crm.view', 'campaign.view', 'campaign.approve'], 'all'));
}, 240_000);
afterAll(async () => {
  await mk?.close();
  await Promise.all([h?.close(), h2?.close()]);
});

describe('AC1 phân khúc', () => {
  it('tạo AST lồng → đếm thật; quá sâu / trường lạ → 422; GET /segments theo zod chung; tenant khác không thấy', async () => {
    await mk.contact({ group: 'vip', spent: 15_000_000n, zaloAccount: zalo });
    await mk.contact({ group: 'vip', spent: 2_000_000n });
    await mk.contact({ group: 'loyal' });
    const filter = { op: 'and', children: [VIP, { op: 'or', children: [{ field: 'total_spent', op: 'gte', value: '10000000' }, { field: 'last_order_at', op: 'never' }] }] };
    const r = await mk.act('segment.create', { name: 'VIP chi nhiều', filter });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.count).toBe(2);
    const deep = { op: 'and', children: [{ op: 'or', children: [{ op: 'and', children: [{ op: 'or', children: [VIP] }] }] }] };
    expect((await mk.act('segment.create', { name: 'Sâu', filter: deep })).status).toBe(422);
    expect((await mk.act('segment.create', { name: 'Lạ', filter: { field: 'raw', op: 'eq', value: '1=1' } })).status).toBe(422);
    const list = await mk.get('/segments');
    expect(list.body.data.every((s: unknown) => segmentDtoSchema.safeParse(s).success)).toBe(true);
    expect(list.body.data.map((s: { name: string }) => s.name)).toContain('VIP chi nhiều');
    expect((await json(await fetch(`${h2.base}/v1/segments`, { headers: { 'x-workspace-id': h2.ws, authorization: `Bearer ${h2.token}` } }))).body.data).toEqual([]);
  });

  it('preview: phân khúc ∪ chọn tay không đếm trùng; gửi được loại huỷ nhận / không có hội thoại; scope CRM người gọi', async () => {
    const seg = (await mk.act('segment.create', { name: 'VIP', filter: VIP })).body.data.result.segment_id as string;
    const vips = (await (await mk.db()).contact.findMany({ where: { group: 'vip' }, select: { id: true } })).map((c) => c.id);
    const extra = await mk.contact({ zaloAccount: zalo });
    await mk.contact({ group: 'vip', optOut: true, zaloAccount: zalo });
    const r = await mk.act('segment.preview', { segment_ids: [seg], contact_ids: [...vips, extra], channel: 'zalo' });
    expect(r.body.data.result).toEqual({ count: vips.length + 2, reachable: 2 });
    // Marketer (CRM own) chỉ đếm khách của mình.
    await mk.contact({ group: 'vip', owner: marketer.id, zaloAccount: zalo });
    expect((await mk.act('segment.preview', { segment_ids: [seg], channel: 'zalo' }, marketer)).body.data.result).toEqual({ count: 1, reachable: 1 });
  });

  it('update stale → 409; xoá phân khúc đang dùng trong nháp → 409; xoá được khi không còn nháp dùng', async () => {
    const s = (await mk.act('segment.create', { name: 'Mới', filter: { field: 'group', op: 'in', value: ['new'] } })).body.data.result;
    expect((await mk.act('segment.update', { segment_id: s.segment_id, name: 'Mới 2', if_version: 1 })).status).toBe(200);
    expect((await mk.act('segment.update', { segment_id: s.segment_id, name: 'Mới 3', if_version: 1 })).status).toBe(409);
    const c = await mk.act('campaign.create', { name: 'Dùng phân khúc', channel: 'zalo', account_id: zalo, segment_ids: [s.segment_id], content: { text: 'Chào {ten}' } });
    expect((await mk.act('segment.delete', { segment_id: s.segment_id })).status).toBe(409);
    expect((await mk.act('campaign.delete', { campaign_id: c.body.data.result.campaign_id })).status).toBe(200);
    expect((await mk.act('segment.delete', { segment_id: s.segment_id })).status).toBe(200);
  });
});

describe('AC2 vòng đời', () => {
  it('nháp → gửi duyệt chụp người nhận + lý do loại; sửa sau gửi duyệt 409; marketer không duyệt được; Trợ lý chỉ xem trước', async () => {
    const ok = await mk.contact({ zaloAccount: zalo });
    const opted = await mk.contact({ optOut: true, zaloAccount: zalo });
    const noConv = await mk.contact();
    const c = await mk.act('campaign.create', { name: 'Tri ân', channel: 'zalo', account_id: zalo, contact_ids: [ok, opted, noConv], content: { text: 'Chào {ten}' } });
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    const id = c.body.data.result.campaign_id as string;
    const d = await mk.get(`/campaigns/${id}`);
    expect(campaignDetailSchema.safeParse(d.body.data).success).toBe(true);
    expect(d.body.data).toMatchObject({ status: 'draft', version: 1 });
    expect((await mk.act('campaign.update', { campaign_id: id, name: 'X', if_version: 9 })).status).toBe(409);
    const s = await mk.act('campaign.submit', { campaign_id: id, if_version: 1 });
    expect(s.body.data.result.status).toBe('pending_approval');
    const rec = await mk.recipients(id);
    expect(Object.fromEntries(rec.map((r) => [r.contactId, [r.status, r.skipReason]]))).toEqual({ [ok]: ['pending', null], [opted]: ['skipped', 'opt_out'], [noConv]: ['skipped', 'no_endpoint'] });
    expect((await mk.act('campaign.update', { campaign_id: id, name: 'Sửa lén' })).body.error.code).toBe('INVALID_TRANSITION');
    expect((await mk.act('campaign.approve', { campaign_id: id }, marketer)).status).toBe(403);
    const asst = await mk.act('campaign.approve', { campaign_id: id }, undefined, { 'x-action-source': 'assistant' });
    expect(asst.status).toBe(202);
    expect(asst.body.data.preview.count).toBe(1);
    // UI cũng phải xác nhận (bulk + send); chưa xác nhận → không đổi trạng thái.
    expect((await mk.act('campaign.approve', { campaign_id: id })).status).toBe(202);
    expect((await mk.get(`/campaigns/${id}`)).body.data.status).toBe('pending_approval');
    const a = await mk.confirmed('campaign.approve', { campaign_id: id, if_version: s.body.data.result.version }, approver);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data.result).toMatchObject({ status: 'approved', recipients: 1 });
    // Duyệt không gửi trong request: chưa ai được nhận lô.
    expect((await mk.recipients(id)).every((r) => !r.claimedAt && r.sendState === 'none')).toBe(true);
    const again = await mk.confirmed('campaign.approve', { campaign_id: id }, approver);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');
    expect((await mk.act('campaign.delete', { campaign_id: id })).status).toBe(409);
  });

  it('hoàn tác gửi duyệt → nháp + xoá snapshot; từ chối có lý do → sửa → nháp; khách ngoài scope marketer → 404', async () => {
    const k = await mk.contact({ zaloAccount: zalo });
    const id = (await mk.act('campaign.create', { name: 'Hoàn tác', channel: 'zalo', account_id: zalo, contact_ids: [k], content: { text: 'a' } })).body.data.result.campaign_id;
    const s = await mk.act('campaign.submit', { campaign_id: id });
    expect((await mk.undo(s.body.data.action_log_id)).status).toBe(200);
    expect((await mk.get(`/campaigns/${id}`)).body.data.status).toBe('draft');
    expect(await mk.recipients(id)).toHaveLength(0);
    await mk.act('campaign.submit', { campaign_id: id });
    expect((await mk.act('campaign.reject', { campaign_id: id, reason: '' })).status).toBe(422);
    const rj = await mk.act('campaign.reject', { campaign_id: id, reason: 'Sai giọng văn' }, approver);
    expect(rj.body.data.result.status).toBe('rejected');
    expect((await mk.get(`/campaigns/${id}`)).body.data.reject_reason).toBe('Sai giọng văn');
    expect((await mk.act('campaign.update', { campaign_id: id, content: { text: 'b' } })).body.data.result.status).toBe('draft');
    expect((await mk.act('campaign.create', { name: 'Lấn', channel: 'zalo', account_id: zalo, contact_ids: [k], content: { text: 'x' } }, marketer)).status).toBe(404);
  });

  it('quét → đang chạy + nhận lô; tạm dừng / tiếp tục; huỷ khi đang chạy 409 (tạm dừng trước); huỷ → người nhận chưa gọi kênh skipped', async () => {
    const ks = await Promise.all([1, 2, 3].map(() => mk.contact({ zaloAccount: zalo })));
    const { id } = await mk.campaign({ contacts: ks, account: zalo, approve: true });
    h.clock.advance(60_000);
    await mk.tick();
    expect((await mk.get(`/campaigns/${id}`)).body.data.status).toBe('running');
    const rec = await mk.recipients(id);
    expect(rec.every((r) => r.claimedAt)).toBe(true);
    await mk.deliver(rec[0]!.id, 'accepted');
    expect((await mk.act('campaign.cancel', { campaign_id: id })).body.error.code).toBe('INVALID_TRANSITION');
    expect((await mk.act('campaign.pause', { campaign_id: id })).body.data.result.status).toBe('paused');
    expect((await mk.act('campaign.resume', { campaign_id: id })).body.data.result.status).toBe('running');
    await mk.act('campaign.pause', { campaign_id: id });
    expect((await mk.act('campaign.cancel', { campaign_id: id })).body.data.result.status).toBe('cancelled');
    const after = await mk.recipients(id);
    expect(after.map((r) => r.status).sort()).toEqual(['sent', 'skipped', 'skipped']);
    expect(after.filter((r) => r.status === 'skipped').every((r) => r.skipReason === 'cancelled')).toBe(true);
    // Khoá 48 giờ của người chưa gửi được nhả; người đã gửi giữ.
    const touches = await (await mk.db()).campaignContactTouch.findMany({ where: { campaignId: id } });
    expect(touches.map((t) => [t.recipientId, t.state])).toEqual([[rec[0]!.id, 'sent']]);
  });

  it('hẹn giờ: duyệt → scheduled; quét trước giờ không gửi; tới giờ → running; giờ đã qua lúc gửi duyệt → 422', async () => {
    const k = await mk.contact({ zaloAccount: zalo });
    const at = h.clock.now().getTime() + 3 * 3_600_000;
    const { id } = await mk.campaign({ contacts: [k], account: zalo, approve: true, scheduled_at: iso(at) });
    expect((await mk.get(`/campaigns/${id}`)).body.data.status).toBe('scheduled');
    h.clock.advance(60_000);
    await mk.tick();
    expect((await mk.recipients(id))[0]!.claimedAt).toBeNull();
    h.clock.advance(3 * 3_600_000);
    await mk.tick();
    expect((await mk.get(`/campaigns/${id}`)).body.data.status).toBe('running');
    const past = await mk.act('campaign.create', { name: 'Quá giờ', channel: 'zalo', account_id: zalo, contact_ids: [k], content: { text: 'x' }, send: 'schedule', scheduled_at: iso(h.clock.now().getTime() - 60_000) });
    expect(past.status).toBe(422);
  });
});

describe('AC3 an toàn người nhận', () => {
  it('hai chiến dịch cùng khách: chỉ một chiến dịch nhận lô trong 48 giờ, chiến dịch kia skipped cooldown; snapshot sau đó loại sẵn', async () => {
    const shared = await mk.contact({ zaloAccount: zalo });
    const a = await mk.campaign({ contacts: [shared], account: zalo, approve: true, name: 'A' });
    const b = await mk.campaign({ contacts: [shared], account: zalo, approve: true, name: 'B' });
    h.clock.advance(60_000);
    await mk.tick();
    const ra = (await mk.recipients(a.id))[0]!;
    const rb = (await mk.recipients(b.id))[0]!;
    expect([ra.claimedAt ? 'claimed' : ra.skipReason, rb.claimedAt ? 'claimed' : rb.skipReason].sort()).toEqual(['claimed', 'cooldown']);
    const c = await mk.act('campaign.create', { name: 'C', channel: 'zalo', account_id: zalo, contact_ids: [shared], content: { text: 'x' } });
    expect((await mk.act('campaign.submit', { campaign_id: c.body.data.result.campaign_id })).body.error.fields).toEqual({ audience: 'no_reachable' });
  });

  it('huỷ nhận tin sau khi đã nhận lô → đặt chỗ trước kênh bị từ chối, skipped opt_out (chưa gọi kênh)', async () => {
    const k = await mk.contact({ zaloAccount: zalo });
    const { id } = await mk.campaign({ contacts: [k], account: zalo, approve: true });
    h.clock.advance(60_000);
    await mk.tick();
    const r = (await mk.recipients(id))[0]!;
    await (await mk.db()).contact.update({ where: { id: k }, data: { marketingOptOut: true } });
    expect(await reserveRecipient(await mk.db(), r.id, h.clock.now())).toBe('rejected');
    expect((await mk.recipients(id))[0]).toMatchObject({ status: 'skipped', skipReason: 'opt_out', sendState: 'none' });
  });

  it('tài khoản gửi hết hạn: đã duyệt → giữ + ghi lịch sử held; đang chạy → tạm dừng; không đổi sang tài khoản khác', async () => {
    const acc = await mk.account('zalo_personal', 'Zalo phụ');
    const spare = await mk.account('zalo_personal', 'Zalo dự phòng');
    const k1 = await mk.contact({ zaloAccount: acc });
    const k2 = await mk.contact({ zaloAccount: acc });
    const a = await mk.campaign({ contacts: [k1], account: acc, approve: true });
    const b = await mk.campaign({ contacts: [k2], account: acc, approve: true });
    h.clock.advance(60_000);
    await mk.system('dispatch', 'campaign.dispatch', { campaign_id: b.id, approved_version: b.version, batch: 0 });
    await (await mk.db()).channelAccount.update({ where: { id: acc }, data: { status: 'expired' } });
    h.clock.advance(60_000);
    await mk.tick();
    const da = (await mk.get(`/campaigns/${a.id}`)).body.data;
    expect(da.status).toBe('approved');
    expect(da.history.at(-1)[0]).toBe('held');
    const db2 = (await mk.get(`/campaigns/${b.id}`)).body.data;
    expect(db2).toMatchObject({ status: 'paused', account_id: acc });
    expect(db2.account_id).not.toBe(spare);
  });

  it('kết quả kênh: accepted → sent + khoá 48 giờ; ghi lặp không đếm đôi; unknown → cần kiểm tra, không nhận lại lô', async () => {
    const ks = await Promise.all([1, 2].map(() => mk.contact({ zaloAccount: zalo })));
    const { id } = await mk.campaign({ contacts: ks, account: zalo, approve: true });
    h.clock.advance(60_000);
    await mk.tick();
    const [r1, r2] = await mk.recipients(id);
    await mk.deliver(r1!.id, 'accepted');
    await mk.system('delivery', 'campaign.record_delivery', { delivery_ref: `cr_${r1!.id}`, outcome: 'accepted', definite: true, external_msg_id: 'z-dup' });
    await mk.deliver(r2!.id, 'unknown');
    const d = (await mk.get(`/campaigns/${id}`)).body.data;
    expect(campaignDtoSchema.safeParse(d).success).toBe(true);
    expect(d.stats).toMatchObject({ sent: 1, unknown: 1, open: null, click: null });
    const rec = await mk.recipients(id);
    expect(rec.find((r) => r.id === r1!.id)).toMatchObject({ status: 'sent', externalMsgId: `z-${r1!.id}` });
    expect(rec.find((r) => r.id === r2!.id)).toMatchObject({ outcome: 'unknown', sendState: 'unknown' });
    h.clock.advance(60_000);
    await mk.tick();
    expect((await mk.get(`/campaigns/${id}`)).body.data.status).toBe('completed');
  });
});

describe('huỷ nhận tin công khai', () => {
  it('GET chỉ đọc tên DN; POST xác nhận → opt-out + người nhận chưa gửi bị loại; token sửa / người nhận giả → 404; UI gọi action → 403', async () => {
    const k = await mk.contact({ zaloAccount: zalo });
    const { id } = await mk.campaign({ contacts: [k], account: zalo, approve: true });
    const r = (await mk.recipients(id))[0]!;
    const key = parseEncKey(env.APP_ENC_KEY!);
    const t = unsubToken(key, h.ws, r.id, h.clock.now());
    const pub = (path: string, method = 'GET') => fetch(`${h.base}/v1/public/campaign-unsubscribe/${path}`, { method }).then(json);
    const v = await pub(t);
    expect(v.body.data).toEqual({ business: 'WS test', unsubscribed: false });
    expect(JSON.stringify(v.body)).not.toContain(k);
    expect((await pub(t.slice(0, -2) + 'xx')).status).toBe(404);
    expect((await pub(unsubToken(key, h.ws, uuidv7(), h.clock.now()))).status).toBe(404);
    expect((await pub(`${t}/confirm`, 'POST')).body.data).toEqual({ business: 'WS test', unsubscribed: true });
    expect((await pub(`${t}/confirm`, 'POST')).body.data.unsubscribed).toBe(true);
    expect((await (await mk.db()).contact.findUniqueOrThrow({ where: { id: k } })).marketingOptOut).toBe(true);
    expect((await mk.recipients(id))[0]).toMatchObject({ status: 'skipped', skipReason: 'opt_out' });
    expect((await mk.act('campaign.unsubscribe', { token: t })).status).toBe(403);
  });
});
