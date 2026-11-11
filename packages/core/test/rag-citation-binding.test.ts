// TIP-020d (unit): bản chữ + ánh xạ vị trí (tiếng Việt, cặp thay thế UTF-16, Markdown, PII khác độ dài, CRLF / trim) và kiểm trích dẫn theo
// sổ bí danh — đúng bí danh + vị trí + nguồn hiện hành → trích dẫn chuẩn hoá (không phải mọi hit truy hồi); bí danh lạ / vị trí hỏng /
// nguồn đổi thế hệ / tên tệp nguồn lọt vào câu gửi khách → không hợp lệ (cả ứng viên); không trích dẫn khi có tài liệu → `missing`.
import { describe, expect, it, vi } from 'vitest';
import { parseAgentReply } from '@appchat/ai';
import { registerPassages, registryOf, MAX_CITATION_CANDIDATES, type RegistryEntry } from '../src/ai/citations/binding';
import { quoteSpan, replyDigest, sliceCp, textRevision } from '../src/ai/citations/text-revision';
import { validateAnswer } from '../src/ai/citations/validation';
import { agentKnowledge } from '../src/ai/kb/scope/context';

const flat = (args: unknown[]): unknown[] =>
  args.flatMap((a) => (Array.isArray(a) ? ((a as unknown as { raw?: unknown }).raw ? [] : [a]) : a && typeof a === 'object' && Array.isArray((a as { values?: unknown }).values) ? flat((a as { values: unknown[] }).values) : [a]));

const AG = '0190f000-0000-7000-8000-0000000000a1';
const RUN = '0190f000-0000-7000-8000-0000000000e1';
const S1 = '0190f000-0000-7000-8000-0000000000d1';
const C1 = '0190f000-0000-7000-8000-0000000000c1';
const C2 = '0190f000-0000-7000-8000-0000000000c2';
const F1 = '0190f000-0000-7000-8000-0000000000f1';

describe('bản chữ + ánh xạ vị trí', () => {
  it('tiếng Việt + emoji (cặp thay thế) + Markdown: vị trí theo điểm mã, không theo UTF-16', () => {
    const raw = '**Spa** mở 8h 😊 tới 20h';
    const r = textRevision(raw, {});
    expect(r.text).toBe(raw);
    expect(r.length).toBe(Array.from(raw).length);
    expect(sliceCp(r.text, r.map(20)!, r.map(23)!)).toBe('20h');
    expect(quoteSpan(r.text, 'tới 20h')).toEqual({ start: 16, end: 23 });
  });

  it('CRLF → LF + trim: biên trong vùng cắt / giữa \\r\\n không hợp lệ', () => {
    const r = textRevision('  Dạ\r\nchào chị  ', {});
    expect(r.text).toBe('Dạ\nchào chị');
    expect(r.map(0)).toBeUndefined();
    expect(r.map(2)).toBe(0);
    expect(r.map(5)).toBeUndefined();
    expect(r.map(14)).toBe(r.length);
    expect(r.map(16)).toBeUndefined();
  });

  it('PII thay bằng giá trị khác độ dài: vị trí sau mã dời đúng; biên trong mã → không hợp lệ', () => {
    const raw = 'STK [PII_1] của chị đã nhận';
    const r = textRevision(raw, { '[PII_1]': '0123456789012' });
    expect(r.text).toBe('STK 0123456789012 của chị đã nhận');
    const s = raw.indexOf('của');
    expect(sliceCp(r.text, r.map(s)!, r.map(raw.length)!)).toBe('của chị đã nhận');
    expect(r.map(6)).toBeUndefined();
    expect(r.map(4)).toBe(4);
  });

  it('quote phải xuất hiện đúng một lần', () => {
    expect(quoteSpan('a b a', 'a')).toBeNull();
    expect(quoteSpan('a b c', 'x')).toBeNull();
    expect(replyDigest('x')).toHaveLength(32);
  });
});

