// TIP-028 AC1 trên Postgres 16 + Memurai: mẫu chứng từ — migration 028 (4 mẫu mặc định, một mặc định mỗi loại, EXPLAIN), tạo mẫu rich
// (biến lạ 422, làm sạch HTML, bảng kiểm lưu cùng mẫu), tải DOCX (purpose document) → detect_fields (model giả → bộ luật; vị trí thật
// trong tệp) → lưu khi đã xác nhận (vị trí bịa 422, .docm / macro 422), update + if_version 409 + đặt mặc định + hoàn tác, xoá (mặc
// định 409) + hoàn tác, quyền (sales chỉ đọc danh sách — kế toán 403), GET /doc-templates khớp schema, PDF xem trước (LibreOffice).
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { docTemplatesListSchema } from '@appchat/shared';
import { WalletService, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let accountant: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  [sales, accountant] = [await h.member('sales'), await h.member('accountant')];
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
});
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const list = async (kind?: string) => docTemplatesListSchema.parse((await get(`/doc-templates${kind ? `?kind=${kind}` : ''}`)).body).data;
const fx = (n: string) => readFileSync(join(import.meta.dirname, '../../../../packages/core/test/fixtures/documents', n));

async function upload(name: string, body: Buffer) {
  const form = new FormData();
  form.set('purpose', 'document');
  form.set('file', new Blob([new Uint8Array(body)]), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.token}` }, body: form });
  return (await json(r)).body.data?.file_id as string;
}

describe('migration 028 + danh sách', () => {
  it('4 mẫu mặc định (rich, có biến hợp lệ; đề nghị thanh toán / phiếu thu có dòng không thay thế HĐ GTGT); một mặc định mỗi loại', async () => {
    const rows = await list();
    expect(rows.map((r) => [r.kind, r.is_default, r.source])).toEqual([
      ['quote', true, 'rich'],
      ['contract', true, 'rich'],
      ['payment_request', true, 'rich'],
      ['receipt', true, 'rich'],
    ]);
    expect(rows.find((r) => r.kind === 'receipt')!.body).toContain('không thay thế hoá đơn giá trị gia tăng');
    expect(rows[0]!.updated_by).toBe('Hệ thống');
    expect((await list('quote')).length).toBe(1);
    expect((await get('/doc-templates?kind=lạ')).status).toBe(400);
    const db = await tenant();
    await expect(db.$executeRawUnsafe(`UPDATE doc_template SET is_default = true WHERE id = (SELECT id FROM doc_template WHERE kind = 'quote' LIMIT 1) AND false`)).resolves.toBe(0);
    const plan = (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT id FROM doc_template WHERE deleted_at IS NULL AND kind = 'quote' ORDER BY is_default DESC, updated_at DESC, id`)).map((r) => r['QUERY PLAN']).join('\n');
    expect(plan).toMatch(/doc_template_live_kind_idx|Seq Scan/);
    // Mặc định chia nhóm từ TIP-030b: chung (contract_kind rỗng) + riêng từng loại hợp đồng.
    const idx = await db.$queryRawUnsafe<{ indexdef: string }[]>(`SELECT indexdef FROM pg_indexes WHERE indexname IN ('doc_template_live_kind_idx', 'doc_template_default_uq', 'doc_template_default_kind_uq') ORDER BY indexname`);
    expect(idx.map((x) => x.indexdef).join('\n')).toMatch(
      /UNIQUE INDEX doc_template_default_kind_uq .*\(kind, contract_kind\) WHERE \(is_default AND \(deleted_at IS NULL\) AND \(contract_kind IS NOT NULL\)\)[\s\S]*UNIQUE INDEX doc_template_default_uq .*\(kind\) WHERE \(is_default AND \(deleted_at IS NULL\) AND \(contract_kind IS NULL\)\)[\s\S]*\(kind, is_default DESC, updated_at DESC, id\) WHERE \(deleted_at IS NULL\)/,
    );
  });

  it('quyền: sales đọc danh sách (chọn mẫu khi báo giá), không tạo; kế toán 403', async () => {
    expect((await get('/doc-templates', sales)).status).toBe(200);
    expect((await get('/doc-templates', accountant)).status).toBe(403);
    expect((await act('doc_template.create', { kind: 'quote', name: 'X', source: 'rich', body: '{{customer.name}}' }, sales)).status).toBe(403);
  });
});

