// TIP-033c (AC1–AC6): gợi ý tạo đơn từ lịch hẹn là phép chiếu HIỆN HÀNH từ dữ kiện bền — đọc lại sau tải lại; theo hội thoại chỉ lịch gắn
// đúng hội thoại + họ khách; chưa xong / đã có đơn / dịch vụ ngừng bán → không thẻ (liệu trình → 409 ở booking.test); tạo đơn chỉ qua
// order.create_from_appointment với xác nhận ràng giá / version (đổi giá sau xem trước → 409 stale, 0 ghi); hai xác nhận song song khác
// khoá → một đơn; token đã dùng không tạo thêm đơn; hoàn thành lịch không tự tạo đơn. Trợ lý (§2.2): khối GenUI `appointment_order` chỉ
// nhận lịch còn thẻ cho người dùng (đã có đơn → model sửa một lần), lưu cây không giá, mở lại phiên dựng lại không gọi model.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, GenUiIntents, REDIS, WalletService, assistantTurn, createLogger, uuidv7, type AssistantDeps } from '@appchat/core';
import { assistantMessageSchema, authzForRole, type GenUiPart } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const s = {} as Record<'lan' | 'vy' | 'svc' | 'staff' | 'conv' | 'conv2' | 'acc', string>;
let sales: { id: string };
let acct: { id: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { id: string }): Record<string, string> => (u ? { authorization: `Bearer ${h.tokenFor(u.id)}` } : {});
const act = (id: string, input: unknown, who?: { id: string }, extra: Record<string, unknown> = {}, key = uuidv7()) =>
  call(h, `/actions/${id}`, { input, ...extra }, { 'idempotency-key': key, ...as(who) }).then(json);
const db = () => resolver.get(TenantContexts.system(h.ws, 'aos'));
const suggest = (input: unknown, who?: { id: string }) => act('appointment.order_suggestions', input, who);
const ids = (r: { data: { appointment_id: string }[] }) => r.data.map((x) => x.appointment_id);
const preview = async (id: string, who?: { id: string }) => {
  const r = await act('order.create_from_appointment', { appointment_id: id }, who);
  expect(r.body.data?.status, JSON.stringify(r.body)).toBe('preview_required');
  return r.body.data.confirm_token as string;
};
const confirm = (id: string, token: string, who?: { id: string }, key?: string) => act('order.create_from_appointment', { appointment_id: id }, who, { confirm_token: token }, key);

