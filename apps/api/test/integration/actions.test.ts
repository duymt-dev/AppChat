// TIP-003 AC1–3, 5–8, 11 qua HTTP thật (Postgres 16 + Memurai): POST /v1/actions/:id, undo, idempotency, preview, outbox.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, withDatabase, tenantDbName } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';
import * as setup from './setup';

let h: Harness;
let tenant: pg.Client;
let accountantId: string;
const accountant = () => h.tokenFor(accountantId);

beforeAll(async () => {
  h = await startApi();
  accountantId = (await h.member('accountant')).id;
  tenant = new pg.Client({ connectionString: withDatabase(env.PG_ADMIN_URL ?? env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
  await tenant.connect();
});

afterAll(async () => {
  await tenant?.end();
  await h?.close();
});

// Thân phản hồi đọc theo path động (body.data.result.campaign_id…) — chỉ trong test.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as Record<string, any> });

describe('POST /v1/actions/:id', () => {
  it('AC1 action lạ → 404 ACTION_NOT_FOUND', async () => {
    expect(await json(await call(h, '/actions/unknown.x', { input: {} }))).toMatchObject({ status: 404, body: { error: { code: 'ACTION_NOT_FOUND' } } });
  });

  it('AC2 input sai zod → 422 + fields theo path', async () => {
    const r = await json(await call(h, '/actions/notification.mark_read', { input: { ids: [] } }));
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(r.body.error.fields)).toContain('ids');
  });

  it('AC3 thiếu quyền → 403 FORBIDDEN (accountant không có inbox.manage)', async () => {
    const r = await json(await call(h, '/actions/campaign.create', { input: { name: 'VIP', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] } }, { authorization: `Bearer ${accountant()}`, 'idempotency-key': 'k-forbid' }));
    expect(r).toMatchObject({ status: 403, body: { error: { code: 'FORBIDDEN' } } });
  });

  it('AC3 handler ném scope → 403 SCOPE_FORBIDDEN, không ghi action_log', async () => {
    const r = await json(await call(h, '/actions/contract.delete', { input: { contract_id: setup.SCOPE_PROBE } }));
    expect(r).toMatchObject({ status: 403, body: { error: { code: 'SCOPE_FORBIDDEN' } } });
    expect((await tenant.query(`SELECT count(*)::int AS c FROM action_log WHERE action_id = 'contract.delete'`)).rows[0].c).toBe(0);
  });

  it('AC11 thiếu / sai X-Workspace-Id → 403 trước khi mở DB tenant; thiếu / sai token → 401 (TIP-004: JWT + membership)', async () => {
    const r1 = await fetch(`${h.base}/v1/actions/notification.mark_read`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${h.token}` },
      body: JSON.stringify({ input: { ids: 'all' } }),
    });
    expect(r1.status).toBe(403);
    const other = '0190f000-0000-7000-8000-0000000000ee';
    expect((await call(h, '/actions/notification.mark_read', { input: { ids: 'all' } }, { 'x-workspace-id': other })).status).toBe(403);
    const r3 = await fetch(`${h.base}/v1/actions/notification.mark_read`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-workspace-id': h.ws },
      body: '{}',
    });
    expect(r3.status).toBe(401);
    expect((await call(h, '/actions/notification.mark_read', { input: { ids: 'all' } }, { authorization: `Bearer ${h.token}x` })).status).toBe(401);
    // Hết hạn 15 phút → 401.
    const old = h.tokenFor(h.user);
    h.clock.advance(15 * 60_000 + 1);
    expect((await call(h, '/actions/notification.mark_read', { input: { ids: 'all' } }, { authorization: `Bearer ${old}` })).status).toBe(401);
    h.clock.set('2026-10-30T08:00:00.000Z');
  });

  it('happy path notification.mark_read → 200 + action_log (trace_id) đúng DB tenant', async () => {
    await tenant.query(`INSERT INTO notification(id, user_id, type, title) VALUES (gen_random_uuid(), $1, 'x', 'a'), (gen_random_uuid(), $1, 'x', 'b')`, [h.user]);
    const r = await call(h, '/actions/notification.mark_read', { input: { ids: 'all' } }, { 'x-request-id': 'trace-abc' });
    const { status, body } = await json(r);
    expect(status).toBe(200);
    expect(body.data.result).toEqual({ updated: 2 });
    const log = await tenant.query('SELECT action_id, status, trace_id, source, actor_id FROM action_log WHERE id = $1', [body.data.action_log_id]);
    expect(log.rows[0]).toEqual({ action_id: 'notification.mark_read', status: 'succeeded', trace_id: 'trace-abc', source: 'ui', actor_id: h.user });
  });

  it('AC4 assistant + config → 202 preview + confirm_token; gửi lại kèm token → 200; token dùng lại → preview lại', async () => {
    const hdr = { 'x-action-source': 'assistant', 'idempotency-key': 'k-prev-1' };
    const p = await json(await call(h, '/actions/campaign.create', { input: { name: 'VIP', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] } }, hdr));
    expect(p.status).toBe(202);
    expect(p.body.data).toMatchObject({ status: 'preview_required', preview: { summary: 'Tạo thẻ VIP' } });
    const token = p.body.data.confirm_token as string;
    const wrong = await json(await call(h, '/actions/campaign.create', { input: { name: 'KHÁC', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] }, confirm_token: token }, { ...hdr, 'idempotency-key': 'k-prev-2' }));
    expect(wrong.status).toBe(202); // token gắn input khác → bị tiêu + preview lại
    const p2 = await json(await call(h, '/actions/campaign.create', { input: { name: 'VIP', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] } }, hdr));
    const ok = await json(await call(h, '/actions/campaign.create', { input: { name: 'VIP', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] }, confirm_token: p2.body.data.confirm_token }, hdr));
    expect(ok.status).toBe(200);
    const again = await json(await call(h, '/actions/campaign.create', { input: { name: 'VIP', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] }, confirm_token: p2.body.data.confirm_token }, { ...hdr, 'idempotency-key': 'k-prev-3' }));
    expect(again.status).toBe(202);
  });

  it('AC5 idempotency: cùng key + body → kết quả cũ, handler 1 lần; khác body → 409; thiếu key (*.create) → 422', async () => {
    const before = setup.calls;
    const a = await json(await call(h, '/actions/campaign.create', { input: { name: 'Idem', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] } }, { 'idempotency-key': 'k-idem' }));
    const b = await json(await call(h, '/actions/campaign.create', { input: { name: 'Idem', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] } }, { 'idempotency-key': 'k-idem' }));
    expect(a.status).toBe(200);
    expect(b).toEqual(a);
    expect(setup.calls - before).toBe(1);
    expect((await call(h, '/actions/campaign.create', { input: { name: 'Khác', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] } }, { 'idempotency-key': 'k-idem' })).status).toBe(409);
    const miss = await json(await call(h, '/actions/campaign.create', { input: { name: 'NoKey', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] } }));
    expect(miss).toMatchObject({ status: 422, body: { error: { fields: { idempotency_key: 'required' } } } });
  });

  it('AC6 thành công → outbox cùng transaction (payload ws + occurred_at); handler ném → rollback (không log, không outbox, không dữ liệu)', async () => {
    const ok = await json(await call(h, '/actions/campaign.create', { input: { name: 'Out', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] } }, { 'idempotency-key': 'k-out' }));
    const ev = await tenant.query(`SELECT topic, status, payload FROM outbox_event WHERE payload->>'id' = $1`, [ok.body.data.result.campaign_id]);
    expect(ev.rows).toHaveLength(1);
    expect(ev.rows[0]).toMatchObject({ topic: 'tag.created', status: 'pending', payload: { ws: h.ws, occurred_at: '2026-10-30T08:00:00.000Z' } });
    const n0 = (await tenant.query(`SELECT count(*)::int AS c FROM action_log`)).rows[0].c;
    const boom = await json(await call(h, '/actions/campaign.create', { input: { name: 'boom', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] } }, { 'idempotency-key': 'k-boom' }));
    expect(boom.status).toBe(500);
    expect(boom.body.error).toEqual({ code: 'INTERNAL', message: 'Internal error' });
    expect((await tenant.query(`SELECT count(*)::int AS c FROM action_log`)).rows[0].c).toBe(n0);
    expect((await tenant.query(`SELECT count(*)::int AS c FROM notification WHERE title = 'boom'`)).rows[0].c).toBe(0);
    expect((await tenant.query(`SELECT count(*)::int AS c FROM idempotency_key WHERE key = 'k-boom'`)).rows[0].c).toBe(0);
  });

  it('AC7 undo: trong hạn → khôi phục + undone; lần 2 → 409; quá hạn → UNDO_EXPIRED; action không undo → UNDO_NOT_SUPPORTED', async () => {
    const created = await json(await call(h, '/actions/campaign.create', { input: { name: 'Undo', channel: 'zalo', content: { text: 'x' }, contact_ids: ['c1'] } }, { 'idempotency-key': 'k-undo' }));
    const id = created.body.data.result.campaign_id as string;
    const del = await json(await call(h, '/actions/contract.delete', { input: { contract_id: id } }));
    expect(del.status).toBe(200);
    expect(del.body.data.undo_until).toBe('2026-10-31T08:00:00.000Z');
    expect((await tenant.query('SELECT count(*)::int AS c FROM notification WHERE id = $1', [id])).rows[0].c).toBe(0);
    const u = await json(await call(h, `/action-logs/${del.body.data.action_log_id}/undo`, {}));
    expect(u).toEqual({ status: 200, body: { data: { undone: true } } });
    expect((await tenant.query('SELECT count(*)::int AS c FROM notification WHERE id = $1', [id])).rows[0].c).toBe(1);
    expect((await call(h, `/action-logs/${del.body.data.action_log_id}/undo`, {})).status).toBe(409);

    const del2 = await json(await call(h, '/actions/contract.delete', { input: { contract_id: id } }));
    h.clock.advance(86_400_001);
    expect(await json(await call(h, `/action-logs/${del2.body.data.action_log_id}/undo`, {}))).toMatchObject({ status: 409, body: { error: { code: 'UNDO_EXPIRED' } } });
    expect(await json(await call(h, `/action-logs/${created.body.data.action_log_id}/undo`, {}))).toMatchObject({ status: 409, body: { error: { code: 'UNDO_NOT_SUPPORTED' } } });
  });

  it('AC8 action chưa cài → 501 NOT_IMPLEMENTED kèm TIP chủ', async () => {
    const r = await json(await call(h, '/actions/campaign.delete', { input: { campaign_id: 'cp1' } }));
    expect(r).toMatchObject({ status: 501, body: { error: { code: 'NOT_IMPLEMENTED', fields: { tip: '037' } } } });
    // action `db: 'platform'` chưa cài (TIP-039) — đi nhánh nền tảng của executor rồi mới 501.
    const p = await json(await call(h, '/actions/wallet.update_alerts', { input: { low_alert: true } }));
    expect(p).toMatchObject({ status: 501, body: { error: { code: 'NOT_IMPLEMENTED', fields: { tip: '039' } } } });
  });

  it('GET /v1/actions lọc theo quyền + có input_schema', async () => {
    const owner = await json(await call(h, '/actions'));
    const acct = await json(await call(h, '/actions', undefined, { authorization: `Bearer ${accountant()}` }));
    expect(owner.body.data.length).toBeGreaterThan(acct.body.data.length);
    const mr = owner.body.data.find((a: { id: string }) => a.id === 'notification.mark_read');
    expect(mr.input_schema).toMatchObject({ type: 'object' });
    expect(acct.body.data.some((a: { id: string }) => a.id === 'campaign.create')).toBe(false);
  });

  it('tenant resolver của test trỏ đúng DB (sanity)', async () => {
    const r = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
    const db = await r.get(TenantContexts.system(h.ws, 't'));
    expect((await db.$queryRaw<{ d: string }[]>`SELECT current_database() AS d`)[0]!.d).toBe(tenantDbName(h.ws));
    await r.close();
  });
});
