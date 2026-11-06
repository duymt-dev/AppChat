// Dựng API thật trên Postgres 16 + Memurai cho integration (TIP-003+): workspace thật ở DB nền tảng (registry Prisma —
// TIP-004), DB tenant provision từ template, user + membership owner, access JWT thật. Mail = console (bộ nhớ).
// Handler thử (`campaign.create` / `campaign.delete` / `campaign.submit`) ghi vào bảng kernel `notification` — chỉ để thử executor
// (preview / undo / outbox). TIP-037 đã cài handler thật → harness bật `probes` THAY provider thật bằng lớp thử (overrideProvider, không
// đăng ký thêm — registry cấm trùng id); file test marketing chạy handler thật (không bật). `campaign.delete` (risk delete → task cần
// duyệt) không có undo trong registry → thử undo qua `campaign.submit`.
import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AccessTokens,
  ActionHandler,
  CampaignCreateHandler,
  CampaignDeleteHandler,
  CampaignSubmitHandler,
  CLOCK,
  FixedClock,
  LOGGER,
  MAIL_PROVIDER,
  createLogger,
  runTenantSeeds,
  tenantSeedDb,
  uuidv7,
  type ActionContext,
  type ActionLogRow,
  type TenantTx,
} from '@appchat/core';
import { AppError } from '@appchat/shared';
import { TenantProvisioner, createPlatformDb, tenantDbName, testDbEnv, type PlatformDb } from '@appchat/db';
import { MemoryMailProvider } from '@appchat/integrations';
import { AppModule } from '../../src/app.module';
import { EnvelopeErrorFilter } from '../../src/http/kernel/error.filter';
import { applyPrefix } from '../../src/http/kernel/prefix';
import { traceMiddleware } from '../../src/middleware/trace.middleware';
import { applySecurity } from '../../src/http/kernel/security.middleware';

const ROOT = join(import.meta.dirname, '..', '..', '..', '..');
const readEnv = (f: string): Record<string, string> =>
  existsSync(f)
    ? Object.fromEntries(
        readFileSync(f, 'utf8')
          .split(/\r?\n/)
          .filter((l) => /^[A-Z_]+=/.test(l))
          .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
      )
    : {};
const dotenv = readEnv(join(ROOT, '.env'));
export const env: Record<string, string> = {
  ...dotenv,
  // DB nền tảng riêng của test (DC-358) — không ghi workspace test vào DB demo.
  ...testDbEnv(dotenv),
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  MAIL_PROVIDER: 'console',
  // Hộp thư kênh Email giả (TIP-018) — integration không đăng nhập IMAP / SMTP thật.
  MAIL_TRANSPORT: 'fake',
  // Model + embedding giả (TIP-019 / 020, Q-001); tệp tải lên vào thư mục tạm của lượt test.
  AI_ENGINE: 'mock',
  // Lượt Trợ lý chạy trong tiến trình API (không có worker ROLE=ai ở harness này) — đường queue có test riêng ở apps/worker (DC-316).
  ASSISTANT_DISPATCH: 'inline',
  FILES_DIR: join(tmpdir(), 'appchat-test-files'),
  TAX_LOOKUP_PROVIDER: 'mock',
  COOKIE_SECURE: 'true',
  JWT_SECRET: 'test-secret-0123456789-0123456789-abcdef',
  // Link tuyệt đối trong email thông báo — cố định, không theo cổng web demo của `.env`.
  APP_PUBLIC_URL: 'http://localhost:3000',
  // Launcher đổi DOCX cô lập (TIP-030b, DC-321) — chỉ khi người chạy test đặt trong shell; vắng → đường đóng an toàn 501.
  ...Object.fromEntries(['RENDER_ISOLATION_LAUNCHER', 'RENDER_ISOLATION_WINDOWS_MODE'].flatMap((k) => (process.env[k] ? [[k, process.env[k]!]] : []))),
};
// Hàng đợi BullMQ không có prefix theo môi trường: worker demo / dev chạy cùng Memurai DB 0 sẽ lấy mất job của test (đăng nhập Zalo giả
// bị worker ZALO_TRANSPORT=zca nhận). Test dùng DB Redis riêng (mặc định 15) — không đụng dữ liệu demo.
env.REDIS_URL = env.TEST_REDIS_URL ?? (env.REDIS_URL ?? 'redis://127.0.0.1:6379/0').replace(/\/\d+$/, '') + '/15';

