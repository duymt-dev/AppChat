// TIP-015 AC1–AC8 trên Postgres 16 + Memurai: migration 015, contact.create (mã, chống giành khách, custom), role-isolation
// (sales A / B, collaborator, watcher), update / set_stage / tag / delete + hoàn tác, đồng phụ trách / chuyển phụ trách,
// xin chia sẻ, gộp trùng, đọc /contacts (D42) + stats + 360° + timeline đúng schema FE.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { collaboratorsSchema, contact360Schema, contactsPageSchema, crmStatsSchema, duplicatesSchema, membersListSchema, timelinePageSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let salesA: { id: string; token: string };
let salesB: { id: string; token: string };
let manager: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  [salesA, salesB, manager] = [await h.member('sales'), await h.member('sales'), await h.member('manager')];
});
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const idem = () => ({ 'idempotency-key': uuidv7() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const create = (input: Record<string, unknown>, who?: { token: string }) => act('contact.create', input, { ...idem(), ...(who ? as(who) : {}) });
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const undo = (logId: string, who?: { token: string }) => call(h, `/action-logs/${logId}/undo`, {}, who ? as(who) : {}).then(json);
const tenant = async () => resolver.get(TenantContexts.system(h.ws, 't'));
const outbox = async (topic: string) => (await (await tenant()).outboxEvent.findMany({ where: { topic } })).map((e) => e.payload as Record<string, unknown>);
const ids = (page: { data: { id: string }[] }) => page.data.map((c) => c.id);

describe('schema', () => {
  it('AC1 migration 015: bảng + index viết tay; EXPLAIN list scope own dùng index owner_user_id', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('contact','tag','contact_access_request','contact_collaborator')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['contact_phone_norm_key', 'contact_owner_recent_idx', 'contact_name_trgm_idx', 'contact_custom_gin_idx', 'tag_name_lower_key', 'contact_access_request_pending_key', 'contact_collaborator_user_id_contact_id_idx']));
    const fk = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM pg_constraint WHERE conname LIKE 'contact%_fk'`;
    expect(Number(fk[0]!.n)).toBeGreaterThanOrEqual(8);
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (await c.query(`EXPLAIN SELECT c.id FROM contact c WHERE c.deleted_at IS NULL AND c.owner_user_id = '${salesA.id}'::uuid ORDER BY c.last_interaction_at DESC, c.id DESC LIMIT 20`)).rows.map((r) => r['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/contact_owner_recent_idx/);
    } finally {
      await c.end();
    }
  });
});

describe('tạo khách + chống giành khách', () => {
  let lan: string;

  it('AC2 contact.create: mã KH, phone_norm, lead, owner = người tạo, timeline + outbox; trùng của người khác → CONTACT_OWNED; của mình → CONFLICT; custom sai → 422; hoàn tác', async () => {
    const r = await create({ full_name: 'Nguyễn Thị Lan', phone: '+84 909 123 456', email: 'Lan@ShopBeNa.vn', title: 'Chủ shop', city: 'TP.HCM' }, salesA);
    expect(r.status).toBe(200);
    expect(r.body.data.result.code).toMatch(/^KH-1\d{3}$/);
    lan = r.body.data.result.contact_id;
    const row = await (await tenant()).contact.findUniqueOrThrow({ where: { id: lan } });
    expect(row).toMatchObject({ phoneNorm: '0909123456', email: 'lan@shopbena.vn', stage: 'lead', ownerUserId: salesA.id, source: 'manual' });
    expect(await outbox('contact.created')).toContainEqual(expect.objectContaining({ contact_id: lan, owner_user_id: salesA.id }));

    const owned = await create({ full_name: 'Lan (trùng)', phone: '0909 123 456' }, salesB);
    expect(owned).toMatchObject({ status: 409, body: { error: { code: 'CONTACT_OWNED', fields: { contact_id: lan, owner_name: 'sales' } } } });
    expect(JSON.stringify(owned.body)).not.toContain('Nguyễn Thị Lan');
    expect((await create({ full_name: 'Lan 2', email: 'lan@shopbena.vn' }, salesA)).body.error).toMatchObject({ code: 'CONFLICT', fields: { email: 'duplicate' } });
    expect((await create({ full_name: 'Không liên hệ' })).body.error.fields).toMatchObject({ phone: 'custom' });
    expect((await create({ full_name: 'X', phone: '0911000001', custom: { size_ao: 'XL' } })).body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { 'custom.size_ao': 'unknown' } });
    expect((await create({ full_name: 'Gán hộ', phone: '0911000002', owner_user_id: salesB.id }, salesA)).status).toBe(403);

    const tmp = await create({ full_name: 'Tạm', phone: '0911000003' });
    expect((await undo(tmp.body.data.action_log_id)).status).toBe(200);
    expect(await (await tenant()).contact.findUnique({ where: { id: tmp.body.data.result.contact_id } })).toBeNull();
  });

  it('AC3 role-isolation: sales B không thấy / không sửa khách của A; collaborator thấy + sửa; watcher chỉ đọc; mine gồm khách đồng phụ trách', async () => {
    expect(ids((await get('/contacts', salesB)).body)).not.toContain(lan);
    expect((await get(`/contacts/${lan}`, salesB)).status).toBe(404);
    expect((await act('contact.update', { contact_id: lan, patch: { city: 'HN' } }, as(salesB))).status).toBe(404);
    expect((await act('contact.add_collaborator', { contact_id: lan, user_id: salesB.id, role: 'watcher' }, as(salesB))).status).toBe(404);

    expect((await act('contact.add_collaborator', { contact_id: lan, user_id: salesB.id, role: 'watcher' }, as(salesA))).body.data.result).toEqual({ collaborators: 1 });
    expect(ids((await get('/contacts', salesB)).body)).toContain(lan);
    expect((await act('contact.update', { contact_id: lan, patch: { city: 'HN' } }, as(salesB))).body.error).toMatchObject({ code: 'SCOPE_FORBIDDEN' });
    await act('contact.add_collaborator', { contact_id: lan, user_id: salesB.id, role: 'collaborator' }, as(salesA));
    expect((await act('contact.update', { contact_id: lan, patch: { district: 'Q.7' } }, as(salesB))).status).toBe(200);
    expect(ids((await get('/contacts?mine=1', salesB)).body)).toContain(lan);
    // collaborator không thêm người khác (chỉ owner / crm.reassign).
    expect((await act('contact.add_collaborator', { contact_id: lan, user_id: manager.id, role: 'watcher' }, as(salesB))).status).toBe(403);
    const col = (await get(`/contacts/${lan}/collaborators`, salesB)).body.data;
    expect(collaboratorsSchema.parse(col)).toMatchObject({ owner: { user_id: salesA.id }, collaborators: [{ user_id: salesB.id, role: 'collaborator' }] });
    expect((await act('contact.remove_collaborator', { contact_id: lan, user_id: salesB.id }, as(salesB))).body.data.result).toEqual({ collaborators: 0 });
    expect((await get(`/contacts/${lan}`, salesB)).status).toBe(404);
  });

  it('AC4 update / set_stage / tag / delete + hoàn tác', async () => {
    const up = await act('contact.update', { contact_id: lan, patch: { title: 'Giám đốc', phone: '0909 999 000' } }, as(salesA));
    expect((await (await tenant()).contact.findUniqueOrThrow({ where: { id: lan } })).phoneNorm).toBe('0909999000');
    await undo(up.body.data.action_log_id, salesA);
    expect(await (await tenant()).contact.findUniqueOrThrow({ where: { id: lan } })).toMatchObject({ title: 'Chủ shop', phoneNorm: '0909123456' });
    expect((await act('contact.update', { contact_id: lan, patch: { owner_user_id: salesB.id } }, as(salesA))).status).toBe(403);

    const st = await act('contact.set_stage', { contact_id: lan, stage: 'consulting' }, as(salesA));
    expect(st.body.data.result).toEqual({ stage: 'consulting' });
    expect(await outbox('contact.stage_changed')).toContainEqual(expect.objectContaining({ contact_id: lan, from: 'lead', to: 'consulting', manual: true }));
    const tl = (await get(`/contacts/${lan}/timeline`, salesA)).body;
    expect(timelinePageSchema.parse(tl).data[0]).toMatchObject({ text: 'Đổi giai đoạn: Lead mới → Đang tư vấn', icon: 'ic-trend' });

    expect((await act('contact.tag', { contact_id: lan, tag: 'VIP', op: 'add' }, as(salesA))).body.data.result).toEqual({ tags: ['VIP'] });
    const t2 = await act('contact.tag', { contact_id: lan, tag: 'vip', op: 'add' }, as(salesA));
    expect(t2.body.data.result).toEqual({ tags: ['VIP'] });
    expect(await (await tenant()).tag.count({ where: { name: { equals: 'VIP', mode: 'insensitive' } } })).toBe(1);
    const t3 = await act('contact.tag', { contact_id: lan, tag: 'Hot lead', op: 'add' }, as(salesA));
    await undo(t3.body.data.action_log_id, salesA);
    expect((await get(`/contacts?q=lan`, salesA)).body.data[0].tags).toEqual(['VIP']);

    const tmp = (await create({ full_name: 'Sẽ xoá', phone: '0911000010' }, salesA)).body.data.result.contact_id;
    expect((await act('contact.delete', { contact_id: tmp }, as(salesA))).status).toBe(403); // sales không có crm.delete
    const del = await act('contact.delete', { contact_id: tmp });
    expect(ids((await get('/contacts', salesA)).body)).not.toContain(tmp);
    await undo(del.body.data.action_log_id);
    expect(ids((await get('/contacts', salesA)).body)).toContain(tmp);
  });

  it('AC5 chuyển phụ trách: sales 403; Quản lý chuyển A → B: B phụ trách, outbox owner_changed; hoàn tác', async () => {
    const move = { conversations: true, quotes: true, appointments: false };
    expect((await act('contact.transfer_owner', { contact_id: lan, to_user_id: salesB.id, move }, as(salesA))).status).toBe(403);
    const r = await act('contact.transfer_owner', { contact_id: lan, to_user_id: salesB.id, move }, as(manager));
    expect(r.body.data.result).toEqual({ owner_user_id: salesB.id, moved: { conversations: 0, quotes: 0, appointments: 0 } });
    expect(await outbox('contact.owner_changed')).toContainEqual(expect.objectContaining({ contact_id: lan, from: salesA.id, to: salesB.id, move }));
    expect(ids((await get('/contacts', salesA)).body)).not.toContain(lan);
    expect((await get(`/contacts/${lan}`, salesB)).status).toBe(200);
    await undo(r.body.data.action_log_id, manager);
    expect((await (await tenant()).contact.findUniqueOrThrow({ where: { id: lan } })).ownerUserId).toBe(salesA.id);
    expect((await act('contact.transfer_owner', { contact_id: lan, to_user_id: uuidv7(), move }, as(manager))).body.error.fields).toEqual({ to_user_id: 'not_member' });
  });

  it('AC6 xin chia sẻ: B xin → pending (xin lại 409); A thấy yêu cầu; B không duyệt được; A duyệt → B thành collaborator', async () => {
    const r = await act('contact.request_access', { contact_id: lan, note: 'Khách nhắn Zalo em' }, as(salesB));
    expect(r.body.data.result).toMatchObject({ status: 'pending' });
    expect((await act('contact.request_access', { contact_id: lan }, as(salesB))).status).toBe(409);
    expect(await outbox('contact.access_requested')).toContainEqual(expect.objectContaining({ contact_id: lan, requester_user_id: salesB.id }));
    const list = (await get('/contact-access-requests', salesA)).body.data;
    expect(list).toEqual([expect.objectContaining({ id: r.body.data.result.request_id, contact_id: lan, requester_name: 'sales', contact_name: 'Nguyễn Thị Lan', note: 'Khách nhắn Zalo em' })]);
    expect((await get('/contact-access-requests', salesB)).body.data).toEqual([]);
    expect((await act('contact.decide_access', { request_id: r.body.data.result.request_id, decision: 'approved' }, as(salesB))).status).toBe(403);
    expect((await act('contact.decide_access', { request_id: r.body.data.result.request_id, decision: 'approved' }, as(salesA))).body.data.result).toEqual({ status: 'approved' });
    expect((await get(`/contacts/${lan}`, salesB)).status).toBe(200);
    expect((await act('contact.decide_access', { request_id: r.body.data.result.request_id, decision: 'rejected' }, as(salesA))).status).toBe(409);
  });

  it('AC7 trùng email → /contacts/duplicates; merge (preview → xác nhận) chuyển thẻ / ghi chú / timeline; bản phụ biến mất; hoàn tác', async () => {
    const a = (await create({ full_name: 'Trần Quốc Bảo', phone: '0938222110', email: 'bao@gmail.com', note: 'Khách cũ' })).body.data.result.contact_id;
    await act('contact.tag', { contact_id: a, tag: 'Quốc tế', op: 'add' });
    const db = await tenant();
    // Bản trùng email từ kênh (không qua create — chống trùng chặn ở create).
    const b = uuidv7();
    await db.contact.create({ data: { id: b, code: 'KH-9001', name: 'Bảo Trần', email: 'bao@gmail.com', phone: '0938000000', phoneNorm: '0938000000', source: 'zalo_personal' } });
    await db.contactNote.create({ data: { id: uuidv7(), contactId: b, body: 'Ghi chú bản phụ', authorUserId: h.user } });
    const dup = duplicatesSchema.parse((await get('/contacts/duplicates')).body.data);
    const g = dup.groups.find((x) => x.id === `${a}~${b}`);
    expect(g).toMatchObject({ by: 'Email', a: { email: 'bao@gmail.com' } });
    const pv = await act('contact.merge', { group_ids: [g!.id] });
    expect(pv.status).toBe(202);
    expect(pv.body.data).toMatchObject({ status: 'preview_required', preview: { count: 1 } });
    const ok = await call(h, '/actions/contact.merge', { input: { group_ids: [g!.id] }, confirm_token: pv.body.data.confirm_token }).then(json);
    expect(ok.body.data.result).toEqual({ merged: 1 });
    expect(ids((await get('/contacts')).body)).not.toContain(b);
    expect(await db.contactNote.count({ where: { contactId: a } })).toBe(2);
    expect(await outbox('contact.merged')).toContainEqual(expect.objectContaining({ contact_id: a, merged_ids: [b] }));
    await undo(ok.body.data.action_log_id);
    expect(ids((await get('/contacts')).body)).toContain(b);
    expect(await db.contactNote.count({ where: { contactId: b } })).toBe(1);
  });

  it('AC8 GET /contacts (D42 page + limit, lọc, q không dấu), /stats, /members, /contacts/:id (360° + layout) đúng schema FE', async () => {
    const page = (await get('/contacts?page=1&limit=2')).body;
    expect(contactsPageSchema.safeParse(page).success).toBe(true);
    expect(page.meta).toMatchObject({ page: 1, limit: 2 });
    expect(page.meta.total).toBeGreaterThanOrEqual(4);
    expect(page.data).toHaveLength(2);
    expect(page.next_cursor).toBe('2');
    const lanRow = (await get('/contacts?q=nguyen thi')).body.data;
    expect(lanRow.map((c: { full_name: string }) => c.full_name)).toEqual(['Nguyễn Thị Lan']);
    expect(lanRow[0]).toMatchObject({ owner_user_id: salesA.id, owner_name: 'sales', source_label: 'Nhập tay', stage: 'consulting', initials: 'LN', my_access: 'scope' });
    expect(ids((await get('/contacts?q=0909123456')).body)).toEqual([lanRow[0].id]);
    expect(ids((await get('/contacts?stage=consulting')).body)).toEqual([lanRow[0].id]);
    expect(ids((await get(`/contacts?owner_id=${salesB.id}`)).body)).toEqual([]);

    const stats = crmStatsSchema.parse((await get('/contacts/stats')).body.data);
    expect(stats.stages.find((s) => s.key === 'consulting')?.count).toBe(1);
    expect(stats.tag_defs.map((t) => t.label)).toEqual(expect.arrayContaining(['VIP', 'Quốc tế']));
    const members = membersListSchema.parse((await get('/members')).body.data);
    expect(members[0]).toMatchObject({ id: h.user, role: 'Chủ sở hữu' });

    const p360 = (await get(`/contacts/${lanRow[0].id}`, salesA)).body.data;
    expect(contact360Schema.safeParse(p360).success).toBe(true);
    expect(p360).toMatchObject({ name: 'Nguyễn Thị Lan', stage_label: 'Đang tư vấn', layout: { id: 'pl_sales' } });
    expect(p360.timeline.length).toBeGreaterThanOrEqual(2);
    expect((await get(`/contacts/${uuidv7()}`)).status).toBe(404);
    expect((await get('/contacts/abc')).status).toBe(404);
  });
});
