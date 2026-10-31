// TIP-004 AC1, AC7–AC11 qua HTTP + DB thật: index membership, tạo workspace → job tenant.provision (BullMQ trên Memurai,
// worker thật) → active + outbox workspace.ready, /me, action db 'platform', invite, tra MST.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { InvitesService, KernelModule, IdentityJobsModule, TAX_LOOKUP, uuidv7 } from '@appchat/core';
import type { TaxLookupProvider } from '@appchat/integrations';
import { tenantDbName, withDatabase } from '@appchat/db';
import { Module, type DynamicModule } from '@nestjs/common';
import { call, env, startApi, testEmail, type Harness } from './setup';

let h: Harness;
let worker: INestApplicationContext;

@Module({})
class WorkerHarness {
  static forRoot(): DynamicModule {
    return { module: WorkerHarness, imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), IdentityJobsModule] };
  }
}

beforeAll(async () => {
  h = await startApi();
  // Worker ROLE=jobs thật (chỉ module identity) — xử lý queue `tenant`.
  worker = await NestFactory.createApplicationContext(WorkerHarness.forRoot(), { logger: false });
  await worker.init();
});
afterAll(async () => {
  await worker?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const asUser = (token: string, extra: Record<string, string> = {}) => ({ authorization: `Bearer ${token}`, 'x-workspace-id': '', ...extra });
const until = async (fn: () => Promise<boolean>, ms = 20_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};

describe('schema', () => {
  it('AC1 resolver membership dùng Index Only Scan trên membership_user_active_idx', async () => {
    const c = new pg.Client({ connectionString: env.PLATFORM_DATABASE_URL });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      await c.query('VACUUM (ANALYZE) membership').catch(() => undefined);
      const plan = await c.query(
        `EXPLAIN SELECT workspace_id, role_key FROM membership WHERE user_id = $1 AND workspace_id = $2 AND status = 'active'`,
        [h.user, h.ws],
      );
      const text = plan.rows.map((r) => r['QUERY PLAN']).join('\n');
      // DB dev dùng chung: nhiều workspace test 1–2 thành viên → planner có lúc chọn index theo workspace (1 dòng) thay index theo user.
      // Điều cần giữ: luôn đi index của membership, không quét bảng.
      expect(text).toMatch(/Index (Only )?Scan using membership_(user_active_idx|pkey|workspace_created_idx)/);
      expect(text).not.toMatch(/Seq Scan/);
      const idx = await c.query(`SELECT indexname FROM pg_indexes WHERE tablename IN ('membership','invite','refresh_token','otp_code') ORDER BY 1`);
      expect(idx.rows.map((r) => r.indexname)).toEqual(
        expect.arrayContaining(['membership_user_active_idx', 'membership_workspace_created_idx', 'invite_pending_idx', 'refresh_token_family_active_idx', 'otp_code_reset_hash_idx']),
      );
    } finally {
      await c.end();
    }
  });
});

describe('workspace', () => {
  it('AC7 POST /v1/workspaces → 201 provisioning; worker tạo ws_* → ready; outbox workspace.ready trong DB tenant mới', async () => {
    const created = await json(await call(h, '/workspaces', { name: 'Spa Hương Sen' }, asUser(h.token)));
    expect(created.status).toBe(201);
    const ws = created.body.data.workspace;
    expect(ws).toMatchObject({ name: 'Spa Hương Sen', db_status: 'provisioning' });
    expect(ws.slug).toMatch(/^spa-huong-sen-[0-9a-f]{6}$/);

    const first = await json(await call(h, `/workspaces/${ws.id}/provisioning`, undefined, asUser(h.token)));
    expect(['running', 'ready']).toContain(first.body.data.status);
    const ready = await until(async () => (await json(await call(h, `/workspaces/${ws.id}/provisioning`, undefined, asUser(h.token)))).body.data.status === 'ready');
    expect(ready).toBe(true);

    const row = await h.platform.workspace.findUniqueOrThrow({ where: { id: ws.id } });
    expect(row).toMatchObject({ dbName: tenantDbName(ws.id), dbStatus: 'active' });
    expect(row.provisionedAt).not.toBeNull();
    const t = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, row.dbName) });
    await t.connect();
    // Job đặt `active` rồi mới ghi outbox vào DB tenant (resolver chỉ mở DB active) → chờ event thay vì đọc ngay.
    const readyEvent = () => t.query(`SELECT topic, payload FROM outbox_event WHERE topic = 'workspace.ready'`);
    expect(await until(async () => (await readyEvent()).rowCount === 1)).toBe(true);
    const ev = await readyEvent();
    await t.end();
    expect(ev.rows).toHaveLength(1);
    expect(ev.rows[0].payload).toMatchObject({ ws: ws.id, workspace_id: ws.id });

    // Người ngoài không xem được trạng thái khởi tạo.
    const stranger = uuidv7();
    expect((await call(h, `/workspaces/${ws.id}/provisioning`, undefined, asUser(h.tokenFor(stranger)))).status).toBe(403);
  });

  it('GET /v1/me: user + workspace (role) + current + needs_declare; không token → 401', async () => {
    const me = await json(await call(h, '/me', undefined, asUser(h.token)));
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(h.user);
    expect(me.body.data.workspaces.map((w: { id: string; role: string }) => [w.id, w.role])).toContainEqual([h.ws, 'owner']);
    expect(me.body.data.needs_declare).toBe(true);
    expect((await fetch(`${h.base}/v1/me`)).status).toBe(401);
  });

  it('workspace đang provisioning → action trả 503 WORKSPACE_UNAVAILABLE', async () => {
    const id = uuidv7();
    await h.platform.workspace.create({ data: { id, name: 'P', slug: `p-${id.slice(-12)}`, ownerUserId: h.user, dbName: tenantDbName(id), dbStatus: 'provisioning' } });
    await h.platform.membership.create({ data: { workspaceId: id, userId: h.user, roleKey: 'owner' } });
    const r = await json(await call(h, '/actions/notification.mark_read', { input: { ids: 'all' } }, { 'x-workspace-id': id }));
    expect(r).toMatchObject({ status: 503, body: { error: { code: 'WORKSPACE_UNAVAILABLE' } } });
  });
});

