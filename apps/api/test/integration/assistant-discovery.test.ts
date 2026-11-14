// TIP-023e (Postgres 16 + pgvector thật): dựng generation bằng embed giả 1536 chiều → `ready`; discoverActions trên DB tenant thật: vector
// chỉ trong tập action được phép (người quyền hẹp không thấy action ngoài quyền dù vector khớp), keyword fallback trung thực khi chưa có
// generation; câu hỏi `find_actions` ghi qua RunStore thật bị che trong `ai_run_step`; EXPLAIN truy vấn vector dùng khoá
// (generation_id, action_id) — lọc theo generation + id được phép TRƯỚC khi xếp hạng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mockEmbedSource, mockVector } from '@appchat/ai';
import { RunStore, buildCorpus, buildGeneration, claimGeneration, discoverActions, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
const now = () => new Date();
const all = () => true;
const models = mockEmbedSource();
const executor = { isImplemented: () => true, execute: async () => ({ status: 200, data: {} }) } as never;

async function space() {
  const [c] = await models.candidates('standard', 'embed', { tools: false });
  return { provider: c!.provider, model: c!.model, dimension: 1536, configRevision: c!.configRevision ?? '' };
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'discovery-test'));
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('discovery trên DB tenant thật', () => {
  it('chưa có generation → keyword, reason corpus_not_ready', async () => {
    const r = await discoverActions({ db, space: await space(), queryVector: async () => new Array(1536).fill(0.01) }, { authz: authzForRole('owner', 'u1'), mode: 'cowork', query: 'tạo khách hàng', limit: 8, implemented: all });
    expect(r.discovery).toMatchObject({ strategy: 'keyword', reason: 'corpus_not_ready' });
  });

  it('claim + build → ready; hybrid chỉ trả action trong quyền hiện hành', async () => {
    const corpus = buildCorpus(all);
    const sp = await space();
    const c = await claimGeneration(db, { corpusHash: corpus.corpusHash, space: sp, buildOperationId: uuidv7(), ownerRootRunId: uuidv7(), expectedCount: corpus.docs.length, now: now() });
    const out = await buildGeneration(db, h.ws, c.generation.id, { executor, models, meter: null, now });
    expect(out.status).toBe('ready');
    const docs = await db.actionDiscoveryDocument.count({ where: { generationId: c.generation.id } });
    expect(docs).toBe(corpus.docs.length);

    const vec = mockVector('xoá khách hàng');
    const owner = await discoverActions({ db, space: sp, queryVector: async () => vec }, { authz: authzForRole('owner', 'u1'), mode: 'cowork', query: 'xoá khách hàng', limit: 8, implemented: all });
    expect(owner.discovery).toMatchObject({ strategy: 'hybrid', corpus_version: corpus.corpusHash });
    expect(owner.actions.length).toBeGreaterThan(0);

    const chat = await discoverActions({ db, space: sp, queryVector: async () => vec }, { authz: authzForRole('cs', 'u2'), mode: 'chat', query: 'xoá khách hàng', limit: 8, implemented: all });
    expect(chat.actions.every((a) => a.risk === 'read')).toBe(true);
  });

  it('EXPLAIN truy vấn vector: lọc theo generation + id được phép trước khi xếp hạng (dùng khoá generation_id, action_id)', async () => {
    const g = await db.actionDiscoveryGeneration.findFirst({ where: { phase: 'ready' }, select: { id: true } });
    const q = `[${new Array(1536).fill('0.01').join(',')}]`;
    const plan = await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
      `EXPLAIN SELECT action_id FROM action_discovery_document WHERE generation_id = $1::uuid AND action_id IN ('contact.create','contact.search') AND embedding IS NOT NULL ORDER BY embedding <=> $2::vector, action_id LIMIT 20`,
      g!.id,
      q,
    );
    const text = plan.map((r) => r['QUERY PLAN']).join('\n');
    expect(text).toMatch(/action_discovery_document_key/);
    expect(text).not.toMatch(/Seq Scan on action_discovery_document/);
  });

  it('bước find_actions ghi qua RunStore thật → câu hỏi bị che trong ai_run_step', async () => {
    const store = new RunStore(db, now);
    const run = await store.create({ kind: 'assistant', tier: 'standard', input: {}, initiatedByUserId: h.user });
    await store.step(run.id, { idx: 0, type: 'tool', actionId: 'find_actions', input: { query: 'SĐT chị Hoa 0912345678', module: 'crm' }, output: { kind: 'ok', output: { actions: [] } } });
    const row = await db.aiRunStep.findUniqueOrThrow({ where: { runId_idx: { runId: run.id, idx: 0 } }, select: { input: true } });
    expect(row.input).toEqual({ query: '[redacted]', module: 'crm' });
  });
});
