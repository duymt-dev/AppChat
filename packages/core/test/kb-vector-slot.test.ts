// TIP-020e AC1 (unit): nhánh vector chỉ so khe đang phục vụ, đúng generation của khe; câu hỏi embed GHIM space của khe — space khác / route
// của khe đã gỡ → nhánh vector tắt, `degraded: embed_space_retired`, nhánh từ khoá vẫn chạy (trung thực, không im lặng). Không bao giờ so
// vector câu hỏi Y với kho X. Nội dung chỉ đọc cho top-N (deferred) — chunk id giữ nguyên, citations theo đúng chunk id.
import { describe, expect, it } from 'vitest';
import type { EmbedResult, Embedder } from '@appchat/ai';
import { TenantSql as Prisma } from '@appchat/db';
import { sameSpace, slotCols, spaceLabel } from '../src/ai/kb/reindex/space';
import { searchKb } from '../src/ai/kb/search';

type Sql = { sql: string; values: unknown[] };
const SPACE_X = 'openai:te3:1536:rX';
const restriction = { principal: { kind: 'public' }, admitted: null, current: null } as never;
const vec = () => Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0));

function fakeDb(setting: Record<string, unknown> | null, kwRows: { id: string; score: number }[] = [{ id: 'k1', score: 0.9 }], vecRows: { id: string; score: number }[] = [{ id: 'v1', score: 0.9 }]) {
  const seen: Sql[] = [];
  const run = (q: TemplateStringsArray | Sql, ...vals: unknown[]) => {
    const s: Sql = 'sql' in q ? q : Prisma.sql(q, ...(vals as never[]));
    seen.push(s);
    if (s.sql.includes('<=>')) return Promise.resolve(vecRows);
    if (s.sql.includes('word_similarity')) return Promise.resolve(kwRows);
    if (s.sql.includes('ANY(')) return Promise.resolve([...vecRows, ...kwRows].map((r) => ({ id: r.id, source_id: `s-${r.id}`, source_name: 'n', content: `nội dung ${r.id}`, meta: null, seq: 2 })));
    return Promise.resolve([]);
  };
  const db = {
    $queryRaw: run,
    $executeRaw: (q: TemplateStringsArray | Sql, ...v: unknown[]) => run(q, ...v).then(() => 0),
    kbSetting: { findUnique: async () => setting },
  };
  return { db, seen };
}

const embedderOf = (space: string | null, calls: string[] = []): Embedder => ({
  embed: async (_v, _s, _h, pin) => {
    calls.push(pin ?? '(none)');
    if (pin && space !== pin) throw Object.assign(new Error('retired'), { code: 'EMBED_SPACE_RETIRED' });
    return { vectors: [vec()], provider: 'openai', model: 'te3', tokens: 1, space: space ?? undefined } as EmbedResult;
  },
});

describe('khe vector + space ghim', () => {
  it('slotCols: khe A = embedding, khe B = embedding_b (tên cột hằng)', () => {
    expect(slotCols('a').vec.sql).toBe('c.embedding');
    expect(slotCols('b').vec.sql).toBe('c.embedding_b');
    expect(slotCols('b').gen.sql).toBe('c.embed_generation_b');
  });

  it('sameSpace: nguyên văn; space cũ (thế hệ trống) cùng provider + model; khác model → false; nhãn không lộ thế hệ', () => {
    expect(sameSpace(SPACE_X, SPACE_X)).toBe(true);
    expect(sameSpace('openai:te3:1536:', SPACE_X)).toBe(true);
    expect(sameSpace('openai:te3:1536:', 'openai:te4:1536:r')).toBe(false);
    expect(sameSpace(SPACE_X, 'openai:te3:1536:rY')).toBe(false);
    expect(spaceLabel(SPACE_X)).toBe('openai · te3');
  });

  it('khe B đang phục vụ: câu hỏi embed ghim space X, so embedding_b theo generation khe B; kết quả giữ chunk id', async () => {
    const { db, seen } = fakeDb({ activeSlot: 'b', activeGenerationId: '00000000-0000-0000-0000-00000000000b', activeSpace: SPACE_X, indexState: 'current', minScore: 0.35, version: 3 });
    const calls: string[] = [];
    const r = await searchKb(db as never, embedderOf(SPACE_X, calls), { query: 'giờ mở cửa', restriction });
    expect(calls).toEqual([SPACE_X]);
    const q = seen.find((s) => s.sql.includes('<=>'))!;
    expect(q.sql).toContain('c.embedding_b');
    expect(q.sql).toContain('c.embed_generation_b');
    expect(q.sql).not.toMatch(/c\.embedding\s*</);
    expect(q.values).toContain('00000000-0000-0000-0000-00000000000b');
    expect(r.degraded).toBeUndefined();
    expect(r.citations.map((c) => c.chunk_id).sort()).toEqual(['k1', 'v1']);
  });

  it('route của space X đã gỡ (embed ghim báo EMBED_SPACE_RETIRED) → không so vector, degraded + nhánh từ khoá', async () => {
    const { db, seen } = fakeDb({ activeSlot: 'a', activeGenerationId: 'g', activeSpace: SPACE_X, indexState: 'stale', minScore: 0.35, version: 1 });
    const r = await searchKb(db as never, embedderOf('openai:te3:1536:rY'), { query: 'giờ mở cửa', restriction });
    expect(seen.some((s) => s.sql.includes('<=>'))).toBe(false);
    expect(r).toMatchObject({ grounded: true, degraded: 'embed_space_retired' });
    expect(r.chunks.map((c) => c.chunk_id)).toEqual(['k1']);
  });

  it('vector câu hỏi đã embed sẵn ở space Y (người gọi) ≠ space khe → không bao giờ so; suy giảm trung thực', async () => {
    const { db, seen } = fakeDb({ activeSlot: 'a', activeGenerationId: 'g', activeSpace: SPACE_X, indexState: 'stale', minScore: 0.35, version: 1 });
    const e: EmbedResult = { vectors: [vec()], provider: 'openai', model: 'te4', tokens: 1, space: 'openai:te4:1536:rY' };
    const r = await searchKb(db as never, null, { query: 'giờ mở cửa', restriction, queryEmbedding: e });
    expect(seen.some((s) => s.sql.includes('<=>'))).toBe(false);
    expect(r.degraded).toBe('embed_space_retired');
  });

  it('người gọi báo EMBED_SPACE_RETIRED (embed có đo đã thất bại) → degraded, chỉ từ khoá; không căn cứ → rỗng nhưng vẫn ghi suy giảm', async () => {
    const { db } = fakeDb({ activeSlot: 'a', activeGenerationId: 'g', activeSpace: SPACE_X, indexState: 'current', minScore: 0.35, version: 1 }, []);
    const r = await searchKb(db as never, null, { query: 'xyz', restriction, embedError: 'EMBED_SPACE_RETIRED' });
    expect(r).toMatchObject({ grounded: false, chunks: [], degraded: 'embed_space_retired' });
  });
});
