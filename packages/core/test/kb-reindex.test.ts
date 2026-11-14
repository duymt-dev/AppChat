// TIP-020e AC3–AC5 (unit, chạy trên DB giả trong bộ nhớ mô phỏng đúng các câu lệnh của reindex): lô 64 theo cursor id, kill giữa chừng rồi
// chạy lại → tiếp từ cursor (không embed lại lô đã ghi), chunk id không đổi, lease cũ / generation đã huỷ không ghi được, nguồn nạp lại /
// xoá trong lúc embed → bỏ đoạn đó và catch-up bù, catch-up quá 3 vòng → failed, lỗi ví / provider → failed có lý do (khe cũ giữ), usage
// không rõ → giữ generation (paused) chờ đối soát. Native Postgres (publish / race thật / Credit): integration `kb-reindex.test.ts`.
import { describe, expect, it } from 'vitest';
import type { EmbedResult, Embedder } from '@appchat/ai';
import { TenantSql as Prisma } from '@appchat/db';
import { reasonOf, runGeneration } from '../src/ai/kb/reindex/reindex.service';

interface Chunk { id: string; source: string; content: string; b: string | null; bSpace: string | null }
interface Source { id: string; seq: number; live: boolean }

const pad = (i: number) => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
const SPACE = 'openai:te3:1536:r2';
const now = new Date('2026-11-14T08:00:00Z');

/** DB giả: chỉ hiểu đúng các câu lệnh reindex.service / generation.store / publish dùng. */
function world(n: number) {
  const sources = new Map<string, Source>([['s1', { id: 's1', seq: 1, live: true }], ['s2', { id: 's2', seq: 1, live: true }]]);
  const chunks: Chunk[] = Array.from({ length: n }, (_, i) => ({ id: pad(i + 1), source: i % 2 ? 's2' : 's1', content: `đoạn ${i}`, b: null, bSpace: null }));
  const gen = { id: 'gen-1', slot: 'b', spaceKey: SPACE, phase: 'building', expected: n, done: 0, tokens: 0n, cursorChunkId: null as string | null, batchStep: 0, catchupRound: 0, leaseToken: null as string | null, leaseUntil: null as Date | null, reason: null as string | null, createdBy: null, createdAt: now, version: 1 };
  const setting = { activeSlot: 'a', activeGenerationId: 'gen-0', activeSpace: 'openai:te3:1536:r1', indexState: 'stale' };
  const live = (c: Chunk) => sources.get(c.source)!.live;
  const missing = () => chunks.filter((c) => live(c) && c.b !== gen.id);
  const hooks = { beforeWrite: null as null | (() => void) };
  // Làm phẳng như Prisma: template có `Prisma.Sql` lồng (cột khe, vị từ nguồn) → một câu + mảng tham số.
  const flat = (q: TemplateStringsArray | { sql: string; values: unknown[] }, v: unknown[]) => ('sql' in q ? q : Prisma.sql(q, ...(v as never[])));
  const text = (q: TemplateStringsArray | { sql: string; values: unknown[] }, v: unknown[] = []) => flat(q, v).sql;
  const vals = (q: TemplateStringsArray | { sql: string; values: unknown[] }, v: unknown[]) => flat(q, v).values;
  const db = {
    kbEmbedGeneration: {
      findUnique: async () => ({ ...gen }),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (where.id !== undefined && where.id !== gen.id) return { count: 0 };
        const phases = (where.phase as { in?: string[] } | string | undefined);
        if (typeof phases === 'string' && gen.phase !== phases) return { count: 0 };
        if (phases && typeof phases === 'object' && !phases.in!.includes(gen.phase)) return { count: 0 };
        if (where.leaseToken !== undefined && where.leaseToken !== gen.leaseToken) return { count: 0 };
        if (where.OR && gen.leaseToken && !(where.OR as Record<string, unknown>[]).some((o) => o.leaseToken === gen.leaseToken)) {
          if (!(gen.leaseUntil && gen.leaseUntil < (now as Date))) return { count: 0 };
        }
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && 'increment' in v) {
            const cur = (gen as Record<string, unknown>)[k];
            const inc = (v as { increment: number }).increment;
            (gen as Record<string, unknown>)[k] = typeof cur === 'bigint' ? cur + BigInt(inc) : (cur as number) + inc;
          }
          else (gen as Record<string, unknown>)[k] = v;
        }
        return { count: 1 };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(gen, { phase: data.phase }),
    },
    kbSetting: { findUnique: async () => ({ ...setting }), upsert: async ({ update }: { update: Record<string, unknown> }) => Object.assign(setting, { activeSlot: update.activeSlot, activeGenerationId: update.activeGenerationId, activeSpace: update.activeSpace, indexState: update.indexState }) },
    outboxEvent: { createMany: async () => undefined },
    // Không có ví theo ref (meter null) → không tạo run đo; đóng run bỏ qua khi không có.
    aiRun: { findUnique: async () => null, findFirst: async () => null },
    $queryRaw: async (q: TemplateStringsArray | { sql: string; values: unknown[] }, ...v: unknown[]) => {
      const s = text(q, v);
      const p = vals(q, v);
      if (s.includes('SELECT c.id::text AS id FROM kb_chunk')) {
        const cursor = p.find((x) => typeof x === 'string' && x.startsWith('00000000')) as string | undefined;
        return missing().filter((c) => !cursor || c.id > cursor).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 64).map((c) => ({ id: c.id }));
      }
      if (s.includes('SELECT c.id::text AS id, c.content')) {
        const ids = p.find(Array.isArray) as string[];
        return chunks.filter((c) => ids.includes(c.id) && live(c)).map((c) => ({ id: c.id, content: c.content, seq: sources.get(c.source)!.seq, source_id: c.source }));
      }
      if (s.includes('lease_token =')) return [{ ok: gen.leaseToken === p[0] && ['building', 'catching_up'].includes(gen.phase) }];
      if (s.includes('count(*) AS n')) return [{ n: BigInt(missing().length) }];
      if (s.includes('protocol') || s.includes('event_protocol')) return [{ phase: 'v1' }];
      return [];
    },
    $executeRaw: async (q: TemplateStringsArray | { sql: string; values: unknown[] }, ...v: unknown[]) => {
      const s = text(q, v);
      const p = vals(q, v);
      if (s.includes('UPDATE kb_chunk c SET')) {
        hooks.beforeWrite?.();
        const id = p.find((x) => typeof x === 'string' && x.startsWith('00000000')) as string;
        const seq = p.find((x) => typeof x === 'number') as number;
        const c = chunks.find((x) => x.id === id)!;
        const src = sources.get(c.source)!;
        if (!src.live || src.seq !== seq) return 0;
        c.b = gen.id;
        c.bSpace = SPACE;
        return 1;
      }
      return 0;
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(db),
  };
  return { db, gen, chunks, sources, setting, hooks };
}

