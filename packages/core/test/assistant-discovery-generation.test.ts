// TIP-023e §1.3, §1.5: claimGeneration nguyên tử theo (corpus_hash, embedding_space) — một gốc thắng lease `building`, gốc khác
// cùng cặp nhận lại đúng dòng đang có (không tạo batch song song); advanceGeneration/failGeneration CAS theo phase `building`
// (không đè generation đã `ready`/`failed` ở tiến trình khác).
import { describe, expect, it } from 'vitest';
import { advanceGeneration, claimGeneration, failGeneration, findGeneration } from '../src/ai/assistant/discovery/generation';
import type { EmbeddingSpace } from '../src/ai/assistant/discovery/types';

const SPACE: EmbeddingSpace = { provider: 'nine', model: 'embed-1', dimension: 1536, configRevision: 'rev-1' };
const CORPUS = 'corpus-hash-abc';
const NOW = new Date('2026-11-10T00:00:00Z');

/** DB giả tối thiểu: chỉ `actionDiscoveryGeneration` (findUnique/create/updateMany) — đủ cho generation.ts, không cần Postgres thật. */
function fakeDb() {
  const rows = new Map<string, Record<string, unknown>>();
  const keyOf = (corpusHash: string, embeddingSpace: string) => `${corpusHash}\u0000${embeddingSpace}`;
  return {
    rows,
    actionDiscoveryGeneration: {
      findUnique: async ({ where }: { where: { id?: string; corpusHash_embeddingSpace?: { corpusHash: string; embeddingSpace: string } } }) => {
        if (where.id) return rows.get(where.id) ?? null;
        if (where.corpusHash_embeddingSpace) {
          const k = keyOf(where.corpusHash_embeddingSpace.corpusHash, where.corpusHash_embeddingSpace.embeddingSpace);
          return [...rows.values()].find((r) => keyOf(r.corpusHash as string, r.embeddingSpace as string) === k) ?? null;
        }
        return null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const k = keyOf(data.corpusHash as string, data.embeddingSpace as string);
        if ([...rows.values()].some((r) => keyOf(r.corpusHash as string, r.embeddingSpace as string) === k)) {
          throw Object.assign(new Error('unique violation'), { code: 'P2002' });
        }
        rows.set(data.id as string, { ...data });
        return { ...data };
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const row = rows.get(where.id as string);
        if (!row || (where.phase !== undefined && row.phase !== where.phase)) return { count: 0 };
        const next = { ...row };
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && 'increment' in (v as object)) next[k] = (next[k] as number) + (v as { increment: number }).increment;
          else next[k] = v;
        }
        rows.set(row.id as string, next);
        return { count: 1 };
      },
    },
  } as never;
}

describe('claimGeneration (TIP-023e §1.3, §1.5)', () => {
  it('chưa có generation nào cho (corpus_hash, embedding_space) → claimed, phase building', async () => {
    const db = fakeDb();
    const r = await claimGeneration(db, { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 3, now: NOW });
    expect(r.kind).toBe('claimed');
    expect(r.generation.phase).toBe('building');
    expect(r.generation.buildOperationId).toBe('op-1');
  });

  it('cùng (corpus_hash, embedding_space) đã building → gốc khác KHÔNG giành lease thứ hai, nhận lại dòng đang có', async () => {
    const db = fakeDb();
    const first = await claimGeneration(db, { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 3, now: NOW });
    const second = await claimGeneration(db, { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-2', ownerRootRunId: 'root-2', expectedCount: 3, now: NOW });
    expect(second.kind).toBe('existing');
    expect(second.generation.id).toBe((first as { kind: 'claimed'; generation: { id: string } }).generation.id);
    expect(second.generation.buildOperationId).toBe('op-1'); // của lượt thắng, không bị op-2 ghi đè
  });

  it('corpus khác hoặc embedding_space khác → generation riêng (không đụng nhau)', async () => {
    const db = fakeDb();
    const a = await claimGeneration(db, { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-a', ownerRootRunId: 'root-a', expectedCount: 1, now: NOW });
    const b = await claimGeneration(db, { corpusHash: 'other-corpus', space: SPACE, buildOperationId: 'op-b', ownerRootRunId: 'root-b', expectedCount: 1, now: NOW });
    const c = await claimGeneration(db, { corpusHash: CORPUS, space: { ...SPACE, model: 'embed-2' }, buildOperationId: 'op-c', ownerRootRunId: 'root-c', expectedCount: 1, now: NOW });
    expect(a.kind).toBe('claimed');
    expect(b.kind).toBe('claimed');
    expect(c.kind).toBe('claimed');
  });

  it('advanceGeneration: đủ expected_count → tự chuyển ready; chưa đủ → vẫn building', async () => {
    const db = fakeDb();
    const claim = await claimGeneration(db, { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 5, now: NOW });
    const id = (claim as { kind: 'claimed'; generation: { id: string } }).generation.id;
    const partial = await advanceGeneration(db, id, 3, NOW);
    expect(partial?.phase).toBe('building');
    expect(partial?.completedCount).toBe(3);
    const done = await advanceGeneration(db, id, 2, NOW);
    expect(done?.phase).toBe('ready');
    expect(done?.completedCount).toBe(5);
  });

  it('advanceGeneration trên generation đã failed → không tăng đè (CAS theo building)', async () => {
    const db = fakeDb();
    const claim = await claimGeneration(db, { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 5, now: NOW });
    const id = (claim as { kind: 'claimed'; generation: { id: string } }).generation.id;
    await failGeneration(db, id, 'provider_unavailable', NOW);
    const r = await advanceGeneration(db, id, 1, NOW);
    expect(r).toBeNull();
    expect((await findGeneration(db, CORPUS, SPACE))?.phase).toBe('failed');
  });

  it('failGeneration trên generation đã ready → không đè lại thành failed (CAS theo building)', async () => {
    const db = fakeDb();
    const claim = await claimGeneration(db, { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 1, now: NOW });
    const id = (claim as { kind: 'claimed'; generation: { id: string } }).generation.id;
    await advanceGeneration(db, id, 1, NOW);
    await failGeneration(db, id, 'late_failure', NOW);
    expect((await findGeneration(db, CORPUS, SPACE))?.phase).toBe('ready');
  });

  it('findGeneration: chưa từng dựng → null', async () => {
    const db = fakeDb();
    expect(await findGeneration(db, 'unknown-corpus', SPACE)).toBeNull();
  });
});