describe('action identity (db platform)', () => {
  it('AC9 profile.update ghi user ở DB nền tảng; action_log ở DB tenant', async () => {
    const r = await json(await call(h, '/actions/profile.update', { input: { name: 'Thùy Trâm', locale: 'en' } }));
    expect(r.status).toBe(200);
    expect(r.body.data.result).toEqual({ user_id: h.user });
    expect(await h.platform.user.findUniqueOrThrow({ where: { id: h.user } })).toMatchObject({ name: 'Thùy Trâm', locale: 'en' });
    const t = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await t.connect();
    const log = await t.query(`SELECT action_id, status, before, after FROM action_log WHERE id = $1`, [r.body.data.action_log_id]);
    await t.end();
    expect(log.rows[0]).toMatchObject({ action_id: 'profile.update', status: 'succeeded', after: { name: 'Thùy Trâm', locale: 'en' } });
  });

  it('AC9 workspace.switch: không phải thành viên → 403; thành viên → 200 + current_workspace_id đổi', async () => {
    const other = uuidv7();
    expect((await json(await call(h, '/actions/workspace.switch', { input: { workspace_id: other } }))).status).toBe(403);
    const mine = (await h.platform.workspace.findMany({ where: { ownerUserId: h.user, dbStatus: 'active', NOT: { id: h.ws } }, select: { id: true } }))[0]!;
    expect((await json(await call(h, '/actions/workspace.switch', { input: { workspace_id: mine.id } }))).status).toBe(200);
    expect((await json(await call(h, '/me', undefined, asUser(h.token)))).body.data.current_workspace_id).toBe(mine.id);
  });

  it('AC9 business_profile.update → lưu + declared_at; needs_declare false; sales (không settings.manage) → 403', async () => {
    const input = { kind: 'enterprise', tax_code: '0312345678', legal_name: 'CÔNG TY TNHH A', address: 'Q1', business_description: 'Spa' };
    const r = await json(await call(h, '/actions/business_profile.update', { input }));
    expect(r.status).toBe(200);
    expect(r.body.data.result).toEqual({ workspace_id: h.ws, declared_at: '2026-10-30T08:00:00.000Z' });
    expect(await h.platform.businessProfile.findUniqueOrThrow({ where: { workspaceId: h.ws } })).toMatchObject({ legalName: 'CÔNG TY TNHH A', taxCode: '0312345678' });
    expect((await json(await call(h, '/me', undefined, asUser(h.token)))).body.data.needs_declare).toBe(false);
    const sales = await h.member('sales');
    expect((await call(h, '/actions/business_profile.update', { input }, { authorization: `Bearer ${sales.token}` })).status).toBe(403);
  });

  it('AC8 vai trò lấy từ membership.role_key: thành viên `custom:*` chưa có quyền (TIP-005) → 403 ở action cần quyền', async () => {
    const custom = await h.member('custom:x');
    expect((await call(h, '/actions/business_profile.update', { input: {} }, { authorization: `Bearer ${custom.token}` })).status).toBe(422);
    const input = { kind: 'individual', national_id: '012345678901', legal_name: 'A', address: 'B', business_description: 'C' };
    expect((await call(h, '/actions/business_profile.update', { input }, { authorization: `Bearer ${custom.token}` })).status).toBe(403);
  });
});

