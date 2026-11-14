// TIP-019 AC3: LLM Router — ứng viên theo priority, bỏ provider tắt / thiếu key / thiếu tool calling; engine chuyển provider khi
// 5xx / 429 (không chuyển khi 401); `openai_compatible` dựng với baseURL + headers; `isFallbackError`.
import { describe, expect, it } from 'vitest';
import { AiSdkEngine, LlmRouter, buildModel, isFallbackError, mockLanguageModel, type ProviderConfig, type RouteRow, type RunEvent } from '../src';

const prov = (key: string, p: Partial<ProviderConfig> = {}): ProviderConfig => ({ key, kind: 'openai_compatible', baseUrl: 'https://r.example/v1', apiKey: 'k', capabilities: { tools: true }, ...p });

function router(routes: RouteRow[], providers: Record<string, ProviderConfig | null>, models: Record<string, unknown> = {}) {
  return new LlmRouter({ routes: async (tier, purpose) => routes.filter((r) => r.tier === tier && r.purpose === purpose), provider: async (k) => providers[k] ?? null }, (p, m) => models[`${p.key}:${m}`] ?? { p: p.key, m });
}

describe('LlmRouter', () => {
  const routes: RouteRow[] = [
    { tier: 'standard', purpose: 'chat', priority: 2, providerKey: 'c', model: 'mc' },
    { tier: 'standard', purpose: 'chat', priority: 0, providerKey: 'a', model: 'ma' },
    { tier: 'standard', purpose: 'chat', priority: 1, providerKey: 'b', model: 'mb' },
    { tier: 'advanced', purpose: 'chat', priority: 0, providerKey: 'c', model: 'mx' },
    { tier: 'standard', purpose: 'embed', priority: 0, providerKey: 'a', model: 'emb' },
  ];

  it('theo priority; bỏ provider null (tắt / thiếu key); agent có tool bỏ provider không tool; embed cần embeddings', async () => {
    const r = router(routes, { a: prov('a'), b: prov('b', { capabilities: { tools: false } }), c: prov('c') });
    expect((await r.candidates('standard', 'chat', { tools: true })).map((c) => `${c.provider}:${c.model}`)).toEqual(['a:ma', 'c:mc']);
    expect((await r.candidates('standard', 'chat', { tools: false })).map((c) => c.provider)).toEqual(['a', 'b', 'c']);
    expect((await r.candidates('advanced', 'chat', { tools: true })).map((c) => c.model)).toEqual(['mx']);
    expect(await r.candidates('standard', 'embed', { tools: false })).toEqual([]);
    const r2 = router(routes, { a: prov('a', { capabilities: { embeddings: true } }), b: null, c: null });
    expect((await r2.candidates('standard', 'embed', { tools: false })).map((c) => c.model)).toEqual(['emb']);
    expect((await r2.candidates('standard', 'chat', { tools: false })).map((c) => c.provider)).toEqual(['a']);
  });

  it('engine: provider đầu 503 / 429 → provider kế; 401 → lỗi, không thử tiếp', async () => {
    const run = async (first: number) => {
      const m1 = mockLanguageModel([{ error: { statusCode: first } }]);
      const m2 = mockLanguageModel([{ text: 'từ provider 2' }]);
      const r = router(routes, { a: prov('a'), b: prov('b'), c: prov('c') }, { 'a:ma': m1, 'b:mb': m2, 'c:mc': m2 });
      const ev: RunEvent[] = [];
      for await (const e of new AiSdkEngine(r).run({ runId: 'r', workspaceId: 'w', system: '', messages: [{ role: 'user', content: 'hi' }], tools: [], tier: 'standard', maxSteps: 4, budget: { maxCredits: 10 } }, new AbortController().signal)) ev.push(e);
      return ev;
    };
    for (const code of [503, 429]) {
      const ev = await run(code);
      expect(ev.find((e) => e.type === 'usage')).toMatchObject({ usage: { provider: 'b', model: 'mb' } });
      expect(ev.at(-1)).toMatchObject({ type: 'finish', text: 'từ provider 2' });
    }
    expect((await run(401)).at(-1)).toMatchObject({ type: 'error', code: 'LLM_ERROR' });
  });

  it('không route → NO_MODEL_ROUTE; isFallbackError theo mã / mạng', async () => {
    const ev: RunEvent[] = [];
    for await (const e of new AiSdkEngine(router([], {})).run({ runId: 'r', workspaceId: 'w', system: '', messages: [{ role: 'user', content: 'hi' }], tools: [], tier: 'max', maxSteps: 4, budget: { maxCredits: 10 } }, new AbortController().signal)) ev.push(e);
    expect(ev.at(-1)).toMatchObject({ type: 'error', code: 'NO_MODEL_ROUTE' });
    expect([500, 502, 429, 408].every((s) => isFallbackError({ statusCode: s }))).toBe(true);
    expect([400, 401, 403, 404].some((s) => isFallbackError({ statusCode: s }))).toBe(false);
    expect(isFallbackError({ code: 'ETIMEDOUT' })).toBe(true);
    expect(isFallbackError({ cause: { name: 'TimeoutError' } })).toBe(true);
  });

  it('buildModel: openai_compatible cần base_url; provider gốc dựng được model + embedding', () => {
    expect(() => buildModel(prov('x', { baseUrl: null }), 'm', 'chat')).toThrow(/base_url/);
    const m = buildModel(prov('nine', { headers: { 'X-Org': 'a' } }), 'gpt-x', 'chat') as { provider: string; modelId: string };
    expect(m).toMatchObject({ modelId: 'gpt-x' });
    expect(m.provider).toContain('nine');
    for (const kind of ['anthropic', 'openai', 'google', 'deepseek'] as const) expect(buildModel(prov(kind, { kind, baseUrl: null }), 'model-x', 'chat')).toMatchObject({ modelId: 'model-x' });
    expect(buildModel(prov('o', { kind: 'openai', baseUrl: null }), 'emb-x', 'embed')).toMatchObject({ modelId: 'emb-x' });
  });

  it('TIP-020e: rerank lọc theo capability `rerank`; ứng viên mang nửa route của thế hệ cấu hình (ghim không gian embed)', async () => {
    const rr: RouteRow[] = [
      { tier: 'standard', purpose: 'rerank', priority: 0, providerKey: 'a', model: 'ra', configRevision: 'route-a' },
      { tier: 'standard', purpose: 'rerank', priority: 1, providerKey: 'b', model: 'rb', configRevision: 'route-b' },
      { tier: 'standard', purpose: 'embed', priority: 0, providerKey: 'b', model: 'eb', configRevision: 'route-e' },
    ];
    const r = router(rr, { a: prov('a'), b: prov('b', { capabilities: { rerank: true, embeddings: true }, configRevision: 'prov-b' }) });
    expect((await r.candidates('standard', 'rerank', { tools: false })).map((c) => c.model)).toEqual(['rb']);
    const [e] = await r.candidates('standard', 'embed', { tools: false });
    expect(e).toMatchObject({ provider: 'b', model: 'eb', routeRevision: 'route-e', configRevision: 'prov-b:route-e' });
  });
});