function embedder(o: { failAt?: number; code?: string } = {}) {
  let calls = 0;
  const seen: string[][] = [];
  const e: Embedder = {
    embed: async (values, _s, _h, space) => {
      calls++;
      if (space !== SPACE) throw new Error(`space không ghim: ${space}`);
      if (o.failAt === calls) throw Object.assign(new Error('fail'), { code: o.code ?? 'X' });
      seen.push(values);
      return { vectors: values.map(() => Array(1536).fill(0.01)), provider: 'openai', model: 'te3', tokens: values.length * 10, space } as EmbedResult;
    },
  };
  return { e, calls: () => calls, seen };
}

const deps = (e: Embedder, extra: Record<string, unknown> = {}) => ({ embedder: e, meter: null, now: () => now, ...extra });

describe('runGeneration', () => {
  it('3 lô (150 đoạn) → catch-up → publish; chunk id không đổi; embed ghim space đích; tiến độ = số đoạn', async () => {
    const w = world(150);
    const ids = w.chunks.map((c) => c.id);
    const em = embedder();
    expect(await runGeneration(w.db as never, 'ws', 'gen-1', 'tok-1', deps(em.e))).toEqual({ status: 'published' });
    expect(em.seen.map((b) => b.length)).toEqual([64, 64, 22]);
    expect(w.chunks.map((c) => c.id)).toEqual(ids);
    expect(w.chunks.every((c) => c.b === 'gen-1' && c.bSpace === SPACE)).toBe(true);
    expect(w.gen).toMatchObject({ phase: 'active', done: 150 });
    expect(w.setting).toMatchObject({ activeSlot: 'b', activeGenerationId: 'gen-1', activeSpace: SPACE, indexState: 'current' });
  });

  it('kill ở lô 2 (lỗi hạ tầng) → chạy lại tiếp từ cursor, không embed lại lô 1', async () => {
    const w = world(150);
    const first = embedder({ failAt: 2, code: 'USAGE_UNKNOWN' });
    expect(await runGeneration(w.db as never, 'ws', 'gen-1', 'tok-1', deps(first.e))).toEqual({ status: 'paused', reason: 'usage_unknown' });
    expect(w.gen).toMatchObject({ phase: 'building', done: 64, cursorChunkId: pad(64), leaseToken: null });
    const again = embedder();
    expect(await runGeneration(w.db as never, 'ws', 'gen-1', 'tok-2', deps(again.e))).toEqual({ status: 'published' });
    expect(again.seen[0]![0]).toBe('đoạn 64');
    expect(again.seen.flat()).toHaveLength(86);
  });

  it('lease đang bị job khác giữ (chưa hết hạn) → busy, không embed', async () => {
    const w = world(10);
    Object.assign(w.gen, { leaseToken: 'other', leaseUntil: new Date(now.getTime() + 30_000) });
    const em = embedder();
    expect(await runGeneration(w.db as never, 'ws', 'gen-1', 'tok-1', deps(em.e))).toEqual({ status: 'busy' });
    expect(em.calls()).toBe(0);
  });

  it('huỷ trong lúc embed (generation không còn dở) → bỏ kết quả lô, không ghi khe đích', async () => {
    const w = world(10);
    w.hooks.beforeWrite = null;
    const em: Embedder = {
      embed: async (values, _s, _h, space) => {
        Object.assign(w.gen, { phase: 'cancelled', leaseToken: null });
        return { vectors: values.map(() => Array(1536).fill(0.01)), provider: 'openai', model: 'te3', tokens: 1, space } as EmbedResult;
      },
    };
    expect(await runGeneration(w.db as never, 'ws', 'gen-1', 'tok-1', deps(em))).toEqual({ status: 'skipped' });
    expect(w.chunks.every((c) => c.b === null)).toBe(true);
    expect(w.setting.activeSlot).toBe('a');
  });

  it('nguồn nạp lại trong lúc embed lô (ingest_seq đổi) → đoạn đó không ghi, catch-up bù; nguồn bị xoá → không ghi, không cần', async () => {
    const w = world(4);
    let round = 0;
    const em: Embedder = {
      embed: async (values, _s, _h, space) => {
        round++;
        if (round === 1) {
          w.sources.get('s2')!.seq = 2;
          w.sources.get('s1')!.live = false;
        }
        return { vectors: values.map(() => Array(1536).fill(0.01)), provider: 'openai', model: 'te3', tokens: 1, space } as EmbedResult;
      },
    };
    expect(await runGeneration(w.db as never, 'ws', 'gen-1', 'tok-1', deps(em))).toEqual({ status: 'published' });
    expect(round).toBe(2);
    expect(w.chunks.filter((c) => c.source === 's2').every((c) => c.b === 'gen-1')).toBe(true);
    expect(w.chunks.filter((c) => c.source === 's1').every((c) => c.b === null)).toBe(true);
  });

  it('nguồn đổi liên tục (catch-up không ghi được) quá 3 vòng → failed catch_up_exhausted, khe cũ vẫn phục vụ', async () => {
    const w = world(2);
    const em: Embedder = {
      embed: async (values, _s, _h, space) => {
        w.sources.get('s1')!.seq++;
        w.sources.get('s2')!.seq++;
        return { vectors: values.map(() => Array(1536).fill(0.01)), provider: 'openai', model: 'te3', tokens: 1, space } as EmbedResult;
      },
    };
    expect(await runGeneration(w.db as never, 'ws', 'gen-1', 'tok-1', deps(em))).toEqual({ status: 'failed', reason: 'catch_up_exhausted' });
    expect(w.gen.phase).toBe('failed');
    expect(w.setting).toMatchObject({ activeSlot: 'a', activeGenerationId: 'gen-0' });
  });

  it('hết Credit / provider lỗi / route mất → failed với lý do riêng, khe cũ giữ; drain → paused, giữ cursor', async () => {
    for (const [code, reason] of [['CREDIT_EXHAUSTED', 'credit_exhausted'], ['EMBED_SPACE_RETIRED', 'space_retired'], ['HTTP_500', 'provider_unavailable']]) {
      const w = world(70);
      expect(await runGeneration(w.db as never, 'ws', 'gen-1', 't', deps(embedder({ failAt: 1, code }).e))).toEqual({ status: 'failed', reason });
      expect(w.setting.activeSlot).toBe('a');
    }
    const w = world(70);
    let n = 0;
    expect(await runGeneration(w.db as never, 'ws', 'gen-1', 't', deps(embedder().e, { draining: () => n++ > 0 }))).toEqual({ status: 'paused' });
    expect(w.gen).toMatchObject({ phase: 'building', done: 64, cursorChunkId: pad(64), leaseToken: null });
  });

  it('workspace tạm dừng (041) → paused trước lô đầu, không embed', async () => {
    const w = world(5);
    const em = embedder();
    expect(await runGeneration(w.db as never, 'ws', 'gen-1', 't', deps(em.e, { active: async () => false }))).toEqual({ status: 'paused' });
    expect(em.calls()).toBe(0);
  });

  it('reasonOf phân loại lỗi', () => {
    expect(reasonOf({ code: 'BUDGET' })).toBe('budget');
    expect(reasonOf({ code: 'VALIDATION_FAILED' })).toBe('price_missing');
    expect(reasonOf(new Error('x'))).toBe('provider_unavailable');
  });
});
