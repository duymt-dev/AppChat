// TIP-023f §3.2: cần ảnh → chỉ route khai `vision` cho ĐÚNG model (provider vision=true chưa đủ, vắng = không); cùng provider có model
// chữ + model ảnh → chọn đúng model ảnh; không route nào → engine báo VISION_UNAVAILABLE, không gửi thiếu ảnh.
import { describe, expect, it } from 'vitest';
import { LlmRouter, type RouteRow } from '../src/router/router';
import { AiSdkEngine } from '../src/gateway/engine';
import type { ProviderConfig } from '../src/router/providers';
import type { RunEvent } from '../src/gateway/types';

const provider = (vision?: boolean): ProviderConfig => ({ key: 'p', kind: 'openai_compatible', apiKey: 'k', capabilities: { tools: true, ...(vision === undefined ? {} : { vision }) } });
const route = (model: string, priority: number, vision?: boolean): RouteRow => ({ tier: 'standard', purpose: 'chat', priority, providerKey: 'p', model, ...(vision ? { vision } : {}) });
const router = (routes: RouteRow[], p = provider()) => new LlmRouter({ routes: async () => routes, provider: async () => p }, () => ({}));

describe('lọc route theo vision', () => {
  it('không cần ảnh → mọi route; cần ảnh → chỉ route khai vision', async () => {
    const r = router([route('text-only', 0), route('vision-model', 1, true)]);
    expect((await r.candidates('standard', 'chat', { tools: true })).map((c) => c.model)).toEqual(['text-only', 'vision-model']);
    expect((await r.candidates('standard', 'chat', { tools: true, vision: true })).map((c) => c.model)).toEqual(['vision-model']);
  });

  it('provider khai vision=true nhưng route không khai → loại; provider vision=false → loại cả route khai', async () => {
    expect(await router([route('m', 0)], provider(true)).candidates('standard', 'chat', { tools: false, vision: true })).toEqual([]);
    expect(await router([route('m', 0, true)], provider(false)).candidates('standard', 'chat', { tools: false, vision: true })).toEqual([]);
  });

  it('engine: có ảnh mà không route vision → VISION_UNAVAILABLE trước mọi lời gọi', async () => {
    const engine = new AiSdkEngine(router([route('text-only', 0)]));
    const inputs = { hydrate: async () => [[{ type: 'image' as const, image: new Uint8Array([1]), mediaType: 'image/png' as const }]] };
    const events: RunEvent[] = [];
    try {
      for await (const e of engine.run({ runId: 'r', workspaceId: 'w', system: 's', messages: [{ role: 'user', content: [{ type: 'appchat-input', artifact_id: 'a', revision: 1 }] }], tools: [], tier: 'standard', maxSteps: 2, budget: { maxCredits: 10 }, inputs }, new AbortController().signal)) events.push(e);
    } catch (e) {
      events.push({ type: 'error', code: (e as { code?: string }).code ?? '', message: '', stepIdx: 0 });
    }
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'VISION_UNAVAILABLE' });
  });
});
