// probe provider (TIP-040, DC-371): mã lỗi làm sạch + khả năng chỉ cập nhật từ kết quả kiểm thật (chat không suy ra embed).
import { describe, expect, it } from 'vitest';
import { mergeCapabilities, probeError, probeProvider } from '../src/router/probe';

describe('probeError', () => {
  it('ánh xạ mã HTTP / huỷ → mã ngắn, không chép message', () => {
    expect(probeError({ statusCode: 401, message: 'sk-secret' })).toBe('auth');
    expect(probeError({ statusCode: 429 })).toBe('rate_limited');
    expect(probeError({ statusCode: 404 })).toBe('not_found');
    expect(probeError({ statusCode: 400 })).toBe('unsupported');
    expect(probeError({ statusCode: 503 })).toBe('provider_error');
    expect(probeError({ name: 'AbortError' })).toBe('timeout');
    expect(probeError(new Error('ECONNREFUSED'))).toBe('network');
  });
});

describe('mergeCapabilities', () => {
  it('chỉ đổi khả năng đã kiểm; chat không ghi khả năng nào', () => {
    const prev = { tools: true, embeddings: true, vision: true };
    expect(
      mergeCapabilities(prev, [
        { capability: 'chat', ok: true, latency_ms: 1 },
        { capability: 'embeddings', ok: false, latency_ms: 1, error: 'unsupported' },
      ]),
    ).toEqual({ tools: true, embeddings: false, vision: true });
  });
});

describe('probeProvider', () => {
  it('thiếu model → unsupported, không gọi mạng', async () => {
    const provider = { key: 'k', kind: 'openai_compatible' as const, baseUrl: 'http://127.0.0.1:1/v1', apiKey: 'x', capabilities: {} };
    expect(await probeProvider({ provider, chatModel: null, embedModel: null, capabilities: ['chat', 'embeddings'] })).toEqual([
      { capability: 'chat', ok: false, latency_ms: 0, error: 'unsupported' },
      { capability: 'embeddings', ok: false, latency_ms: 0, error: 'unsupported' },
    ]);
  });
});