/** DB giả: run giữ binding kênh phạm vi F1; đoạn còn hợp lệ = `live` (chunk → [source, seq]); tên nguồn theo `names`. */
function fake(live: Record<string, [string, number]>, names: string[] = ['noi-bo/bang-gio-mo-cua.pdf']) {
  const runs: Record<string, { citationRegistry: unknown; knowledge: unknown }> = { [RUN]: { citationRegistry: null, knowledge: agentKnowledge({ agentId: AG, version: 1, cfg: { kb_scope: { folder_ids: [F1], tags: [] } } }, { channel: true }) } };
  return {
    runs,
    aiRun: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (runs[where.id] ? { id: where.id, ...runs[where.id] } : null)),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { citationRegistry?: unknown } }) => {
        runs[where.id] = { ...runs[where.id]!, ...(data.citationRegistry ? { citationRegistry: data.citationRegistry } : {}) };
      }),
    },
    aiAgent: { findUnique: vi.fn(async () => ({ id: AG, status: 'active', deletedAt: null, publishedVersion: 1 })) },
    aiAgentVersion: { findUnique: vi.fn(async () => ({ config: { kb_scope: { folder_ids: [F1], tags: [] } } })) },
    $queryRaw: vi.fn(async (...args: unknown[]) => {
      const text = (args[0] as { strings?: string[] }).strings?.join('?') ?? String((args[0] as { sql?: string }).sql ?? '');
      if (/SELECT name FROM kb_source/.test(text)) return names.map((name) => ({ name }));
      const ids = (flat(args).find((v) => Array.isArray(v)) ?? []) as string[];
      return ids.filter((c) => c in live).map((c) => ({ chunk: c, id: live[c]![0], seq: live[c]![1] }));
    }),
  };
}

const reg = async (db: ReturnType<typeof fake>) => {
  const a = await registerPassages(db as never, RUN, RUN, [
    { source_id: S1, chunk_id: C1, generation: 1, content: 'Spa mở cửa 8h–20h.' },
    { source_id: S1, chunk_id: C2, generation: 1, content: 'Chủ nhật nghỉ.' },
  ]);
  return { aliases: a, entries: registryOf(db.runs[RUN]!.citationRegistry) as RegistryEntry[] };
};

describe('sổ bí danh', () => {
  it('cấp S1, S2; đoạn trùng giữ bí danh cũ; đầy 40 → null (không đẩy bí danh đã cấp)', async () => {
    const db = fake({});
    const { aliases, entries } = await reg(db);
    expect(aliases).toEqual(['S1', 'S2']);
    expect(entries.map((e) => [e.a, e.c, e.g])).toEqual([['S1', C1, 1], ['S2', C2, 1]]);
    expect(await registerPassages(db as never, RUN, RUN, [{ source_id: S1, chunk_id: C1, generation: 1, content: 'x' }])).toEqual(['S1']);
    db.runs[RUN]!.citationRegistry = Array.from({ length: MAX_CITATION_CANDIDATES }, (_, i) => ({ a: `S${i + 1}`, s: S1, c: `c${i}`, g: 1, d: 'x', b: RUN }));
    expect(await registerPassages(db as never, RUN, RUN, [{ source_id: S1, chunk_id: 'new', generation: 1, content: 'y' }])).toEqual([null]);
  });
});

