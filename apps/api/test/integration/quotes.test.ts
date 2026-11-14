// TIP-029 AC1 trên Postgres 16 + Memurai (+ LibreOffice thật): báo giá — migration 029 + index (EXPLAIN danh sách), create (BG-1001…,
// tổng thuế sau chiết khấu), update chỉ ở nháp, ngưỡng duyệt (QUOTE_NEEDS_APPROVAL → gửi duyệt → duyệt → gửi), gửi qua hội thoại
// Zalo của khách (PDF đóng băng + link xem, valid_until cuối ngày giờ VN, timeline, giai đoạn → Báo giá), email mở chuỗi mới, link
// công khai → viewed (token sai 404), xin sửa → lần 2 cùng mã (bản cũ superseded khi gửi lần 2), gia hạn, chốt / từ chối + hoàn tác,
// quét hết hạn + nhắc T-2 + lùi giai đoạn, chuyển phụ trách kèm báo giá, quyền + scope (sales own / cs none / kế toán đọc), D42 + meta,
// AI soạn từ nội dung (giá từ catalog, ngoài danh mục buộc duyệt).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { publicQuoteSchema, quoteRowSchema, quotesMetaSchema, quotesPageSchema } from '@appchat/shared';
import { ActionExecutor, WalletService, quoteOwnerConsumer, sweepQuotes, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { drainRenders } from './helpers/doc-render';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let cs: { id: string; token: string };
let accountant: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  [sales, cs, accountant] = [await h.member('sales'), await h.member('cs'), await h.member('accountant')];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 60_000);
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
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);

const ids: Record<string, string> = {};
let zalo: string;

async function contact(key: string, name: string, phone: string, extra: Record<string, unknown> = {}, who?: { token: string }) {
  const d = ok(await act('contact.create', { full_name: name, phone, ...extra }, who));
  return (ids[key] = d.result.contact_id as string);
}

/** Hội thoại Zalo có tin khách (khách đã nhắn trước — Zalo cá nhân không nhắn chủ động). */
async function zaloConversation(contactId: string) {
  const db = await tenant();
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: zalo, channelType: 'zalo_personal', contactId, externalThreadId: `z-${id}`, title: 'Khách', lastMessageAt: h.clock.now() } });
  return id;
}

describe('chuẩn bị', () => {
  it('sản phẩm, khách, tài khoản Zalo + email', async () => {
    const p = async (key: string, input: Record<string, unknown>) => (ids[key] = ok(await act('product.create', input)).result.product_id as string);
    await p('hifu', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 });
    await p('serum', { name: 'Serum phục hồi B5', type: 'physical', price: '680000', tax_rate: 10, stock: 5 });
    await p('pkg', { name: 'Liệu trình trẻ hoá 10 buổi', type: 'package', price: '25000000', sessions: 10, valid_days: 90 });
    await contact('lan', 'Chị Lan', '0909100001', { email: 'lan@example.com' });
    // Khách của sales (scope own — sales chỉ tạo báo giá cho khách mình phụ trách / cùng phụ trách).
    await contact('vy', 'Phương Vy', '0909100002', {}, sales);
    const db = await tenant();
    zalo = uuidv7();
    await db.channelAccount.create({ data: { id: zalo, type: 'zalo_personal', name: 'Zalo Spa', externalId: 'z-spa', status: 'connected', settings: {} } });
    await db.channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: 'cskh@spa.vn', status: 'connected', settings: {} } });
  });
});