export let calls = 0;
export const SCOPE_PROBE = '0190f000-0000-7000-8000-00000000aaaa';
@Injectable()
@ActionHandler('campaign.create')
export class TestTagCreate {
  async execute(ctx: ActionContext, input: { name: string }, tx: TenantTx) {
    calls++;
    const id = uuidv7();
    await tx.notification.create({ data: { id, userId: ctx.actor.id, type: 'tag', title: input.name } });
    if (input.name === 'boom') throw new Error('handler lỗi');
    return { result: { campaign_id: id, code: 'CP-1', est_recipients: 1, est_credits: 0 }, after: { id }, events: [{ topic: 'tag.created', payload: { id } }] };
  }
  async preview(_ctx: ActionContext, input: { name: string }) {
    return { summary: `Tạo thẻ ${input.name}`, risk: 'config' as const };
  }
}

/** Xoá bản ghi `notification` theo `campaign_id` (dùng chung cho hai handler test dưới). */
async function removeProbe(ctx: ActionContext, input: { campaign_id: string }, tx: TenantTx) {
  // Kiểm scope do handler làm (action-registry §5 bước 3) — bản ghi SCOPE_PROBE coi như của người khác.
  if (input.campaign_id === SCOPE_PROBE && ctx.authz.userId !== SCOPE_PROBE) throw new AppError('SCOPE_FORBIDDEN', 403);
  const before = await tx.notification.findUniqueOrThrow({ where: { id: input.campaign_id } });
  await tx.notification.delete({ where: { id: input.campaign_id } });
  return { result: { campaign_id: input.campaign_id }, before: { ...before, createdAt: before.createdAt.toISOString() } };
}

async function restoreProbe(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
  const b = log.before as { id: string; userId: string; type: string; title: string; createdAt: string };
  await tx.notification.create({ data: { id: b.id, userId: b.userId, type: b.type, title: b.title, createdAt: new Date(b.createdAt) } });
}

@Injectable()
@ActionHandler('campaign.delete')
export class TestTagDelete {
  execute = removeProbe;
  undo = restoreProbe;
}

@Injectable()
@ActionHandler('campaign.submit')
export class TestTagSubmit {
  async execute(ctx: ActionContext, input: { campaign_id: string }, tx: TenantTx) {
    const out = await removeProbe(ctx, input, tx);
    return { ...out, result: { ...out.result, status: 'pending_approval' } };
  }
  undo = restoreProbe;
}

/** Handler thật → lớp thử (bật bằng `startApi({ probes: true })`). */
const PROBES = [
  [CampaignCreateHandler, TestTagCreate],
  [CampaignDeleteHandler, TestTagDelete],
  [CampaignSubmitHandler, TestTagSubmit],
] as const;

export interface Harness {
  app: INestApplication;
  base: string;
  ws: string;
  user: string;
  /** Access JWT của owner. */
  token: string;
  clock: FixedClock;
  mail: MemoryMailProvider;
  platform: PlatformDb;
  /** Thêm user + membership (vai trò) vào workspace của harness → access token. */
  member(role: string): Promise<{ id: string; token: string }>;
  /** Access token cho user bất kỳ (không cần membership). */
  tokenFor(userId: string): string;
  /** Đăng ký user tạo qua API để dọn khi close. */
  track(userId: string): void;
  close(): Promise<void>;
}

export const provisioner = () =>
  new TenantProvisioner({
    adminUrl: env.PROVISIONER_DATABASE_URL!,
    templateDb: env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template',
    ownerRole: 'appchat_migrator',
    appRole: 'appchat_tenant_app',
  });

export const testEmail = (tag: string) => `t-${tag}-${uuidv7().slice(-12)}@test.appchat.vn`;

/** Xoá dữ liệu nền tảng của các user / workspace test (DB tenant drop riêng). */
export async function cleanupPlatform(platform: PlatformDb, users: string[], workspaces: string[]): Promise<void> {
  const emails = (await platform.user.findMany({ where: { id: { in: users } }, select: { email: true } })).map((u) => u.email);
  await platform.membership.deleteMany({ where: { OR: [{ userId: { in: users } }, { workspaceId: { in: workspaces } }] } });
  await platform.invite.deleteMany({ where: { workspaceId: { in: workspaces } } });
  await platform.businessProfile.deleteMany({ where: { workspaceId: { in: workspaces } } });
  await platform.workspace.deleteMany({ where: { id: { in: workspaces } } });
  await platform.refreshToken.deleteMany({ where: { userId: { in: users } } });
  await platform.otpCode.deleteMany({ where: { email: { in: emails } } });
  await platform.notificationPref.deleteMany({ where: { userId: { in: users } } });
  await platform.integrationInterest.deleteMany({ where: { workspaceId: { in: workspaces } } });
  await platform.tenantIntegrationRoute.deleteMany({ where: { workspaceId: { in: workspaces } } });
  await platform.tenantChannelRoute.deleteMany({ where: { workspaceId: { in: workspaces } } });
  await platform.tenantSignRoute.deleteMany({ where: { workspaceId: { in: workspaces } } });
  await platform.billingInvoice.deleteMany({ where: { workspaceId: { in: workspaces } } });
  await platform.creditLedger.deleteMany({ where: { workspaceId: { in: workspaces } } });
  await platform.creditWallet.deleteMany({ where: { workspaceId: { in: workspaces } } });
  await platform.subscription.deleteMany({ where: { workspaceId: { in: workspaces } } });
  await platform.user.deleteMany({ where: { id: { in: users } } });
}