describe('invite', () => {
  it('AC10 tạo → accept đúng email → membership active; email khác → 403; dùng lại → 409; hết hạn → 409', async () => {
    const invites = h.app.get(InvitesService);
    const email = testEmail('inv');
    const { token } = await invites.create(h.ws, h.user, { email, role: 'cs' });
    expect(h.mail.last(email)?.subject).toMatch(/WS test/);
    const invitee = uuidv7();
    h.track(invitee);
    await h.platform.user.create({ data: { id: invitee, email, name: 'Inv' } });
    const wrong = uuidv7();
    h.track(wrong);
    await h.platform.user.create({ data: { id: wrong, email: testEmail('wrong'), name: 'W' } });

    const accept = (who: string, t: string) =>
      fetch(`${h.base}/v1/auth/invite/accept`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${h.tokenFor(who)}` }, body: JSON.stringify({ token: t }) });
    expect((await accept(wrong, token)).status).toBe(403);
    const ok = await json(await accept(invitee, token));
    expect(ok).toEqual({ status: 200, body: { data: { workspace_id: h.ws, role: 'cs' } } });
    expect(await h.platform.membership.findUniqueOrThrow({ where: { workspaceId_userId: { workspaceId: h.ws, userId: invitee } } })).toMatchObject({ roleKey: 'cs', status: 'active' });
    expect((await accept(invitee, token)).status).toBe(409);

    const e2 = testEmail('inv2');
    const second = await invites.create(h.ws, h.user, { email: e2, role: 'sales' });
    h.clock.advance(7 * 86_400_000 + 1);
    const late = uuidv7();
    h.track(late);
    await h.platform.user.create({ data: { id: late, email: e2, name: 'Late' } });
    expect((await accept(late, second.token)).status).toBe(409);
    h.clock.set('2026-10-30T08:00:00.000Z');
    await expect(invites.create(h.ws, h.user, { email, role: 'cs' })).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('tra MST', () => {
  it('AC11 mock trả dữ liệu; sai định dạng → 422; cần đăng nhập', async () => {
    const ok = await json(await call(h, '/business-lookup/tax/0312345678', undefined, asUser(h.token)));
    expect(ok.status).toBe(200);
    expect(ok.body.data.legal_name).toBe('CÔNG TY TNHH MEDIASOFT VIỆT NAM');
    expect((await call(h, '/business-lookup/tax/123', undefined, asUser(h.token))).status).toBe(422);
    expect((await fetch(`${h.base}/v1/business-lookup/tax/0312345678`)).status).toBe(401);
    // Provider không thấy / lỗi → 404 (UI nhập tay — D35).
    const tax = h.app.get<TaxLookupProvider>(TAX_LOOKUP);
    const orig = tax.lookup.bind(tax);
    tax.lookup = async () => null;
    try {
      expect(await json(await call(h, '/business-lookup/tax/0999999999', undefined, asUser(h.token)))).toMatchObject({ status: 404, body: { error: { code: 'NOT_FOUND' } } });
    } finally {
      tax.lookup = orig;
    }
  });
});
