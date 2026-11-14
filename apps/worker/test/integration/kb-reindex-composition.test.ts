// TIP-020e AC10: worker ROLE=ai thật (WorkerModule.forRole — module production, engine mock) đăng ký processor `kb-reindex`: job đẩy qua
// KbReindexQueue (đúng hàng đợi API dùng sau commit) → lượt runGeneration dưới lease → publish đổi khe. Drain (đóng app — 045b): processor
// ngừng nhận lô mới; lô đang chạy ghi xong rồi nhả lease (cursor giữ), job sau tiếp đúng cursor. Không có Redis / DB → không chạy (ngoài phạm vi).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { KB_EMBEDDER, KB_REINDEX_QUEUE, KbReindexQueue, WalletService, createGeneration, runTenantSeeds, tenantSeedDb, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '@appchat/db';
import { WorkerModule } from '../../src/worker.module';
import { testEnv } from './fixtures/ai-process';

let app: INestApplicationContext | null = null;
let platform: PlatformDb;
let resolver: TenantDbResolver;
let db: TenantDb;
let redis: IORedis;
let queue: KbReindexQueue;
const ws = uuidv7();
const owner = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const VEC = `[${Array.from({ length: 1536 }, (_, i) => (i === 0 ? '1' : '0')).join(',')}]`;
let source = '';

/** Bề mặt embedder production cần trong test (gói worker không phụ thuộc @appchat/ai). */
type Embedder = { embed(values: string[], ...rest: unknown[]): Promise<unknown>; space?(): Promise<{ key: string } | null> };

const until = async (f: () => Promise<boolean>, ms = 30_000) => {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 200))) if (await f()) return true;
  return false;
};

async function boot() {
  Object.assign(process.env, testEnv, { ROLE: 'ai' });
  const a = await NestFactory.createApplicationContext(WorkerModule.forRole('ai'), { logger: false });
  await a.init();
  return a;
}

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-kbre-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS kb reindex', slug: `ws-kbre-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  redis = new IORedis(testEnv.REDIS_URL!, { maxRetriesPerRequest: null });
  queue = new KbReindexQueue(redis);
  db = await resolver.get(TenantContexts.system(ws, 't'));
  // Kho 130 đoạn ở khe A, space cũ (thế hệ route trống — trước 020e) → 3 lô vào khe B ở space của embedder mock hiện hành.
  source = uuidv7();
  await db.kbSource.create({ data: { id: source, origin: 'text', kind: 'text', name: 'Bảo hành', body: 'x', status: 'ready', chunkCount: 130 } });
  const s = await db.kbSetting.findUniqueOrThrow({ where: { id: 1 } });
  for (let i = 0; i < 130; i++)
    await db.$executeRaw`INSERT INTO kb_chunk (id, source_id, ord, content, embedding, embed_model, embed_space_a, embed_generation_a, token_count)
      VALUES (${uuidv7()}::uuid, ${source}::uuid, ${i}, ${`chính sách bảo hành đoạn ${i}`}, ${VEC}::vector, 'old:m', 'old:m:1536:', ${s.activeGenerationId}::uuid, 10)`;
  await db.kbSetting.update({ where: { id: 1 }, data: { activeSpace: 'old:m:1536:', indexState: 'stale' } });
}, 180_000);

afterAll(async () => {
  await app?.close();
  await new Queue(KB_REINDEX_QUEUE, { connection: redis.duplicate() }).obliterate({ force: true }).catch(() => undefined);
  await queue?.onApplicationShutdown();
  redis?.disconnect();
  await resolver?.close();
  await prov.drop(tenantDbName(ws)).catch(() => undefined);
  await platform.membership.deleteMany({ where: { workspaceId: ws } });
  await platform.workspace.deleteMany({ where: { id: ws } });
  await platform.user.deleteMany({ where: { id: owner } });
  await platform.$disconnect();
});

describe('worker ROLE=ai — processor kb-reindex', () => {
  it('drain giữa lô → nhả lease, cursor giữ; worker mới nhận job tiếp đúng cursor → publish đổi khe (embedder production)', async () => {
    app = await boot();
    await app.get(WalletService, { strict: false }).topup(ws, 1000, { refType: 'test', refId: uuidv7() });
    const embedder = app.get(KB_EMBEDDER, { strict: false }) as Embedder;
    const space = (await embedder.space!())!.key;
    const g = await createGeneration(db, { slot: 'b', spaceKey: space, expected: 130, createdBy: owner, operationId: null, now: new Date() });
    // Chặn lô 1 tại embed để đóng app (drain) đúng lúc lô đang chạy.
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let entered = false;
    const real = embedder.embed.bind(embedder);
    Object.assign(embedder, {
      embed: async (...a: Parameters<Embedder['embed']>) => {
        if (!entered) {
          entered = true;
          await gate;
        }
        return real(...a);
      },
    });
    await queue.push(ws, g.id, null);
    expect(await until(async () => entered)).toBe(true);
    const closing = app.close();
    release();
    await closing;
    app = null;
    const paused = await db.kbEmbedGeneration.findUniqueOrThrow({ where: { id: g.id } });
    expect(paused).toMatchObject({ phase: 'building', done: 64, leaseToken: null });
    expect(paused.cursorChunkId).not.toBeNull();

    // Khởi động lại (quét khôi phục / API đẩy lại từ cursor) → worker production tiếp, không embed lại lô 1.
    app = await boot();
    const calls: number[] = [];
    const e2 = app.get(KB_EMBEDDER, { strict: false }) as Embedder;
    const real2 = e2.embed.bind(e2);
    Object.assign(e2, { embed: async (...a: Parameters<Embedder['embed']>) => (calls.push(a[0].length), real2(...a)) });
    await queue.push(ws, g.id, paused.cursorChunkId);
    expect(await until(async () => (await db.kbEmbedGeneration.findUniqueOrThrow({ where: { id: g.id } })).phase === 'active')).toBe(true);
    expect(calls).toEqual([64, 2]);
    expect(await db.kbChunk.count({ where: { sourceId: source, embedGenerationB: g.id, embedSpaceB: space } })).toBe(130);
    expect(await db.kbSetting.findUniqueOrThrow({ where: { id: 1 } })).toMatchObject({ activeSlot: 'b', activeGenerationId: g.id, activeSpace: space, indexState: 'current' });
    // Ví nguồn `kb` bị trừ theo usage thật (019b) — không miễn phí.
    expect(await platform.creditLedger.count({ where: { workspaceId: ws, source: 'kb', kind: 'usage' } })).toBeGreaterThan(0);
  }, 120_000);
});