/** `logSink`: bắt log thật của app (mức info) — test AC12 kiểm không có PII. */
/** Ngưỡng nới cho bộ test nghiệp vụ (mỗi file dồn hàng trăm lệnh của một user); `realRateLimits` dùng ngưỡng thật (TIP-045b AC). */
const RELAXED_RATE = { read: { name: 'api:read', limit: 100_000, windowMs: 60_000 }, action: { name: 'api:action', limit: 100_000, windowMs: 60_000 }, public: { name: 'api:public', limit: 100_000, windowMs: 60_000 } };

export async function startApi(opts: { logSink?: NodeJS.WritableStream; realRateLimits?: boolean; probes?: boolean } = {}): Promise<Harness> {
  const clock = new FixedClock('2026-10-30T08:00:00.000Z');
  const mail = new MemoryMailProvider();
  const log = opts.logSink ? createLogger({ level: 'info', destination: opts.logSink }) : createLogger({ level: 'silent' });
  const platform = createPlatformDb(env.PLATFORM_DATABASE_URL!);
  const prov = provisioner();
  const ws = uuidv7();
  const user = uuidv7();
  const users = [user];
  await platform.user.create({ data: { id: user, email: testEmail('owner'), name: 'Owner', emailVerifiedAt: clock.now() } });
  const { dbName } = await prov.provision(ws);
  // Như job tenant.provision: chạy seed mặc định (vai trò hệ thống…) trước khi active.
  await tenantSeedDb(env.TENANT_DATABASE_URL!)(dbName, (db) => runTenantSeeds(db, { workspaceId: ws, now: clock.now() }));
  await platform.workspace.create({ data: { id: ws, name: 'WS test', slug: `ws-test-${ws.slice(-12)}`, ownerUserId: user, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: user, roleKey: 'owner', joinedAt: clock.now() } });

  let builder = Test.createTestingModule({ imports: [AppModule.forRoot(env)] });
  if (opts.probes) for (const [real, probe] of PROBES) builder = builder.overrideProvider(real).useClass(probe);
  const mod = await builder
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(LOGGER)
    .useValue(log)
    .overrideProvider(MAIL_PROVIDER)
    .useValue(mail)
    .compile();
  const app = mod.createNestApplication({ logger: false, rawBody: true });
  applyPrefix(app);
  app.use(traceMiddleware(log));
  applySecurity(app, env, opts.realRateLimits ? undefined : RELAXED_RATE);
  app.useGlobalFilters(new EnvelopeErrorFilter(log));
  await app.listen(0);
  const base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
  const tokens = app.get(AccessTokens);
  const tokenFor = (id: string) => tokens.issue(id, clock.now().getTime()).token;
  return {
    app,
    base,
    ws,
    user,
    token: tokenFor(user),
    clock,
    mail,
    platform,
    tokenFor,
    track: (id) => void users.push(id),
    async member(role) {
      const id = uuidv7();
      users.push(id);
      await platform.user.create({ data: { id, email: testEmail(role), name: role } });
      await platform.membership.create({ data: { workspaceId: ws, userId: id, roleKey: role, joinedAt: clock.now() } });
      return { id, token: tokenFor(id) };
    },
    close: async () => {
      await app.close();
      const owned = await platform.workspace.findMany({ where: { OR: [{ id: ws }, { ownerUserId: { in: users } }] }, select: { id: true } });
      const wsIds = owned.map((w) => w.id);
      for (const id of wsIds) await prov.drop(tenantDbName(id));
      await cleanupPlatform(platform, users, wsIds);
      await platform.$disconnect();
    },
  };
}

/** Gọi /v1 với owner (Bearer mới theo đồng hồ test + X-Workspace-Id); header truyền vào ghi đè. */
export function call(h: Harness, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return fetch(`${h.base}/v1${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-workspace-id': h.ws, authorization: `Bearer ${h.tokenFor(h.user)}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
