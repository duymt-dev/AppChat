// TIP-015b P2 insight khách trên Postgres 16 thật: công nợ một công thức cho Hồ sơ 360° / thẻ CRM hợp đồng / meta đề nghị thanh toán (trả một
// phần không cộng hai lần, nháp / huỷ không tính, quá hạn theo ngày workspace); HĐ hiệu lực + giá trị + ngày hết hạn gần nhất; đơn / thu gần
// nhất; LTV = thu ròng confirmed (hoàn tiền âm đúng một lần, đơn huỷ chưa hoàn giữ tiền đã thu, điểm không tính); quyền theo module (CS không
// thấy công nợ / thu → vắng, không 0 giả); cột "AI gợi ý" theo luật; `/crm/ai` thật theo scope; không fallback `ai_summary` cũ; EXPLAIN.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { contact360Schema, contactsPageSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let lan: string;
let cs: { id: string; token: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const day = (offset: number) => new Date(Date.UTC(h.clock.now().getUTCFullYear(), h.clock.now().getUTCMonth(), h.clock.now().getUTCDate() + offset));
let n = 0;
const code = (p: string) => `${p}-IN${String(++n).padStart(4, '0')}`;

async function seed() {
  const db = await tenant();
  const now = h.clock.now();
  const order = async (status: 'new' | 'processing' | 'completed' | 'cancelled', total: number, at: number) => {
    const id = uuidv7();
    await db.order.create({ data: { id, code: code('DH'), contactId: lan, status, total: BigInt(total), subtotal: BigInt(total), ownerUserId: h.user, ...(status === 'cancelled' ? { cancelReason: 'Khách đổi ý' } : {}), createdAt: new Date(now.getTime() + at) } });
    return id;
  };
  const invoice = async (status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void', amount: number, paid: number, due: Date, orderId: string | null = null) => {
    const id = uuidv7();
    await db.invoice.create({ data: { id, code: code('TT'), contactId: lan, orderId, ownerUserId: h.user, status, amount: BigInt(amount), paidAmount: BigInt(paid), dueDate: due, ...(status === 'void' ? { voidReason: 'Lập nhầm' } : {}) } });
    return id;
  };
  const pay = (kind: 'deposit' | 'payment' | 'refund' | 'points', amount: number, at: number, ref: { invoiceId?: string; orderId?: string }, status: 'confirmed' | 'pending' = 'confirmed') =>
    db.customerPayment.create({ data: { id: uuidv7(), contactId: lan, kind, amount: BigInt(amount), method: 'cash', status, paidAt: new Date(now.getTime() + at), receiptCode: amount > 0 ? code('PT') : null, ...(kind === 'refund' ? { reason: 'Hoàn một phần' } : {}), ...ref } });

  const cancelled = await order('cancelled', 2_000_000, -5000);
  const done = await order('completed', 5_000_000, -4000);
  await order('processing', 3_000_000, -1000);
  // Công nợ: partial 3.000.000 còn 1.800.000 (chưa hạn) + overdue 1.000.000 (quá hạn) = 2.800.000, quá hạn 1.000.000; nháp / huỷ / đã trả không tính.
  const part = await invoice('partial', 3_000_000, 1_200_000, day(5), done);
  await invoice('overdue', 1_000_000, 0, day(-3));
  await invoice('draft', 9_000_000, 0, day(7));
  await invoice('void', 7_000_000, 0, day(-10));
  await invoice('paid', 500_000, 500_000, day(-1));
  // LTV: +1.200.000 (đề nghị partial) +800.000 (cọc đơn đã huỷ, chưa hoàn) +500.000 −300.000 hoàn = 2.200.000; điểm / pending không tính.
  await pay('payment', 1_200_000, -3000, { invoiceId: part });
  await pay('deposit', 800_000, -2500, { orderId: cancelled });
  await pay('payment', 500_000, -2000, { orderId: done });
  await pay('refund', -300_000, -1500, { orderId: done });
  await pay('points', 100_000, -1200, { orderId: done });
  await pay('payment', 9_999_000, -100, { orderId: done }, 'pending');
  // HĐ hiệu lực: 2 HĐ signed còn hạn (10tr hết hạn +20 ngày, 4tr không hạn); signed đã quá hạn + nháp không tính.
  const signedFile = async () => {
    const id = uuidv7();
    await db.file.create({ data: { id, storageKey: `test/${id}.pdf`, name: 'hd.pdf', mime: 'application/pdf', size: 1n, purpose: 'contract' } });
    return { signedFileId: id, signedSha256: 'a'.repeat(64) };
  };
  const contract = async (status: 'signed' | 'draft', value: number, end: Date | null) =>
    db.contract.create({ data: { id: uuidv7(), code: code('HD'), contactId: lan, status, value: BigInt(value), endDate: end, ownerUserId: h.user, ...(status === 'signed' ? await signedFile() : {}) } });
  await contract('signed', 10_000_000, day(20));
  await contract('signed', 4_000_000, null);
  await contract('signed', 6_000_000, day(-2));
  await contract('draft', 50_000_000, day(60));
  await db.contact.update({ where: { id: lan }, data: { aiSummary: 'Công nợ bí mật 99.000.000₫ — chỉ Owner' } });
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  const r = await act('contact.create', { full_name: 'Chị Lan Số Liệu', phone: '0909710001' });
  lan = r.body.data.result.contact_id;
  cs = await h.member('cs');
  await seed();
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('Hồ sơ 360° — insight', () => {
  it('Owner: công nợ / HĐ / đơn / thu / LTV đúng số; shape khớp schema; không đọc ai_summary cũ', async () => {
    const r = await get(`/contacts/${lan}`);
    expect(r.status).toBe(200);
    expect(contact360Schema.safeParse(r.body.data).success).toBe(true);
    const ins = r.body.data.insights;
    expect(ins.debt).toEqual({ due: '2800000', overdue: '1000000', open: 2 });
    expect(ins.contracts).toMatchObject({ active: 2, value: '14000000', next_end: day(20).toISOString().slice(0, 10) });
    expect(ins.recent_order).toMatchObject({ status: 'processing', amount: '3000000' });
    expect(ins.recent_payment).toMatchObject({ status: 'payment', amount: '500000' });
    expect(ins.ltv).toBe('2200000');
    expect(r.body.data.crm.kpis.length).toBe(4);
    expect(r.body.data.crm.recent_order.title).toContain('3.000.000');
    expect(r.body.data.ai_summary.bullets).toEqual([]);
    expect(JSON.stringify(r.body.data)).not.toContain('99.000.000');
  });

  it('CS (không invoice / order / contract quyền tiền): không có công nợ / thu / LTV (vắng, không 0 giả), không lộ ai_summary', async () => {
    const r = await get(`/contacts/${lan}`, cs);
    expect(r.status).toBe(200);
    const ins = r.body.data.insights;
    expect(ins.debt).toBeNull();
    expect(ins.ltv).toBeNull();
    expect(ins.recent_payment).toBeUndefined();
    expect(ins.links.quotes).toBeNull();
    expect(r.body.data.crm.kpis.map(([k]: [string]) => k)).not.toContain('Công nợ');
    expect(JSON.stringify(r.body.data)).not.toContain('99.000.000');
  });

  it('cùng công thức: thẻ CRM hợp đồng và meta đề nghị thanh toán trả cùng công nợ', async () => {
    const db = await tenant();
    const c = await db.contract.findFirstOrThrow({ where: { contactId: lan, status: 'signed' } });
    expect((await get(`/contracts/meta?contract_id=${c.id}`)).body.data.crm.debt).toBe('2800000');
    const i = await db.invoice.findFirstOrThrow({ where: { contactId: lan, status: 'partial' } });
    expect((await get(`/invoices/meta?invoice_id=${i.id}`)).body.data.crm).toMatchObject({ debt: '2800000', overdue: '1000000' });
  });
});

describe('danh sách khách — cột AI gợi ý', () => {
  it('quá hạn → nhắc thu (wait, luật); khách mới → tư vấn', async () => {
    const fresh = (await act('contact.create', { full_name: 'Anh Minh Mới', phone: '0909710002' })).body.data.result.contact_id;
    const r = await get('/contacts?page=1&limit=50');
    expect(contactsPageSchema.safeParse(r.body).success).toBe(true);
    const row = (id: string) => r.body.data.find((x: { id: string }) => x.id === id);
    expect(row(lan).ai).toMatchObject({ kind: 'wait' });
    expect(row(lan).ai.hint).toContain('1.000.000');
    expect(row(fresh).ai.kind).toBe('wait');
    expect(row(fresh).ai.hint).not.toBe('');
  });
});

describe('/crm/ai', () => {
  it('peek là tiêu đề run AI đã xong trong phạm vi người xem (không cứng)', async () => {
    const db = await tenant();
    const id = uuidv7();
    await db.aiRun.create({ data: { id, rootRunId: id, kind: 'assistant', status: 'completed', title: 'Phân tích pipeline tuần này', initiatedByUserId: h.user } });
    expect((await get('/crm/ai')).body.data.peek).toContain('Phân tích pipeline tuần này');
    expect((await get('/crm/ai', cs)).body.data.peek).not.toContain('Phân tích pipeline tuần này');
  });
});

describe('EXPLAIN', () => {
  it('công nợ dùng invoice_contact_idx · khoản thu gần nhất dùng customer_payment_contact_confirmed_idx', async () => {
    const db = await tenant();
    const plan = (sql: string) =>
      db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
        return (await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`)).map((r) => r['QUERY PLAN']).join('\n');
      });
    expect(await plan(`SELECT sum(amount - paid_amount) FROM invoice WHERE contact_id = '${lan}'::uuid AND status IN ('sent','partial','overdue')`)).toContain('invoice_contact_idx');
    expect(await plan(`SELECT id FROM customer_payment WHERE contact_id = '${lan}'::uuid AND status = 'confirmed' ORDER BY paid_at DESC, id DESC LIMIT 1`)).toContain('customer_payment_contact_confirmed_idx');
  });
});
