// TIP-042b — contract FE ↔ BE chia lead trên HTTP thật (Postgres 16): GET /v1/settings/lead-routing parse đúng zod chung với mock FE
// (`@appchat/shared` api/lead-routing), danh sách kênh mang `routing` đúng schema, output action parse `output` của ActionDef, lỗi theo
// envelope chung, event outbox lead.routing_requested / contact.owner_changed / conversation.assigned parse EVENT_SCHEMAS. EXPLAIN
// (AC8): rule theo tài khoản, quyết định theo khách / event, tải người phụ trách dùng index — không quét bảng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { getAction } from '@appchat/actions';
import { ActionExecutor, ContactIdentityService, InboundPipeline, leadRoutingConsumer, uuidv7 } from '@appchat/core';
import { ERROR_CODES, EVENT_SCHEMAS, leadRoutingSchema, settingsChannelListSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let acc: string;
let u1: string;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (path: string) => call(h, path).then(json);
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const errorEnvelope = z.object({ error: z.object({ code: z.enum(ERROR_CODES), message: z.string(), fields: z.record(z.string(), z.string()).optional() }).strict() }).strict();
const parsed = <T extends z.ZodTypeAny>(s: T, v: unknown) => {
  const r = s.safeParse(v);
  return r.success ? 'ok' : r.error.issues.slice(0, 3).map((i) => `${i.path.join('.')} ${i.message}`).join('; ');
};

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  acc = uuidv7();
  await (await tenant()).channelAccount.create({ data: { id: acc, type: 'zalo_personal', name: 'Zalo Spa', externalId: `z-${acc.slice(-6)}`, status: 'connected', settings: { assign_mode: 'shift' } } });
  u1 = (await h.member('sales')).id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('DTO ↔ zod chung', () => {
  it('GET /settings/lead-routing (chưa rule + sau khi tạo) · /settings/channels có routing; output action parse ActionDef', async () => {
    const empty = await get('/settings/lead-routing');
    expect(parsed(leadRoutingSchema, empty.body.data)).toBe('ok');
    expect(empty.body.data.rules).toEqual([]);
    expect(empty.body.data.candidates.accounts).toEqual([expect.objectContaining({ id: acc, legacy_assign_mode: 'shift' })]);
    const r = await act('lead_routing.update', { enabled: true, mode: 'round_robin', user_ids: [u1] });
    expect(r.status).toBe(200);
    expect(getAction('lead_routing.update')!.output.safeParse(r.body.data.result).success).toBe(true);
    const full = await get('/settings/lead-routing');
    expect(parsed(leadRoutingSchema, full.body.data)).toBe('ok');
    expect(full.body.data.rules[0]).toMatchObject({ channel_account_id: null, enabled: true, mode: 'round_robin', user_ids: [u1], version: 1 });
    const ch = await get('/settings/channels');
    expect(parsed(settingsChannelListSchema, ch.body.data)).toBe('ok');
    const zalo = ch.body.data.flatMap((c: { accounts: unknown[] }) => c.accounts).find((a: { id: string }) => a.id === acc);
    // Cấu hình cũ `shift` vẫn đọc được; chia thật theo rule mặc định.
    expect(zalo).toMatchObject({ assign_mode: 'shift', routing: { source: 'default', enabled: true, mode: 'round_robin' } });
  });

  it('lỗi theo envelope chung: pool rỗng 422 kèm fields, trùng rule 409', async () => {
    const e1 = await act('lead_routing.update', { channel_account_id: acc, enabled: true, mode: 'least_busy' });
    expect(e1.status).toBe(422);
    expect(parsed(errorEnvelope, e1.body)).toBe('ok');
    const e2 = await act('lead_routing.update', { enabled: false, mode: 'manual' });
    expect(e2.status).toBe(409);
    expect(parsed(errorEnvelope, e2.body)).toBe('ok');
  });

  it('event outbox parse EVENT_SCHEMAS: lead.routing_requested → contact.owner_changed + conversation.assigned (auto)', async () => {
    const db = await tenant();
    const r = await new InboundPipeline(new ContactIdentityService()).handle(db, h.ws, {
      channelAccountId: acc, externalThreadId: 't-contract', externalMsgId: 'm-contract', isGroup: false, sender: { externalId: 'contract-1', name: 'Khách hợp đồng' },
      kind: 'text', text: 'Chào', sentAt: h.clock.now().toISOString(), raw: {},
    }, h.clock.now());
    const req = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'lead.routing_requested', payload: { path: ['message_id'], equals: r.messageId! } } });
    expect(parsed(EVENT_SCHEMAS['lead.routing_requested'], req.payload)).toBe('ok');
    await leadRoutingConsumer(h.app.get(ActionExecutor, { strict: false })).handle({ id: req.id, topic: req.topic, workspaceId: h.ws, payload: req.payload as Record<string, unknown>, traceId: null }, db);
    const contactId = (req.payload as { contact_id: string }).contact_id;
    const owner = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'contact.owner_changed', payload: { path: ['contact_id'], equals: contactId } } });
    expect(parsed(EVENT_SCHEMAS['contact.owner_changed'], owner.payload)).toBe('ok');
    const asg = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'conversation.assigned', payload: { path: ['conversation_id'], equals: r.conversationId } }, orderBy: { createdAt: 'desc' } });
    expect(parsed(EVENT_SCHEMAS['conversation.assigned'], asg.payload)).toBe('ok');
    expect(asg.payload).toMatchObject({ assignee_user_id: u1, auto: true, by_user_id: null });
  });
});

