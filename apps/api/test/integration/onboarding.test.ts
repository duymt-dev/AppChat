// TIP-011 AC1–AC8 qua HTTP thật (Postgres 16 + Memurai + worker ROLE=jobs thật): đăng ký OTP → workspace đầu tiên + khởi tạo,
// GET /v1/session (cổng onboarding FE), khai báo → đổi tên + trial, /workspace/provisioning, ack thông báo, hết trial,
// /v1/me theo meSchema, /v1/auth/brand, onboarding.toggle_step.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CLOCK, IdentityJobsModule, KernelModule, LOGGER, SubscriptionsService, createLogger, uuidv7 } from '@appchat/core';
import { authBrandSchema, meSchema, provisioningSchema, sessionSchema } from '@appchat/shared';
import { Module, type DynamicModule } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { env, startApi, testEmail, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

let h: Harness;
let w: WorkerHarness;
let provisioner: TestingModule;
const emails: string[] = [];

@Module({})
class ProvisionWorker {
  static forRoot(): DynamicModule {
    return { module: ProvisionWorker, imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), IdentityJobsModule] };
  }
}

beforeAll(async () => {
  h = await startApi();
  w = await startWorker(h.platform, { clock: h.clock });
  provisioner = await Test.createTestingModule({ imports: [ProvisionWorker.forRoot()] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await provisioner.init();
});
afterAll(async () => {
  const users = await h.platform.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  users.forEach((u) => h.track(u.id));
  await h.platform.otpCode.deleteMany({ where: { email: { in: emails } } });
  await provisioner?.close();
  await w?.close();
  await h?.close();
});

type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
let ip = 0;
const RUN = Math.floor(Math.random() * 200) + 20;
async function req(method: 'GET' | 'POST', path: string, body?: unknown, token?: string, extra: Record<string, string> = {}): Promise<Res> {
  const r = await fetch(`${h.base}/v1${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `10.${RUN}.9.${++ip % 250}`,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : null };
}
const codeOf = (email: string) => /\b(\d{6})\b/.exec(h.mail.last(email)?.text ?? '')?.[1];

async function signUp(tag: string) {
  const email = testEmail(tag);
  emails.push(email);
  await req('POST', '/auth/otp/request', { email, purpose: 'register' });
  const r = await req('POST', '/auth/otp/verify', { email, code: codeOf(email), purpose: 'register' });
  expect(r.status).toBe(200);
  return { email, token: r.body.data.access_token as string, userId: r.body.data.user.id as string, needsDeclare: r.body.data.needs_declare as boolean };
}

const session = async (token?: string) => (await req('GET', '/session', undefined, token)).body.data;

describe('đăng ký → workspace đầu tiên → khai báo → trial', () => {
  let u: Awaited<ReturnType<typeof signUp>>;
  let ws: string;

  it('AC1 migration 011: membership.notices_seen mặc định rỗng', async () => {
    const col = await h.platform.$queryRaw<{ column_default: string }[]>`
      SELECT column_default FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'notices_seen'`;
    expect(col[0]?.column_default).toMatch(/ARRAY\[\]/);
  });

  it('AC2 verify đăng ký → workspace provisioning (đang dùng), needs_declare; /session authed chưa khai báo; không token → authed:false 200', async () => {
    u = await signUp('onb');
    expect(u.needsDeclare).toBe(true);
    const m = await h.platform.membership.findMany({ where: { userId: u.userId } });
    expect(m).toHaveLength(1);
    ws = m[0]!.workspaceId;
    expect(await h.platform.workspace.findUniqueOrThrow({ where: { id: ws } })).toMatchObject({ name: u.email.split('@')[0], ownerUserId: u.userId });
    const s = await session(u.token);
    expect(sessionSchema.safeParse(s).success).toBe(true);
    expect(s).toMatchObject({ authed: true, declared: false, provisioned: false, workspace_id: ws });
    const anon = await req('GET', '/session');
    expect(anon.status).toBe(200);
    expect(anon.body.data).toMatchObject({ authed: false });
    expect((await req('GET', '/session', undefined, 'sai.token.x')).body.data.authed).toBe(false);
  });

  it('AC3 khai báo → đổi tên workspace; provisioning running → ready (DB active + trial); session trial 15 ngày', async () => {
    expect(await until(async () => (await h.platform.workspace.findUniqueOrThrow({ where: { id: ws } })).dbStatus === 'active', 30_000)).toBe(true);
    const before = await req('GET', '/workspace/provisioning', undefined, u.token);
    expect(provisioningSchema.parse(before.body.data).status).toBe('running'); // chưa khai báo → chưa có trial
    const input = { kind: 'enterprise', tax_code: '0312345678', legal_name: 'CÔNG TY TNHH MEDIASOFT', address: 'Q1', business_description: 'Spa' };
    const r = await req('POST', '/actions/business_profile.update', { input }, u.token, { 'x-workspace-id': ws });
    expect(r.status).toBe(200);
    expect((await h.platform.workspace.findUniqueOrThrow({ where: { id: ws } })).name).toBe('CÔNG TY TNHH MEDIASOFT');
    expect(await until(async () => (await req('GET', '/workspace/provisioning', undefined, u.token)).body.data.status === 'ready')).toBe(true);
    const s = await session(u.token);
    expect(s).toMatchObject({ declared: true, provisioned: true, trialDaysLeft: 15, trialSeen: false, expiredSeen: true });
    expect(s.trialEndsAt).toBe(new Date('2026-11-14T08:00:00.000Z').getTime());
  });

  it('AC4 ack trial_welcome → trialSeen (gọi lại không lỗi); notice sai → 422; không token → 401', async () => {
    expect((await req('POST', '/session/ack', { notice: 'trial_welcome' }, u.token)).status).toBe(204);
    expect((await req('POST', '/session/ack', { notice: 'trial_welcome' }, u.token)).status).toBe(204);
    expect((await h.platform.membership.findFirstOrThrow({ where: { userId: u.userId } })).noticesSeen).toEqual(['trial_welcome']);
    expect((await session(u.token)).trialSeen).toBe(true);
    expect((await req('POST', '/session/ack', { notice: 'x' }, u.token)).status).toBe(422);
    expect((await req('POST', '/session/ack', { notice: 'trial_welcome' })).status).toBe(401);
  });

  it('AC6 /me đúng meSchema: initial, title (vai trò), kind / color theo gói; /auth/brand theo locale', async () => {
    const me = (await req('GET', '/me', undefined, u.token)).body.data;
    expect(meSchema.safeParse(me).error?.issues ?? []).toEqual([]);
    expect(me.user).toMatchObject({ initial: u.email.charAt(0).toUpperCase(), title: 'Chủ sở hữu', phone: '' });
    expect(me.workspaces).toEqual([expect.objectContaining({ id: ws, name: 'CÔNG TY TNHH MEDIASOFT', initial: 'C', kind: 'personal', plan: 'Cá nhân Pro', color: '#2563EB' })]);
    const vi = await req('GET', '/auth/brand');
    expect(authBrandSchema.parse(vi.body.data).stats).toHaveLength(3);
    expect((await req('GET', '/auth/brand?locale=en')).body.data.stats[0].l).toBe('Businesses on board');
  });

  it('AC7 onboarding.toggle_step lưu theo workspace, done_count đúng', async () => {
    const t = (step: string, done: boolean) => req('POST', '/actions/onboarding.toggle_step', { input: { step, done } }, u.token, { 'x-workspace-id': ws });
    expect((await t('channel', true)).body.data.result).toEqual({ done_count: 1 });
    expect((await t('ai', true)).body.data.result).toEqual({ done_count: 2 });
    expect((await t('channel', false)).body.data.result).toEqual({ done_count: 1 });
    const settings = (await h.platform.workspace.findUniqueOrThrow({ where: { id: ws } })).settings as { onboarding_steps: Record<string, boolean> };
    expect(settings.onboarding_steps).toEqual({ channel: false, ai: true });
  });

  it('AC5 hết trial → trialDaysLeft 0, expiredSeen false → ack → true; gói trả phí không nhắc', async () => {
    h.clock.advance(16 * 86_400_000);
    try {
      const subs = w.app.get(SubscriptionsService, { strict: false });
      // Access token 15 phút — sau khi tua đồng hồ cấp token mới (token cũ hết hạn → /session authed:false).
      u.token = h.tokenFor(u.userId);
      expect(await subs.expireTrials()).toContain(ws);
      expect(await session(u.token)).toMatchObject({ trialDaysLeft: 0, expiredSeen: false, provisioned: true });
      expect((await req('POST', '/session/ack', { notice: 'trial_expired' }, u.token)).status).toBe(204);
      expect((await session(u.token)).expiredSeen).toBe(true);
      await h.platform.membership.updateMany({ where: { userId: u.userId }, data: { noticesSeen: [] } });
      await subs.activate(ws, 'team', 1, `inv-onb-${uuidv7()}`);
      expect(await session(u.token)).toMatchObject({ trialDaysLeft: 0, expiredSeen: true });
      const me = (await req('GET', '/me', undefined, u.token)).body.data;
      expect(me.workspaces[0]).toMatchObject({ kind: 'team', color: '#0E9B7E' });
    } finally {
      h.clock.advance(-16 * 86_400_000);
    }
  });

  it('AC8 đăng nhập lại (OTP login) không tạo workspace mới; needs_declare false', async () => {
    await req('POST', '/auth/otp/request', { email: u.email, purpose: 'login' });
    const r = await req('POST', '/auth/otp/verify', { email: u.email, code: codeOf(u.email), purpose: 'login' });
    expect(r.status).toBe(200);
    expect(r.body.data.needs_declare).toBe(false);
    expect(await h.platform.membership.count({ where: { userId: u.userId } })).toBe(1);
  });
});
