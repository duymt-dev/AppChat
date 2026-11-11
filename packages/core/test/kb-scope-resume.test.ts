// TIP-020c (unit): chạy tiếp / khôi phục giữ binding gốc (§1.3, §3.6) — run agent thiếu binding → SCOPE_UNAVAILABLE (không tự điền /
// không chạy lại); nguồn đã dùng hết hiệu lực (xoá / chuyển / nạp lại / agent tạm dừng / người ra lệnh mất) → KNOWLEDGE_REVOKED trước lời
// gọi model kế; nguồn ghi kèm binding đã cho phép nó (con consult / delegate) và lan lên cha; runner dừng có lý do, không gọi provider.
import { describe, expect, it, vi } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { agentKnowledge, assistantKnowledge } from '../src/ai/kb/scope/context';
import { knowledgeCurrent, recordRefs, refsOf, staleRuns } from '../src/ai/kb/scope/provenance';
import { KNOWLEDGE_STOP, knowledgeStop, needsBinding, resumeGate } from '../src/ai/kb/scope/recovery';

/** Giá trị tham số của một lời gọi $queryRaw (template tag hoặc Prisma.sql) — gồm cả tham số lồng trong Sql con. */
const flat = (args: unknown[]): unknown[] =>
  args.flatMap((a) => (Array.isArray(a) ? ((a as unknown as { raw?: unknown }).raw ? [] : [a]) : a && typeof a === 'object' && Array.isArray((a as { values?: unknown }).values) ? flat((a as { values: unknown[] }).values) : [a]));

const AG = '0190f000-0000-7000-8000-0000000000a1';
const U = '0190f000-0000-7000-8000-0000000000b1';
const S1 = '0190f000-0000-7000-8000-0000000000d1';
const S2 = '0190f000-0000-7000-8000-0000000000d2';
const F1 = '0190f000-0000-7000-8000-0000000000f1';

type RunRow = { kind: string; agentId?: string | null; knowledge?: unknown; knowledgeRefs?: unknown; parentRunId?: string | null };

/** DB giả: run theo id; nguồn còn hợp lệ theo vị từ = `live` (id → ingest_seq hiện tại); agent theo `agent`. */
function fake(runs: Record<string, RunRow>, live: Record<string, number>, agent: { status?: string } = {}) {
  const updates: { id: string; data: Record<string, unknown> }[] = [];
  return {
    updates,
    aiRun: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (runs[where.id] ? { id: where.id, agentId: null, knowledge: null, knowledgeRefs: null, parentRunId: null, ...runs[where.id] } : null)),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push({ id: where.id, data });
        runs[where.id] = { ...runs[where.id]!, ...(data.knowledgeRefs ? { knowledgeRefs: data.knowledgeRefs } : {}) };
      }),
    },
    aiAgent: { findUnique: vi.fn(async () => ({ id: AG, status: agent.status ?? 'active', deletedAt: null, publishedVersion: 1 })) },
    aiAgentVersion: { findUnique: vi.fn(async () => ({ config: { kb_scope: { folder_ids: [F1], tags: [] } } })) },
    // Vị từ hiện hành (sourceSql) mô phỏng bằng tập `live`: trả nguồn được hỏi còn hợp lệ kèm thế hệ.
    $queryRaw: vi.fn(async (...args: unknown[]) => {
      const q = { values: flat(args) };
      const ids = (q.values.find((v) => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length === 36)) ?? []) as string[];
      return ids.filter((id) => id in live).map((id) => ({ id, seq: live[id] }));
    }),
  };
}

const channel = agentKnowledge({ agentId: AG, version: 1, cfg: { kb_scope: { folder_ids: [F1], tags: [] } } }, { channel: true });

