// TIP-025b §D.4 trên Postgres 16: phiên bản lạc quan của khách — trigger tăng version ở MỌI UPDATE (kể cả writer cũ không gửi version,
// chuyển phụ trách); contact.update có if_version: hai lệnh cùng version → một thắng, một 409 STALE_VERSION; kết quả trả version mới;
// chỉ ghi trường thực sự đổi; undo chỉ khôi phục trường đã đổi và từ chối khi đã có sửa sau; không ghi được version tay.
// GET /contacts/:id/edit-context (= contact.get_edit_context): version hiện hành, quyền sửa / chuyển; watcher chỉ đọc; ngoài scope 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let lan = '';

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as Body });
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? { authorization: `Bearer ${who.token}` } : {}).then(json);
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const row = async () => (await tenant()).contact.findUniqueOrThrow({ where: { id: lan } });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  const r = await act('contact.create', { full_name: 'Nguyễn Thị Lan', phone: '0909 800 001' });
  lan = r.body.data.result.contact_id;
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('phiên bản khách (§D.4)', () => {
  it('mới tạo version 1; writer cũ (không version) vẫn tăng; ghi version tay không có tác dụng', async () => {
    expect((await row()).version).toBe(1);
    await (await tenant()).contact.update({ where: { id: lan }, data: { city: 'Hà Nội' } });
    expect((await row()).version).toBe(2);
    await (await tenant()).contact.update({ where: { id: lan }, data: { version: 1, district: 'Ba Đình' } });
    expect((await row()).version).toBe(3);
  });

  it('hai lệnh cùng if_version chạy song song → một thắng, một 409 STALE_VERSION; kết quả trả version mới', async () => {
    const v = (await row()).version;
    const [a, b] = await Promise.all([act('contact.update', { contact_id: lan, if_version: v, patch: { title: 'Chủ shop' } }), act('contact.update', { contact_id: lan, if_version: v, patch: { title: 'Quản lý' } })]);
    const s = [a.status, b.status].sort();
    expect(s).toEqual([200, 409]);
    const win = a.status === 200 ? a : b;
    const lose = a.status === 200 ? b : a;
    expect(lose.body.error.code).toBe('STALE_VERSION');
    expect(win.body.data.result.version).toBe(v + 1);
    expect((await row()).version).toBe(v + 1);
  });

  it('không gửi if_version vẫn sửa được (tương thích); không đổi gì → không tăng version', async () => {
    const v = (await row()).version;
    const r = await act('contact.update', { contact_id: lan, patch: { city: 'TP.HCM' } });
    expect([r.status, r.body.data.result.version]).toEqual([200, v + 1]);
    const same = await act('contact.update', { contact_id: lan, patch: { city: 'TP.HCM' } });
    expect([same.status, same.body.data.result.version]).toEqual([200, v + 1]);
  });

  it('undo chỉ khôi phục trường đã đổi; có sửa sau (kể cả writer hệ thống) → 409, không ghi đè', async () => {
    const r = await act('contact.update', { contact_id: lan, if_version: (await row()).version, patch: { title: 'Giám đốc' } });
    const log = r.body.data.action_log_id;
    await (await tenant()).contact.update({ where: { id: lan }, data: { address: '12 Lý Thường Kiệt' } });
    expect((await undo(log)).status).toBe(409);
    expect((await row()).title).toBe('Giám đốc');
    const r2 = await act('contact.update', { contact_id: lan, if_version: (await row()).version, patch: { title: 'Trưởng phòng' } });
    const u = await undo(r2.body.data.action_log_id);
    expect(u.status, JSON.stringify(u.body)).toBe(200);
    const after = await row();
    expect([after.title, after.address]).toEqual(['Giám đốc', '12 Lý Thường Kiệt']);
  });
});

describe('ngữ cảnh form sửa (§D.3)', () => {
  it('Owner: version hiện hành + sửa / chuyển được; action đọc trả cùng dữ liệu', async () => {
    const r = await get(`/contacts/${lan}/edit-context`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data).toMatchObject({ id: lan, version: (await row()).version, editable: true, can_transfer: true, values: { full_name: 'Nguyễn Thị Lan' }, hidden_fields: [] });
    const a = await act('contact.get_edit_context', { contact_id: lan });
    expect(a.body.data.result.version).toBe(r.body.data.version);
  });

  it('watcher: thấy nhưng editable false, không chuyển được; người ngoài scope → 404', async () => {
    const w = await h.member('sales');
    await (await tenant()).contactCollaborator.create({ data: { contactId: lan, userId: w.id, role: 'watcher' } });
    const r = await get(`/contacts/${lan}/edit-context`, w);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect([r.body.data.editable, r.body.data.can_transfer]).toEqual([false, false]);
    const other = await h.member('sales');
    expect((await get(`/contacts/${lan}/edit-context`, other)).status).toBe(404);
  });
});
