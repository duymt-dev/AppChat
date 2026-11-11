// TIP-023e §1.4-§1.6: buildGeneration — dựng vector cho MỘT generation đã claim (building): embed theo lô, ghi document, advance
// sau mỗi lô; registry đổi giữa claim/build (corpus_hash lệch) → fail rõ corpus_changed; thiếu route embed → fail no_model_route;
// generation không còn building (race) → skipped, không ghi thêm.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { mockEmbeddingModel } from '@appchat/ai';
import { buildGeneration } from '../src/ai/assistant/discovery/build.processor';
import { buildCorpus } from '../src/ai/assistant/discovery/corpus';
import { embeddingSpaceKey, type EmbeddingSpace } from '../src/ai/assistant/discovery/types';

const NOW = new Date('2026-11-10T00:00:00Z');
const now = () => NOW;
const implemented = () => true;

const SPACE: EmbeddingSpace = { provider: 'mock', model: 'mock-embed', dimension: 1536, configRevision: '' };
const mockModels = { candidates: async () => [{ provider: SPACE.provider, model: SPACE.model, handle: mockEmbeddingModel(SPACE.provider), configRevision: SPACE.configRevision }] };

/** DB giả: actionDiscoveryGeneration (findUnique/create/updateMany) + actionDiscoveryDocument (findMany) + $executeRaw (ghi
 *  document qua raw SQL — bắt lại tham số của tagged template, không thực sự chạy Postgres). */
function fakeDb() {
  const generations = new Map<string, Record<string, unknown>>();
  const docs: { generationId: string; actionId: string; documentHash: string }[] = [];
  return {
    generations,
    docs,
    actionDiscoveryGeneration: {
      findUnique: async ({ where }: { where: { id: string } }) => generations.get(where.id) ?? null,
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const row = generations.get(where.id as string);
        if (!row || (where.phase !== undefined && row.phase !== where.phase)) return { count: 0 };
        const next = { ...row };
        for (const [k, v] of Object.entries(data)) next[k] = v && typeof v === 'object' && 'increment' in (v as object) ? (next[k] as number) + (v as { increment: number }).increment : v;
        generations.set(row.id as string, next);
        return { count: 1 };
      },
    },
    actionDiscoveryDocument: {
      findMany: async ({ where }: { where: { generationId: string } }) => docs.filter((d) => d.generationId === where.generationId).map((d) => ({ actionId: d.actionId })),
    },
    aiRun: { findUnique: async () => null, create: async () => null },
    $executeRaw: async (strings: readonly string[], ...vals: unknown[]) => {
      // INSERT INTO action_discovery_document (id, generation_id, action_id, document_hash, embedding) VALUES (...)
      const sql = strings.join('?');
      if (sql.includes('action_discovery_document')) docs.push({ generationId: String(vals[1]), actionId: String(vals[2]), documentHash: String(vals[3]) });
      return 1;
    },
  };
}

const asDb = (db: ReturnType<typeof fakeDb>) => db as never;

function seedGeneration(db: ReturnType<typeof fakeDb>, i: { id: string; corpusHash: string; expectedCount: number }) {
  db.generations.set(i.id, { id: i.id, corpusHash: i.corpusHash, embeddingSpace: embeddingSpaceKey(SPACE), phase: 'building', buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: i.expectedCount, completedCount: 0, failedReason: null });
}

describe('buildGeneration (TIP-023e §1.4-§1.6)', () => {
  it('dựng xong mọi document → generation chuyển ready, mỗi action một document với vector 1536 chiều', async () => {
    const corpus = buildCorpus(implemented);
    const db = fakeDb();
    seedGeneration(db, { id: 'gen-1', corpusHash: corpus.corpusHash, expectedCount: corpus.docs.length });
    const out = await buildGeneration(asDb(db), 'ws', 'gen-1', { executor: { execute: async () => { throw new Error('unused'); }, isImplemented: implemented }, models: mockModels as never, meter: null, now });
    expect(out.status).toBe('ready');
    expect(db.generations.get('gen-1')!.phase).toBe('ready');
    expect(db.generations.get('gen-1')!.completedCount).toBe(corpus.docs.length);
    expect(db.docs).toHaveLength(corpus.docs.length);
  });

  it('generation không ở phase building (đã ready/failed/không tồn tại) → skipped, không ghi gì', async () => {
    const db = fakeDb();
    const out = await buildGeneration(asDb(db), 'ws', 'missing', { executor: { execute: async () => { throw new Error('unused'); }, isImplemented: implemented }, models: mockModels as never, meter: null, now });
    expect(out.status).toBe('skipped');
    expect(db.docs).toHaveLength(0);
  });

  it('thiếu model embedding (ModelSource null) → fail rõ no_model_route, generation chuyển failed', async () => {
    const corpus = buildCorpus(implemented);
    const db = fakeDb();
    seedGeneration(db, { id: 'gen-1', corpusHash: corpus.corpusHash, expectedCount: corpus.docs.length });
    const out = await buildGeneration(asDb(db), 'ws', 'gen-1', { executor: { execute: async () => { throw new Error('unused'); }, isImplemented: implemented }, models: null, meter: null, now });
    expect(out.status).toBe('failed');
    expect(db.generations.get('gen-1')!.phase).toBe('failed');
    expect(db.generations.get('gen-1')!.failedReason).toBe('no_model_route');
  });

  it('registry đổi giữa claim và build (corpus_hash khác) → fail rõ corpus_changed, không embed theo registry mới', async () => {
    const db = fakeDb();
    seedGeneration(db, { id: 'gen-1', corpusHash: 'corpus-hash-cu-khong-con-khop', expectedCount: 1 });
    const out = await buildGeneration(asDb(db), 'ws', 'gen-1', { executor: { execute: async () => { throw new Error('unused'); }, isImplemented: implemented }, models: mockModels as never, meter: null, now });
    expect(out.status).toBe('failed');
    expect(db.generations.get('gen-1')!.failedReason).toBe('corpus_changed');
    expect(db.docs).toHaveLength(0);
  });

  it('document đã có từ lần chạy trước (job retry) → KHÔNG embed lại, chỉ các action còn thiếu', async () => {
    const corpus = buildCorpus(implemented);
    const db = fakeDb();
    seedGeneration(db, { id: 'gen-1', corpusHash: corpus.corpusHash, expectedCount: corpus.docs.length });
    // Giả lập một action đã có document từ lần chạy trước (completedCount khớp).
    const already = corpus.docs[0]!;
    db.docs.push({ generationId: 'gen-1', actionId: already.actionId, documentHash: already.documentHash });
    db.generations.set('gen-1', { ...db.generations.get('gen-1')!, completedCount: 1 });
    let calls = 0;
    const countingModels = { candidates: async () => [{ provider: SPACE.provider, model: SPACE.model, handle: mockEmbeddingModel(SPACE.provider, { onCall: () => calls++ }), configRevision: SPACE.configRevision }] };
    const out = await buildGeneration(asDb(db), 'ws', 'gen-1', { executor: { execute: async () => { throw new Error('unused'); }, isImplemented: implemented }, models: countingModels as never, meter: null, now });
    expect(out.status).toBe('ready');
    expect(db.docs).toHaveLength(corpus.docs.length); // vẫn đủ document, không trùng action đã có
    expect(new Set(db.docs.map((d) => d.actionId)).size).toBe(corpus.docs.length);
  });
});
