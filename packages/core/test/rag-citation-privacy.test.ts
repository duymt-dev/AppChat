// TIP-020d (unit): ranh giới dữ liệu — ngữ cảnh model chỉ có bí danh + nội dung (không tên tệp / đường dẫn canary); kết quả kb.search
// trong run trích dẫn không mang tên nguồn; erase xoá sổ / binding / ứng viên; chiếu cho người xem: nguồn đổi → unavailable không lộ tên.
import { describe, expect, it, vi } from 'vitest';
import { aliasedDocs, aliasedHits, CITATION_RULE_VI } from '../src/ai/citations/prompt';
import { eraseRunCitations } from '../src/ai/privacy/cleanup';
import { citationsOf } from '../src/ai/citations/projection';
import { authzForRole } from '@appchat/shared';

const CANARY = 'BAOCAO-NOIBO-CANARY.pdf';
const hits = [
  { chunk_id: 'c1', source_id: 's1', source_name: CANARY, content: 'Spa mở 8h–20h.', path: ['Mục bí mật'], score: 0.9 },
  { chunk_id: 'c2', source_id: 's1', source_name: CANARY, content: 'Chủ nhật nghỉ.', path: [], score: 0.8 },
];

describe('ngữ cảnh model', () => {
  it('khối tài liệu + kết quả tool chỉ có bí danh và nội dung — không tên tệp / đường dẫn', () => {
    const docs = aliasedDocs(hits, ['S1', null]);
    expect(docs).toContain('[S1]\nSpa mở 8h–20h.');
    expect(docs).not.toContain(CANARY);
    expect(docs).not.toContain('Mục bí mật');
    expect(docs).not.toContain('Chủ nhật nghỉ');
    expect(docs).toMatch(/đủ số nguồn tối đa/);
    const out = JSON.stringify(aliasedHits(hits, ['S1', 'S2']));
    expect(out).not.toContain(CANARY);
    expect(out).not.toContain('Mục bí mật');
    expect(CITATION_RULE_VI).toMatch(/Không nhắc mã nguồn, tên tài liệu/);
  });
});

describe('erase + chiếu', () => {
  it('erase: xoá sổ bí danh + binding, pha failed (privacy_erased)', async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    await eraseRunCitations({ aiRun: { updateMany } } as never, 'r1');
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ citationRegistry: [], citationPhase: 'failed', answerCitations: expect.objectContaining({ citations: [], reason: 'privacy_erased' }) }) }));
  });

  it('chiếu: pha chờ kiểm → null (không lộ ứng viên); không hợp lệ → unavailable không tên; nguồn đổi thế hệ → unavailable', async () => {
    const run = (o: object) => ({ aiRun: { findUnique: vi.fn(async () => ({ citationPhase: 'validating', answerCitations: { candidate: { raw: CANARY } }, citationRegistry: [], ...o })) }, aiAgent: { findUnique: vi.fn() }, aiAgentVersion: { findUnique: vi.fn() }, $queryRaw: vi.fn(async () => []) });
    const viewer = authzForRole('owner', 'u1');
    expect(await citationsOf(run({}) as never, 'r1', viewer)).toBeNull();
    const inv = await citationsOf(run({ citationPhase: 'invalidated' }) as never, 'r1', viewer);
    expect(inv).toEqual({ answer: { run_id: 'r1', generation: 1 }, state: 'unavailable', entries: [] });
    const binding = { v: 1, state: 'validated', answer_generation: 1, answer_step_idx: 2, reply_digest: 'd', reason: null, citations: [{ source_id: 's1', chunk_id: 'c1', source_generation: 1, claim_start: 0, claim_end: 3 }] };
    const stale = await citationsOf(run({ citationPhase: 'validated', answerCitations: binding, citationRegistry: [{ a: 'S1', s: 's1', c: 'c1', g: 1, d: 'x', b: 'r1' }], knowledge: null }) as never, 'r1', viewer);
    expect(stale?.state).toBe('unavailable');
    expect(JSON.stringify(stale)).not.toContain(CANARY);
  });
});
