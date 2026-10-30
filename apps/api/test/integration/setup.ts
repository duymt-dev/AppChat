// Dựng API thật trên Postgres 16 + Memurai cho integration TIP-003: 1 workspace provision từ template, dev actor, handler test.
// Handler test (`tag.create` / `tag.delete`) ghi vào bảng kernel `notification` — chỉ để thử executor (preview / undo / outbox),
// handler thật của tag thuộc TIP-016.
import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Injectable, Module, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ActionHandler,
  CLOCK,
  FixedClock,
  LOGGER,
  WORKSPACE_REGISTRY,
  createLogger,
  uuidv7,
  type ActionContext,
  type ActionLogRow,
  type TenantTx,
} from '@appchat/core';
import { AppError } from '@appchat/shared';
import { MemoryWorkspaceRegistry, TenantProvisioner, tenantDbName } from '@appchat/db';
import { AppModule } from '../../src/app.module';
import { EnvelopeErrorFilter } from '../../src/http/kernel/error.filter';
import { DEV_MEMBERS } from '../../src/http/kernel/kernel.http.module';
import { traceMiddleware } from '../../src/middleware/trace.middleware';

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
export const env: Record<string, string> = { ...readEnv(join(ROOT, '.env')), NODE_ENV: 'test', LOG_LEVEL: 'silent' };

export let calls = 0;
export const SCOPE_PROBE = '0190f000-0000-7000-8000-00000000aaaa';
@Injectable()
@ActionHandler('tag.create')
export class TestTagCreate {
  async execute(ctx: ActionContext, input: { name: string }, tx: TenantTx) {
    calls++;
    const id = uuidv7();
    await tx.notification.create({ data: { id, userId: ctx.actor.id, type: 'tag', title: input.name } });
    if (input.name === 'boom') throw new Error('handler lỗi');
    return { result: { tag_id: id }, after: { id }, events: [{ topic: 'tag.created', payload: { id } }] };
  }
  async preview(_ctx: ActionContext, input: { name: string }) {
    return { summary: `Tạo thẻ ${input.name}`, risk: 'config' as const };
  }
}

@Injectable()
@ActionHandler('tag.delete')
export class TestTagDelete {
  async execute(ctx: ActionContext, input: { tag_id: string }, tx: TenantTx) {
    // Kiểm scope do handler làm (action-registry §5 bước 3) — bản ghi SCOPE_PROBE coi như của người khác.
    if (input.tag_id === SCOPE_PROBE && ctx.authz.userId !== SCOPE_PROBE) throw new AppError('SCOPE_FORBIDDEN', 403);
    const before = await tx.notification.findUniqueOrThrow({ where: { id: input.tag_id } });
    await tx.notification.delete({ where: { id: input.tag_id } });
    return { result: { ok: true }, before: { ...before, createdAt: before.createdAt.toISOString() } };
  }
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string; userId: string; type: string; title: string; createdAt: string };
    await tx.notification.create({ data: { id: b.id, userId: b.userId, type: b.type, title: b.title, createdAt: new Date(b.createdAt) } });
  }
}

@Module({ providers: [TestTagCreate, TestTagDelete] })
class TestHandlersModule {}

export interface Harness {
  app: INestApplication;
  base: string;
  ws: string;
  user: string;
  clock: FixedClock;
  registry: MemoryWorkspaceRegistry;
  close(): Promise<void>;
}

export async function startApi(): Promise<Harness> {
  const ws = randomUUID();
  const user = randomUUID();
  const provisioner = new TenantProvisioner({
    adminUrl: env.PROVISIONER_DATABASE_URL!,
    templateDb: env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template',
    ownerRole: 'appchat_migrator',
    appRole: 'appchat_tenant_app',
  });
  const { dbName } = await provisioner.provision(ws);
  const registry = new MemoryWorkspaceRegistry();
  registry.upsert({ workspaceId: ws, dbName, dbHost: null, dbStatus: 'active', schemaVersion: null });
  DEV_MEMBERS.set(ws, new Set([user]));
  const clock = new FixedClock('2026-10-30T08:00:00.000Z');
  const log = createLogger({ level: 'silent' });
  const mod = await Test.createTestingModule({ imports: [AppModule.forRoot(env), TestHandlersModule] })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(LOGGER)
    .useValue(log)
    .overrideProvider(WORKSPACE_REGISTRY)
    .useValue(registry)
    .compile();
  const app = mod.createNestApplication({ logger: false });
  app.setGlobalPrefix('v1');
  app.use(traceMiddleware(log));
  app.useGlobalFilters(new EnvelopeErrorFilter(log));
  await app.listen(0);
  const base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
  return {
    app,
    base,
    ws,
    user,
    clock,
    registry,
    close: async () => {
      await app.close();
      await provisioner.drop(tenantDbName(ws));
    },
  };
}

export function call(h: Harness, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return fetch(`${h.base}/v1${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-workspace-id': h.ws, 'x-dev-user': h.user, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