describe('cổng chạy tiếp (AC4 / AC6)', () => {
  it('run agent thiếu binding (trước TIP) → SCOPE_UNAVAILABLE; Trợ lý cũ không nguồn → được', async () => {
    const db = fake({ old: { kind: 'agent_reply', agentId: AG }, chat: { kind: 'assistant' } }, {});
    expect(await resumeGate(db as never, 'old')).toBe(KNOWLEDGE_STOP.unavailable);
    expect(await resumeGate(db as never, 'chat')).toBeNull();
    expect(needsBinding({ kind: 'task', agentId: null })).toBe(true);
    expect(needsBinding({ kind: 'assistant', agentId: null })).toBe(false);
  });

  it('nguồn còn nguyên thế hệ → chạy tiếp; nạp lại (thế hệ đổi) / bị loại khỏi vị từ (chuyển / xoá / đổi quyền) → KNOWLEDGE_REVOKED', async () => {
    const refs = [{ s: S1, g: 1, b: 'r' }];
    expect(await resumeGate(fake({ r: { kind: 'agent_reply', agentId: AG, knowledge: channel, knowledgeRefs: refs } }, { [S1]: 1 }) as never, 'r')).toBeNull();
    expect(await resumeGate(fake({ r: { kind: 'agent_reply', agentId: AG, knowledge: channel, knowledgeRefs: refs } }, { [S1]: 2 }) as never, 'r')).toBe(KNOWLEDGE_STOP.revoked);
    expect(await resumeGate(fake({ r: { kind: 'agent_reply', agentId: AG, knowledge: channel, knowledgeRefs: refs } }, {}) as never, 'r')).toBe(KNOWLEDGE_STOP.revoked);
  });

  it('agent tạm dừng sau khi truy hồi → nội dung phụ thuộc hết hiệu lực', async () => {
    const db = fake({ r: { kind: 'agent_reply', agentId: AG, knowledge: channel, knowledgeRefs: [{ s: S1, g: 1, b: 'r' }] } }, { [S1]: 1 }, { status: 'paused' });
    expect(await knowledgeCurrent(db as never, 'r')).toBe(false);
  });

  it('người ra lệnh mất quyền / rời workspace (resolver trả null) → hết hiệu lực', async () => {
    const k = agentKnowledge({ agentId: AG, version: 1, cfg: { kb_scope: { folder_ids: [F1], tags: [] } } }, { commanderId: U });
    const db = fake({ d: { kind: 'delegate', agentId: AG, knowledge: k, knowledgeRefs: [{ s: S1, g: 1, b: 'd' }] } }, { [S1]: 1 });
    expect(await knowledgeCurrent(db as never, 'd', async () => authzForRole('owner', U))).toBe(true);
    expect(await knowledgeCurrent(db as never, 'd', async () => null)).toBe(false);
  });

  it('mã dừng runner: lỗi mang code engine hiểu (không gọi provider)', () => {
    expect((knowledgeStop(KNOWLEDGE_STOP.unavailable) as Error & { code: string }).code).toBe('SCOPE_UNAVAILABLE');
    expect((knowledgeStop(KNOWLEDGE_STOP.revoked) as Error).message).toBe('knowledge_revoked');
  });
});

describe('nguồn đã dùng (§3.4)', () => {
  it('ghi kèm binding, gộp theo (binding, nguồn), lan lên run cha (cha dùng kết quả của con)', async () => {
    const runs: Record<string, RunRow> = { child: { kind: 'consult', parentRunId: 'parent' }, parent: { kind: 'agent_reply', agentId: AG, knowledge: channel } };
    const db = fake(runs, {});
    await recordRefs(db as never, 'child', [{ s: S1, g: 1, b: 'child' }]);
    await recordRefs(db as never, 'child', [{ s: S1, g: 2, b: 'child' }, { s: S2, g: 1, b: 'child' }]);
    expect(refsOf(runs.child!.knowledgeRefs)).toEqual([{ s: S1, g: 2, b: 'child' }, { s: S2, g: 1, b: 'child' }]);
    expect(refsOf(runs.parent!.knowledgeRefs)).toEqual([{ s: S1, g: 2, b: 'child' }, { s: S2, g: 1, b: 'child' }]);
  });

  it('nguồn của con kiểm theo binding của con — con mất binding → cha cũng hết hiệu lực', async () => {
    const db = fake({ parent: { kind: 'assistant', knowledge: assistantKnowledge(U), knowledgeRefs: [{ s: S1, g: 1, b: 'gone' }] } }, { [S1]: 1 });
    expect(await knowledgeCurrent(db as never, 'parent')).toBe(false);
  });

  it('run không nguồn luôn dùng được; danh sách → chỉ run có nguồn hết hiệu lực', async () => {
    const db = fake({
      a: { kind: 'agent_reply', agentId: AG, knowledge: channel },
      b: { kind: 'agent_reply', agentId: AG, knowledge: channel, knowledgeRefs: [{ s: S1, g: 1, b: 'b' }] },
    }, {});
    db.$queryRaw.mockImplementationOnce(async () => [{ id: 'b', seq: undefined }]);
    expect(await knowledgeCurrent(db as never, 'a')).toBe(true);
    expect([...(await staleRuns(db as never, ['a', 'b', null]))]).toEqual(['b']);
  });
});