describe('EXPLAIN (AC8)', () => {
  it('rule theo tài khoản · quyết định theo khách / event · tải người phụ trách → index, không quét bảng', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('lead_routing_rule','lead_routing_decision','conversation')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['lead_routing_rule_default_key', 'lead_routing_rule_account_key', 'lead_routing_decision_contact_key', 'lead_routing_decision_event_key', 'conversation_routing_load_idx']));
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const urlOf = (base: string) => base.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`);
    const c = new pg.Client({ connectionString: urlOf(env.TENANT_DATABASE_URL!) });
    await c.connect();
    try {
      const q = (sql: string) => c.query(`EXPLAIN ${sql}`).then((r) => r.rows.map((x) => x['QUERY PLAN']).join('\n'));
      // Tải thật: 6.000 hội thoại (đa số đã đóng — lịch sử), người phụ trách rải 300 người; pool trần 100. ANALYZE bằng chủ bảng — bảng
      // rỗng không có thống kê, planner chọn bừa.
      const all = Array.from({ length: 300 }, () => `'${uuidv7()}'`);
      const users = all.slice(0, 100).join(',');
      await c.query(`INSERT INTO conversation (id, channel_account_id, channel_type, external_thread_id, status, assignee_user_id, last_message_at)
        SELECT gen_random_uuid(), '${acc}', 'zalo_personal', 'load-' || g,
          (CASE WHEN g % 20 = 0 THEN 'open' WHEN g % 20 = 1 THEN 'pending' WHEN g % 20 = 2 THEN 'snoozed' ELSE 'closed' END)::conversation_status,
          (ARRAY[${all.join(',')}]::uuid[])[1 + g % 300], now() - (g || ' minutes')::interval FROM generate_series(1, 6000) g`);
      const adm = new pg.Client({ connectionString: urlOf(env.PROVISIONER_DATABASE_URL!) });
      await adm.connect();
      await adm.query('ANALYZE conversation');
      await adm.end();
      const load = (pool: string) =>
        q(`SELECT assignee_user_id, count(*) FROM conversation WHERE assignee_user_id = ANY(ARRAY[${pool}]::uuid[]) AND status IN ('open','pending','snoozed') AND archived_at IS NULL AND hidden_at IS NULL GROUP BY assignee_user_id`);
      // Pool thường (vài người) → index partial tải; pool trần 100 → planner có thể chọn index trạng thái, nhưng không quét cả bảng.
      expect(await load(all.slice(0, 3).join(','))).toMatch(/conversation_routing_load_idx/);
      expect(await load(users)).not.toMatch(/Seq Scan/);
      // Bảng rule / quyết định nhỏ: tắt seqscan để kiểm index đúng cột (unique / partial unique).
      await c.query('SET enable_seqscan = off');
      expect(await q(`SELECT id FROM lead_routing_rule WHERE channel_account_id = '${acc}'::uuid`)).toMatch(/lead_routing_rule_account_key/);
      expect(await q(`SELECT id FROM lead_routing_rule WHERE channel_account_id IS NULL`)).toMatch(/lead_routing_rule_default_key/);
      expect(await q(`SELECT 1 FROM lead_routing_decision WHERE contact_id = '${uuidv7()}'::uuid`)).toMatch(/lead_routing_decision_contact_key/);
      expect(await q(`SELECT 1 FROM lead_routing_decision WHERE originating_event_id = '${uuidv7()}'::uuid`)).toMatch(/lead_routing_decision_event_key/);
    } finally {
      await c.end();
    }
  });
});
