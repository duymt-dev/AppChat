// TIP-023g §3.6, §4.1 (AC6): cùng request_id + cùng input → cùng binding / run, không gọi model lần hai; input khác → 409; đang chạy trong
// lease → 409; chết sau khi model trả (validating quá lease) → kiểm lại chữ đã lưu, KHÔNG gửi lại provider; chết trước khi có chữ → failed
// USAGE_UNKNOWN; quét khôi phục cùng luật; huỷ / vô hiệu thắng tiến trình kiểm cũ (CAS thế hệ, không ABA).
import { describe, expect, it } from 'vitest';
import { AppError } from '@appchat/shared';
import { proposeForRecord, recoverProposals } from '../src/ai/assistant/record-intent/recovery';
import { invalidateProposal, publishProposal, recordGeneration } from '../src/ai/assistant/record-intent/publication';
import { PROPOSAL_LEASE_MS } from '../src/ai/assistant/record-intent/admission';
import { P1, recordHarness } from './fixtures/record-ai-harness';

const RID = '0190f000-0000-7000-8000-0000000003f1';
const ok = JSON.stringify({ name: 'Combo', rationale: '', items: [{ product_id: P1, qty: 1 }], unresolved: [] });
const ri = (o: Record<string, unknown> = {}) => ({ entity: 'product' as const, entity_id: P1, intent: 'product_combo' as const, request_id: RID, ...o });
const later = (h: ReturnType<typeof recordHarness>, ms: number) => (h.now.t = new Date(h.now.t.getTime() + ms));

describe('gửi lại cùng request_id', () => {
  it('đã xong → cùng kết quả, không run / model mới; input khác → 409', async () => {
    const h = recordHarness({ results: [{ status: 'completed', text: ok }] });
    const t = h.turn();
    const a = await proposeForRecord(h.deps, t, ri());
    const b = await proposeForRecord(h.deps, h.turn(), ri());
    expect(b).toEqual(a);
    expect(h.calls).toBe(1);
    expect(h.runs).toHaveLength(1);
    await expect(proposeForRecord(h.deps, h.turn(), ri({ user_task: 'khác' }))).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('đang sinh trong lease → 409 in_progress; quá lease chưa có chữ → failed USAGE_UNKNOWN, không gọi lại provider', async () => {
    const h = recordHarness();
    h.deps.runner.start = (async () => {
      // Lượt thứ hai đến khi lượt đầu còn đang chờ model.
      const e = await proposeForRecord(h.deps, h.turn(), ri()).catch((x: AppError) => x);
      expect(e).toMatchObject({ httpStatus: 409, fields: { request_id: 'in_progress' } });
      throw Object.assign(new Error('crash'), { code: 'CRASH' });
    }) as never;
    await expect(proposeForRecord(h.deps, h.turn(), ri())).rejects.toThrow('crash');
    let calls = 0;
    h.deps.runner.start = (async () => (calls++, { status: 'completed', text: ok, creditsUsed: 1 })) as never;
    later(h, PROPOSAL_LEASE_MS + 1);
    const out = await proposeForRecord(h.deps, h.turn(), ri());
    expect(out).toMatchObject({ state: 'failed', reason: 'USAGE_UNKNOWN' });
    expect(calls).toBe(0);
  });

  it('chết sau khi model trả (validating quá lease) → gửi lại kiểm chữ đã lưu, công bố, không gọi model', async () => {
    const h = recordHarness();
    await h.db.recordProposal.create({ data: { id: 'b1', userId: h.turn().userId, requestId: RID, runId: 'r1', entity: 'product', entityId: P1, intent: 'product_combo', sourceVersion: null, schemaVersion: 1, inputDigest: '', leaseUntil: h.now.t } });
    // digest thật cho cùng input
    const { proposalDigest } = await import('../src/ai/assistant/record-intent/admission');
    h.rows[0]!.inputDigest = proposalDigest(ri());
    await recordGeneration(h.db as never, 'b1', ok, h.now.t);
    later(h, PROPOSAL_LEASE_MS + 1);
    const out = await proposeForRecord(h.deps, h.turn(), ri());
    expect(out.state).toBe('validated');
    expect(h.calls).toBe(0);
  });
});

describe('fence + quét khôi phục', () => {
  it('vô hiệu thắng tiến trình kiểm cũ (CAS thế hệ); quét: sinh dở → USAGE_UNKNOWN, kiểm dở quá hạn → abandoned', async () => {
    const h = recordHarness();
    const mk = async (id: string, req: string) => h.db.recordProposal.create({ data: { id, userId: 'u', requestId: req, runId: `run-${id}`, entity: 'product', entityId: P1, intent: 'product_combo', sourceVersion: null, schemaVersion: 1, inputDigest: 'd', leaseUntil: h.now.t } });
    await mk('a', 'r-a');
    const g = (await recordGeneration(h.db as never, 'a', ok, h.now.t))!;
    await invalidateProposal(h.db as never, 'a', 'cancelled');
    expect(await publishProposal(h.db as never, 'a', g, { combo: {} })).toBe(false);
    expect(h.rows[0]!.phase).toBe('invalidated');
    await mk('b', 'r-b');
    await mk('c', 'r-c');
    await recordGeneration(h.db as never, 'c', ok, h.now.t);
    later(h, 25 * 3600_000);
    const r = await recoverProposals(h.db as never, h.now.t, 24 * 3600_000);
    expect(r).toEqual({ unknown: 1, abandoned: 1 });
    expect(h.rows.find((x) => x.id === 'b')).toMatchObject({ phase: 'failed', safeReason: 'USAGE_UNKNOWN' });
    expect(h.rows.find((x) => x.id === 'c')).toMatchObject({ phase: 'invalidated', privateGeneration: null });
  });
});
