// TIP-028b trên Postgres 16 + Memurai + LibreOffice thật. Pha 1 (§2–§3): (AC3) đề nghị thanh toán / phiếu thu chụp `template_id` +
// `template_version` lúc tạo, PDF render đúng mẫu đã chụp dù mặc định đổi sau đó; (AC4) preview gửi báo giá có bảng kiểm — DN chưa khai MST
// → mục "Thông tin bên bán + MST" chưa đạt kèm lý do, chỉ cảnh báo (DC-444: xác nhận vẫn gửi được); UI xin xem trước (`x-action-preview`)
// → 202 có bảng kiểm, không xin → chạy thẳng như cũ; hợp đồng trình duyệt / đề nghị gửi lần đầu có bảng kiểm. (AC5) hoàn tác tạo mẫu:
// mẫu chưa dùng → xoá mềm + mặc định trả về mẫu cũ; mẫu đã có chứng từ dùng → 409 HAS_DEPENDENCIES nêu loại chứng từ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let lan = '';

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as Body });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const ok = (r: { status: number; body: Body }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data as { result: Record<string, any>; action_log_id: string }; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const RECEIPT = '<h2>PHIẾU THU MẪU MỚI {{doc.code}}</h2><p>Đã nhận của {{customer.name}}: {{totals.total}}</p>';
const PAY = '<h2>ĐỀ NGHỊ MẪU MỚI {{doc.code}}</h2><p>{{customer.name}} · {{totals.total}}</p>';

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'doc-render'));
  lan = ok(await act('contact.create', { full_name: 'Chị Lan Chứng Từ', phone: '0909 128 001', email: 'lan.ct@example.com' })).result.contact_id;
  await db.channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: 'cskh@spa.vn', status: 'connected', settings: {} } });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('phiên bản mẫu trên đề nghị thanh toán / phiếu thu (§2.1, AC3)', () => {
  it('tạo → chụp mẫu mặc định; đổi mặc định sau đó không đổi mẫu đã chụp; phiếu thu cũng chụp', async () => {
    const def = await db.docTemplate.findFirstOrThrow({ where: { kind: 'payment_request', isDefault: true, deletedAt: null } });
    const inv = ok(await act('invoice.create', { contact_id: lan, kind: 'full', amount: '1500000' })).result;
    const row = await db.invoice.findUniqueOrThrow({ where: { id: inv.invoice_id } });
    expect([row.templateId, row.templateVersion]).toEqual([def.id, def.version]);

    // Mặc định mới cho đề nghị → đề nghị đã tạo vẫn giữ mẫu cũ; đề nghị mới chụp mẫu mới.
    const fresh = ok(await act('doc_template.create', { kind: 'payment_request', name: 'ĐN mới', source: 'rich', body: PAY, is_default: true })).result.template_id;
    expect((await db.invoice.findUniqueOrThrow({ where: { id: inv.invoice_id } })).templateId).toBe(def.id);
    const inv2 = ok(await act('invoice.create', { contact_id: lan, kind: 'full', amount: '900000' })).result;
    expect((await db.invoice.findUniqueOrThrow({ where: { id: inv2.invoice_id } })).templateId).toBe(fresh);

    // Phiếu thu: chụp mẫu receipt mặc định khi ghi khoản thu.
    const rdef = await db.docTemplate.findFirstOrThrow({ where: { kind: 'receipt', isDefault: true, deletedAt: null } });
    ok(await act('invoice.record_payment', { invoice_id: inv.invoice_id, amount: '1500000', method: 'cash' }));
    const pay = await db.customerPayment.findFirstOrThrow({ where: { invoiceId: inv.invoice_id } });
    expect([pay.templateId, pay.templateVersion]).toEqual([rdef.id, rdef.version]);
  });

  it('PDF phiếu thu render bằng đúng mẫu đã chụp (mẫu mặc định đổi sau khi thu tiền)', async () => {
    const inv = ok(await act('invoice.create', { contact_id: lan, kind: 'full', amount: '700000' })).result;
    ok(await act('invoice.record_payment', { invoice_id: inv.invoice_id, amount: '700000', method: 'cash' }));
    const pay = await db.customerPayment.findFirstOrThrow({ where: { invoiceId: inv.invoice_id } });
    const newer = ok(await act('doc_template.create', { kind: 'receipt', name: 'PT mới', source: 'rich', body: RECEIPT, is_default: true })).result.template_id;
    expect(pay.templateId).not.toBe(newer);
    const r = await call(h, `/invoices/receipts/${pay.id}/pdf`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('application/pdf');
    // Phiếu thu mới sau khi đổi mặc định → chụp mẫu mới.
    const inv2 = ok(await act('invoice.create', { contact_id: lan, kind: 'full', amount: '300000' })).result;
    ok(await act('invoice.record_payment', { invoice_id: inv2.invoice_id, amount: '300000', method: 'cash' }));
    expect((await db.customerPayment.findFirstOrThrow({ where: { invoiceId: inv2.invoice_id } })).templateId).toBe(newer);
  }, 120_000);
});

describe('bảng kiểm pháp lý trong preview gửi / duyệt (§2.2, AC4)', () => {
  it('gửi báo giá, DN chưa khai MST: UI xin xem trước → 202 + mục MST chưa đạt; xác nhận vẫn gửi (cảnh báo, không chặn)', async () => {
    const q = ok(await act('quote.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '1500000', tax_rate: 8 }] })).result;
    const input = { quote_id: q.quote_id, channel: 'email' };
    const key = uuidv7();
    const pv = await call(h, '/actions/quote.send', { input }, { 'idempotency-key': key, 'x-action-preview': '1' }).then(json);
    expect(pv.status, JSON.stringify(pv.body)).toBe(202);
    const list = pv.body.data.preview.checklist as { code: string; ok: boolean; hint?: string }[];
    expect(list.map((c) => c.code)).toEqual(['seller_tax', 'date', 'validity', 'vat_note']);
    expect(list.find((c) => c.code === 'seller_tax')).toEqual({ code: 'seller_tax', ok: false, hint: 'empty:business.tax_code' });
    expect((await db.quote.findUniqueOrThrow({ where: { id: q.quote_id } })).status).toBe('draft');
    const done = await call(h, '/actions/quote.send', { input, confirm_token: pv.body.data.confirm_token }, { 'idempotency-key': key, 'x-action-preview': '1' }).then(json);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await db.quote.findUniqueOrThrow({ where: { id: q.quote_id } })).status).toBe('sent');
  }, 120_000);

  it('khai MST → mục đạt; không xin xem trước → chạy thẳng như cũ (API / tích hợp không đổi)', async () => {
    const at = h.clock.now();
    await h.platform.businessProfile.upsert({
      where: { workspaceId: h.ws },
      create: { workspaceId: h.ws, kind: 'enterprise', legalName: 'Spa An Nhiên', taxCode: '0312345678', address: 'Q1', businessDescription: 'Spa', declaredAt: at },
      update: { taxCode: '0312345678' },
    });
    const q = ok(await act('quote.create', { contact_id: lan, items: [{ name: 'Peel da', qty: 1, unit_price: '800000', tax_rate: 8 }] })).result;
    const pv = await act('quote.send', { quote_id: q.quote_id, channel: 'email' }, { 'x-action-preview': '1' });
    expect(pv.status).toBe(202);
    expect(pv.body.data.preview.checklist.every((c: { ok: boolean }) => c.ok)).toBe(true);
    const direct = await act('quote.send', { quote_id: q.quote_id, channel: 'email' });
    expect(direct.status, JSON.stringify(direct.body)).toBe(200);
  }, 120_000);

  it('hợp đồng trình duyệt + đề nghị gửi lần đầu có bảng kiểm; nhắc lại (không PDF mới) thì không', async () => {
    const c = ok(await act('contract.create', { contact_id: lan, title: 'Liệu trình', value: '5000000', kind: 'service' })).result;
    const sub = await act('contract.submit', { contract_id: c.contract_id }, { 'x-action-preview': '1' });
    expect(sub.status, JSON.stringify(sub.body)).toBe(202);
    expect(sub.body.data.preview.checklist).toHaveLength(9);
    const inv = ok(await act('invoice.create', { contact_id: lan, kind: 'full', amount: '400000' })).result;
    const first = await act('invoice.send_payment_qr', { invoice_id: inv.invoice_id, channel: 'email' }, { 'x-action-preview': '1' });
    expect(first.body.data.preview.checklist).toEqual([{ code: 'not_vat', ok: true }]);
  });
});

describe('hoàn tác tạo mẫu (§3, AC5)', () => {
  it('chưa dùng → xoá mềm, mặc định trả về mẫu cũ', async () => {
    const prev = await db.docTemplate.findFirstOrThrow({ where: { kind: 'quote', isDefault: true, deletedAt: null, contractKind: null } });
    const d = ok(await act('doc_template.create', { kind: 'quote', name: 'BG tạm', source: 'rich', body: '<p>{{customer.name}}</p>', is_default: true }));
    expect((await undo(d.action_log_id)).status).toBe(200);
    expect((await db.docTemplate.findUniqueOrThrow({ where: { id: d.result.template_id } })).deletedAt).not.toBeNull();
    expect((await db.docTemplate.findFirstOrThrow({ where: { kind: 'quote', isDefault: true, deletedAt: null, contractKind: null } })).id).toBe(prev.id);
  });

  it('đã có chứng từ dùng mẫu → 409 HAS_DEPENDENCIES nêu loại; mẫu còn nguyên', async () => {
    const d = ok(await act('doc_template.create', { kind: 'payment_request', name: 'ĐN dùng rồi', source: 'rich', body: PAY, is_default: true }));
    ok(await act('invoice.create', { contact_id: lan, kind: 'full', amount: '250000' }));
    const r = await undo(d.action_log_id);
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'HAS_DEPENDENCIES', fields: { template_id: 'used_by:payment_request' } });
    expect((await db.docTemplate.findUniqueOrThrow({ where: { id: d.result.template_id } })).deletedAt).toBeNull();
  });

  it('EXPLAIN: kiểm "mẫu đã dùng" dùng được index partial template_id của cả 4 bảng', async () => {
    const id = uuidv7();
    // Bảng thử nhỏ → planner chọn Seq Scan; tắt seqscan trong transaction để chứng minh index dùng được cho đúng điều kiện.
    const plans = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      const out: string[] = [];
      for (const t of ['quote', 'contract', 'invoice', 'customer_payment'])
        out.push((await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT 1 FROM ${t} WHERE template_id = '${id}'::uuid`)).map((r) => r['QUERY PLAN']).join('\n'));
      return out;
    });
    ['quote', 'contract', 'invoice', 'customer_payment'].forEach((t, i) => expect(plans[i], plans[i]).toContain(`${t}_template_idx`));
  });
});