// Mỗi lịch một khung giờ riêng (ràng buộc không chồng giờ theo nhân sự) — lùi dần về quá khứ; `endMin` cộng thêm để xếp thứ tự.
let slot = 0;
async function appt(o: { contact?: string; conv?: string | null; status?: 'done' | 'pending'; service?: string; owner?: string | null; endMin?: number }) {
  const id = uuidv7();
  const start = new Date(h.clock.now().getTime() - (++slot) * 3 * 3_600_000 + (o.endMin ?? 0) * 60_000);
  const end = new Date(start.getTime() + 3_600_000);
  await (await db()).appointment.create({
    data: {
      id,
      code: `LH-${id.slice(-6)}`,
      contactId: o.contact ?? s.lan,
      ownerUserId: o.owner === undefined ? h.user : o.owner,
      serviceId: o.service ?? s.svc,
      staffId: s.staff,
      startAt: start,
      endAt: end,
      blockEndAt: end,
      status: o.status ?? 'done',
      doneAt: o.status === 'pending' ? null : end,
      source: 'manual',
      createdByType: 'user',
      conversationId: o.conv === undefined ? s.conv : o.conv,
    },
  });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  [sales, acct] = [await h.member('sales'), await h.member('accountant')];
  const seed = async (id: string, input: unknown) => (await act(id, input)).body.data.result;
  s.lan = (await seed('contact.create', { full_name: 'Chị Lan GY', phone: '0909330001' })).contact_id;
  s.vy = (await seed('contact.create', { full_name: 'Chị Vy GY', phone: '0909330002' })).contact_id;
  s.svc = (await seed('product.create', { name: 'Gội dưỡng sinh', type: 'service', price: '300000', tax_rate: 8 })).product_id;
  s.staff = (await seed('staff.create', { name: 'KTV. Hoa' })).staff_id;
  const t = await db();
  s.acc = uuidv7();
  await t.channelAccount.create({ data: { id: s.acc, type: 'webchat', name: 'Web', status: 'connected', settings: {} } });
  for (const [k, c] of [['conv', s.lan], ['conv2', s.vy]] as const) {
    s[k] = uuidv7();
    await t.conversation.create({ data: { id: s[k], channelAccountId: s.acc, channelType: 'webchat', externalThreadId: `t-${s[k]}`, contactId: c, assigneeUserId: h.user, lastMessageAt: h.clock.now() } });
  }
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('appointment.order_suggestions — phép chiếu hiện hành', () => {
  it('lịch đủ điều kiện → thẻ giá hiện tại (chuỗi VND), đọc lại vẫn còn; đúng một trong hai id, sai → 422', async () => {
    const id = await appt({});
    const r = await suggest({ appointment_id: id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const card = r.body.data.result.data[0];
    expect([card.appointment_id, card.unit_price, card.tax_total, card.total, card.can_create]).toEqual([id, '300000', '24000', '324000', true]);
    expect((await suggest({ appointment_id: id })).body.data.result.data[0].revision).toBe(card.revision);
    expect((await suggest({})).status).toBe(422);
    expect((await suggest({ appointment_id: id, conversation_id: s.conv })).status).toBe(422);
  });

  it('không thẻ: chưa xong · đã có đơn · dịch vụ ngừng bán; lịch đã xoá → 404', async () => {
    const t = await db();
    expect((await suggest({ appointment_id: await appt({ status: 'pending' }) })).body.data.result.data).toEqual([]);
    const linked = await appt({ conv: null });
    expect((await confirm(linked, await preview(linked))).status).toBe(200);
    expect((await suggest({ appointment_id: linked })).body.data.result.data).toEqual([]);
    const svc2 = (await act('product.create', { name: 'Dịch vụ cũ', type: 'service', price: '100000', tax_rate: 0 })).body.data.result.product_id;
    const old = await appt({ service: svc2 });
    await t.product.update({ where: { id: svc2 }, data: { status: 'archived' } });
    expect((await suggest({ appointment_id: old })).body.data.result.data).toEqual([]);
    const gone = await appt({});
    await t.appointment.update({ where: { id: gone }, data: { deletedAt: h.clock.now() } });
    expect((await suggest({ appointment_id: gone })).status).toBe(404);
  });

  it('theo hội thoại: chỉ lịch gắn đúng hội thoại + họ khách, mới nhất trước, con trỏ gắn bộ lọc; hội thoại không thấy → 404', async () => {
    const t = await db();
    await t.appointment.updateMany({ where: { conversationId: s.conv }, data: { conversationId: null } });
    const c = await appt({});
    const b = await appt({});
    const a = await appt({});
    await appt({ conv: s.conv2, contact: s.vy });
    await appt({ conv: s.conv, contact: s.vy }); // gắn hội thoại nhưng khác họ khách → không lẫn vào
    const p1 = (await suggest({ conversation_id: s.conv, limit: 2 })).body.data.result;
    expect(ids(p1)).toEqual([c, b]);
    const p2 = (await suggest({ conversation_id: s.conv, limit: 2, cursor: p1.next_cursor })).body.data.result;
    expect([ids(p2), p2.next_cursor]).toEqual([[a], null]);
    expect((await suggest({ conversation_id: s.conv2, limit: 2, cursor: p1.next_cursor })).status).toBe(422);
    expect((await suggest({ conversation_id: s.conv }, sales)).status).toBe(404);
  });

  it('quyền: kế toán (không booking.view) → 403; sales: lịch người khác → 404, lịch của mình → thẻ tạo được', async () => {
    const id = await appt({});
    expect((await suggest({ appointment_id: id }, acct)).status).toBe(403);
    expect((await suggest({ appointment_id: id }, sales)).status).toBe(404);
    const mine = await appt({ owner: sales.id, conv: null });
    const card = (await suggest({ appointment_id: mine }, sales)).body.data.result.data[0];
    expect([card?.appointment_id, card?.can_create]).toEqual([mine, true]);
  });
});

describe('order.create_from_appointment — xác nhận ràng giá / version', () => {
  it('không token → 202 (0 ghi); đổi giá sau xem trước → 409 stale (0 ghi); xem trước lại → đúng giá mới; token đã dùng không tạo thêm', async () => {
    const t = await db();
    const id = await appt({ conv: null });
    const raw = await act('order.create_from_appointment', { appointment_id: id });
    expect([raw.status, raw.body.data.status]).toEqual([202, 'preview_required']);
    const p = await t.product.findUniqueOrThrow({ where: { id: s.svc } });
    expect((await act('product.update', { product_id: s.svc, patch: { price: '350000' }, if_version: p.version })).status).toBe(200);
    const stale = await confirm(id, raw.body.data.confirm_token);
    expect([stale.status, stale.body.error?.code, stale.body.error?.fields?.preview]).toEqual([409, 'CONFLICT', 'stale']);
    expect(await t.order.count({ where: { appointmentId: id } })).toBe(0);
    const tok = await preview(id);
    const done = await confirm(id, tok);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const o = await t.order.findUniqueOrThrow({ where: { id: done.body.data.result.order_id } });
    expect([String(o.total), o.appointmentId, o.source]).toEqual(['378000', id, 'appointment']);
    expect((await confirm(id, tok)).body.data?.status).toBe('preview_required');
    expect(await t.order.count({ where: { appointmentId: id } })).toBe(1);
    expect((await suggest({ appointment_id: id })).body.data.result.data).toEqual([]);
  });

  it('hai client xác nhận song song (khoá khác) → đúng một đơn + một order.created; client sau nhận biên nhận reused', async () => {
    const t = await db();
    const id = await appt({ conv: null });
    const [k1, k2] = [await preview(id), await preview(id)];
    const [r1, r2] = await Promise.all([confirm(id, k1), confirm(id, k2)]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect(r1.body.data.result.order_id).toBe(r2.body.data.result.order_id);
    expect([r1.body.data.result.reused, r2.body.data.result.reused].sort()).toEqual([false, true]);
    expect(await t.order.count({ where: { appointmentId: id } })).toBe(1);
    expect(await t.outboxEvent.count({ where: { topic: 'order.created', payload: { path: ['order_id'], equals: r1.body.data.result.order_id } } })).toBe(1);
  });

  it('cùng Idempotency-Key gửi lại → cùng biên nhận; hoàn thành lịch không tự tạo đơn', async () => {
    const t = await db();
    const id = await appt({ conv: null, status: 'pending' });
    await t.appointment.update({ where: { id }, data: { status: 'in_progress' } });
    const before = await t.order.count();
    const done = await act('appointment.complete', { appointment_id: id });
    expect(done.body.data.result.suggest_order).toBe(true);
    expect(await t.order.count()).toBe(before);
    const tok = await preview(id);
    const key = uuidv7();
    const a = await confirm(id, tok, undefined, key);
    const b = await confirm(id, tok, undefined, key);
    expect(b.body.data.result.order_id).toBe(a.body.data.result.order_id);
    expect(await t.order.count()).toBe(before + 1);
  });
});

describe('index / EXPLAIN (AC8)', () => {
  it('100k lịch, tập đủ điều kiện thưa: danh sách theo hội thoại đi appointment_order_suggest_idx, không quét bảng', async () => {
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      // 100k lịch đã huỷ / 1 trên 50 đã hoàn thành, rải 2000 hội thoại; nhân sự mỗi dòng một khung giờ riêng (ràng buộc không chồng giờ).
      await c.query(`INSERT INTO appointment (id, code, contact_id, service_id, staff_id, start_at, end_at, block_end_at, status, cancel_reason, conversation_id, source, created_by_type)
        SELECT gen_random_uuid(), 'LHX-'||g, $1::uuid, $2::uuid, $3::uuid, now() - (g||' hours')::interval - interval '400 days', now() - (g||' hours')::interval - interval '400 days' + interval '30 min',
          now() - (g||' hours')::interval - interval '400 days' + interval '30 min', (CASE WHEN g % 50 = 0 THEN 'done' ELSE 'cancelled' END)::appointment_status, 'x',
          (CASE WHEN g % 2000 = 0 THEN $4::uuid ELSE NULL END), 'manual', 'user'
        FROM generate_series(1, 100000) g`, [s.lan, s.svc, s.staff, s.conv]);
      await c.query('ANALYZE appointment');
      const plan = (await c.query(`EXPLAIN SELECT a.id, a.end_at FROM appointment a
        WHERE a.conversation_id = $1::uuid AND a.status = 'done' AND a.package_id IS NULL AND a.order_id IS NULL AND a.deleted_at IS NULL
        ORDER BY a.end_at DESC, a.id DESC LIMIT 11`, [s.conv])).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/appointment_order_suggest_idx/);
      expect(plan).not.toMatch(/Seq Scan on appointment/);
      expect((await suggest({ conversation_id: s.conv, limit: 20 })).status).toBe(200);
    } finally {
      await c.query(`DELETE FROM appointment WHERE code LIKE 'LHX-%'`);
      await c.end();
    }
  }, 120_000);
});

describe('Trợ lý — khối GenUI appointment_order (§2.2)', () => {
  const PROVIDER = `t-${uuidv7().slice(-12)}`;
  let calls = 0;
  function deps(script: MockScript): AssistantDeps {
    const model = mockLanguageModel(script, { provider: PROVIDER, model: 'mock-chat' });
    const spy = model.doStream.bind(model);
    model.doStream = async (o) => (calls++, spy(o));
    const runner = new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: 'mock-chat', handle: model }])), meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log: createLogger({ level: 'silent' }) });
    const kv = h.app.get(REDIS, { strict: false });
    return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv, pub: kv, intents: h.app.get(GenUiIntents, { strict: false }), now: () => h.clock.now(), planKey: async () => 'business' };
  }
  const turn = async (script: MockScript, text: string) =>
    assistantTurn(deps(script), await db(), { mode: 'cowork', ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner', text, requestId: `req-${uuidv7()}` });
  const render = (id: string) => ({ tool: 'render', input: { tree: { version: 1, root: { type: 'stack', children: [{ type: 'text', text: 'Buổi vừa xong' }, { type: 'appointment_order', appointment_id: id }] } } } });
  const uiOf = (events: { type: string }[]) => events.find((e) => e.type === 'ui') as GenUiPart | undefined;

  beforeAll(async () => {
    await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: 'mock-chat', tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
    await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  });
  afterAll(() => h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } }));

  it('lịch còn thẻ → phần ui có khối, tin lưu cây không giá; mở lại phiên dựng lại không gọi model; không tự tạo đơn', async () => {
    const t = await db();
    const id = await appt({ conv: null });
    const before = await t.order.count();
    const r = await turn(({ call: n }) => (n === 0 ? { tool: 'call_action', input: { action_id: 'appointment.order_suggestions', input: { appointment_id: id } } } : n === 1 ? render(id) : { text: 'Bạn muốn tạo đơn cho buổi này không?' }), 'tạo đơn cho buổi vừa xong');
    const ui = uiOf(r.events);
    expect(JSON.stringify(ui?.tree)).toContain('"appointment_order"');
    const msg = await t.assistantMessage.findFirstOrThrow({ where: { sessionId: r.session_id, role: 'assistant' }, orderBy: { createdAt: 'desc' } });
    expect(JSON.stringify(msg.content)).not.toMatch(/300000|324000|350000/);
    const n = calls;
    const again = await call(h, `/assistant/sessions/${r.session_id}/messages`, undefined).then((x) => x.json() as Promise<{ data: unknown[] }>);
    expect(again.data.map((m) => assistantMessageSchema.parse(m)).some((m) => JSON.stringify(m.ui?.tree ?? '').includes(id))).toBe(true);
    expect(calls).toBe(n);
    expect(await t.order.count()).toBe(before);
  });

  it('lịch đã có đơn → render bị từ chối, model sửa một lần (bỏ khối); thẻ không dựng từ chữ model', async () => {
    const id = await appt({ conv: null });
    expect((await confirm(id, await preview(id))).status).toBe(200);
    let tries = 0;
    const r = await turn(({ call: n }) => {
      if (n <= 1 && tries++ === 0) return render(id);
      if (n <= 2 && tries === 1) return (tries++, { tool: 'render', input: { tree: { version: 1, root: { type: 'text', text: 'Buổi này đã có đơn.' } } } });
      return { text: 'Buổi này đã có đơn.' };
    }, 'tạo đơn buổi đã có đơn');
    const ui = uiOf(r.events);
    expect(JSON.stringify(ui?.tree ?? {})).not.toContain('appointment_order');
  });
});
