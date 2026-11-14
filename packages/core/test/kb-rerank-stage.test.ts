// TIP-020e AC7 (unit): giai đoạn rerank — ứng viên giới hạn ≤ 40 ĐÚNG tập đã qua restriction, nội dung che PII trước khi gửi, chỉ áp
// hoán vị trên đúng tập id đã gửi (không thêm / mở rộng id), mọi kết quả không phải `ok` → thứ tự RRF + lý do riêng, lỗi ngân sách / ví ở
// hook đo → ném ra (dừng lượt), không có reranker / không có hook đo (chưa có giá — DC-303) → `not_configured` và KHÔNG gọi reranker.
import { describe, expect, it, vi } from 'vitest';
import { RERANK_MAX_DOCS, type RerankHooks, type RerankOutcome, type Reranker } from '@appchat/ai';
import { rerankStage } from '../src/ai/kb/rerank-stage';

const ids = Array.from({ length: 45 }, (_, i) => `c${String(i).padStart(2, '0')}`);
const content = new Map(ids.map((id) => [id, `Đoạn ${id} — CCCD 079123456789`]));
const hooks: RerankHooks = { before: async () => undefined, after: async () => undefined };

function fake(out: (n: number) => RerankOutcome) {
  const calls: { query: string; docs: string[] }[] = [];
  const r: Reranker = {
    route: async () => ({ provider: 'rr', model: 'm' }),
    rerank: vi.fn(async (query: string, docs: string[]) => {
      calls.push({ query, docs });
      return out(docs.length);
    }),
  };
  return { r, calls };
}

describe('rerank-stage', () => {
  it('không reranker / không hook đo (chưa có đơn giá) → not_configured, thứ tự RRF, không gọi mạng', async () => {
    const f = fake(() => ({ kind: 'invalid_result' }));
    expect(await rerankStage(null, hooks, { query: 'q', fused: ids, content, limit: 6 })).toEqual({ ids: ids.slice(0, 6), rerank: 'not_configured' });
    expect(await rerankStage(f.r, null, { query: 'q', fused: ids, content, limit: 6 })).toEqual({ ids: ids.slice(0, 6), rerank: 'not_configured' });
    expect(f.calls).toHaveLength(0);
  });

  it('gửi ≤ 40 ứng viên có nội dung (đã qua restriction), PII đã che; hoán vị ngược → top6 theo thứ tự rerank, chỉ id đã gửi', async () => {
    const restricted = new Map([...content].filter(([id]) => id !== 'c03'));
    const f = fake((n) => ({ kind: 'ok', order: Array.from({ length: n }, (_, i) => n - 1 - i), scores: Array(n).fill(0.5), provider: 'rr', model: 'm', units: 1 }));
    const out = await rerankStage(f.r, hooks, { query: 'CCCD 079123456789', fused: ids, content: restricted, limit: 6 });
    const sent = ids.filter((id) => id !== 'c03').slice(0, RERANK_MAX_DOCS);
    expect(f.calls[0]!.docs).toHaveLength(RERANK_MAX_DOCS);
    expect(f.calls[0]!.docs.join(' ') + f.calls[0]!.query).not.toContain('079123456789');
    expect(out).toEqual({ ids: [...sent].reverse().slice(0, 6), rerank: 'applied' });
    expect(out.ids.every((id) => sent.includes(id))).toBe(true);
  });

  it('kết quả không hợp lệ / quá hạn / thiếu usage / provider lỗi → RRF + lý do riêng', async () => {
    for (const o of [{ kind: 'invalid_result' }, { kind: 'timeout' }, { kind: 'unknown_usage' }, { kind: 'provider_error', error: 'HTTP_503' }, { kind: 'unsupported' }] as RerankOutcome[]) {
      const out = await rerankStage(fake(() => o).r, hooks, { query: 'q', fused: ids, content, limit: 6 });
      expect(out).toEqual({ ids: ids.slice(0, 6), rerank: o.kind });
    }
  });

  it('phòng thủ kép: reranker trả "ok" nhưng chỉ số trùng / ngoài khoảng / thiếu → invalid_result, không thêm id lạ', async () => {
    for (const order of [[0, 0], [0, 99], [1]]) {
      const out = await rerankStage(fake(() => ({ kind: 'ok', order, scores: [], provider: 'rr', model: 'm', units: 1 })).r, hooks, { query: 'q', fused: ids.slice(0, 2), content, limit: 6 });
      expect(out).toEqual({ ids: ids.slice(0, 2), rerank: 'invalid_result' });
    }
  });

  it('lỗi Credit / ngân sách ở hook đo → ném ra (dừng lượt, không nuốt về RRF)', async () => {
    const r: Reranker = { route: async () => ({ provider: 'rr', model: 'm' }), rerank: async () => Promise.reject(Object.assign(new Error('hết'), { code: 'CREDIT_EXHAUSTED' })) };
    await expect(rerankStage(r, hooks, { query: 'q', fused: ids, content, limit: 6 })).rejects.toMatchObject({ code: 'CREDIT_EXHAUSTED' });
  });
});