let rich: string;
describe('mẫu rich', () => {
  it('biến lạ / vòng sai → 422; làm sạch script; bảng kiểm lưu cùng mẫu; is_default chuyển cờ', async () => {
    const bad = await act('doc_template.create', { kind: 'quote', name: 'Sai', source: 'rich', body: '{{customer.name}} {{contract.value}}' });
    expect(bad).toMatchObject({ status: 422, body: { error: { fields: { body: 'unknown_vars:contract.value' } } } });
    expect((await act('doc_template.create', { kind: 'quote', name: 'Sai', source: 'rich', body: '{{#items}}{{name}}' })).status).toBe(422);
    expect((await act('doc_template.create', { kind: 'quote', name: 'Rỗng', source: 'rich', body: '<p>Không biến</p>' })).status).toBe(422);
    h.clock.advance(1000);
    const r = ok(await act('doc_template.create', { kind: 'quote', name: 'Báo giá ngắn', source: 'rich', body: '<p onclick="x()">Kính gửi {{customer.name}}</p><script>alert(1)</script>{{#items}}<p>{{name}} {{amount}}</p>{{/items}}<p>Hiệu lực đến {{doc.valid_until}}</p>', is_default: true }));
    rich = r.result.template_id;
    const rows = await list('quote');
    expect(rows.map((x) => [x.name, x.is_default])).toEqual([['Báo giá ngắn', true], ['Báo giá chuẩn', false]]);
    const mine = rows[0]!;
    expect(mine.body).not.toMatch(/script|onclick/);
    expect(mine.checklist_missing).toEqual(['seller_tax', 'date', 'vat_note']);
    expect(mine.updated_by).toBe('Owner');
  });

  it('update: if_version lệch 409; sửa thân → version + 1; hoàn tác → nội dung cũ, mặc định cũ', async () => {
    expect((await act('doc_template.update', { template_id: rich, name: 'X', if_version: 9 })).body.error.code).toBe('STALE_VERSION');
    const old = (await list('quote')).find((x) => x.name === 'Báo giá chuẩn')!;
    const u = ok(await act('doc_template.update', { template_id: old.id, body: '<p>{{customer.name}} · MST {{business.tax_code}}</p>', is_default: true, if_version: 1 }));
    expect(u.result).toEqual({ template_id: old.id, version: 2 });
    expect((await list('quote')).find((x) => x.id === old.id)).toMatchObject({ is_default: true, version: 2 });
    expect((await act('doc_template.update', { template_id: old.id, is_default: false })).status).toBe(422);
    expect((await call(h, `/action-logs/${u.action_log_id}/undo`, {})).status).toBe(200);
    const back = (await list('quote')).find((x) => x.id === old.id)!;
    expect(back).toMatchObject({ is_default: false, version: 3 });
    expect(back.body).toContain('BÁO GIÁ {{doc.code}}');
    expect((await list('quote')).find((x) => x.id === rich)!.is_default).toBe(true);
  });

  it('xoá: mặc định 409; mẫu khác xoá mềm + hoàn tác', async () => {
    expect((await act('doc_template.delete', { template_id: rich })).body.error.code).toBe('CONFLICT');
    const other = (await list('quote')).find((x) => !x.is_default)!;
    const d = ok(await act('doc_template.delete', { template_id: other.id }));
    expect((await list('quote')).length).toBe(1);
    expect((await call(h, `/action-logs/${d.action_log_id}/undo`, {})).status).toBe(200);
    expect((await list('quote')).length).toBe(2);
  });
});

