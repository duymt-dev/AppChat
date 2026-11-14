// TIP-020e AC1 (unit): không gian embedding `provider:model:1536:<thế hệ route>` — ghim space → chỉ đúng ứng viên đó, lỗi không rơi sang
// model khác (kể cả có hooks đo); space không còn route → EMBED_SPACE_RETIRED, không gọi mạng; space cũ (trước 020e, thế hệ trống) khớp
// đúng provider + model; vector sai số chiều / không hữu hạn bị từ chối.
import { describe, expect, it } from 'vitest';
import { MockEmbeddingModelV4 } from 'ai/test';
import { AiSdkEmbedder, EMBED_DIM, embedSpaceKey, mockEmbeddingModel, spaceMatches, staticModelSource, type EmbedHooks, type ModelCandidate } from '../src';

const vec = (x = 1) => Array.from({ length: EMBED_DIM }, (_, i) => (i === 0 ? x : 0));

function counted(provider: string, o: { fail?: number; vector?: () => number[] } = {}) {
  let calls = 0;
  const handle = new MockEmbeddingModelV4({
    provider, modelId: 'm', maxEmbeddingsPerCall: 64,
    doEmbed: async ({ values }) => {
      calls++;
      if (o.fail) throw Object.assign(new Error('busy'), { statusCode: o.fail });
      return { embeddings: values.map(() => (o.vector ?? vec)()), usage: { tokens: 3 }, warnings: [] };
    },
  });
  return { handle, calls: () => calls };
}

const cand = (provider: string, model: string, routeRevision: string, handle: unknown): ModelCandidate => ({ provider, model, handle, routeRevision, configRevision: `p:${routeRevision}` });

describe('embedding space', () => {
  it('khoá = provider:model:1536:<thế hệ route> — xoay khoá provider (configRevision khác) không đổi không gian', () => {
    expect(embedSpaceKey({ provider: 'openai', model: 'te3', routeRevision: 'r1' })).toBe(`openai:te3:${EMBED_DIM}:r1`);
    expect(embedSpaceKey({ provider: 'openai', model: 'te3' })).toBe(`openai:te3:${EMBED_DIM}:`);
  });

  it('spaceMatches: nguyên văn; space cũ (thế hệ trống) khớp cùng provider + model, không khớp model khác', () => {
    expect(spaceMatches('a:m:1536:r1', 'a:m:1536:r1')).toBe(true);
    expect(spaceMatches('a:m:1536:r1', 'a:m:1536:r2')).toBe(false);
    expect(spaceMatches('a:m:1536:', 'a:m:1536:r9')).toBe(true);
    expect(spaceMatches('a:m:1536:', 'a:m2:1536:r9')).toBe(false);
    expect(spaceMatches('a:m:1536:', 'b:m:1536:')).toBe(false);
  });

  it('space() = ứng viên ưu tiên cao nhất; embed trả space đã dùng', async () => {
    const a = counted('A');
    const e = new AiSdkEmbedder(staticModelSource([cand('A', 'ma', 'r1', a.handle), cand('B', 'mb', 'r2', mockEmbeddingModel('B'))]));
    expect(await e.space()).toEqual({ key: `A:ma:${EMBED_DIM}:r1`, provider: 'A', model: 'ma' });
    expect((await e.embed(['x'])).space).toBe(`A:ma:${EMBED_DIM}:r1`);
  });

  it('ghim space B: không gọi A; B lỗi 503 → ném lỗi, KHÔNG rơi sang A (không trộn không gian) — cả khi có hooks đo', async () => {
    const a = counted('A');
    const b = counted('B', { fail: 503 });
    const e = new AiSdkEmbedder(staticModelSource([cand('A', 'ma', 'r1', a.handle), cand('B', 'mb', 'r2', b.handle)]));
    await expect(e.embed(['x'], undefined, undefined, `B:mb:${EMBED_DIM}:r2`)).rejects.toMatchObject({ statusCode: 503 });
    const hooks: EmbedHooks = { before: async () => undefined, after: async () => undefined };
    await expect(e.embed(['x'], undefined, hooks, `B:mb:${EMBED_DIM}:r2`)).rejects.toMatchObject({ statusCode: 503 });
    expect(a.calls()).toBe(0);
  });

  it('space không còn route → EMBED_SPACE_RETIRED, 0 lời gọi', async () => {
    const a = counted('A');
    const e = new AiSdkEmbedder(staticModelSource([cand('A', 'ma', 'r2', a.handle)]));
    await expect(e.embed(['x'], undefined, undefined, `A:ma:${EMBED_DIM}:r1`)).rejects.toMatchObject({ code: 'EMBED_SPACE_RETIRED' });
    expect(a.calls()).toBe(0);
  });

  it('vector sai số chiều / NaN / Infinity → từ chối (không ghi vector hỏng)', async () => {
    for (const [v, code] of [[() => [1, 2, 3], 'EMBED_DIM_MISMATCH'], [() => vec(Number.NaN), 'EMBED_VECTOR_INVALID'], [() => vec(Number.POSITIVE_INFINITY), 'EMBED_VECTOR_INVALID']] as const) {
      const m = counted('A', { vector: v });
      await expect(new AiSdkEmbedder(staticModelSource([cand('A', 'ma', 'r1', m.handle)])).embed(['x'])).rejects.toMatchObject({ code });
    }
  });
});
