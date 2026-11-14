// TIP-015g AC4 / AC6 / AC7 trên Postgres 16 + Memurai + LibreOffice thật: trong 24 giờ giữ, mọi producer chứng từ (gửi / từ chối / hết hạn
// báo giá, gửi / ký hợp đồng, hoàn tất đơn) vẫn chuyển chứng từ + event của nó nhưng KHÔNG đổi giai đoạn khách (không timeline / event
// giai đoạn); hết giữ thì trigger hợp lệ kế tiếp mới áp. (AC6) báo giá cũ của khách nguồn đã gộp hết hạn trong khi khách gốc còn báo giá
// mở → không lùi; EXPLAIN EXISTS họ khách trên 100k báo giá đi index. (AC7) quét lại / gửi lại cùng Idempotency-Key → không lặp event.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { OPEN_QUOTE_STATUSES } from '@appchat/shared';
import { ActionExecutor, WalletService, sweepQuotes, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let zalo: string;
let product: string;
let ownerEmail: string;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 't'));
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  ownerEmail = (await h.platform.user.findUniqueOrThrow({ where: { id: h.user } })).email;
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, key = uuidv7()) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': key }).then(json);
const ok = async (p: Promise<{ status: number; body: any }>) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = await p;
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result;
};
const pub = (path: string, body: unknown) => fetch(`${h.base}/v1/public/sign/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'vitest' }, body: JSON.stringify(body) }).then(json);
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const otpIn = (s: string | undefined) => /\b(\d{6})\b/.exec(s ?? '')?.[1];
const stage = async (id: string) => (await db.contact.findUniqueOrThrow({ where: { id } })).stage;
const stageEvents = (id: string) => db.outboxEvent.count({ where: { topic: 'contact.stage_changed', payload: { path: ['contact_id'], equals: id } } });
const sweepDeps = () => ({ platform: { workspace: { findMany: () => h.platform.workspace.findMany({ where: { id: h.ws }, select: { id: true, timezone: true } }) } } as never, tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), now: () => h.clock.now() });

let n = 0;
/** Khách + hội thoại Zalo, giai đoạn `stage`; `held` = kéo tay 1 giờ trước (còn giữ). */
async function customer(st: string, held: boolean) {
  const id = await ok(act('contact.create', { full_name: `Khách producer ${++n}`, phone: `09095200${String(n).padStart(2, '0')}` })).then((r) => r.contact_id as string);
  await db.$executeRaw`UPDATE contact SET stage = ${st}::contact_stage, stage_set_manually_at = ${held ? new Date(h.clock.now().getTime() - 3_600_000).toISOString() : null}::timestamptz WHERE id = ${id}::uuid`;
  await db.conversation.create({ data: { id: uuidv7(), channelAccountId: zalo, channelType: 'zalo_personal', contactId: id, externalThreadId: `z-${uuidv7()}`, title: 'Khách', lastMessageAt: h.clock.now() } });
  return id;
}
const quote = (contact: string) => ok(act('quote.create', { contact_id: contact, items: [{ product_id: product, name: 'HIFU', qty: 1, unit_price: '1500000', tax_rate: 8 }] })).then((r) => r.quote_id as string);
const sentQuote = async (contact: string) => {
  const q = await quote(contact);
  await db.quote.update({ where: { id: q }, data: { status: 'sent', sentAt: h.clock.now(), validUntil: new Date(h.clock.now().getTime() + 86_400_000) } });
  return q;
};
async function ownerSigned(contact: string) {
  h.clock.advance(1000);
  const id = (await ok(act('contract.create', { contact_id: contact, kind: 'service', value: '3000000' }))).contract_id as string;
  await ok(act('contract.submit', { contract_id: id }));
  await ok(act('contract.request_sign_otp', { contract_id: id }));
  await ok(act('contract.approve_and_sign', { contract_id: id, otp: otpIn(h.mail.last(ownerEmail)?.text)!, signature_png: PNG }));
  return id;
}

describe('chuẩn bị', () => {
  it('Zalo + sản phẩm', async () => {
    zalo = uuidv7();
    await db.channelAccount.create({ data: { id: zalo, type: 'zalo_personal', name: 'Zalo Spa', externalId: 'z-spa-015g', status: 'connected', settings: {} } });
    product = (await ok(act('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 }))).product_id;
  });
});

describe('ma trận producer khi đang giữ (AC4)', () => {
  it('gửi báo giá: chứng từ sent, giai đoạn giữ nguyên; hết giữ → gửi tiếp nâng Báo giá', async () => {
    const c = await customer('consulting', true);
    const q = await quote(c);
    await ok(act('quote.send', { quote_id: q, channel: 'zalo_personal' }));
    expect((await db.quote.findUniqueOrThrow({ where: { id: q } })).status).toBe('sent');
    expect([await stage(c), await stageEvents(c)]).toEqual(['consulting', 0]);
    await db.$executeRaw`UPDATE contact SET stage_set_manually_at = ${new Date(h.clock.now().getTime() - 86_400_000).toISOString()}::timestamptz WHERE id = ${c}::uuid`;
    await ok(act('quote.send', { quote_id: await quote(c), channel: 'zalo_personal' }));
    expect([await stage(c), await stageEvents(c)]).toEqual(['quote', 1]);
  }, 120_000);

  it('từ chối báo giá: rejected, không lùi khi giữ; hết giữ → từ chối báo giá cuối lùi Đang tư vấn', async () => {
    const c = await customer('quote', true);
    const [q1, q2] = [await sentQuote(c), await sentQuote(c)];
    await ok(act('quote.mark_rejected', { quote_id: q1 }));
    expect((await db.quote.findUniqueOrThrow({ where: { id: q1 } })).status).toBe('rejected');
    await db.quote.update({ where: { id: q2 }, data: { status: 'rejected' } });
    expect([await stage(c), await stageEvents(c)]).toEqual(['quote', 0]);
    h.clock.advance(86_400_000);
    await ok(act('quote.mark_rejected', { quote_id: await sentQuote(c) }));
    expect(await stage(c)).toBe('consulting');
  });

  it('hết hạn (action riêng hệ thống): expired + event, giai đoạn giữ; quét lại không lặp (AC7)', async () => {
    const c = await customer('quote', true);
    const q = await sentQuote(c);
    await db.quote.update({ where: { id: q }, data: { validUntil: new Date(h.clock.now().getTime() - 60_000) } });
    expect((await sweepQuotes(sweepDeps())).expired).toBeGreaterThanOrEqual(1);
    expect((await db.quote.findUniqueOrThrow({ where: { id: q } })).status).toBe('expired');
    expect(await db.outboxEvent.count({ where: { topic: 'quote.expired', payload: { path: ['quote_id'], equals: q } } })).toBe(1);
    expect([await stage(c), await stageEvents(c)]).toEqual(['quote', 0]);
    await sweepQuotes(sweepDeps());
    expect(await db.outboxEvent.count({ where: { topic: 'quote.expired', payload: { path: ['quote_id'], equals: q } } })).toBe(1);
  });

  it('gửi ký + khách ký hợp đồng: chứng từ chuyển, giai đoạn giữ; hết giữ → gửi ký nâng Hợp đồng', async () => {
    const c = await customer('quote', true);
    const id = await ownerSigned(c);
    const s = await ok(act('contract.send_for_signature', { contract_id: id, channel: 'zalo_personal' }));
    expect([await stage(c), await stageEvents(c)]).toEqual(['quote', 0]);
    const token = (s.sign_url as string).split('/sign/')[1]!;
    const conv = (await db.contract.findUniqueOrThrow({ where: { id } })).conversationId!;
    expect((await pub(`${token}/otp`, { request_id: crypto.randomUUID() })).status).toBe(200);
    const msg = await db.message.findFirstOrThrow({ where: { conversationId: conv, direction: 'out' }, orderBy: { createdAt: 'desc' } });
    const signed = await pub(`${token}/sign`, { otp: otpIn(msg.body)!, signature_png: PNG, consent: true, request_id: crypto.randomUUID() });
    expect(signed.status, JSON.stringify(signed.body)).toBe(200);
    expect((await db.contract.findUniqueOrThrow({ where: { id } })).status).toBe('signed');
    expect([await stage(c), await stageEvents(c)]).toEqual(['quote', 0]);
    h.clock.advance(86_400_000);
    await ok(act('contract.send_for_signature', { contract_id: await ownerSigned(c), channel: 'zalo_personal' }));
    expect([await stage(c), await stageEvents(c)]).toEqual(['contract', 1]);
  }, 240_000);

  it('hoàn tất đơn: completed + tổng chi, giai đoạn giữ (đơn không rollback); hết giữ → Đã mua; gửi lại cùng khoá không lặp (AC7)', async () => {
    const c = await customer('contract', true);
    const order = async () => {
      const o = (await ok(act('order.create', { contact_id: c, items: [{ name: 'Serum', qty: 1, unit_price: '300000', tax_rate: 0 }] }))).order_id as string;
      await ok(act('order.confirm', { order_id: o }));
      return o;
    };
    const o1 = await order();
    await ok(act('order.complete', { order_id: o1 }));
    expect((await db.order.findUniqueOrThrow({ where: { id: o1 } })).status).toBe('completed');
    expect((await db.contact.findUniqueOrThrow({ where: { id: c } })).totalSpent).toBe(300000n);
    expect([await stage(c), await stageEvents(c)]).toEqual(['contract', 0]);
    h.clock.advance(86_400_000);
    const o2 = await order();
    const key = uuidv7();
    await ok(act('order.complete', { order_id: o2 }, key));
    await ok(act('order.complete', { order_id: o2 }, key));
    expect([await stage(c), await stageEvents(c)]).toEqual(['won', 1]);
  });
});

describe('họ khách sau gộp (AC6)', () => {
  it('báo giá cũ của nguồn đã gộp hết hạn khi gốc còn báo giá mở → không lùi; hết báo giá mở → lùi trên gốc', async () => {
    const root = await customer('quote', false);
    const src = await customer('quote', false);
    const old = await sentQuote(src);
    const open = await sentQuote(root);
    await db.$executeRaw`UPDATE contact SET merged_into_id = ${root}::uuid, deleted_at = ${h.clock.now()} WHERE id = ${src}::uuid`;
    await db.quote.update({ where: { id: old }, data: { validUntil: new Date(h.clock.now().getTime() - 60_000) } });
    await sweepQuotes(sweepDeps());
    expect((await db.quote.findUniqueOrThrow({ where: { id: old } })).status).toBe('expired');
    expect([await stage(root), await stageEvents(root)]).toEqual(['quote', 0]);
    await db.quote.update({ where: { id: open }, data: { validUntil: new Date(h.clock.now().getTime() - 60_000) } });
    await sweepQuotes(sweepDeps());
    expect([await stage(root), await stageEvents(root)]).toEqual(['consulting', 1]);
    expect(await stage(src)).toBe('quote');
  });

  it('EXPLAIN EXISTS họ khách trên 100k báo giá → seek index theo contact_id, không Seq Scan', async () => {
    const base = await customer('quote', false);
    const spread = `KQ${Date.now()}`;
    await db.$executeRawUnsafe(`INSERT INTO contact (id, code, name, source) SELECT gen_random_uuid(), '${spread}' || g, 'Nền ' || g, 'manual' FROM generate_series(1, 2000) g`);
    await db.$executeRawUnsafe(`WITH x AS (SELECT g, gen_random_uuid() AS id FROM generate_series(1, 100000) g)
      INSERT INTO quote (id, code, version, root_quote_id, contact_id, owner_user_id, status)
      SELECT x.id, 'BG-E${spread}' || x.g, 1, x.id, (SELECT id FROM contact WHERE code = '${spread}' || (1 + x.g % 2000)), '${h.user}'::uuid,
             (ARRAY['draft','accepted','rejected','sent'])[1 + x.g % 4]::quote_status FROM x`);
    await db.$executeRawUnsafe('ANALYZE quote');
    const dense = await db.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM contact WHERE code IN ('${spread}1', '${spread}2')`);
    const fam = [base, ...dense.map((r) => r.id)];
    const rows = await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
      `EXPLAIN SELECT EXISTS (SELECT 1 FROM quote WHERE contact_id = ANY($1::uuid[]) AND status = ANY($2::quote_status[]) AND deleted_at IS NULL AND id <> $3::uuid) AS x`,
      fam,
      [...OPEN_QUOTE_STATUSES],
      uuidv7(),
    );
    const plan = rows.map((r) => r['QUERY PLAN']).join('\n');
    // Seek theo contact_id (015d quote_contact_status_idx (contact_id, status, id) hoặc 029 quote_contact_idx) — không quét bảng.
    expect(plan).toMatch(/(Index (Only )?Scan|Bitmap Index Scan) on quote_contact_(status_)?idx|Index (Only )?Scan using quote_contact_(status_)?idx/);
    expect(plan).not.toMatch(/Seq Scan on quote/);
  }, 120_000);
});
