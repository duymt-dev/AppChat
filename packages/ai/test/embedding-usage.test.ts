// TIP-019b §3.3 (unit): embedding đo từng lô — biên nhận trước khi gửi, usage từng lô, ứng viên từ chối rõ → ứng viên kế từ lô 0 (lô
// đã có usage vẫn báo), lỗi không rõ / thiếu usage → USAGE_UNKNOWN, không gửi lại, không chuyển ứng viên.
import { describe, expect, it } from 'vitest';
import { MockEmbeddingModelV4 } from 'ai/test';
import { AiSdkEmbedder, EMBED_DIM, mockEmbeddingModel, staticModelSource, type AttemptOutcome, type EmbedAttempt, type EmbedHooks } from '../src';

function spy() {
  const log: string[] = [];
  const hooks: EmbedHooks = {
    before: async (a) => void log.push(`before ${a.provider} c${a.candidate} b${a.batch}`),
    after: async (a: EmbedAttempt, o: AttemptOutcome) => void log.push(`after ${a.provider} c${a.candidate} b${a.batch} ${o.kind}${o.kind === 'usage' ? `:${o.tokensIn}` : ''}`),
  };
  return { log, hooks };
}
const vec = () => Array.from({ length: EMBED_DIM }, (_, i) => (i === 0 ? 1 : 0));
const values = (n: number) => Array.from({ length: n }, (_, i) => `đoạn ${i}`);

describe('embedding có đo', () => {
  it('mỗi lô một biên nhận, usage cộng đúng', async () => {
    const s = spy();
    const r = await new AiSdkEmbedder(staticModelSource([{ provider: 'p1', model: 'mock-embed', handle: mockEmbeddingModel('p1') }])).embed(values(70), undefined, s.hooks);
    expect(r.vectors).toHaveLength(70);
    expect(s.log.filter((l) => l.startsWith('before'))).toEqual(['before p1 c0 b0', 'before p1 c0 b1']);
    expect(s.log.filter((l) => l.startsWith('after')).every((l) => / usage:\d+$/.test(l))).toBe(true);
  });

  it('lô 2 của ứng viên đầu bị 503 → ứng viên kế làm lại từ lô 0; usage lô 1 đã báo giữ nguyên', async () => {
    let n = 0;
    const flaky = new MockEmbeddingModelV4({
      provider: 'p1', modelId: 'm1', maxEmbeddingsPerCall: 64,
      doEmbed: async ({ values: v }) => {
        if (n++ === 1) throw Object.assign(new Error('busy'), { statusCode: 503 });
        return { embeddings: v.map(vec), usage: { tokens: 10 }, warnings: [] };
      },
    });
    const s = spy();
    const r = await new AiSdkEmbedder(staticModelSource([{ provider: 'p1', model: 'm1', handle: flaky }, { provider: 'p2', model: 'mock-embed', handle: mockEmbeddingModel('p2') }])).embed(values(70), undefined, s.hooks);
    expect(r.provider).toBe('p2');
    expect(s.log.slice(0, 4)).toEqual(['before p1 c0 b0', 'after p1 c0 b0 usage:10', 'before p1 c0 b1', 'after p1 c0 b1 rejected']);
    expect(s.log.slice(4).filter((l) => l.startsWith('before'))).toEqual(['before p2 c1 b0', 'before p2 c1 b1']);
  });

  it('lỗi không rõ (đứt kết nối) → USAGE_UNKNOWN, không thử ứng viên kế', async () => {
    const lost = new MockEmbeddingModelV4({ provider: 'p1', modelId: 'm1', doEmbed: async () => { throw Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }); } });
    const s = spy();
    const e = new AiSdkEmbedder(staticModelSource([{ provider: 'p1', model: 'm1', handle: lost }, { provider: 'p2', model: 'mock-embed', handle: mockEmbeddingModel('p2') }]));
    await expect(e.embed(['a'], undefined, s.hooks)).rejects.toMatchObject({ code: 'USAGE_UNKNOWN' });
    expect(s.log).toEqual(['before p1 c0 b0', 'after p1 c0 b0 unknown']);
  });

  it('thiếu usage ≠ usage 0 → không rõ', async () => {
    const quiet = new MockEmbeddingModelV4({ provider: 'p1', modelId: 'm1', doEmbed: async ({ values: v }) => ({ embeddings: v.map(vec), warnings: [] }) });
    const s = spy();
    await expect(new AiSdkEmbedder(staticModelSource([{ provider: 'p1', model: 'm1', handle: quiet }])).embed(['a'], undefined, s.hooks)).rejects.toMatchObject({ code: 'USAGE_UNKNOWN' });
    expect(s.log.at(-1)).toBe('after p1 c0 b0 unknown');
  });

  it('hook từ chối trước khi gửi (hết ngân sách) → không gọi model', async () => {
    let calls = 0;
    const m = new MockEmbeddingModelV4({ provider: 'p1', modelId: 'm1', doEmbed: async ({ values: v }) => (calls++, { embeddings: v.map(vec), usage: { tokens: 1 }, warnings: [] }) });
    const hooks: EmbedHooks = { before: async () => { throw Object.assign(new Error('budget'), { code: 'BUDGET' }); }, after: async () => {} };
    await expect(new AiSdkEmbedder(staticModelSource([{ provider: 'p1', model: 'm1', handle: m }])).embed(['a'], undefined, hooks)).rejects.toMatchObject({ code: 'BUDGET' });
    expect(calls).toBe(0);
  });
});
