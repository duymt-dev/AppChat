// TIP-021b §2.3, §3.4, §3.6 (AC5–AC6): kết quả model là RIÊNG cho tới khi công bố (run không ghi output công khai, run-detail không trả
// result_text, sự kiện run chỉ là tín hiệu); công bố CAS theo pha + thế hệ (vô hiệu / huỷ thắng); bản soạn không ghi agent; gửi lại cùng
// request_id đọc lại chiếu theo quyền HIỆN TẠI; khôi phục quá lease không gọi model; Quên khách vô hiệu cả bản đã công bố.
import { describe, expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { draftHarness, modelDraft, RID } from './fixtures/agent-draft-harness';
import { invalidateDraft, publishDraft, recordGenerated, recoverDrafts } from '../src/ai/agents/drafting/publication';
import { assertSignalOnly } from '../src/ai/runs/run-events';
import { runDetail } from '../src/ai/runs/run-detail';
import { eraseAiArtifact } from '../src/ai/privacy/cleanup';
import { redactSensitiveQueryInput } from '../src/authz/fields/history-provenance';

const DESC = 'Agent CSKH ticket bảo hành qua Zalo';

describe('soạn agent — công bố có hàng rào', () => {
  it('spec run: protectedOutput + structured; bản soạn không tạo agent / version', async () => {
    const h = draftHarness({ results: [{ status: 'completed', text: modelDraft(['ticket.create']) }] });
    await h.draft(DESC, RID);
    expect(h.specs[0]!.protectedOutput).toBe(true);
    expect('aiAgent' in h.db).toBe(false);
    expect(h.rows[0]).toMatchObject({ phase: 'published', protectedResult: null });
  });

  it('CAS: thế hệ sai / đã vô hiệu → không công bố; vô hiệu xoá cả đề xuất đã công bố', async () => {
    const h = draftHarness({ results: [{ status: 'completed', text: modelDraft([]) }] });
    await h.draft(DESC, RID);
    const id = h.rows[0]!.id;
    expect(await publishDraft(h.db as never, id, 99, {})).toBe(false);
    await invalidateDraft(h.db as never, id, 'stale');
    expect(h.rows[0]).toMatchObject({ phase: 'invalidated', publishedResult: null, safeReason: 'stale' });
    await expect(h.draft(DESC, RID)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('gửi lại cùng request_id sau khi quyền action bị thu hồi → tool bị bỏ khi đọc lại (không trả quyền cũ)', async () => {
    const h = draftHarness({ results: [{ status: 'completed', text: modelDraft(['ticket.create']) }] });
    expect((await h.draft(DESC, RID)).draft.tools).toEqual(['ticket.create']);
    h.setAuthz({ ...authzForRole('owner', 'u1'), isOwner: false, permissions: new Set(['agents.manage']) });
    const again = await h.draft(DESC, RID);
    expect(again.draft.tools).toEqual([]);
    expect(again.generation_info.warnings).toContain('tools_revoked');
    expect(h.calls).toBe(1);
  });

  it('khôi phục: chưa có chữ quá lease → rejected USAGE_UNKNOWN; có chữ quá lease khi gửi lại → kiểm lại, không gọi model', async () => {
    const h = draftHarness({ results: [{ status: 'completed', text: modelDraft([]) }] });
    // Mô phỏng tiến trình chết sau khi model trả: binding còn awaiting_validation với chữ bền, lease đã hết.
    await h.db.agentDraftPublication.create({ data: { id: 'b1', runId: 'r1', actorId: 'user:u1', requestKeyHash: 'k1', inputDigest: 'd', schemaVersion: 1, candidateFingerprint: 'f', candidates: [], discovery: { strategy: 'keyword' }, leaseUntil: new Date('2026-11-11T00:00:00Z') } });
    await h.db.agentDraftPublication.create({ data: { id: 'b2', runId: 'r2', actorId: 'user:u1', requestKeyHash: 'k2', inputDigest: 'd', schemaVersion: 1, candidateFingerprint: 'f', candidates: [], discovery: {}, leaseUntil: new Date('2026-11-11T00:00:00Z') } });
    expect(await recordGenerated(h.db as never, 'b2', modelDraft([]), new Date('2026-11-10T00:00:00Z'))).toBe(1);
    h.rows.find((r) => r.id === 'b2')!.leaseUntil = new Date('2026-11-11T00:00:00Z');
    const r = await recoverDrafts(h.db as never, new Date('2026-11-11T03:00:00Z'), 86_400_000);
    expect(r).toEqual({ unknown: 1, abandoned: 0 });
    expect(h.rows.find((x) => x.id === 'b1')).toMatchObject({ phase: 'rejected', safeReason: 'USAGE_UNKNOWN' });
    expect(h.rows.find((x) => x.id === 'b2')).toMatchObject({ phase: 'awaiting_validation' });
    expect(h.calls).toBe(0);
  });

  it('Quên khách: erase binding → invalidated, xoá chữ thô + đề xuất; kind lạ → 501 (không no-op)', async () => {
    const h = draftHarness({ results: [{ status: 'completed', text: modelDraft([]) }] });
    await h.draft(DESC, RID);
    await eraseAiArtifact(h.db as never, { kind: 'agent_draft_publication', recordId: h.rows[0]!.id });
    expect(h.rows[0]).toMatchObject({ phase: 'invalidated', publishedResult: null, safeReason: 'privacy_erased' });
    await expect(eraseAiArtifact(h.db as never, { kind: 'ai_run', recordId: 'x' })).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' });
  });
});

describe('hàng rào đọc run chung', () => {
  const runRow = (output: unknown) => ({ id: 'r1', rootRunId: 'r1', parentRunId: null, depth: 0, kind: 'assistant', title: 'agent.draft_from_description', agentId: null, status: 'completed', stopReason: 'success', error: null, startedAt: new Date(), finishedAt: new Date(), creditsUsed: 1, subtreeCredits: 1, state: null, output, eventSeq: 2, initiatedByUserId: 'u1' });
  const dbOf = (output: unknown) =>
    ({
      aiRun: { findUnique: async () => runRow(output), findUniqueOrThrow: async () => runRow(output), count: async () => 0 },
      aiRunStep: { count: async () => 0 },
      aiAgent: { findMany: async () => [] },
      aiRootBudget: { findUnique: async () => null },
      aiUsageReceipt: { count: async () => 0 },
      $queryRaw: async () => [{ id: 'r1' }],
    }) as never;

  it('run kết quả riêng (`output.protected`) → result_text null dù completed', async () => {
    const d = await runDetail(dbOf({ protected: true, stop: 'stop' }), authzForRole('owner', 'u1'), 'r1');
    if (d) expect(d.result_text).toBeNull();
  });

  it('sự kiện run chỉ mang tín hiệu — khoá nội dung bị từ chối', () => {
    expect(() => assertSignalOnly({ runId: 'r', kind: 'status', status: 'completed' })).not.toThrow();
    expect(() => assertSignalOnly({ runId: 'r', kind: 'status', status: 'completed', output: 'x' } as never)).toThrow();
  });

  it('bước call_action agent.draft_from_description: mô tả bị che, request_id giữ', () => {
    const r = redactSensitiveQueryInput('call_action', { action_id: 'agent.draft_from_description', input: { description: 'Khách Nguyễn A 0901', request_id: RID } }) as { input: Record<string, string> };
    expect(r.input.description).not.toContain('0901');
    expect(r.input.request_id).toBe(RID);
  });
});
