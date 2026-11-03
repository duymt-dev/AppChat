// TIP-023c hợp đồng 1–2 trên Postgres 16 + Memurai (API thật, trạng thái đăng nhập trong Redis như worker ghi): start_login → `channel.status`
// waiting + `qr_ref` (không ảnh); GET ảnh đúng attempt (có auth, cần channels.manage); làm mới cùng tài khoản (reconnect) → attempt mới,
// ảnh / sự kiện của attempt cũ bị bỏ (404, không ghi đè), số tài khoản không tăng; connected → assistant.resume tiếp tục đúng một lần;
// attempt cũ không resume được. QR không nằm trong DTO / action_log / bước run.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ChannelControl, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

const QR = 'iVBORw0KGgoQR-SENTINEL-PNG';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let control: ChannelControl;

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  control = h.app.get(ChannelControl, { strict: false });
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const status = async (acc: string) => (await act('channel.status', { channel_account_id: acc })).body.data.result;
const qrPath = (ref: string) => ref; // `/assistant/ui/qr/<acc>?attempt=…` dưới /v1

describe('QR attempt qua channel.status', () => {
  let acc: string;
  let a1: string;
  let a2: string;

  it('start_login → waiting không ảnh; worker ghi QR → qr_ref đúng attempt; ảnh lấy qua route có auth', async () => {
    const s = await act('channel.zalo.start_login', { label: 'Zalo GenUI' });
    expect(s.status).toBe(200);
    acc = s.body.data.result.channel_account_id;
    a1 = (await control.login(acc))!.attempt!;
    expect((await status(acc)).login).toMatchObject({ status: 'waiting', qr_ref: null, terminal: false });
    await control.setLogin({ account_id: acc, status: 'waiting', qr: QR, expires_at: '2026-10-30T08:02:30.000Z', attempt: a1 });
    const st = await status(acc);
    expect(JSON.stringify(st)).not.toContain(QR);
    expect(st.login).toMatchObject({ status: 'waiting', attempt: a1, qr_ref: `/assistant/ui/qr/${acc}?attempt=${a1}` });
    const img = await call(h, qrPath(st.login.qr_ref)).then(json);
    expect(img.status).toBe(200);
    expect(img.body.data.png_base64).toBe(QR);
    expect((await call(h, qrPath(st.login.qr_ref), undefined, { authorization: `Bearer ${sales.token}` })).status).toBe(403);
  });

  it('làm mới cùng tài khoản → attempt mới; ảnh / sự kiện attempt cũ bị bỏ; không tạo tài khoản mới', async () => {
    const db = await tenant();
    const before = await db.channelAccount.count();
    // Hết hạn rồi làm mới (khối qr gọi channel.reconnect cùng account).
    await control.setLogin({ account_id: acc, status: 'expired', qr: null, expires_at: null, attempt: a1 });
    expect((await status(acc)).login).toMatchObject({ status: 'expired', terminal: true });
    expect((await act('channel.reconnect', { channel_account_id: acc })).status).toBe(200);
    a2 = (await control.login(acc))!.attempt!;
    expect(a2).not.toBe(a1);
    expect(await control.setLogin({ account_id: acc, status: 'connected', qr: null, expires_at: null, attempt: a1 })).toBe(false);
    await control.setLogin({ account_id: acc, status: 'waiting', qr: QR, expires_at: '2026-10-30T08:05:00.000Z', attempt: a2 });
    expect((await call(h, `/assistant/ui/qr/${acc}?attempt=${a1}`)).status).toBe(404);
    expect((await call(h, `/assistant/ui/qr/${acc}?attempt=${a2}`)).status).toBe(200);
    expect(await db.channelAccount.count()).toBe(before);
  });

  it('đã quét → scanned (không ảnh); connected → resume một lần; attempt cũ không resume', async () => {
    await control.setLogin({ account_id: acc, status: 'scanned', qr: null, expires_at: null, attempt: a2 });
    expect((await status(acc)).login).toMatchObject({ status: 'scanned', qr_ref: null });
    expect((await call(h, `/assistant/ui/qr/${acc}?attempt=${a2}`)).status).toBe(404);
    const db = await tenant();
    await db.channelAccount.update({ where: { id: acc }, data: { status: 'connected' } });
    await control.setLogin({ account_id: acc, status: 'connected', qr: null, expires_at: null, attempt: a2 });
    const runId = uuidv7();
    await db.aiRun.create({ data: { id: runId, kind: 'assistant', tier: 'standard', input: {}, rootRunId: runId, initiatedByUserId: h.user, status: 'waiting_approval', startedAt: h.clock.now() } });
    const r1 = await act('assistant.resume', { run_id: runId, node: '0', channel_account_id: acc, attempt: a2 });
    expect(r1.body.data.result).toEqual({ resumed: true, status: 'connected' });
    expect((await act('assistant.resume', { run_id: runId, node: '0', channel_account_id: acc, attempt: a2 })).body.data.result.resumed).toBe(false);
    expect((await act('assistant.resume', { run_id: runId, node: '0', channel_account_id: acc, attempt: a1 })).body.data.result.resumed).toBe(false);
  });

  it('QR không nằm trong action_log / bước run', async () => {
    const db = await tenant();
    const logs = await db.actionLog.findMany({ where: { actionId: { in: ['channel.status', 'channel.zalo.start_login', 'channel.reconnect', 'assistant.resume'] } }, select: { input: true, result: true } });
    expect(JSON.stringify(logs)).not.toContain(QR);
    expect(JSON.stringify(await db.aiRunStep.findMany({ select: { input: true, output: true } }))).not.toContain(QR);
  });
});
