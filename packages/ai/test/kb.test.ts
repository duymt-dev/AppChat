// TIP-020 (unit): cắt đoạn theo cấu trúc (đề mục / bảng / dòng Excel, ≤ 800 token, chồng nhau, đoạn có giá → volatile), RRF,
// embedder (lô, fallback provider, sai số chiều), embedding giả tất định (câu chung từ cosine cao, không dấu = có dấu).
import { describe, expect, it } from 'vitest';
import { MockEmbeddingModelV4 } from 'ai/test';
import { AiSdkEmbedder, CHUNK_MAX_TOKENS, EMBED_DIM, chunkDocument, mockEmbedSource, mockVector, rrf, staticModelSource, tokensOf, type DocBlock } from '../src';

const cos = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i]!, 0);
const words = (n: number, w = 'chăm sóc da') => Array.from({ length: n }, (_, i) => `${w} ${i}.`).join(' ');

describe('chunker', () => {
  it('đề mục giữ đường dẫn; đề mục con thay đề mục cùng cấp', () => {
    const blocks: DocBlock[] = [
      { type: 'heading', level: 1, text: 'Chính sách' },
      { type: 'heading', level: 2, text: 'Đổi trả' },
      { type: 'para', text: words(300) },
      { type: 'heading', level: 2, text: 'Bảo hành' },
      { type: 'para', text: 'Bảo hành 12 tháng cho máy.' },
    ];
    const c = chunkDocument(blocks);
    expect(c[0]!.meta.path).toEqual(['Chính sách', 'Đổi trả']);
    expect(c.at(-1)!.meta.path).toEqual(['Chính sách', 'Bảo hành']);
    expect(c.at(-1)!.content).toContain('Bảo hành 12 tháng');
  });

  it('đoạn dài cắt ≤ 800 token, đoạn sau chồng phần cuối đoạn trước', () => {
    const c = chunkDocument([...Array.from({ length: 30 }, (_, i): DocBlock => ({ type: 'para', text: words(30, `mục ${i}`) })), { type: 'para', text: words(900, 'trẻ hoá') }]);
    expect(c.length).toBeGreaterThan(1);
    for (const x of c) expect(x.tokens).toBeLessThanOrEqual(CHUNK_MAX_TOKENS + 10);
    const tail = c[0]!.content.slice(-40).split(' ').slice(1).join(' ');
    expect(c[1]!.content).toContain(tail);
  });

  it('bảng: mỗi đoạn kèm hàng tiêu đề; Excel: mỗi dòng một đoạn kèm tên cột', () => {
    const rows = Array.from({ length: 200 }, (_, i) => [`Dịch vụ ${i}`, `Mô tả dài cho dịch vụ số ${i} gồm nhiều bước chăm sóc`]);
    const t = chunkDocument([{ type: 'table', header: ['Tên', 'Mô tả'], rows }]);
    expect(t.length).toBeGreaterThan(1);
    for (const x of t) expect(x.content.startsWith('| Tên | Mô tả |')).toBe(true);
    const x = chunkDocument([{ type: 'row', columns: ['Tên', 'Thời lượng'], values: ['HIFU', '60 phút'], row: 2, sheet: 'Dịch vụ' }]);
    expect(x).toEqual([{ content: 'Dịch vụ — Tên: HIFU; Thời lượng: 60 phút', tokens: tokensOf('Dịch vụ — Tên: HIFU; Thời lượng: 60 phút'), meta: { row: 2, sheet: 'Dịch vụ' } }]);
  });

  it('đoạn văn có giá → đoạn riêng volatile; đoạn không giá cùng tài liệu không bị kéo theo', () => {
    const c = chunkDocument([
      { type: 'heading', level: 2, text: 'HIFU' },
      { type: 'para', text: 'HIFU nâng cơ không phẫu thuật, 60 phút.' },
      { type: 'para', text: 'Gói HIFU giá 2.500.000đ một lần.' },
      { type: 'para', text: 'Kiêng nắng 3 ngày sau liệu trình.' },
    ]);
    expect(c.map((x) => [x.content, !!x.meta.volatile])).toEqual([
      ['HIFU nâng cơ không phẫu thuật, 60 phút.', false],
      ['HIFU\nGói HIFU giá 2.500.000đ một lần.', true],
      ['Kiêng nắng 3 ngày sau liệu trình.', false],
    ]);
  });
});

describe('RRF', () => {
  it('gộp theo 1/(k+hạng): có mặt ở cả hai danh sách đứng đầu', () => {
    const r = rrf([['a', 'b', 'c'], ['c', 'd', 'a']]);
    expect(r.map((x) => x.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(r[0]!.score).toBeCloseTo(1 / 61 + 1 / 63, 10);
  });
});

describe('embedding', () => {
  it('giả tất định: không dấu = có dấu; câu chung từ cosine cao hơn câu khác', () => {
    const q = mockVector('chinh sach doi tra');
    expect(mockVector('Chính sách đổi trả')).toEqual(q);
    expect(cos(q, mockVector('Chính sách đổi trả trong 7 ngày'))).toBeGreaterThan(cos(q, mockVector('Giờ mở cửa 8h đến 20h')));
    expect(q).toHaveLength(EMBED_DIM);
  });

  it('embedder: lô 64, token cộng dồn; provider đầu 503 → provider kế; sai số chiều → lỗi', async () => {
    const values = Array.from({ length: 130 }, (_, i) => `đoạn ${i}`);
    const r = await new AiSdkEmbedder(mockEmbedSource('p1')).embed(values);
    expect(r).toMatchObject({ provider: 'p1', model: 'mock-embed' });
    expect(r.vectors).toHaveLength(130);
    expect(r.tokens).toBeGreaterThan(0);
    const down = new MockEmbeddingModelV4({ doEmbed: async () => Promise.reject(Object.assign(new Error('HTTP 503'), { statusCode: 503, isRetryable: true })) });
    const ok = (await mockEmbedSource('p2').candidates('standard', 'embed', { tools: false }))[0]!;
    const two = staticModelSource([{ provider: 'p1', model: 'x', handle: down }, ok]);
    expect((await new AiSdkEmbedder(two).embed(['a'])).provider).toBe('p2');
    const short = new MockEmbeddingModelV4({ doEmbed: async () => ({ embeddings: [[1, 0]], warnings: [] }) });
    await expect(new AiSdkEmbedder(staticModelSource([{ provider: 'p', model: 'm', handle: short }])).embed(['a'])).rejects.toThrow(/2 chiều/);
  });
});
