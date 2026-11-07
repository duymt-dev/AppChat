// TIP-045b annex A2 trên Postgres 16 + Memurai: GET /v1/settings/audit · /ai-audit — cần audit.view; không tham số → mảng (tương thích),
// `page=1` / cursor / lọc → trang 50 `{ data, next_cursor }` created_at DESC, id DESC; dòng chỉ là chiếu an toàn (không input / OTP / nội
// dung); action nhạy cảm ghi action_log cờ audit + event `audit.security_event` (thông báo Owner); admin.* / action nhạy cảm nền tảng ghi
// platform_audit_log trong commit nền tảng (input đã chiếu); đăng nhập thiết bị mới → `session.new_device`. EXPLAIN: index trang.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { auditPageSchema, aiAuditPageSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (path: string, token?: string) => call(h, path, undefined, token ? { authorization: `Bearer ${token}` } : {}).then(json);
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'audit-test'));
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('đọc audit', () => {
  it('403 không có audit.view; mảng cũ không tham số; trang có con trỏ ổn định, không trùng / sót', async () => {
    const sales = await h.member('sales');
    expect((await get('/settings/audit', sales.token)).status).toBe(403);
    expect((await get('/settings/ai-audit', sales.token)).status).toBe(403);
    // 55 dòng log (đổi giờ làm việc) — đủ để có trang 2.
    const week = Array.from({ length: 7 }, (_, day) => ({ day, on: day < 6, from: '08:00', to: '18:00' }));
    for (let i = 0; i < 55; i++) {
      h.clock.advance(1000);
      expect((await act('working_hours.update', { days: week, pause_sla: false })).status).toBe(200);
    }
    const legacy = await get('/settings/audit');
    expect(legacy.status).toBe(200);
    expect(Array.isArray(legacy.body.data)).toBe(true);
    expect(legacy.body.next_cursor).toBeUndefined();
    const p1 = await get('/settings/audit?page=1');
    expect(auditPageSchema.parse(p1.body).data).toHaveLength(50);
    expect(p1.body.next_cursor).toBeTruthy();
    const p2 = await get(`/settings/audit?cursor=${encodeURIComponent(p1.body.next_cursor)}`);
    const ids = [...p1.body.data, ...p2.body.data].map((r: { id: string }) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(55);
    const times = [...p1.body.data, ...p2.body.data].map((r: { time: string }) => r.time);
    expect([...times].sort().reverse()).toEqual(times);
    expect(p1.body.data[0]).toMatchObject({ name: 'Owner', role: 'owner', action_id: 'working_hours.update', status: 'ok' });
    expect((await get('/settings/audit?status=bad')).status).toBe(400);
    expect((await get('/settings/audit?cursor=garbage')).status).toBe(200);
  });

  it('lọc action / actor; chỉ sự kiện bảo mật; dòng không chứa input', async () => {
    const staff = await h.member('cs');
    expect((await act('member.set_role', { user_id: staff.id, role: 'sales' })).status).toBe(200);
    const sec = await get('/settings/audit?action=security');
    expect(sec.body.data.map((r: { action_id: string }) => r.action_id)).toContain('member.set_role');
    expect(sec.body.data.every((r: { action_id: string }) => r.action_id !== 'working_hours.update')).toBe(true);
    const mine = await get(`/settings/audit?actor=${h.user}&action=member.set_role`);
    expect(mine.body.data).toHaveLength(1);
    expect(Object.keys(mine.body.data[0]).sort()).toEqual(['action', 'action_id', 'actor_id', 'id', 'ip', 'name', 'role', 'source', 'status', 'time', 'trace_id']);
    const log = await db.actionLog.findFirstOrThrow({ where: { actionId: 'member.set_role' }, orderBy: { createdAt: 'desc' } });
    expect(log.audit).toBe(true);
    const ev = await db.outboxEvent.findMany({ where: { topic: 'audit.security_event' } });
    expect(ev.map((e) => (e.payload as { action_log_id: string }).action_log_id)).toContain(log.id);
    expect(JSON.stringify(ev)).not.toMatch(/"role":"sales"/);
  });

  it('platform_audit_log: action nhạy cảm nền tảng ghi trong commit, input đã chiếu (không mã OTP)', async () => {
    await h.platform.user.update({ where: { id: h.user }, data: { emailVerifiedAt: h.clock.now() } });
    const lan = await h.member('sales');
    await act('workspace.request_transfer_otp', { to_user_id: lan.id });
    const owner = await h.platform.user.findUniqueOrThrow({ where: { id: h.user } });
    const code = /<b>(\d{6})<\/b>/.exec(h.mail.last(owner.email)!.html!)![1]!;
    await act('workspace.transfer_ownership', { to_user_id: lan.id, otp: '000000' === code ? '111111' : '000000' });
    const rows = await h.platform.platformAuditLog.findMany({ where: { workspaceId: h.ws, actionId: { in: ['member.set_role', 'workspace.transfer_ownership'] } } });
    expect(rows.some((r) => r.actionId === 'member.set_role')).toBe(true);
    expect(JSON.stringify(await h.platform.platformAuditLog.findMany({ where: { workspaceId: h.ws } }))).not.toContain(code);
    // Lệnh sai mã không commit nền tảng → không có dòng audit cho lần đó.
    expect(rows.filter((r) => r.actionId === 'workspace.transfer_ownership')).toHaveLength(0);
  });

  it('đăng nhập thiết bị mới → session.new_device trong audit workspace (định danh băm, không UA / IP thô)', async () => {
    const owner = await h.platform.user.findUniqueOrThrow({ where: { id: h.user } });
    await h.platform.refreshToken.create({ data: { id: uuidv7(), userId: h.user, tokenHash: uuidv7(), familyId: uuidv7(), expiresAt: new Date(h.clock.now().getTime() + 86_400_000), userAgent: 'old-browser' } });
    await h.platform.user.update({ where: { id: h.user }, data: { passwordHash: null } });
    const otpReq = await fetch(`${h.base}/v1/auth/otp/request`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: owner.email, purpose: 'login' }) });
    expect(otpReq.status).toBeLessThan(300);
    const code = /<b>(\d{6})<\/b>/.exec(h.mail.last(owner.email)!.html!)![1]!;
    const ua = 'Mozilla/5.0 (NewDevice) Test';
    const login = await fetch(`${h.base}/v1/auth/otp/verify`, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': ua }, body: JSON.stringify({ email: owner.email, code, purpose: 'login' }) });
    expect(login.status, await login.clone().text()).toBeLessThan(300);
    const rows = await h.platform.platformAuditLog.findMany({ where: { workspaceId: h.ws, actionId: 'session.new_device' } });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain('NewDevice');
    const page = await get('/settings/audit?action=security');
    expect(page.body.data.map((r: { action_id: string }) => r.action_id)).toContain('session.new_device');
  });

  it('AI audit: chỉ metadata run (mức AI, credit, token, trạng thái) — không input / output / tên model', async () => {
    const run = uuidv7();
    await db.aiRun.create({ data: { id: run, kind: 'assistant', rootRunId: run, status: 'handoff', title: 'Tóm tắt khách', tier: 'advanced', input: { prompt: 'BÍ MẬT KHÁCH' }, output: { text: 'trả lời' }, creditsUsed: 3, startedAt: h.clock.now() } });
    await db.aiRunStep.create({ data: { id: uuidv7(), runId: run, idx: 0, type: 'llm', model: 'vendor-model-x', tokensIn: 100, tokensOut: 20, credits: 3 } as never });
    const r = await get('/settings/ai-audit?page=1');
    const row = aiAuditPageSchema.parse(r.body).data.find((x) => x.id === run)!;
    expect(row).toMatchObject({ actor: 'copilot', action: 'Tóm tắt khách', tier: 'advanced', credits: 3, tokens: 120, status: 'escalated' });
    expect(JSON.stringify(r.body)).not.toMatch(/BÍ MẬT|trả lời|vendor-model-x/);
    expect((await get('/settings/ai-audit?status=escalated')).body.data.some((x: { id: string }) => x.id === run)).toBe(true);
  });

  it('EXPLAIN: trang audit / AI audit / lọc actor / lọc bảo mật dùng index trang', async () => {
    const plan = async (q: string) => (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN ${q}`)).map((x) => x['QUERY PLAN']).join('\n');
    await db.$executeRawUnsafe('SET enable_seqscan = off');
    expect(await plan(`SELECT id FROM action_log WHERE risk <> 'read' ORDER BY created_at DESC, id DESC LIMIT 51`)).toMatch(/action_log_(created_at_cover|audit_page|actor_page|action_page)_idx|Index/);
    expect(await plan(`SELECT id FROM action_log WHERE actor_id = '${h.user}' ORDER BY created_at DESC, id DESC LIMIT 51`)).toMatch(/action_log_actor_page_idx/);
    expect(await plan(`SELECT id FROM action_log WHERE audit ORDER BY created_at DESC, id DESC LIMIT 51`)).toMatch(/action_log_audit_page_idx/);
    expect(await plan(`SELECT id FROM ai_run WHERE dry_run = false ORDER BY started_at DESC, id DESC LIMIT 51`)).toMatch(/ai_run_audit_page_idx/);
    await db.$executeRawUnsafe('RESET enable_seqscan');
  });
});
