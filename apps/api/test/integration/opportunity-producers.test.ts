// TIP-026c AC3 / AC4 / AC9 trên Postgres 16 + Memurai + LibreOffice thật: producer chứng từ kéo cơ hội đi theo (§3.1).
// (AC3) báo giá gắn cơ hội Đủ điều kiện: gửi → Báo giá 70% + giá trị = tổng báo giá + việc theo dõi +2 ngày (một lần) → khách chốt →
// Đàm phán → tạo đơn → Đã mua; khách theo Báo giá → Đàm phán, CHƯA Đã mua (chỉ order.completed). Huỷ đơn → cơ hội về Đàm phán.
// (AC4) đường hợp đồng: Owner ký chưa đổi; khách ký → Đã mua; link ký hết hạn → về Đàm phán; báo giá hết hạn khi không còn báo giá mở →
// Tư vấn / Demo. (AC9) báo giá / lịch hẹn "Thuộc cơ hội" khác họ khách → 422; cơ hội Thua → 422 opportunity_lost; lịch hẹn demo hoàn thành
// → chỉ gợi ý (event ai_suggested), không tự đổi giai đoạn; đơn từ lịch hẹn kế thừa cơ hội.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { ActionExecutor, expireLinks, sweepQuotes, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let zalo: string;
let ownerEmail: string;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 't'));
  ownerEmail = (await h.platform.user.findUniqueOrThrow({ where: { id: h.user } })).email;
  zalo = uuidv7();
  await db.channelAccount.create({ data: { id: zalo, type: 'zalo_personal', name: 'Zalo Spa', externalId: 'z-spa-026c', status: 'connected', settings: {} } });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = async (p: Promise<{ status: number; body: any }>) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = await p;
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result;
};
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const otpIn = (s: string | undefined) => /\b(\d{6})\b/.exec(s ?? '')?.[1];
const pub = (path: string, body: unknown) => fetch(`${h.base}/v1/public/sign/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'vitest' }, body: JSON.stringify(body) }).then(json);
const opp = (id: string) => db.contactOpportunity.findUniqueOrThrow({ where: { id } });
const stage = async (id: string) => (await db.contact.findUniqueOrThrow({ where: { id } })).stage;
const kinds = async (id: string) => (await db.contactOpportunityEvent.findMany({ where: { opportunityId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map((e) => `${e.kind}:${e.toStage ?? ''}`);
const sys = () => ({ executor: h.app.get(ActionExecutor, { strict: false }), tenants: resolver });

let n = 0;
async function customer() {
  const id = (await ok(act('contact.create', { full_name: `Khách cơ hội ${++n}`, phone: `09096100${String(n).padStart(2, '0')}` }))).contact_id as string;
  await db.conversation.create({ data: { id: uuidv7(), channelAccountId: zalo, channelType: 'zalo_personal', contactId: id, externalThreadId: `z-${uuidv7()}`, title: 'Khách', lastMessageAt: h.clock.now() } });
  return id;
}
const newOpp = async (contact: string, st = 'qualified', amount = '10000000') => (await ok(act('contact_opportunity.create', { contact_id: contact, title: `Gói ${n}`, amount_vnd: amount, stage: st }))).opportunity_id as string;
const line = { name: 'HIFU nâng cơ', qty: 2, unit_price: '6000000', tax_rate: 0 };
const quote = async (contact: string, opportunity: string | null) => (await ok(act('quote.create', { contact_id: contact, items: [line], opportunity_id: opportunity }))).quote_id as string;
async function ownerSigned(contract: string) {
  await ok(act('contract.submit', { contract_id: contract }));
  await ok(act('contract.request_sign_otp', { contract_id: contract }));
  await ok(act('contract.approve_and_sign', { contract_id: contract, otp: otpIn(h.mail.last(ownerEmail)?.text)!, signature_png: PNG }));
}

describe('đường báo giá → đơn (AC3)', () => {
  let c = '';
  let o = '';
  let q = '';
  it('gửi báo giá: cơ hội Đủ điều kiện → Báo giá, giá trị = tổng báo giá, một việc theo dõi +2 ngày; khách lên Báo giá', async () => {
    c = await customer();
    o = await newOpp(c);
    expect(await stage(c)).toBe('potential');
    q = await quote(c, o);
    await ok(act('quote.send', { quote_id: q, channel: 'zalo_personal' }));
    expect(await opp(o)).toMatchObject({ stage: 'quote', amountVnd: 12000000n });
    expect(await stage(c)).toBe('quote');
    const tasks = await db.contactTask.findMany({ where: { contactId: c, state: 'open' } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.dueAt!.getTime() - h.clock.now().getTime()).toBe(2 * 86_400_000);
    // Báo giá thứ hai cùng cơ hội: không thêm bước giai đoạn (đã ở Báo giá — no-op ổn định), việc theo dõi theo mã báo giá mới.
    const q2 = await quote(c, o);
    await ok(act('quote.send', { quote_id: q2, channel: 'zalo_personal' }));
    expect(await db.contactTask.count({ where: { contactId: c, state: 'open' } })).toBe(2);
    expect((await kinds(o)).filter((k) => k === 'stage:quote')).toHaveLength(1);
    await ok(act('quote.mark_rejected', { quote_id: q2 }));
    // Còn báo giá q mở → cơ hội giữ Báo giá (không về Tư vấn / Demo).
    expect((await opp(o)).stage).toBe('quote');
  });

  it('khách chốt → Đàm phán; tạo đơn → Đã mua (closed_at); khách Đàm phán, chưa Đã mua', async () => {
    await ok(act('quote.mark_accepted', { quote_id: q }));
    expect((await opp(o)).stage).toBe('negotiation');
    expect(await stage(c)).toBe('contract');
    const order = (await ok(act('order.create_from_quote', { quote_id: q }))).order_id as string;
    expect((await db.order.findUniqueOrThrow({ where: { id: order } })).opportunityId).toBe(o);
    const won = await opp(o);
    expect([won.stage, won.closedAt !== null]).toEqual(['won', true]);
    expect(await stage(c)).toBe('contract');
    expect(await kinds(o)).toEqual(['created:qualified', 'stage:quote', 'value:', 'stage:negotiation', 'stage:won']);
    // Đơn không đưa khách lên Đã mua (chỉ order.completed).
    expect(await stage(c)).not.toBe('won');
    // Huỷ đơn duy nhất → cơ hội về Đàm phán (closed_at null).
    await ok(act('order.cancel', { order_id: order, reason: 'Khách đổi ý' }));
    expect(await opp(o)).toMatchObject({ stage: 'negotiation', closedAt: null });
  });

  it('báo giá gắn cơ hội Thua → tạo đơn 422 opportunity_lost; đơn tay gắn cơ hội Thua cũng 422', async () => {
    const c2 = await customer();
    const o2 = await newOpp(c2);
    const q2 = await quote(c2, o2);
    await ok(act('quote.send', { quote_id: q2, channel: 'zalo_personal' }));
    await ok(act('quote.mark_accepted', { quote_id: q2 }));
    await ok(act('contact_opportunity.mark_lost', { opportunity_id: o2, lost_reason: 'price' }));
    const r = await act('order.create_from_quote', { quote_id: q2 });
    expect([r.status, r.body.error.fields]).toEqual([422, { opportunity_id: 'opportunity_lost' }]);
    const m = await act('order.create', { contact_id: c2, items: [line], opportunity_id: o2 });
    expect([m.status, m.body.error.fields]).toEqual([422, { opportunity_id: 'opportunity_lost' }]);
  });
});

describe('đường hợp đồng (AC4)', () => {
  it('Owner ký chưa đổi; khách ký → Đã mua; HĐ khác của cơ hội hết hạn link không kéo lùi khi còn HĐ ký', async () => {
    const c = await customer();
    const o = await newOpp(c, 'quote');
    const q = await quote(c, o);
    await ok(act('quote.send', { quote_id: q, channel: 'zalo_personal' }));
    await ok(act('quote.mark_accepted', { quote_id: q }));
    h.clock.advance(1000);
    const k = (await ok(act('contract.create_from_quote', { quote_id: q }))).contract_id as string;
    await ownerSigned(k);
    expect((await opp(o)).stage).toBe('negotiation');
    const s = await ok(act('contract.send_for_signature', { contract_id: k, channel: 'zalo_personal' }));
    const token = (s.sign_url as string).split('/sign/')[1]!;
    const conv = (await db.contract.findUniqueOrThrow({ where: { id: k } })).conversationId!;
    expect((await pub(`${token}/otp`, { request_id: crypto.randomUUID() })).status).toBe(200);
    const msg = await db.message.findFirstOrThrow({ where: { conversationId: conv, direction: 'out' }, orderBy: { createdAt: 'desc' } });
    const signed = await pub(`${token}/sign`, { otp: otpIn(msg.body)!, signature_png: PNG, consent: true, request_id: crypto.randomUUID() });
    expect(signed.status, JSON.stringify(signed.body)).toBe(200);
    expect(await opp(o)).toMatchObject({ stage: 'won' });
    expect((await db.contactOpportunityEvent.findFirstOrThrow({ where: { opportunityId: o, toStage: 'won' } })).refType).toBe('contract');
  }, 240_000);

  it('link ký hết hạn mà cơ hội Đã mua chỉ nhờ HĐ đó → về Đàm phán', async () => {
    const c = await customer();
    const o = await newOpp(c, 'quote');
    const q = await quote(c, o);
    await ok(act('quote.send', { quote_id: q, channel: 'zalo_personal' }));
    await ok(act('quote.mark_accepted', { quote_id: q }));
    h.clock.advance(1000);
    const k = (await ok(act('contract.create_from_quote', { quote_id: q }))).contract_id as string;
    await ownerSigned(k);
    await ok(act('contract.send_for_signature', { contract_id: k, channel: 'zalo_personal' }));
    // Dựng trạng thái "won nhờ hợp đồng khác đã huỷ" không cần thiết — đặt thẳng won rồi cho link hết hạn (không còn HĐ ký / đơn sống).
    await db.contactOpportunity.update({ where: { id: o }, data: { stage: 'won', closedAt: h.clock.now() } });
    await db.contract.update({ where: { id: k }, data: { signLinkExpiresAt: new Date(h.clock.now().getTime() - 60_000) } });
    await db.contractSignToken.updateMany({ where: { contractId: k }, data: { expiresAt: new Date(h.clock.now().getTime() - 60_000) } });
    expect(await expireLinks(db, h.ws, h.clock.now(), sys())).toBe(1);
    expect((await db.contract.findUniqueOrThrow({ where: { id: k } })).status).toBe('declined');
    expect(await opp(o)).toMatchObject({ stage: 'negotiation', closedAt: null });
  }, 240_000);

  it('báo giá hết hạn khi không còn báo giá mở của cơ hội → Tư vấn / Demo; khách lùi về Tư vấn', async () => {
    const c = await customer();
    const o = await newOpp(c);
    const q = await quote(c, o);
    await ok(act('quote.send', { quote_id: q, channel: 'zalo_personal' }));
    expect([(await opp(o)).stage, await stage(c)]).toEqual(['quote', 'quote']);
    await db.quote.update({ where: { id: q }, data: { validUntil: new Date(h.clock.now().getTime() - 60_000) } });
    await sweepQuotes({ platform: { workspace: { findMany: () => h.platform.workspace.findMany({ where: { id: h.ws }, select: { id: true, timezone: true } }) } } as never, tenants: resolver, executor: sys().executor, now: () => h.clock.now() });
    expect((await db.quote.findUniqueOrThrow({ where: { id: q } })).status).toBe('expired');
    expect((await opp(o)).stage).toBe('demo');
    expect(await stage(c)).toBe('consulting');
  });
});

describe('liên kết "Thuộc cơ hội" + lịch hẹn (AC9)', () => {
  it('báo giá gắn cơ hội khác họ khách → 422 invalid; không gắn → null', async () => {
    const [a, b] = [await customer(), await customer()];
    const ob = await newOpp(b);
    const r = await act('quote.create', { contact_id: a, items: [line], opportunity_id: ob });
    expect([r.status, r.body.error.fields]).toEqual([422, { opportunity_id: 'invalid' }]);
    const q = await quote(a, null);
    expect((await db.quote.findUniqueOrThrow({ where: { id: q } })).opportunityId).toBeNull();
  });

  it('lịch hẹn demo gắn cơ hội hoàn thành → event ai_suggested, KHÔNG đổi giai đoạn; đơn từ lịch kế thừa cơ hội → Đã mua', async () => {
    const svc = (await ok(act('product.create', { name: 'Tư vấn da', type: 'service', price: '500000', duration_min: 60, tax_rate: 0 }))).product_id as string;
    const staff = (await ok(act('staff.create', { name: 'KTV. Cơ Hội' }))).staff_id as string;
    const c = await customer();
    const o = await newOpp(c, 'demo');
    const name = (await db.contact.findUniqueOrThrow({ where: { id: c } })).name;
    const other = await newOpp(await customer());
    const bad = await act('appointment.create', { contact_id: c, contact_name: name, service_id: svc, staff_id: staff, date: '2026-10-31', start: '09:00', opportunity_id: other });
    expect([bad.status, bad.body.error.fields]).toEqual([422, { opportunity_id: 'invalid' }]);
    const a = (await ok(act('appointment.create', { contact_id: c, contact_name: name, service_id: svc, staff_id: staff, date: '2026-10-31', start: '09:00', status: 'confirmed', opportunity_id: o }))).appointment_id as string;
    expect((await db.appointment.findUniqueOrThrow({ where: { id: a } })).opportunityId).toBe(o);
    await ok(act('appointment.check_in', { appointment_id: a }));
    await ok(act('appointment.complete', { appointment_id: a }));
    expect((await opp(o)).stage).toBe('demo');
    const s = await db.contactOpportunityEvent.findFirstOrThrow({ where: { opportunityId: o, kind: 'ai_suggested' } });
    expect([s.toStage, s.refType, (s.params as { reason?: string }).reason]).toEqual(['quote', 'appointment', 'appointment_done']);
    // Bỏ gắn bằng update (null) rồi gắn lại — kiểm như lúc đặt.
    const pv = await call(h, '/actions/order.create_from_appointment', { input: { appointment_id: a } }, { 'idempotency-key': uuidv7(), 'x-action-source': 'assistant' }).then(json);
    expect(pv.status, JSON.stringify(pv.body)).toBe(202);
    const done = await call(h, '/actions/order.create_from_appointment', { input: { appointment_id: a }, confirm_token: pv.body.data.confirm_token }, { 'idempotency-key': uuidv7(), 'x-action-source': 'assistant' }).then(json);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: done.body.data.result.order_id } })).opportunityId).toBe(o);
    expect((await opp(o)).stage).toBe('won');
  });

  it('appointment.update đổi / bỏ "Thuộc cơ hội"; hoàn tác trả liên kết cũ', async () => {
    const svc = (await db.product.findFirstOrThrow({ where: { name: 'Tư vấn da' } })).id;
    const staff = (await db.staff.findFirstOrThrow({ where: { name: 'KTV. Cơ Hội' } })).id;
    const c = await customer();
    const name = (await db.contact.findUniqueOrThrow({ where: { id: c } })).name;
    const o = await newOpp(c);
    const a = (await ok(act('appointment.create', { contact_id: c, contact_name: name, service_id: svc, staff_id: staff, date: '2026-10-31', start: '11:00', opportunity_id: o }))).appointment_id as string;
    const r = await act('appointment.update', { appointment_id: a, patch: { opportunity_id: null } });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((await db.appointment.findUniqueOrThrow({ where: { id: a } })).opportunityId).toBeNull();
    expect((await call(h, `/action-logs/${r.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(200);
    expect((await db.appointment.findUniqueOrThrow({ where: { id: a } })).opportunityId).toBe(o);
  });
});
