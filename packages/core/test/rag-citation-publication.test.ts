// TIP-020d (unit): công bố có hàng rào — ứng viên riêng + lease, CAS theo token (finalizer cũ / huỷ không thắng), khôi phục kiểm lại cục bộ
// ứng viên đã lưu (không gọi provider), không có ứng viên → failed USAGE_UNKNOWN; cổng trả lời: trích dẫn hỏng → chuyển người không nháp,
// thiếu nguồn → chuyển người giữ nháp, hợp lệ → chữ đã kiểm; dispatch chỉ khi pha `validated`.
import { describe, expect, it, vi } from 'vitest';
import { parseAgentReply } from '@appchat/ai';
import { beginValidation, bindingOf, publishOutcome } from '../src/ai/citations/publication';
import { recoverCitations } from '../src/ai/citations/recovery';
import { gateAnswer } from '../src/ai/citations/answer-gate';
import { dispatchKnowledgeOk } from '../src/ai/kb/scope/draft-binding';

const RUN = '0190f000-0000-7000-8000-0000000000e1';
type Row = { id: string; status: string; citationPhase: string | null; answerCitations: unknown; citationRegistry: unknown; output?: unknown; input?: unknown; startedAt: Date; knowledgeRefs?: unknown };

/** DB giả với updateMany có điều kiện (pha / trạng thái / token lease). */
function fake(row: Partial<Row>) {
  const r: Row = { id: RUN, status: 'completed', citationPhase: 'awaiting_generation', answerCitations: null, citationRegistry: [], startedAt: new Date(0), ...row };
  const match = (w: Record<string, unknown>) => {
    if (w.id && w.id !== r.id) return false;
    const ph = w.citationPhase as { in?: string[] } | string | undefined;
    if (typeof ph === 'string' && ph !== r.citationPhase) return false;
    if (ph && typeof ph === 'object' && ph.in && !ph.in.includes(r.citationPhase ?? '')) return false;
    if ((w.status as { not?: string } | undefined)?.not === r.status) return false;
    const lease = w.answerCitations as { path: string[]; equals: string } | undefined;
    if (lease && (r.answerCitations as { lease?: string } | null)?.lease !== lease.equals) return false;
    return true;
  };
  const steps: { id: string; idx: number; type: string; output: unknown }[] = [{ id: 's1', idx: 3, type: 'llm', output: null }];
  return {
    r,
    steps,
    aiRun: {
      findUnique: vi.fn(async () => r),
      findMany: vi.fn(async () => (['awaiting_generation', 'validating'].includes(r.citationPhase ?? '') ? [r] : [])),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
        if (!match(where)) return { count: 0 };
        Object.assign(r, data);
        return { count: 1 };
      }),
    },
    aiRunStep: {
      findFirst: vi.fn(async ({ where }: { where: { idx?: number } }) => (where.idx !== undefined ? steps.find((s) => s.idx === where.idx) : steps.at(-1)) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { output: unknown } }) => void (steps.find((s) => s.id === where.id)!.output = data.output)),
    },
    aiAgent: { findUnique: vi.fn() },
    aiAgentVersion: { findUnique: vi.fn() },
    $queryRaw: vi.fn(async () => []),
  };
}

const RAW = JSON.stringify({ reply: 'Dạ spa mở 8h ạ.', confidence: 0.9, intent: 'question', sentiment: 'neutral', needs_human: null });