describe('migration 029 + tạo / sửa', () => {
  it('bảng + index partial; EXPLAIN danh sách theo trạng thái dùng quote_live_status_idx', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename = 'quote'`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['quote_live_status_idx', 'quote_live_owner_idx', 'quote_live_recent_idx', 'quote_contact_idx', 'quote_open_valid_until_idx', 'quote_code_version_key']));
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (await c.query(`EXPLAIN SELECT q.id FROM quote q WHERE q.deleted_at IS NULL AND q.status <> 'superseded' AND q.status = 'sent' ORDER BY q.created_at DESC, q.id DESC LIMIT 20`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      // Bảng ít dòng: planner chọn một trong hai index partial của danh sách (lọc trạng thái hoặc thứ tự mới nhất) — không Seq Scan.
      expect(plan).toMatch(/quote_live_(status|recent)_idx/);
    } finally {
      await c.end();
    }
  });

  it('create: mã BG-1001, tổng (CK dòng + CK tổng, thuế sau CK), phụ trách = người tạo; hàng không có product_id của người dùng không bị đánh dấu ngoài danh mục', async () => {
    h.clock.advance(1000);
    const d = ok(await act('quote.create', {
      contact_id: ids.lan,
      items: [
        { product_id: ids.hifu, name: 'HIFU nâng cơ', qty: 2, unit_price: '1500000', tax_rate: 8, discount: { kind: 'amount', value: '100000' } },
        { product_id: ids.serum, name: 'Serum phục hồi B5', qty: 1, unit_price: '680000', tax_rate: 10 },
        { name: 'Phí đi lại', qty: 1, unit_price: '100000', tax_rate: 0 },
      ],
      header_discount: { kind: 'amount', value: '50000' },
      payment_terms: 'Chuyển khoản 50% khi chốt',
    }));
    ids.q1 = d.result.quote_id;
    expect(d.result.code).toBe('BG-1001');
    const q = quoteRowSchema.parse((await get(`/quotes/${ids.q1}`)).body.data);
    // 3.000.000 − 100.000 + 680.000 + 100.000 = 3.680.000; CK tổng 50.000 (tổng giảm 3,97% < 5%); thuế phân bổ sau CK.
    expect(q).toMatchObject({ status: 'draft', subtotal: '3780000', discount_total: '150000', off_catalog: false, owner_user_id: h.user, approval_reasons: [] });
    expect(Number(q.total)).toBe(3680000 - 50000 + Number(q.tax_total));
    expect(q.ai.hint).toBeTruthy();
  });

  it('update ở nháp tính lại tổng; contact đổi → 422; sản phẩm lạ → 422', async () => {
    ok(await act('quote.update', { quote_id: ids.q1, patch: { header_discount: null, note: 'Khách quen' } }));
    const q = quoteRowSchema.parse((await get(`/quotes/${ids.q1}`)).body.data);
    expect(q).toMatchObject({ discount_total: '100000', note: 'Khách quen', header_discount: null });
    expect((await act('quote.update', { quote_id: ids.q1, patch: { contact_id: ids.vy } })).status).toBe(422);
    expect((await act('quote.create', { contact_id: ids.lan, items: [{ product_id: uuidv7(), name: 'X', qty: 1, unit_price: '1', tax_rate: 0 }] })).status).toBe(422);
  });
});

describe('ngưỡng duyệt + gửi', () => {
  it('tổng > 20tr → gửi bị chặn QUOTE_NEEDS_APPROVAL; sales gửi duyệt → thông báo; sales không duyệt được; owner duyệt → gửi được', async () => {
    h.clock.advance(1000);
    ids.big = ok(await act('quote.create', { contact_id: ids.vy, items: [{ product_id: ids.pkg, name: 'Liệu trình trẻ hoá 10 buổi', qty: 1, unit_price: '25000000', tax_rate: 8 }] }, sales)).result.quote_id;
    expect(quoteRowSchema.parse((await get(`/quotes/${ids.big}`)).body.data).approval_reasons).toEqual(['total']);
    const blocked = await act('quote.send', { quote_id: ids.big, channel: 'zalo_personal' }, sales);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('QUOTE_NEEDS_APPROVAL');
    ok(await act('quote.submit_for_approval', { quote_id: ids.big }, sales));
    const db = await tenant();
    const ev = await db.outboxEvent.findFirst({ where: { topic: 'notify.requested' }, orderBy: { createdAt: 'desc' } });
    expect(ev?.payload).toMatchObject({ kind: 'quote_approval', to: { permission: 'quote.approve' } });
    expect((await act('quote.approve', { quote_id: ids.big }, sales)).status).toBe(403);
    ok(await act('quote.approve', { quote_id: ids.big }));
    expect((await db.quote.findUniqueOrThrow({ where: { id: ids.big } })).approvedBy).toBe(h.user);
  });

  it('khách chưa có hội thoại Zalo → 409 no_conversation (Zalo không nhắn chủ động)', async () => {
    const r = await act('quote.send', { quote_id: ids.big, channel: 'zalo_personal' }, sales);
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toMatchObject({ channel: 'no_conversation' });
  });

  it('gửi qua Zalo: PDF đóng băng (LibreOffice), tin + tệp vào hội thoại, valid_until = cuối ngày (gửi + 15) giờ VN, timeline + giai đoạn Báo giá', async () => {
    const conv = await zaloConversation(ids.vy!);
    const d = ok(await act('quote.send', { quote_id: ids.big, channel: 'zalo_personal' }, sales));
    // TIP-028b: API trả ngay (PDF chưa có); job doc-render render + gửi tin.
    expect((await (await tenant()).quote.findUniqueOrThrow({ where: { id: ids.big } })).fileId).toBeNull();
    expect(await drainRenders(h, resolver)).toEqual([{ status: 'rendered', out: [expect.anything()] }]);
    // Đồng hồ test 2026-10-30T08:00Z (15:00 VN) → hết 14/11 23:59:59.999 VN = 16:59:59.999Z.
    expect(d.result.valid_until).toBe('2026-11-14T16:59:59.999Z');
    const db = await tenant();
    const q = await db.quote.findUniqueOrThrow({ where: { id: ids.big } });
    expect(q).toMatchObject({ status: 'sent', sentChannel: 'zalo_personal', conversationId: conv });
    expect(q.fileId).toBeTruthy();
    expect(q.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    const f = await db.file.findUniqueOrThrow({ where: { id: q.fileId! } });
    expect(f).toMatchObject({ mime: 'application/pdf', purpose: 'document', confirmed: true });
    const m = await db.message.findFirstOrThrow({ where: { conversationId: conv, direction: 'out' } });
    expect(m.kind).toBe('file');
    expect(m.body).toContain('/q/');
    expect(m.body).toContain('BG-1002');
    expect(await db.outboxMessage.count({ where: { messageId: m.id } })).toBe(1);
    expect(await db.outboxEvent.count({ where: { topic: 'quote.sent' } })).toBe(1);
    expect((await db.contact.findUniqueOrThrow({ where: { id: ids.vy } })).stage).toBe('quote');
    expect(await db.timelineEvent.count({ where: { contactId: ids.vy, type: 'quote' } })).toBe(1);
    const pdf = await call(h, `/quotes/${ids.big}/pdf`, undefined, as(sales));
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
  }, 120_000);

  it('gửi email: khách có email, chưa có hội thoại email → mở chuỗi thư mới; báo giá dưới ngưỡng gửi thẳng từ nháp', async () => {
    const d = ok(await act('quote.send', { quote_id: ids.q1, channel: 'email' }));
    await drainRenders(h, resolver);
    const db = await tenant();
    const q = await db.quote.findUniqueOrThrow({ where: { id: ids.q1 } });
    const conv = await db.conversation.findUniqueOrThrow({ where: { id: q.conversationId! } });
    expect(conv).toMatchObject({ channelType: 'email', contactId: ids.lan });
    expect(await db.emailThread.count({ where: { externalThreadId: conv.externalThreadId, address: 'lan@example.com' } })).toBe(1);
    expect(d.result.valid_until).toBeTruthy();
    expect((await act('quote.update', { quote_id: ids.q1, patch: { note: 'x' } })).status).toBe(409);
  }, 120_000);
});

describe('link công khai + xin sửa + chốt', () => {
  it('link xem: dữ liệu cho khách (không ghi chú nội bộ) → viewed + event; token sai → 404; PDF công khai', async () => {
    const db = await tenant();
    const m = await db.message.findFirstOrThrow({ where: { conversationId: (await db.quote.findUniqueOrThrow({ where: { id: ids.big } })).conversationId!, direction: 'out' } });
    ids.token = m.body.match(/\/q\/([^\s]+)/)![1]!;
    const r = await get(`/public/quotes/${ids.token}`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const v = publicQuoteSchema.parse(r.body.data);
    expect(v).toMatchObject({ code: 'BG-1002', customer: 'Phương Vy', status: 'viewed', expired: false, pdf: true });
    expect(v.items[0]).toMatchObject({ name: 'Liệu trình trẻ hoá 10 buổi', qty: 1, tax_rate: 8 });
    expect(JSON.stringify(v)).not.toContain('note');
    expect((await db.quote.findUniqueOrThrow({ where: { id: ids.big } })).status).toBe('viewed');
    expect(await db.outboxEvent.count({ where: { topic: 'quote.viewed' } })).toBe(1);
    await get(`/public/quotes/${ids.token}`);
    expect(await db.outboxEvent.count({ where: { topic: 'quote.viewed' } })).toBe(1);
    expect((await get(`/public/quotes/${ids.token.slice(0, -2)}xx`)).status).toBe(404);
    const pdf = await call(h, `/public/quotes/${ids.token}/pdf`);
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
  });

  it('xin sửa → lần 2 cùng mã (nháp, dòng sao chép), bản 1 revision_requested; gửi lần 2 → bản 1 superseded; danh sách không hiện bản cũ; versions có cả hai', async () => {
    const d = ok(await act('quote.request_revision', { quote_id: ids.big, reason: 'Khách xin bớt' }, sales));
    expect(d.result).toMatchObject({ code: 'BG-1002', version: 2 });
    ids.big2 = d.result.quote_id;
    const db = await tenant();
    expect((await db.quote.findUniqueOrThrow({ where: { id: ids.big } })).status).toBe('revision_requested');
    expect(await db.quoteItem.count({ where: { quoteId: ids.big2 } })).toBe(1);
    expect((await act('quote.request_revision', { quote_id: ids.big }, sales)).status).toBe(409);
    ok(await act('quote.update', { quote_id: ids.big2, patch: { items: [{ product_id: ids.pkg, name: 'Liệu trình trẻ hoá 10 buổi', qty: 1, unit_price: '18000000', tax_rate: 8 }] } }, sales));
    ok(await act('quote.send', { quote_id: ids.big2, channel: 'zalo_personal' }, sales));
    await drainRenders(h, resolver);
    expect((await db.quote.findUniqueOrThrow({ where: { id: ids.big } })).status).toBe('superseded');
    const list = quotesPageSchema.parse((await get('/quotes?page=1&limit=20')).body);
    expect(list.data.map((q) => q.id)).not.toContain(ids.big);
    const vs = (await get(`/quotes/${ids.big2}/versions`)).body.data as { version: number; status: string }[];
    expect(vs.map((v) => [v.version, v.status])).toEqual([[2, 'sent'], [1, 'superseded']]);
  }, 120_000);

  it('chốt + hoàn tác; từ chối → lùi giai đoạn về Đang tư vấn khi không còn báo giá mở', async () => {
    const a = ok(await act('quote.mark_accepted', { quote_id: ids.big2 }, sales));
    const db = await tenant();
    expect((await db.quote.findUniqueOrThrow({ where: { id: ids.big2 } })).status).toBe('accepted');
    expect((await undo(a.action_log_id)).status).toBe(200);
    expect((await db.quote.findUniqueOrThrow({ where: { id: ids.big2 } })).status).toBe('sent');
    ok(await act('quote.mark_rejected', { quote_id: ids.big2, reason: 'Giá cao' }, sales));
    expect((await db.contact.findUniqueOrThrow({ where: { id: ids.vy } })).stage).toBe('consulting');
    expect((await act('quote.mark_accepted', { quote_id: ids.big2 }, sales)).status).toBe(409);
  });
});

describe('hết hạn + nhắc + gia hạn', () => {
  it('nhắc T-2 một lần; quá hạn → expired + event; gia hạn expired → sent + gửi lại link', async () => {
    const db = await tenant();
    // Chỉ quét workspace của lượt test (DB dùng chung với các file test khác).
    const deps = { platform: { workspace: { findMany: () => h.platform.workspace.findMany({ where: { id: h.ws }, select: { id: true, timezone: true } }) } } as never, tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), now: () => h.clock.now() };
    h.clock.advance(13 * 86_400_000);
    const r1 = await sweepQuotes(deps);
    expect(r1.reminded).toBe(1);
    expect((await db.outboxEvent.findFirst({ where: { topic: 'notify.requested' }, orderBy: { createdAt: 'desc' } }))?.payload).toMatchObject({ kind: 'quote_expiring', to: { user_ids: [h.user] } });
    h.clock.advance(3 * 86_400_000);
    const r2 = await sweepQuotes(deps);
    expect(r2).toMatchObject({ expired: 1, reminded: 0 });
    expect((await db.quote.findUniqueOrThrow({ where: { id: ids.q1 } })).status).toBe('expired');
    expect(await db.outboxEvent.count({ where: { topic: 'quote.expired' } })).toBe(1);
    expect((await db.contact.findUniqueOrThrow({ where: { id: ids.lan } })).stage).toBe('consulting');
    const before = await db.message.count({ where: { direction: 'out' } });
    const e = ok(await act('quote.extend_validity', { quote_id: ids.q1, days: 7 }));
    expect((await db.quote.findUniqueOrThrow({ where: { id: ids.q1 } })).status).toBe('sent');
    expect(new Date(e.result.valid_until).getTime()).toBeGreaterThan(h.clock.now().getTime());
    expect(await db.message.count({ where: { direction: 'out' } })).toBe(before + 1);
  });
});

describe('quyền + scope + danh sách', () => {
  // Đồng hồ test đã tiến 16 ngày → access token cũ hết hạn: cấp lại.
  beforeAll(() => {
    for (const u of [sales, cs, accountant]) u.token = h.tokenFor(u.id);
  });

  it('sales chỉ thấy báo giá mình phụ trách (khác → 404); cs không thấy gì; kế toán đọc hết, không tạo', async () => {
    const ownerQ = ids.q1;
    expect((await get(`/quotes/${ownerQ}`, sales)).status).toBe(404);
    expect((await get(`/quotes/${ids.big2}`, sales)).status).toBe(200);
    expect(quotesPageSchema.parse((await get('/quotes?page=1&limit=20', sales)).body).data.every((q) => q.owner_user_id === sales.id)).toBe(true);
    expect((await get('/quotes', cs)).status).toBe(403);
    expect(quotesPageSchema.parse((await get('/quotes?page=1&limit=20', accountant)).body).meta.total).toBeGreaterThanOrEqual(2);
    expect((await act('quote.create', { contact_id: ids.lan, items: [{ name: 'X', qty: 1, unit_price: '1', tax_rate: 0 }] }, accountant)).status).toBe(403);
  });

  it('D42 lọc trạng thái / khách / q không dấu; meta KPI + số liệu theo báo giá', async () => {
    const s = quotesPageSchema.parse((await get('/quotes?status=rejected&page=1&limit=10')).body);
    expect(s.data.map((q) => q.id)).toEqual([ids.big2]);
    expect(quotesPageSchema.parse((await get(`/quotes?contact_id=${ids.lan}`)).body).data.map((q) => q.id)).toContain(ids.q1);
    expect(quotesPageSchema.parse((await get('/quotes?q=lieu%20trinh')).body).data.map((q) => q.id)).toEqual([ids.big2]);
    const m = quotesMetaSchema.parse((await get(`/quotes/meta?quote_id=${ids.big2}`)).body.data);
    expect(m.counts).toMatchObject({ rejected: 1, sent: 1 });
    expect(m.stats.close_rate).toBe('0%');
    expect(m.timeline.map((t) => t[0])).toEqual(['created', 'sent', 'rejected']);
    expect(m.ai_runs.analyze).toContain('0%');
  });
});

describe('xoá + AI soạn + chuyển phụ trách', () => {
  it('xoá nháp + hoàn tác; báo giá đã gửi không xoá được', async () => {
    h.clock.advance(1000);
    const id = ok(await act('quote.create', { contact_id: ids.lan, items: [{ product_id: ids.hifu, name: 'HIFU nâng cơ', qty: 1, unit_price: '1500000', tax_rate: 8 }] })).result.quote_id;
    const confirm = await act('quote.delete', { quote_id: id });
    expect(confirm.status).toBe(200);
    const db = await tenant();
    expect((await db.quote.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
    expect((await undo(confirm.body.data.action_log_id)).status).toBe(200);
    expect((await db.quote.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull();
    expect((await act('quote.delete', { quote_id: ids.q1 })).status).toBe(409);
  });

  it('AI soạn từ nội dung (model giả → bộ luật): giá từ catalog, dòng ngoài danh mục → off_catalog + buộc duyệt, giảm 5% thành CK tổng', async () => {
    const d = ok(await act('quote.draft_from_content', { contact_id: ids.lan, content: 'Chị Lan lấy HIFU nâng cơ x2 + Serum phục hồi B5, thêm Massage đá nóng, giảm 5%' }));
    expect(d.result.off_catalog).toBe(1);
    const q = quoteRowSchema.parse((await get(`/quotes/${d.result.quote_id}`)).body.data);
    expect(q.items.map((i) => [i.name, i.qty, i.unit_price])).toEqual([['HIFU nâng cơ', 2, '1500000'], ['Serum phục hồi B5', 1, '680000'], ['thêm Massage đá nóng', 1, '0']]);
    expect(q.header_discount).toEqual({ kind: 'pct', value: 5 });
    expect(q.off_catalog).toBe(true);
    expect(q.approval_reasons).toContain('off_catalog');
    const db = await tenant();
    expect(await db.aiRun.count({ where: { title: 'quote.draft_from_content' } })).toBe(1);
  });

  it('TIP-015d: event contact.owner_changed cũ trong hàng đợi không đổi báo giá (consumer chỉ ghi log, không phát lại `to`)', async () => {
    const db = await tenant();
    const open = await db.quote.findMany({ where: { contactId: ids.lan, deletedAt: null, status: { in: ['draft', 'sent'] } }, select: { id: true, ownerUserId: true, assignedUserId: true } });
    expect(open.length).toBeGreaterThan(0);
    await quoteOwnerConsumer().handle({ id: uuidv7(), topic: 'contact.owner_changed', workspaceId: h.ws, traceId: null, payload: { contact_id: ids.lan, from: h.user, to: sales.id, move: { conversations: false, quotes: true, appointments: false } } }, db);
    const after = await db.quote.findMany({ where: { id: { in: open.map((o) => o.id) } }, select: { id: true, ownerUserId: true, assignedUserId: true } });
    expect(after.sort((x, y) => x.id.localeCompare(y.id))).toEqual(open.sort((x, y) => x.id.localeCompare(y.id)));
  });
});
