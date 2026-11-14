// TIP-020e AC6–AC7 (unit, bản ghi phản hồi — không gọi mạng): reranker qua AI SDK `rerank()` chỉ nhận hoán vị đủ của tập đã gửi; chỉ số
// giả / trùng / ngoài khoảng / thiếu → invalid_result; quá hạn → timeout; thiếu đơn vị tính tiền → unknown_usage (không miễn phí);
// không có route → not_configured; provider không có reranking model → router bỏ, buildModel ném RERANK_UNSUPPORTED (không ép LanguageModel).
// Adapter `/rerank` openai_compatible: schema Cohere / Jina, đơn vị tính tiền dưới namespace provider, lỗi HTTP mang statusCode.
import { describe, expect, it } from 'vitest';
import { MockRerankingModelV4 } from 'ai/test';
import { AiSdkReranker, COMPATIBLE_NS, LlmRouter, RERANK_MAX_DOCS, buildModel, compatibleReranker, staticModelSource, validOrder, type ProviderConfig, type RerankAttemptOutcome, type RerankHooks } from '../src';

const docs = ['Cửa hàng mở 8h–21h', 'Giá vé 50k', 'Bảo hành 12 tháng'];

function model(ranking: { index: number; relevanceScore: number }[], o: { units?: number | null; delayMs?: number; error?: unknown } = {}) {
  return new MockRerankingModelV4({
    provider: 'rr',
    modelId: 'rerank-x',
    doRerank: async ({ abortSignal }) => {
      if (o.delayMs) await new Promise((r, j) => {
        const t = setTimeout(r, o.delayMs);
        abortSignal?.addEventListener('abort', () => (clearTimeout(t), j(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
      });
      if (o.error) throw o.error;
      return { ranking, providerMetadata: { [COMPATIBLE_NS]: { billed_units: o.units === undefined ? 1 : o.units } } };
    },
  });
}

const reranker = (m: unknown) => new AiSdkReranker(staticModelSource([{ provider: 'rr', model: 'rerank-x', handle: m }]));

function spy() {
  const log: string[] = [];
  const hooks: RerankHooks = {
    before: async (a) => void log.push(`before ${a.provider}`),
    after: async (_a, o: RerankAttemptOutcome) => void log.push(`after ${o.kind}${o.kind === 'usage' ? `:${o.units}` : ''}`),
  };
  return { log, hooks };
}

describe('AiSdkReranker', () => {
  it('hoán vị đủ → ok + đơn vị; biên nhận trước / sau lời gọi', async () => {
    const s = spy();
    const r = await reranker(model([{ index: 2, relevanceScore: 0.9 }, { index: 0, relevanceScore: 0.5 }, { index: 1, relevanceScore: 0.1 }], { units: 1 })).rerank('bảo hành', docs, { hooks: s.hooks });
    expect(r).toEqual({ kind: 'ok', order: [2, 0, 1], scores: [0.9, 0.5, 0.1], provider: 'rr', model: 'rerank-x', units: 1 });
    expect(s.log).toEqual(['before rr', 'after usage:1']);
  });

  it('chỉ số trùng / thiếu → invalid_result (đã có usage vẫn ghi); ngoài khoảng / giả → invalid_result', async () => {
    const dup = spy();
    expect(await reranker(model([{ index: 0, relevanceScore: 1 }, { index: 0, relevanceScore: 1 }, { index: 1, relevanceScore: 0 }])).rerank('q', docs, { hooks: dup.hooks })).toEqual({ kind: 'invalid_result' });
    expect(dup.log).toEqual(['before rr', 'after usage:1']);
    expect(await reranker(model([{ index: 1, relevanceScore: 1 }])).rerank('q', docs)).toEqual({ kind: 'invalid_result' });
    for (const bad of [7, -1, 1.5]) {
      const s = spy();
      expect(await reranker(model([{ index: bad, relevanceScore: 1 }, { index: 0, relevanceScore: 0 }, { index: 1, relevanceScore: 0 }])).rerank('q', docs, { hooks: s.hooks })).toEqual({ kind: 'invalid_result' });
      expect(s.log).toEqual(['before rr', 'after unknown']);
    }
  });

  it('quá hạn → timeout (biên nhận không rõ — không gửi lại); lỗi 503 → provider_error rejected', async () => {
    const s = spy();
    expect(await reranker(model([], { delayMs: 500 })).rerank('q', docs, { timeoutMs: 20, hooks: s.hooks })).toEqual({ kind: 'timeout' });
    expect(s.log).toEqual(['before rr', 'after unknown']);
    const e = spy();
    expect(await reranker(model([], { error: Object.assign(new Error('busy'), { statusCode: 503 }) })).rerank('q', docs, { hooks: e.hooks })).toEqual({ kind: 'provider_error', error: 'HTTP_503' });
    expect(e.log).toEqual(['before rr', 'after rejected']);
  });

  it('thiếu đơn vị tính tiền → unknown_usage (không coi là miễn phí)', async () => {
    const s = spy();
    expect(await reranker(model([{ index: 0, relevanceScore: 1 }, { index: 1, relevanceScore: 0 }, { index: 2, relevanceScore: 0 }], { units: null })).rerank('q', docs, { hooks: s.hooks })).toEqual({ kind: 'unknown_usage' });
    expect(s.log).toEqual(['before rr', 'after unknown']);
  });

  it('không route → not_configured, không gọi hook; > 40 tài liệu → RangeError', async () => {
    const s = spy();
    expect(await new AiSdkReranker(staticModelSource([])).rerank('q', docs, { hooks: s.hooks })).toEqual({ kind: 'not_configured' });
    expect(s.log).toEqual([]);
    await expect(reranker(model([])).rerank('q', Array.from({ length: RERANK_MAX_DOCS + 1 }, (_, i) => `d${i}`))).rejects.toThrow(RangeError);
  });

  it('validOrder: chỉ hoán vị đủ', () => {
    expect(validOrder([1, 0, 2], 3)).toBe(true);
    expect(validOrder([1, 1, 2], 3)).toBe(false);
    expect(validOrder([0, 1], 3)).toBe(false);
    expect(validOrder([0, 1, 3], 3)).toBe(false);
  });
});

describe('rerank qua router / provider', () => {
  const prov = (key: string, p: Partial<ProviderConfig> = {}): ProviderConfig => ({ key, kind: 'openai_compatible', baseUrl: 'https://r.example/v1', apiKey: 'k', capabilities: { tools: true }, ...p });

  it('buildModel(rerank): provider gốc / compatible chưa khai rerank → RERANK_UNSUPPORTED (không LanguageModel); khai rerank → RerankingModel', () => {
    for (const kind of ['anthropic', 'openai', 'google', 'deepseek'] as const) expect(() => buildModel(prov(kind, { kind, baseUrl: null }), 'r', 'rerank')).toThrow(expect.objectContaining({ code: 'RERANK_UNSUPPORTED' }));
    expect(() => buildModel(prov('nine'), 'r', 'rerank')).toThrow(expect.objectContaining({ code: 'RERANK_UNSUPPORTED' }));
    expect(buildModel(prov('nine', { capabilities: { rerank: true } }), 'rerank-x', 'rerank')).toMatchObject({ specificationVersion: 'v4', modelId: 'rerank-x', provider: 'nine' });
  });

  it('router chỉ trả route rerank của provider khai rerank; kind gốc khai nhầm rerank → bị bỏ (không dựng LanguageModel)', async () => {
    const routes = [
      { tier: 'standard' as const, purpose: 'rerank' as const, priority: 0, providerKey: 'oa', model: 'r0' },
      { tier: 'standard' as const, purpose: 'rerank' as const, priority: 1, providerKey: 'plain', model: 'r1' },
      { tier: 'standard' as const, purpose: 'rerank' as const, priority: 2, providerKey: 'nine', model: 'r2' },
    ];
    const providers: Record<string, ProviderConfig> = { oa: prov('oa', { kind: 'openai', baseUrl: null, capabilities: { rerank: true } }), plain: prov('plain'), nine: prov('nine', { capabilities: { rerank: true } }) };
    const r = new LlmRouter({ routes: async (t, p) => routes.filter((x) => x.tier === t && x.purpose === p), provider: async (k) => providers[k] ?? null });
    const c = await r.candidates('standard', 'rerank', { tools: false });
    expect(c.map((x) => `${x.provider}:${x.model}`)).toEqual(['nine:r2']);
    expect(c[0]!.handle).toMatchObject({ specificationVersion: 'v4' });
  });
});

describe('compatibleReranker (/rerank)', () => {
  const call = (status: number, body: unknown) => {
    const sent: { url: string; body: unknown }[] = [];
    const fetch = (async (url: string, init: { body: string }) => {
      sent.push({ url, body: JSON.parse(init.body) });
      return { ok: status < 400, status, json: async () => body };
    }) as unknown as typeof globalThis.fetch;
    return { sent, m: compatibleReranker({ provider: 'nine', baseUrl: 'https://r.example/v1/', apiKey: 'k', fetch }, 'rerank-x') };
  };

  it('schema Cohere / Jina: gửi model + query + documents + top_n; nhận results + billed_units', async () => {
    const { sent, m } = call(200, { results: [{ index: 1, relevance_score: 0.8 }, { index: 0, relevance_score: 0.2 }], meta: { billed_units: { search_units: 1 } } });
    const r = await m.doRerank({ documents: { type: 'text', values: ['a', 'b'] }, query: 'q', topN: 2 });
    expect(sent).toEqual([{ url: 'https://r.example/v1/rerank', body: { model: 'rerank-x', query: 'q', documents: ['a', 'b'], top_n: 2 } }]);
    expect(r.ranking).toEqual([{ index: 1, relevanceScore: 0.8 }, { index: 0, relevanceScore: 0.2 }]);
    expect(r.providerMetadata).toEqual({ [COMPATIBLE_NS]: { billed_units: 1 } });
  });

  it('không có đơn vị → billed_units null; HTTP 404 → lỗi mang statusCode (không chép thân)', async () => {
    const ok = call(200, { results: [{ index: 0, relevance_score: 1 }] });
    expect((await ok.m.doRerank({ documents: { type: 'text', values: ['a'] }, query: 'q' })).providerMetadata).toEqual({ [COMPATIBLE_NS]: { billed_units: null } });
    const nf = call(404, { secret: 'x' });
    await expect(nf.m.doRerank({ documents: { type: 'text', values: ['a'] }, query: 'q' })).rejects.toMatchObject({ statusCode: 404, message: 'rerank HTTP 404' });
  });
});