describe('mẫu DOCX', () => {
  let fileId: string;
  it('detect_fields: model giả không ra JSON → bộ luật; vị trí có trong tệp; bảng kiểm hợp đồng', async () => {
    fileId = await upload('hop-dong-spa.docx', fx('hop-dong-spa.docx'));
    const r = ok(await act('doc_template.detect_fields', { kind: 'contract', file_id: fileId }));
    const by = Object.fromEntries((r.result.fields as { variable: string; placeholder: string }[]).map((f) => [f.variable, f.placeholder]));
    expect(by['customer.name']).toMatch(/^BÊN B:/);
    expect(by['contract.value']).toMatch(/^Giá trị hợp đồng:/);
    expect((r.result.checklist as { key: string; ok: boolean }[]).find((c) => c.key === 'dispute')).toEqual({ key: 'dispute', ok: true });
    // Run AI được ghi (tốn credit như mọi run); hết credit → vẫn ra gợi ý theo bộ luật.
    expect(await (await tenant()).aiRun.count({ where: { title: 'doc_template.detect_fields', status: 'completed' } })).toBe(1);
  });

  it('lưu: vị trí bịa / biến sai loại 422; xác nhận → lưu field_map + tệp confirmed; tệp macro / không phải docx 422', async () => {
    const fields = (ok(await act('doc_template.detect_fields', { kind: 'contract', file_id: fileId })).result.fields as { placeholder: string; variable: string }[]).map(({ placeholder, variable }) => ({ placeholder, variable }));
    const bịa = await act('doc_template.create', { kind: 'contract', name: 'HĐ spa', source: 'docx', file_id: fileId, fields: [...fields, { placeholder: 'Không có', variable: 'doc.code' }] });
    expect(bịa.body.error.fields).toEqual({ [`fields.${fields.length}.placeholder`]: 'not_in_file' });
    expect((await act('doc_template.create', { kind: 'contract', name: 'HĐ spa', source: 'docx', file_id: fileId, fields: [{ placeholder: fields[0]!.placeholder, variable: 'payment.vietqr' }] })).status).toBe(422);
    expect((await act('doc_template.create', { kind: 'contract', name: 'HĐ spa', source: 'docx', file_id: fileId })).status).toBe(422);
    const r = ok(await act('doc_template.create', { kind: 'contract', name: 'HĐ spa', source: 'docx', file_id: fileId, fields }));
    const row = (await list('contract')).find((x) => x.id === r.result.template_id)!;
    expect(row).toMatchObject({ source: 'docx', file_name: 'hop-dong-spa.docx', file_id: fileId, is_default: false, fields });
    expect((await (await tenant()).file.findUniqueOrThrow({ where: { id: fileId } })).confirmed).toBe(true);

    const z = new PizZip(fx('hop-dong-spa.docx'));
    z.file('word/vbaProject.bin', 'x');
    // TIP-045b: macro trong gói DOCX và đuôi .docm bị chặn ngay ở cổng tải tệp — không có file_id (lớp domain có unit test riêng).
    expect(await upload('mau.docx', z.generate({ type: 'nodebuffer' }))).toBeUndefined();
    expect(await upload('mau.docm', Buffer.from('x'))).toBeUndefined();
  });

  it('PDF xem trước: rich + docx (LibreOffice) → application/pdf; sales không xem được', async () => {
    const docx = (await list('contract')).find((x) => x.source === 'docx')!;
    for (const id of [rich, docx.id]) {
      const r = await call(h, `/doc-templates/${id}/preview`);
      expect(r.status, await r.clone().text()).toBe(200);
      expect(r.headers.get('content-type')).toBe('application/pdf');
      expect(Buffer.from(await r.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
    }
    expect((await get(`/doc-templates/${rich}/preview`, sales)).status).toBe(403);
    expect((await get(`/doc-templates/${uuidv7()}/preview`)).status).toBe(404);
  }, 120_000);
});
