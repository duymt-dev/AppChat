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
  };
}

/** Cast tiện cho các lệnh gọi generation.ts (DB giả chỉ cần `actionDiscoveryGeneration`) — `rows` vẫn đọc được qua `fakeDb()` gốc. */
const asDb = (db: ReturnType<typeof fakeDb>) => db as never;

describe('claimGeneration (TIP-023e §1.3, §1.5)', () => {
  it('chưa có generation nào cho (corpus_hash, embedding_space) → claimed, phase building', async () => {
    const db = fakeDb();
    const r = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 3, now: NOW });
    expect(r.kind).toBe('claimed');
    expect(r.generation.phase).toBe('building');
    expect(r.generation.buildOperationId).toBe('op-1');
  });

  it('cùng (corpus_hash, embedding_space) đã building → gốc khác KHÔNG giành lease thứ hai, nhận lại dòng đang có', async () => {
    const db = fakeDb();
    const first = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 3, now: NOW });
    const second = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-2', ownerRootRunId: 'root-2', expectedCount: 3, now: NOW });
    expect(second.kind).toBe('existing');
    expect(second.generation.id).toBe((first as { kind: 'claimed'; generation: { id: string } }).generation.id);
    expect(second.generation.buildOperationId).toBe('op-1'); // của lượt thắng, không bị op-2 ghi đè
  });

  it('corpus khác hoặc embedding_space khác → generation riêng (không đụng nhau)', async () => {
    const db = fakeDb();
    const a = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-a', ownerRootRunId: 'root-a', expectedCount: 1, now: NOW });
    const b = await claimGeneration(asDb(db), { corpusHash: 'other-corpus', space: SPACE, buildOperationId: 'op-b', ownerRootRunId: 'root-b', expectedCount: 1, now: NOW });
    const c = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: { ...SPACE, model: 'embed-2' }, buildOperationId: 'op-c', ownerRootRunId: 'root-c', expectedCount: 1, now: NOW });
    expect(a.kind).toBe('claimed');
    expect(b.kind).toBe('claimed');
    expect(c.kind).toBe('claimed');
  });

  it('advanceGeneration: đủ expected_count → tự chuyển ready; chưa đủ → vẫn building', async () => {
    const db = fakeDb();
    const claim = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 5, now: NOW });
    const id = (claim as { kind: 'claimed'; generation: { id: string } }).generation.id;
    const partial = await advanceGeneration(asDb(db), id, 3, NOW);
    expect(partial?.phase).toBe('building');
    expect(partial?.completedCount).toBe(3);
    const done = await advanceGeneration(asDb(db), id, 2, NOW);
    expect(done?.phase).toBe('ready');
    expect(done?.completedCount).toBe(5);
  });

  it('advanceGeneration trên generation đã failed → không tăng đè (CAS theo building)', async () => {
    const db = fakeDb();
    const claim = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 5, now: NOW });
    const id = (claim as { kind: 'claimed'; generation: { id: string } }).generation.id;
    await failGeneration(asDb(db), id, 'provider_unavailable', NOW);
    const r = await advanceGeneration(asDb(db), id, 1, NOW);
    expect(r).toBeNull();
    expect((await findGeneration(asDb(db), CORPUS, SPACE))?.phase).toBe('failed');
  });

  it('failGeneration trên generation đã ready → không đè lại thành failed (CAS theo building)', async () => {
    const db = fakeDb();
    const claim = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 1, now: NOW });
    const id = (claim as { kind: 'claimed'; generation: { id: string } }).generation.id;
    await advanceGeneration(asDb(db), id, 1, NOW);
    await failGeneration(asDb(db), id, 'late_failure', NOW);
    expect((await findGeneration(asDb(db), CORPUS, SPACE))?.phase).toBe('ready');
  });

  it('findGeneration: chưa từng dựng → null', async () => {
    const db = fakeDb();
    expect(await findGeneration(asDb(db), 'unknown-corpus', SPACE)).toBeNull();
  });

  it('generation đã failed → một xác nhận mới reclaim ĐÚNG dòng cũ (building lại, completed_count về 0, không tạo dòng thứ hai)', async () => {
    const db = fakeDb();
    const first = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 2, now: NOW });
    const id = (first as { kind: 'claimed'; generation: { id: string } }).generation.id;
    await advanceGeneration(asDb(db), id, 1, NOW);
    await failGeneration(asDb(db), id, 'provider_unavailable', NOW);
    expect(db.rows.size).toBe(1);
    const retry = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-2', ownerRootRunId: 'root-2', expectedCount: 5, now: NOW });
    expect(retry.kind).toBe('reclaimed');
    expect(retry.generation.id).toBe(id); // cùng dòng, không phải dòng mới
    expect(retry.generation.phase).toBe('building');
    expect(retry.generation.buildOperationId).toBe('op-2');
    expect(retry.generation.completedCount).toBe(0);
    expect(db.rows.size).toBe(1); // vẫn chỉ một dòng cho cặp (corpus_hash, embedding_space) này
    const persisted = await findGeneration(asDb(db), CORPUS, SPACE);
    expect(persisted?.phase).toBe('building');
    expect(persisted?.buildOperationId).toBe('op-2');
  });

  it('generation đang building (chưa failed) → claim thứ hai KHÔNG reclaim, chỉ trả existing', async () => {
    const db = fakeDb();
    await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 2, now: NOW });
    const second = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-2', ownerRootRunId: 'root-2', expectedCount: 2, now: NOW });
    expect(second.kind).toBe('existing');
    expect(second.generation.buildOperationId).toBe('op-1');
  });

  it('generation đã ready → claim thứ hai KHÔNG reclaim (reclaim chỉ áp cho failed, không cho ready)', async () => {
    const db = fakeDb();
    const first = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-1', ownerRootRunId: 'root-1', expectedCount: 1, now: NOW });
    const id = (first as { kind: 'claimed'; generation: { id: string } }).generation.id;
    await advanceGeneration(asDb(db), id, 1, NOW);
    const second = await claimGeneration(asDb(db), { corpusHash: CORPUS, space: SPACE, buildOperationId: 'op-2', ownerRootRunId: 'root-2', expectedCount: 1, now: NOW });
    expect(second.kind).toBe('existing');
    expect(second.generation.phase).toBe('ready');
  });
});