describe('kiểm trích dẫn', () => {
  const answer = (o: object) => parseAgentReply(JSON.stringify({ reply: 'Dạ spa mở cửa 8h–20h ạ.', confidence: 0.9, intent: 'question', sentiment: 'neutral', needs_human: null, ...o }));

  it('bí danh + quote hợp lệ → trích dẫn chuẩn hoá của ĐÚNG đoạn được trích (không phải mọi hit)', async () => {
    const db = fake({ [C1]: [S1, 1], [C2]: [S1, 1] });
    const { entries } = await reg(db);
    const o = await validateAnswer(db as never, answer({ citations: [{ ref: 'S1', quote: 'mở cửa 8h–20h' }] }), {}, entries);
    expect(o).toMatchObject({ kind: 'validated', text: 'Dạ spa mở cửa 8h–20h ạ.', citations: [{ source_id: S1, chunk_id: C1, source_generation: 1, claim_start: 7, claim_end: 20 }] });
  });

  it('vị trí theo chuỗi thô (trước trim) được ánh xạ đúng', async () => {
    const db = fake({ [C1]: [S1, 1] });
    const { entries } = await reg(db);
    const o = await validateAnswer(db as never, parseAgentReply(JSON.stringify({ reply: '  Mở 8h–20h ạ', confidence: 0.9, citations: [{ ref: 'S1', claim_start: 2, claim_end: 11 }] })), {}, entries);
    expect(o).toMatchObject({ kind: 'validated', text: 'Mở 8h–20h ạ', citations: [{ claim_start: 0, claim_end: 9 }] });
  });

  it('bí danh lạ / vị trí hỏng / quote không khớp / sai khuôn → invalid (không lọc bớt)', async () => {
    const db = fake({ [C1]: [S1, 1] });
    const { entries } = await reg(db);
    expect(await validateAnswer(db as never, answer({ citations: [{ ref: 'S9', quote: 'mở cửa' }] }), {}, entries)).toEqual({ kind: 'invalid', reason: 'unknown_ref' });
    expect(await validateAnswer(db as never, answer({ citations: [{ ref: 'S1', quote: 'mở cửa' }, { ref: 'S1', claim_start: 5, claim_end: 999 }] }), {}, entries)).toEqual({ kind: 'invalid', reason: 'bad_span' });
    expect(await validateAnswer(db as never, answer({ citations: [{ ref: 'S1', quote: 'đóng cửa' }] }), {}, entries)).toEqual({ kind: 'invalid', reason: 'bad_span' });
    expect(await validateAnswer(db as never, answer({ citations: [{ ref: 'S1', extra: 1 }] }), {}, entries)).toEqual({ kind: 'invalid', reason: 'citation_schema' });
  });

  it('nguồn đổi thế hệ (nạp lại) / đoạn mất → source_changed', async () => {
    const db = fake({ [C1]: [S1, 2] });
    const { entries } = await reg(db);
    expect(await validateAnswer(db as never, answer({ citations: [{ ref: 'S1', quote: 'mở cửa' }] }), {}, entries)).toEqual({ kind: 'invalid', reason: 'source_changed' });
  });

  it('mã bí danh / tên tài liệu nội bộ lọt vào câu gửi khách → source_metadata', async () => {
    const db = fake({ [C1]: [S1, 1] });
    const { entries } = await reg(db);
    expect(await validateAnswer(db as never, answer({ reply: 'Theo S1 spa mở 8h ạ', citations: [{ ref: 'S1', quote: 'spa mở 8h' }] }), {}, entries)).toEqual({ kind: 'invalid', reason: 'source_metadata' });
    expect(await validateAnswer(db as never, answer({ reply: 'Theo noi-bo/bang-gio-mo-cua.pdf thì 8h ạ', citations: [{ ref: 'S1', quote: '8h' }] }), {}, entries)).toEqual({ kind: 'invalid', reason: 'source_metadata' });
    // Tiêu đề chữ thường trùng tên nguồn không phải tệp / đường dẫn → ngôn ngữ tự nhiên, không chặn (DC-434).
    const plain = fake({ [C1]: [S1, 1] }, ['Giờ mở cửa']);
    const e2 = (await reg(plain)).entries;
    expect((await validateAnswer(plain as never, answer({ reply: 'Dạ giờ mở cửa là 8h ạ', citations: [{ ref: 'S1', quote: '8h' }] }), {}, e2)).kind).toBe('validated');
  });

  it('có tài liệu mà không trích dẫn → missing; không tài liệu → none; chữ thường không có trích dẫn', async () => {
    const db = fake({ [C1]: [S1, 1] });
    const { entries } = await reg(db);
    expect((await validateAnswer(db as never, answer({}), {}, entries)).kind).toBe('missing');
    expect((await validateAnswer(db as never, answer({}), {}, [])).kind).toBe('none');
    expect(parseAgentReply('Dạ em chào chị').citations).toBeNull();
  });
});
