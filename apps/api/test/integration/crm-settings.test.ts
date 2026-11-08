// TIP-015 AC9–AC11 trên Postgres 16 + Memurai: trường dữ liệu (custom_field.* + GET /v1/settings/fields), bố cục Hồ sơ 360°
// (profile_layout.* + GET /v1/settings/profile-layouts), liên kết khách theo kênh (ContactIdentityService — C06),
// contact.export (CSV đúng scope) / contact.import (preview, trùng, khách của người khác), contact.send_email khi workspace chưa có tài khoản email gửi.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { fieldsDataSchema, profileLayoutsSchema } from '@appchat/shared';
import { ContactIdentityService, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  sales = await h.member('sales');
});
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const idem = () => ({ 'idempotency-key': uuidv7() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const confirm = async (id: string, input: unknown, headers: Record<string, string> = {}) => {
  const pv = await act(id, input, headers);
  expect(pv.body.data?.status, JSON.stringify(pv.body)).toBe('preview_required');
  return { preview: pv.body.data.preview, done: await call(h, `/actions/${id}`, { input, confirm_token: pv.body.data.confirm_token }, headers).then(json) };
};
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const tenant = async () => resolver.get(TenantContexts.system(h.ws, 't'));

describe('trường dữ liệu + bố cục', () => {
  it('AC9a custom_field.*: seed hệ thống; define → key từ nhãn; nhãn trùng 409; sửa nhãn hệ thống 422; xoá + hoàn tác; create kiểm theo định nghĩa', async () => {
    const f0 = fieldsDataSchema.parse((await get('/settings/fields?entity=contact')).body.data);
    expect(f0.data.map((f) => f.key)).toEqual(['full_name', 'phone', 'email']);
    expect(f0.counts).toMatchObject({ contact: 3, ticket: 2, order: 3, product: 4, quote: 3, appointment: 3 });
    expect((await get('/settings/fields?entity=nope')).status).toBe(422);

    const d = await act('custom_field.define', { entity: 'contact', label: 'Size áo', type: 'picklist', options: 'S / M / L', required: true, visible_in: { list: true, kanban: false, form: true, filter: false, detail: true, export: true } });
    expect(d.body.data?.result, JSON.stringify(d.body)).toEqual({ key: 'size_ao' });
    expect((await act('custom_field.define', { entity: 'contact', label: 'size AO', type: 'text' })).body.error).toMatchObject({ code: 'CONFLICT', fields: { label: 'duplicate' } });
    expect((await act('custom_field.define', { entity: 'contact', label: 'X', type: 'text' }, as(sales))).status).toBe(403);
    const f1 = (await get('/settings/fields?entity=contact')).body.data;
    expect(f1.data.at(-1)).toMatchObject({ key: 'size_ao', options: 'S/M/L', required: true, sys: false, visible_in: { list: true, form: true, detail: true, export: true, kanban: false } });

    expect((await act('custom_field.update', { entity: 'contact', fields: [{ key: 'phone', label: 'Điện thoại' }] })).body.error.fields).toEqual({ key: 'system' });
    expect((await act('custom_field.update', { entity: 'contact', fields: [{ key: 'phone', required: false }], order: ['size_ao', 'full_name'] })).body.data.result).toEqual({ updated: 1 });
    expect((await get('/settings/fields?entity=contact')).body.data.data.map((f: { key: string }) => f.key)).toEqual(['size_ao', 'full_name', 'phone', 'email']);

    // create kiểm theo định nghĩa: thiếu trường bắt buộc / lựa chọn lạ → 422; đúng → lưu.
    expect((await act('contact.create', { full_name: 'A', phone: '0912000001' }, idem())).body.error.fields).toEqual({ 'custom.size_ao': 'required' });
    expect((await act('contact.create', { full_name: 'A', phone: '0912000001', custom: { size_ao: 'XL' } }, idem())).body.error.fields).toEqual({ 'custom.size_ao': 'option' });
    const ok = await act('contact.create', { full_name: 'A', phone: '0912000001', custom: { size_ao: 'M' } }, idem());
    expect(ok.status).toBe(200);
    expect((await get('/contacts?cf.size_ao=M')).body.data.map((c: { id: string }) => c.id)).toEqual([ok.body.data.result.contact_id]);

    expect((await act('custom_field.delete', { entity: 'contact', key: 'phone' })).status).toBe(422);
    const del = await act('custom_field.delete', { entity: 'contact', key: 'size_ao' });
    expect((await get('/settings/fields?entity=contact')).body.data.data.map((f: { key: string }) => f.key)).not.toContain('size_ao');
    await undo(del.body.data.action_log_id);
    expect((await get('/settings/fields?entity=contact')).body.data.data.map((f: { key: string }) => f.key)).toContain('size_ao');
    await act('custom_field.update', { entity: 'contact', fields: [{ key: 'size_ao', required: false }] });
  });

  it('AC9b profile_layout.*: 3 mẫu hệ thống + gán vai trò; tạo / sửa (≥ 1 tab) / nhân bản / gán / xoá mẫu đang gán → về mặc định; mẫu hệ thống không xoá', async () => {
    const l0 = profileLayoutsSchema.parse((await get('/settings/profile-layouts', sales)).body.data);
    expect(l0.layouts.map((l) => l.id)).toEqual(['pl_default', 'pl_cskh', 'pl_sales']);
    expect(l0.role_assignments).toEqual({ owner: 'pl_default', manager: 'pl_default', sales: 'pl_sales', cs: 'pl_cskh', accountant: 'pl_default' });
    expect(l0.layouts.find((l) => l.id === 'pl_sales')).toMatchObject({ roles: ['sales'], created_by: 'Hệ thống' });

    const tabs = l0.layouts[0]!.tabs;
    expect((await act('profile_layout.create', { name: 'Mới', tabs }, as(sales))).status).toBe(403);
    const c = await act('profile_layout.create', { name: 'Spa VIP', tabs }, idem());
    const id = c.body.data.result.layout_id as string;
    expect((await act('profile_layout.update', { layout_id: id, patch: { tabs: tabs.map((t) => ({ ...t, enabled: false })) } })).body.error.fields).toEqual({ tabs: 'at_least_one_tab' });
    expect((await act('profile_layout.update', { layout_id: id, patch: { name: 'Spa VIP 2' } })).status).toBe(200);
    const dup = (await act('profile_layout.duplicate', { layout_id: id })).body.data.result.layout_id;
    expect((await act('profile_layout.assign_role', { role: 'sales', layout_id: id })).body.data.result).toEqual({ role: 'sales', layout_id: id });
    const l1 = profileLayoutsSchema.parse((await get('/settings/profile-layouts')).body.data);
    expect(l1.layouts.find((l) => l.id === dup)).toMatchObject({ name: 'Spa VIP 2 (bản sao)', created_by: 'Owner' });
    expect(l1.role_assignments.sales).toBe(id);
    expect((await act('profile_layout.delete', { layout_id: 'pl_cskh' })).body.error.fields).toEqual({ layout_id: 'system_template' });
    expect((await act('profile_layout.delete', { layout_id: id })).status).toBe(200);
    expect((await get('/settings/profile-layouts')).body.data.role_assignments.sales).toBe('pl_default');
    expect((await act('profile_layout.assign_role', { role: 'cs', layout_id: 'nope' })).status).toBe(404);
  });
});

describe('kênh + nhập / xuất', () => {
  it('AC10 ContactIdentityService.resolve: mới → khách nháp; cùng identity → cùng khách; kênh khác cùng SĐT → gắn vào khách có sẵn', async () => {
    const svc = h.app.get(ContactIdentityService, { strict: false });
    const db = await tenant();
    const acc1 = uuidv7();
    const acc2 = uuidv7();
    const r1 = await db.$transaction((tx) => svc.resolve(tx, { channelType: 'zalo_personal', channelAccountId: acc1, externalId: 'zl-1', displayName: 'Chị Hoa', phone: '+84 977 111 222' }, h.clock.now()));
    expect(r1).toMatchObject({ created: true, events: [{ topic: 'contact.created' }] });
    expect(await db.contact.findUniqueOrThrow({ where: { id: r1.contactId! } })).toMatchObject({ name: 'Chị Hoa', source: 'zalo_personal', ownerUserId: null, stage: 'lead', phoneNorm: '0977111222' });
    const r2 = await db.$transaction((tx) => svc.resolve(tx, { channelType: 'zalo_personal', channelAccountId: acc1, externalId: 'zl-1' }, h.clock.now()));
    expect(r2).toEqual({ contactId: r1.contactId, created: false, state: 'active', events: [] });
    const r3 = await db.$transaction((tx) => svc.resolve(tx, { channelType: 'email', channelAccountId: acc2, externalId: 'hoa@mail.vn', phone: '0977 111 222' }, h.clock.now()));
    expect(r3).toMatchObject({ contactId: r1.contactId, created: false });
    expect(await db.contactIdentity.count({ where: { contactId: r1.contactId! } })).toBe(2);
  });

  it('AC11 contact.import (preview → tạo / trùng / của người khác / lỗi) + hoàn tác; contact.export CSV đúng scope; send_email chưa có tài khoản email → 409', async () => {
    const own = (await act('contact.create', { full_name: 'Khách của sales', phone: '0988000111' }, { ...idem(), ...as(sales) })).body.data.result.contact_id;
    const rows = [
      { full_name: 'Lê Minh', phone: '0988 000 001', email: 'minh@x.vn' },
      { full_name: 'Lê Minh (dòng lặp)', phone: '0988000001' },
      { full_name: 'Trùng khách sales', phone: '0988000111' },
      { full_name: 'Không liên hệ' },
      { full_name: 'Phạm An', email: 'an@x.vn', source: 'referral' as const },
    ];
    expect((await act('contact.import', { rows }, as(sales))).status).toBe(403);
    const { preview, done } = await confirm('contact.import', { rows });
    expect(preview).toMatchObject({ count: 2, summary: 'Nhập 5 dòng: tạo 2, trùng 1, của người khác 1, lỗi 1' });
    expect(done.body.data.result).toMatchObject({ created: 2, duplicates: 1, owned: 1, invalid: 1 });
    const db = await tenant();
    expect(await db.contact.findFirst({ where: { name: 'Phạm An' } })).toMatchObject({ source: 'referral', ownerUserId: h.user });

    // Sales không có crm.export (Blueprint §3.5); Owner xuất theo lọc `owner_id` — scope đã kiểm ở danh sách (crm-contacts AC3).
    expect((await act('contact.export', {}, as(sales))).status).toBe(403);
    const ex = await act('contact.export', { owner_id: sales.id });
    const csv: string = ex.body.data.result.content;
    expect(ex.body.data.result).toMatchObject({ mime: 'text/csv', rows: 1, file_name: expect.stringMatching(/^khach-hang-\d{4}-\d{2}-\d{2}\.csv$/) });
    expect(csv.split('\r\n')[0]).toBe('﻿Mã KH,Họ tên,Số điện thoại,Email,Giai đoạn,Phụ trách,Tỉnh / thành,Nguồn,Ngày tạo');
    expect(csv).toContain('Khách của sales');
    expect(csv).not.toContain('Phạm An');

    await undo(done.body.data.action_log_id);
    // TIP-015f §5.2: hoàn tác nhập = xoá mềm (giữ dòng + biên nhận).
    expect(await db.contact.findFirst({ where: { name: 'Phạm An', deletedAt: null } })).toBeNull();
    expect((await db.contact.findFirstOrThrow({ where: { name: 'Phạm An' } })).deletedAt).not.toBeNull();

    expect((await act('contact.send_email', { contact_id: own, from: 'cskh@spa.vn', to: 'x@y.vn', subject: 'Chào', body: 'Nội dung' }, idem())).body.error).toMatchObject({ code: 'INVALID_STATE', fields: { connector: 'email' } });
  });
});