describe('CAS + lease', () => {
  it('ứng viên riêng lưu ở pha validating; công bố đúng token → validated + binding (không còn chữ thô)', async () => {
    const db = fake({});
    const t = await beginValidation(db as never, RUN, RAW, new Date());
    expect(db.r.citationPhase).toBe('validating');
    expect((db.r.answerCitations as { candidate: { raw: string } }).candidate.raw).toBe(RAW);
    expect(await publishOutcome(db as never, RUN, t!, { kind: 'none', text: 'Dạ spa mở 8h ạ.', digest: 'd' })).toBe(true);
    expect(db.r.citationPhase).toBe('validated');
    expect(bindingOf(db.r.answerCitations)).toMatchObject({ state: 'none', answer_step_idx: 3, reply_digest: 'd' });
    expect(JSON.stringify(db.r.answerCitations)).not.toContain('candidate');
  });

  it('finalizer cũ (token khác) / run bị huỷ / đã chốt → không công bố', async () => {
    const db = fake({});
    const t1 = await beginValidation(db as never, RUN, RAW, new Date());
    const t2 = await beginValidation(db as never, RUN, RAW, new Date());
    expect(await publishOutcome(db as never, RUN, t1!, { kind: 'none', text: 'x', digest: 'd' })).toBe(false);
    db.r.status = 'cancelled';
    expect(await publishOutcome(db as never, RUN, t2!, { kind: 'none', text: 'x', digest: 'd' })).toBe(false);
    const done = fake({ citationPhase: 'validated' });
    expect(await beginValidation(done as never, RUN, RAW, new Date())).toBeNull();
  });

  it('trích dẫn hợp lệ ghi lên bước trả lời (bước LLM cuối)', async () => {
    const db = fake({});
    const t = await beginValidation(db as never, RUN, RAW, new Date());
    const c = { source_id: 's', chunk_id: 'c', source_generation: 1, claim_start: 0, claim_end: 2 };
    await publishOutcome(db as never, RUN, t!, { kind: 'validated', text: 'x', digest: 'd', citations: [c] });
    expect(db.steps[0]!.output).toEqual({ citations: [c] });
  });
});

describe('khôi phục', () => {
  it('ứng viên đã lưu + run xong → kiểm lại cục bộ, chốt (không gọi provider)', async () => {
    const db = fake({ citationPhase: 'validating', answerCitations: { v: 1, candidate: { raw: RAW }, lease: 'old', lease_until: new Date(0).toISOString() } });
    expect(await recoverCitations(db as never, new Date())).toEqual({ validated: 1, invalidated: 0, failed: 0 });
    expect(db.r.citationPhase).toBe('validated');
  });

  it('run thất bại / không có ứng viên → failed USAGE_UNKNOWN; còn lease → bỏ qua', async () => {
    const db = fake({ status: 'failed' });
    expect(await recoverCitations(db as never, new Date())).toEqual({ validated: 0, invalidated: 0, failed: 1 });
    expect(bindingOf(db.r.answerCitations)?.reason).toBe('USAGE_UNKNOWN');
    const live = fake({ citationPhase: 'validating', answerCitations: { v: 1, candidate: { raw: RAW }, lease: 'x', lease_until: new Date(Date.now() + 60_000).toISOString() } });
    expect(await recoverCitations(live as never, new Date())).toEqual({ validated: 0, invalidated: 0, failed: 0 });
  });
});

describe('cổng câu trả lời + gửi', () => {
  const sources = [{ a: 'S1', s: 's1', c: 'c1', g: 1, d: 'x', b: RUN }];

  it('run không ở chế độ trích dẫn → luồng thường', async () => {
    const db = fake({ citationPhase: null });
    expect(await gateAnswer(db as never, RUN, RAW, parseAgentReply(RAW), 'Dạ', {}, new Date())).toEqual({ kind: 'pass', reply: 'Dạ' });
  });

  it('có tài liệu mà không trích dẫn → chuyển người giữ nháp; trích dẫn hỏng → chuyển người KHÔNG nháp', async () => {
    const db = fake({ citationRegistry: sources });
    expect(await gateAnswer(db as never, RUN, RAW, parseAgentReply(RAW), 'Dạ spa mở 8h ạ.', {}, new Date())).toEqual({ kind: 'handoff', reason: 'citation_missing', draft: 'Dạ spa mở 8h ạ.' });
    const bad = JSON.stringify({ reply: 'Dạ spa mở 8h ạ.', confidence: 0.9, citations: [{ ref: 'S7', quote: '8h' }] });
    const db2 = fake({ citationRegistry: sources });
    expect(await gateAnswer(db2 as never, RUN, bad, parseAgentReply(bad), 'Dạ spa mở 8h ạ.', {}, new Date())).toEqual({ kind: 'handoff', reason: 'citation_invalid', draft: null });
    expect(db2.r.citationPhase).toBe('invalidated');
  });

  it('dispatch: pha chưa validated → chặn gửi', async () => {
    expect(await dispatchKnowledgeOk(fake({ citationPhase: 'validating' }) as never, RUN)).toBe(false);
    expect(await dispatchKnowledgeOk(fake({ citationPhase: 'invalidated' }) as never, RUN)).toBe(false);
  });
});
