// TIP-023e §1.2: thế hệ cấu hình opaque của provider / route — đổi mọi trường canonical (kể cả xoay khoá CÙNG độ dài) phải đổi
// digest; ProviderStore phải truyền digest này ra ProviderConfig/RouteRow; LlmRouter phải khoá cache theo digest thay vì độ dài key
// (regression chính của §1.2: xoay khoá cùng độ dài trước đây KHÔNG dựng lại handle — lỗi bảo mật/đúng đắn).
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LlmRouter, type ProviderConfig, type RouteRow } from '@appchat/ai';
import { encryptSecret } from '../src/kernel/crypto';
import { providerRevision, routeRevision, type ProviderFingerprint, type RouteFingerprint } from '../src/ai/router/config-revision';

const encKey = randomBytes(32);
const baseProvider: ProviderFingerprint = { key: 'nine', kind: 'openai_compatible', baseUrl: 'https://r.example', capabilities: { tools: true }, status: 'active', version: 1, apiKeyEnc: new Uint8Array(encryptSecret('sk-aaaaaaaaaaaaaaaa', encKey)), headersEnc: null };
const baseRoute: RouteFingerprint = { id: 'route-1', model: 'gpt-x', params: null, priority: 0 };

describe('providerRevision / routeRevision (TIP-023e §1.2)', () => {
  it('cùng input → cùng digest (deterministic); đổi bất kỳ trường canonical nào → digest khác', () => {
    const a = providerRevision(encKey, baseProvider);
    expect(providerRevision(encKey, baseProvider)).toBe(a);
    expect(providerRevision(encKey, { ...baseProvider, baseUrl: 'https://other.example' })).not.toBe(a);
    expect(providerRevision(encKey, { ...baseProvider, capabilities: { tools: false } })).not.toBe(a);
    expect(providerRevision(encKey, { ...baseProvider, status: 'disabled' })).not.toBe(a);
    expect(providerRevision(encKey, { ...baseProvider, version: 2 })).not.toBe(a);
    expect(providerRevision(encKey, { ...baseProvider, headersEnc: new Uint8Array(encryptSecret('{}', encKey)) })).not.toBe(a);
  });

  it('xoay khoá CÙNG ĐỘ DÀI vẫn đổi digest (ciphertext/IV luôn khác mỗi lần mã hoá) — vá lỗi khoá cache theo apiKey.length', () => {
    const rotated: ProviderFingerprint = { ...baseProvider, apiKeyEnc: new Uint8Array(encryptSecret('sk-bbbbbbbbbbbbbbbb', encKey)) };
    expect(baseProvider.apiKeyEnc!.length).toBe(rotated.apiKeyEnc!.length); // cùng độ dài bản rõ → cùng độ dài ciphertext
    expect(providerRevision(encKey, baseProvider)).not.toBe(providerRevision(encKey, rotated));
  });

  it('khoá mã hoá khác nhau → digest khác (không suy ngược được khoá, nhưng phải domain-separate theo khoá vận hành)', () => {
    expect(providerRevision(encKey, baseProvider)).not.toBe(providerRevision(randomBytes(32), baseProvider));
  });

  it('routeRevision: đổi id/model/params/priority → digest khác; không đổi gì → digest giữ nguyên', () => {
    const a = routeRevision(encKey, baseRoute);
    expect(routeRevision(encKey, baseRoute)).toBe(a);
    expect(routeRevision(encKey, { ...baseRoute, model: 'gpt-y' })).not.toBe(a);
    expect(routeRevision(encKey, { ...baseRoute, priority: 1 })).not.toBe(a);
    expect(routeRevision(encKey, { ...baseRoute, params: { temperature: 0.5 } })).not.toBe(a);
  });
});

describe('LlmRouter: khoá cache theo configRevision (không còn theo apiKey.length)', () => {
  const route = (configRevision?: string): RouteRow => ({ tier: 'standard', purpose: 'chat', priority: 0, providerKey: 'nine', model: 'gpt-x', ...(configRevision ? { configRevision } : {}) });
  const provider = (apiKey: string, configRevision?: string): ProviderConfig => ({ key: 'nine', kind: 'openai_compatible', baseUrl: 'https://r.example', apiKey, capabilities: { tools: true }, ...(configRevision ? { configRevision } : {}) });

  it('có configRevision: xoay khoá cùng độ dài → handle MỚI (trước đây bị lùi về cache cũ do cùng apiKey.length)', async () => {
    let p = provider('sk-aaaaaaaaaaaaaaaa', 'rev-1');
    let built = 0;
    const r = new LlmRouter({ routes: async () => [route('rev-1')], provider: async () => p }, () => {
      built++;
      return { built };
    });
    const first = (await r.candidates('standard', 'chat', { tools: true }))[0]!;
    expect(first.handle).toMatchObject({ built: 1 });
    // Xoay khoá: cùng độ dài apiKey, nhưng configRevision đổi (ProviderStore sẽ tính lại digest mỗi lần nạp cấu hình).
    p = provider('sk-bbbbbbbbbbbbbbbb', 'rev-2');
    const second = (await r.candidates('standard', 'chat', { tools: true }))[0]!;
    expect(second.handle).toMatchObject({ built: 2 });
  });

  it('thiếu configRevision ở cả route lẫn provider (test/mock cũ): vẫn lùi về khoá theo apiKey.length như trước — không vỡ test hiện có', async () => {
    let built = 0;
    const r = new LlmRouter({ routes: async () => [route()], provider: async () => provider('sk-samekeylen12345') }, () => {
      built++;
      return { built };
    });
    await r.candidates('standard', 'chat', { tools: true });
    await r.candidates('standard', 'chat', { tools: true });
    expect(built).toBe(1); // cùng khoá lùi → dùng lại handle (hành vi cũ giữ nguyên khi không có digest)
  });
});
