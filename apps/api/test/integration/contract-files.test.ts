// TIP-030b trên Postgres 16 + Memurai: hợp đồng từ tệp + mẫu theo loại. F1.1 — mẫu mặc định theo loại hợp đồng: mẫu rich loại "Mua bán"
// tạo / đọc lại / đặt mặc định; hợp đồng mua bán dùng mẫu loại, dịch vụ rơi về mặc định chung; mặc định chung + mẫu báo giá không đổi;
// contract_kind với mẫu báo giá → 422; mẫu mặc định không đổi nhóm; hoàn tác đặt mặc định trả đúng nhóm (không hai mặc định).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

type Res = { status: number; body: { data: { result: Record<string, string> & { template_id: string; contact_id: string; contract_id: string }; action_log_id: string }; error?: { fields?: Record<string, string> } } };
const json = async (r: Response): Promise<Res> => ({ status: r.status, body: (await r.json()) as Res['body'] });
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = (r: Res) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data;
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const RICH = '<h2>HỢP ĐỒNG MUA BÁN {{doc.code}}</h2><p>Bên B: {{customer.name}}</p><p>Giá trị: {{contract.value}}</p>';
const defaults = async () => (await (await tenant()).docTemplate.findMany({ where: { isDefault: true, deletedAt: null }, select: { id: true, kind: true, contractKind: true } })).map((r) => `${r.kind}:${r.contractKind ?? '*'}`).sort();

describe('mẫu hợp đồng theo loại (spec 8)', () => {
  let sale: string;
  let generic: string;
  let contact: string;

  it('mẫu loại Mua bán: tạo → đọc lại contract_kind → mặc định riêng của loại; mặc định chung + loại khác giữ nguyên', async () => {
    const before = await defaults();
    expect(before).toEqual(expect.arrayContaining(['contract:*', 'quote:*']));
    generic = (await (await tenant()).docTemplate.findFirstOrThrow({ where: { kind: 'contract', isDefault: true, contractKind: null } })).id;
    sale = ok(await act('doc_template.create', { kind: 'contract', name: 'HĐ mua bán', source: 'rich', body: RICH, contract_kind: 'sale' })).result.template_id;
    // Nhóm "Mua bán" chưa có mặc định → mẫu đầu tiên thành mặc định; mặc định chung không đổi.
    expect(await defaults()).toEqual([...before, 'contract:sale'].sort());
    const list = (await (await call(h, '/doc-templates?kind=contract')).json()) as { data: { id: string; contract_kind: string | null; is_default: boolean }[] };
    expect(list.data.find((r) => r.id === sale)).toMatchObject({ contract_kind: 'sale', is_default: true });
    expect(list.data.find((r) => r.id === generic)).toMatchObject({ contract_kind: null, is_default: true });
  });

  it('hợp đồng Mua bán dùng mẫu loại; Dịch vụ rơi về mặc định chung', async () => {
    contact = ok(await act('contact.create', { full_name: 'Khách mẫu loại', phone: '0909 777 301' })).result.contact_id;
    const c1 = ok(await act('contract.create', { contact_id: contact, kind: 'sale', value: '5000000' })).result.contract_id;
    const c2 = ok(await act('contract.create', { contact_id: contact, kind: 'service', value: '5000000' })).result.contract_id;
    const rows = await (await tenant()).contract.findMany({ where: { id: { in: [c1, c2] } }, select: { id: true, templateId: true, source: true } });
    expect(rows.find((r) => r.id === c1)).toMatchObject({ templateId: sale, source: 'template' });
    expect(rows.find((r) => r.id === c2)).toMatchObject({ templateId: generic, source: 'template' });
  });

  it('contract_kind chỉ với mẫu hợp đồng; mẫu mặc định không đổi nhóm', async () => {
    const bad = await act('doc_template.create', { kind: 'quote', name: 'Báo giá lạ', source: 'rich', body: '<p>{{customer.name}} {{totals.total}}</p>', contract_kind: 'sale' });
    expect(bad.status).toBe(422);
    expect(bad.body.error?.fields).toMatchObject({ contract_kind: 'contract_only' });
    const locked = await act('doc_template.update', { template_id: sale, contract_kind: 'service' });
    expect(locked.status).toBe(422);
    expect(locked.body.error?.fields).toMatchObject({ contract_kind: 'default_locked' });
  });

  it('đặt mẫu khác làm mặc định nhóm Mua bán rồi hoàn tác → đúng một mặc định mỗi nhóm', async () => {
    const sale2 = ok(await act('doc_template.create', { kind: 'contract', name: 'HĐ mua bán 2', source: 'rich', body: RICH, contract_kind: 'sale' })).result.template_id;
    const set = ok(await act('doc_template.update', { template_id: sale2, is_default: true }));
    const db = await tenant();
    expect((await db.docTemplate.findFirstOrThrow({ where: { kind: 'contract', contractKind: 'sale', isDefault: true, deletedAt: null } })).id).toBe(sale2);
    expect((await db.docTemplate.findFirstOrThrow({ where: { kind: 'contract', contractKind: null, isDefault: true, deletedAt: null } })).id).toBe(generic);
    expect((await call(h, `/action-logs/${set.action_log_id}/undo`, {})).status).toBe(200);
    expect((await db.docTemplate.findFirstOrThrow({ where: { kind: 'contract', contractKind: 'sale', isDefault: true, deletedAt: null } })).id).toBe(sale);
    expect(await db.docTemplate.count({ where: { kind: 'contract', contractKind: 'sale', isDefault: true, deletedAt: null } })).toBe(1);
  });
});
