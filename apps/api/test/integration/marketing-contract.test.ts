// TIP-037 — hợp đồng HTTP + dữ liệu Marketing (AC7, AC8, AC10): danh sách page + limit theo zod chung (meta / lọc / tìm / tenant cô lập),
// chi tiết + trang người nhận theo scope CRM người xem, meta số thật (không mở / click giả); nhập danh sách CSV (khớp / tạo / trùng / huỷ
// nhận / khách người khác / ô công thức) → lô id khách thật, không đổi chủ, không đăng ký lại; xuất CSV chặn công thức, chỉ người xuất tải
// được; gán phản hồi / chuyển đổi last-touch 7 ngày từ event outbox thật, chạy lại không đếm đôi; gửi lại chưa đọc → nháp mới cần duyệt;
// action hệ thống không gọi được qua HTTP / nguồn giả; xem không có campaign.view → 403.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { campaignDtoSchema, recipientDtoSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { startApi, type Harness } from './setup';
import { Mk, json } from './helpers/marketing-fixtures';

let h: Harness;
let h2: Harness;
let mk: Mk;
let zalo: string;
let sales: { id: string; token: string };
let viewer: { id: string; token: string };
let marketer: { id: string; token: string };

async function upload(name: string, body: string, token: string) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([new Uint8Array(Buffer.from(body))], { type: 'text/csv' }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${token}` }, body: form });
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

beforeAll(async () => {
  [h, h2] = await Promise.all([startApi(), startApi()]);
  mk = new Mk(h);
  zalo = await mk.account('zalo_personal', 'Zalo HĐ');
  sales = await h.member('sales');
  const key = (await mk.act('role.create', { name: 'Xem chiến dịch', permissions: ['crm.view', 'campaign.view'], data_scope: { inbox: 'own', crm: 'own', sales: 'own', booking: 'own', support: 'own', insights: 'own' } })).body.data.result.key;
  viewer = await h.member(key);
  const mkey = (await mk.act('role.create', { name: 'Marketer', permissions: ['crm.view', 'campaign.view', 'campaign.manage'], data_scope: { inbox: 'own', crm: 'own', sales: 'own', booking: 'own', support: 'own', insights: 'own' } })).body.data.result.key;
  marketer = await h.member(mkey);
}, 240_000);
afterAll(async () => {
  await mk?.close();
  await Promise.all([h?.close(), h2?.close()]);
});

describe('đọc /campaigns*', () => {
  it('page + limit (D42): meta đúng, thứ tự created_at desc, lọc trạng thái / kênh / tìm mã; tenant khác rỗng; không campaign.view → 403', async () => {
    const k = await mk.contact({ zaloAccount: zalo });
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      h.clock.advance(1000);
      ids.push((await mk.act('campaign.create', { name: `Trang ${i}`, channel: 'zalo', account_id: zalo, contact_ids: [k], content: { text: 'x' } })).body.data.result.campaign_id);
    }
    await mk.act('campaign.submit', { campaign_id: ids[0] });
    const p1 = await mk.get('/campaigns?page=1&limit=2');
    expect(p1.body.meta).toEqual({ total: 5, page: 1, limit: 2 });
    expect(p1.body.next_cursor).toBe('2');
    expect(p1.body.data.map((c: { id: string }) => c.id)).toEqual([ids[4], ids[3]]);
    expect(p1.body.data.every((c: unknown) => campaignDtoSchema.safeParse(c).success)).toBe(true);
    expect((await mk.get('/campaigns?page=3&limit=2')).body).toMatchObject({ next_cursor: null, meta: { total: 5, page: 3 } });
    expect((await mk.get('/campaigns?status=pending_approval')).body.data.map((c: { id: string }) => c.id)).toEqual([ids[0]]);
    expect((await mk.get('/campaigns?channel=email')).body.meta.total).toBe(0);
    const code = p1.body.data[0].code as string;
    expect((await mk.get(`/campaigns?q=${encodeURIComponent(code)}`)).body.data).toHaveLength(1);
    expect((await json(await fetch(`${h2.base}/v1/campaigns`, { headers: { 'x-workspace-id': h2.ws, authorization: `Bearer ${h2.token}` } }))).body.meta.total).toBe(0);
    expect((await mk.get('/campaigns', sales)).status).toBe(403);
    expect((await mk.get(`/campaigns/${ids[0]}`, viewer)).body.data.allowed).toEqual([]);
    expect((await mk.get(`/campaigns/${uuidv7()}`)).status).toBe(404);
  });

  it('người nhận: trang server + lọc trạng thái; khách ngoài scope người xem không ra dòng; meta không có mở / click giả', async () => {
    const mine = await mk.contact({ zaloAccount: zalo, owner: viewer.id });
    const other = await mk.contact({ zaloAccount: zalo });
    const { id } = await mk.campaign({ contacts: [mine, other], account: zalo });
    const all = await mk.get(`/campaigns/${id}/recipients?page=1&limit=1`);
    expect(all.body.meta).toEqual({ total: 2, page: 1, limit: 1 });
    expect(recipientDtoSchema.safeParse(all.body.data[0]).success).toBe(true);
    expect((await mk.get(`/campaigns/${id}/recipients?status=skipped`)).body.meta.total).toBe(0);
    const seen = await mk.get(`/campaigns/${id}/recipients`, viewer);
    expect(seen.body.data.map((r: { contact_id: string }) => r.contact_id)).toEqual([mine]);
    const meta = (await mk.get('/campaigns/meta')).body.data;
    expect(meta.kpis.map((k: string[]) => k[0])).toEqual(['running', 'sent', 'reply', 'converted']);
    expect(meta.accounts.find((a: { id: string }) => a.id === zalo)).toMatchObject({ type: 'zalo_personal', daily_cap: 200 });
    expect(meta.signals).toContain('orders');
  });
});

describe('AC7 nhập / xuất', () => {
  it('CSV: khớp / tạo mới / trùng / huỷ nhận / khách người khác / thiếu liên hệ → đếm từng loại; khách người khác không đổi chủ; nháp dùng lô', async () => {
    const own = await mk.contact({ owner: marketer.id, name: 'Khách của Marketer' });
    const ownPhone = (await (await mk.db()).contact.findUniqueOrThrow({ where: { id: own } })).phone!;
    const theirs = await mk.contact({ name: 'Khách của Owner' });
    const theirPhone = (await (await mk.db()).contact.findUniqueOrThrow({ where: { id: theirs } })).phone!;
    const opted = await mk.contact({ owner: marketer.id, optOut: true });
    const optPhone = (await (await mk.db()).contact.findUniqueOrThrow({ where: { id: opted } })).phone!;
    const csv = ['Tên,SĐT,Email', `A,${ownPhone},`, `A lặp,${ownPhone},`, `B,${theirPhone},`, `C,${optPhone},`, '=HYPERLINK("x"),0911222333,', 'D,,khong-hop-le'].join('\n');
    const file = await upload('ds.csv', csv, h.tokenFor(marketer.id));
    // Marketer không có crm.import → dòng mới không tạo khách (invalid no_permission).
    const r = await mk.act('campaign.audience_import', { file_id: file }, marketer);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ rows: 6, valid: 1, duplicate: 1, opted_out: 1, created: 0 });
    expect(r.body.data.result.invalid).toBe(3);
    expect(r.body.data.result.errors.map((e: { row: number; reason: string }) => [e.row, e.reason])).toEqual([[3, 'duplicate'], [4, 'owned'], [5, 'opted_out'], [6, 'invalid:no_permission'], [7, 'invalid:email']]);
    const db = await mk.db();
    expect((await db.contact.findUniqueOrThrow({ where: { id: theirs } })).ownerUserId).toBe(h.user);
    expect((await db.contact.findUniqueOrThrow({ where: { id: opted } })).marketingOptOut).toBe(true);
    const batch = await db.campaignAudienceBatch.findUniqueOrThrow({ where: { id: r.body.data.result.batch_id } });
    expect(batch.contactIds).toEqual([own]);
    // Không campaign.manage → 403; Sales (không quyền chiến dịch) không dùng được tệp / lệnh.
    expect((await mk.act('campaign.audience_import', { file_id: file }, viewer)).status).toBe(403);
    expect((await mk.act('campaign.audience_import', { file_id: file }, sales)).status).toBe(403);
    // Lô của marketer không dùng được cho chiến dịch của người khác (không phải Owner) — 404, không lộ.
    const other = await h.member((await mk.act('role.create', { name: 'Marketer 2', permissions: ['crm.view', 'campaign.view', 'campaign.manage'], data_scope: { inbox: 'own', crm: 'all', sales: 'own', booking: 'own', support: 'own', insights: 'own' } })).body.data.result.key);
    expect((await mk.act('campaign.create', { name: 'Lô người khác', channel: 'zalo', audience_batch_id: batch.id, content: { text: 'x' } }, other)).status).toBe(404);
    // Tệp người khác tải lên → 422 forbidden (kể cả Owner — cùng luật nhập sản phẩm). Owner (crm.import) tải bản của mình, đọc thử: dòng
    // mới sẽ được tạo, khách người khác (Owner thấy hết) khớp; không ghi lô.
    expect((await mk.act('campaign.audience_import', { file_id: file, dry_run: true })).body.error.fields).toEqual({ file_id: 'forbidden' });
    const owner = await mk.act('campaign.audience_import', { file_id: await upload('ds2.csv', csv, h.tokenFor(h.user)), dry_run: true });
    expect(owner.status, JSON.stringify(owner.body)).toBe(200);
    expect(owner.body.data.result).toMatchObject({ batch_id: null, valid: 3, created: 0 });
  });

  it('xuất CSV: ô công thức chặn, chỉ khách trong scope; tệp chỉ người xuất / Owner tải; người khác 404', async () => {
    const k = await mk.contact({ zaloAccount: zalo, name: '=cmd|calc' });
    const { id } = await mk.campaign({ contacts: [k], account: zalo });
    const r = await mk.act('campaign.recipient_export', { campaign_id: id }, viewer);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.rows).toBe(0);
    const mine = await mk.act('campaign.recipient_export', { campaign_id: id });
    expect(mine.body.data.result.rows).toBe(1);
    const dl = await fetch(`${h.base}/v1/files/${mine.body.data.result.file_id}`, { headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.tokenFor(h.user)}` } });
    const text = await dl.text();
    expect(text).toContain(`"'=cmd|calc"`);
    expect(text).not.toMatch(/,=cmd/);
    const other = await fetch(`${h.base}/v1/files/${mine.body.data.result.file_id}`, { headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${viewer.token}` } });
    expect(other.status).toBe(404);
  });
});

describe('AC8 số đo + gửi lại', () => {
  it('tin khách sau gửi → replied; đơn hoàn tất trong 7 ngày → converted + doanh thu; chạy lại cùng event không đếm đôi; quá 7 ngày không gán', async () => {
    const k = await mk.contact({ zaloAccount: zalo });
    const late = await mk.contact({ zaloAccount: zalo });
    const { id } = await mk.campaign({ contacts: [k, late], account: zalo, approve: true });
    h.clock.advance(60_000);
    await mk.tick();
    for (const r of await mk.recipients(id)) await mk.deliver(r.id, 'accepted');
    const db = await mk.db();
    h.clock.advance(3_600_000);
    const conv = (await db.conversation.findFirstOrThrow({ where: { contactId: k } })).id;
    const msg = uuidv7();
    await db.message.create({ data: { id: msg, conversationId: conv, channelAccountId: zalo, senderType: 'contact', direction: 'in', body: 'Còn ưu đãi không?', createdAt: h.clock.now() } });
    const evMsg = uuidv7();
    await db.outboxEvent.create({ data: { id: evMsg, topic: 'message.received', payload: { contact_id: k, message_id: msg, is_group: false }, status: 'published', createdAt: h.clock.now() } });
    await mk.system('metric', 'campaign.record_metric', { event_id: evMsg, kind: 'reply' }, `${evMsg}:campaign-metric`);
    await mk.system('metric', 'campaign.record_metric', { event_id: evMsg, kind: 'reply' }, `${evMsg}:again`);
    const order = uuidv7();
    await db.order.create({ data: { id: order, code: `DH-MK-${order.slice(-6)}`, contactId: k, status: 'completed', total: 2_500_000n, createdAt: h.clock.now() } });
    const evOrder = uuidv7();
    await db.outboxEvent.create({ data: { id: evOrder, topic: 'order.completed', payload: { contact_id: k, order_id: order }, status: 'published', createdAt: h.clock.now() } });
    await mk.system('metric', 'campaign.record_metric', { event_id: evOrder, kind: 'conversion' }, `${evOrder}:campaign-metric`);
    await mk.system('metric', 'campaign.record_metric', { event_id: evOrder, kind: 'conversion' }, `${evOrder}:again`);
    // Khách thứ hai mua sau 8 ngày → ngoài cửa sổ.
    h.clock.advance(8 * 86_400_000);
    const order2 = uuidv7();
    await db.order.create({ data: { id: order2, code: `DH-MK-${order2.slice(-6)}`, contactId: late, status: 'completed', total: 900_000n, createdAt: h.clock.now() } });
    const ev2 = uuidv7();
    await db.outboxEvent.create({ data: { id: ev2, topic: 'order.completed', payload: { contact_id: late, order_id: order2 }, status: 'published', createdAt: h.clock.now() } });
    await mk.system('metric', 'campaign.record_metric', { event_id: ev2, kind: 'conversion' }, `${ev2}:campaign-metric`);
    const stats = (await mk.get(`/campaigns/${id}`)).body.data.stats;
    expect(stats).toMatchObject({ sent: 2, replied: 1, converted: 1, revenue: '2500000', open: null, click: null });
    const r = (await mk.recipients(id)).find((x) => x.contactId === k)!;
    expect(r).toMatchObject({ status: 'converted', orderId: order, revenue: 2_500_000n });
    expect(r.repliedAt).not.toBeNull();
    // Sai topic → 404; event workspace khác bị bỏ qua.
    await expect(mk.system('metric', 'campaign.record_metric', { event_id: evMsg, kind: 'conversion' })).rejects.toMatchObject({ httpStatus: 404 });
  });

  it('gửi lại chưa phản hồi: tạo NHÁP mới (không gửi), người nhận = đã gửi chưa phản hồi / chuyển đổi; Zalo không có xác nhận đọc', async () => {
    const ks = await Promise.all([1, 2].map(() => mk.contact({ zaloAccount: zalo })));
    const { id } = await mk.campaign({ contacts: ks, account: zalo, approve: true });
    expect((await mk.act('campaign.resend_unread', { campaign_id: id })).status).toBe(409);
    h.clock.advance(60_000);
    await mk.tick();
    const [r1, r2] = await mk.recipients(id);
    await mk.deliver(r1!.id, 'accepted');
    await mk.deliver(r2!.id, 'failed');
    const r = await mk.act('campaign.resend_unread', { campaign_id: id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ est_recipients: 1, read_evidence: false });
    const d = (await mk.get(`/campaigns/${r.body.data.result.campaign_id}`)).body.data;
    expect(d).toMatchObject({ status: 'draft', approved_by: null });
    expect(await (await mk.db()).campaignAudience.findMany({ where: { campaignId: d.id }, select: { contactId: true } })).toEqual([{ contactId: r1!.contactId }]);
  });
});

describe('AC10 nguồn + quyền', () => {
  it('action hệ thống qua HTTP (ui / assistant / api) → 403; x-action-source system → 422; preview action hệ thống → 403', async () => {
    const body = { delivery_ref: `cr_${uuidv7()}`, outcome: 'accepted', definite: true };
    for (const src of ['ui', 'assistant', 'api']) expect((await mk.act('campaign.record_delivery', body, undefined, { 'x-action-source': src })).status).toBe(403);
    expect((await mk.act('campaign.record_delivery', body, undefined, { 'x-action-source': 'system' })).status).toBe(422);
    expect((await mk.act('campaign.dispatch', { campaign_id: uuidv7(), approved_version: 1, batch: 0 })).status).toBe(403);
    expect((await mk.act('campaign.store_analysis', { run_id: uuidv7() })).status).toBe(403);
  });

  it('sales (không campaign.*) → 403 mọi lệnh ghi; viewer xem được nhưng không tạo', async () => {
    const k = await mk.contact({ owner: sales.id, zaloAccount: zalo });
    expect((await mk.act('campaign.create', { name: 'x', channel: 'zalo', contact_ids: [k], content: { text: 'x' } }, sales)).status).toBe(403);
    expect((await mk.act('segment.preview', { contact_ids: [k] }, sales)).status).toBe(403);
    expect((await mk.act('campaign.create', { name: 'x', channel: 'zalo', contact_ids: [k], content: { text: 'x' } }, viewer)).status).toBe(403);
    expect((await mk.act('segment.preview', { contact_ids: [k] }, viewer)).status).toBe(200);
  });
});
