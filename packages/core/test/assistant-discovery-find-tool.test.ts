// TIP-023e §2.1, §4.2-4.3: find_actions thật đi qua discoverActions — không có runtime → keyword `no_model_route` (envelope cũ {actions}
// giữ nguyên + thêm `discovery`); câu hỏi rỗng → none, không embed; lỗi dừng cứng khi embed KHÔNG bị nuốt thành fallback; lỗi provider
// thường → provider_unavailable; câu hỏi được che PII trước khi gửi embed.
import { describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { mockEmbedSource } from '@appchat/ai';
import { normalizeQuery, runFindActions } from '../src/ai/assistant/discovery/find-tool';
import { assistantTools, type AssistantTurnCtx } from '../src/ai/assistant/meta-tools';
import type { AiRunner } from '../src/ai/runs/runner';

const t: AssistantTurnCtx = { ws: 'ws', runId: 'run-1', userId: 'u1', authz: authzForRole('owner', 'u1'), mode: 'cowork', locale: 'vi' };
const now = () => new Date('2026-11-10T00:00:00Z');
const all = () => true;
const READY = { id: 'gen-1', phase: 'ready', buildOperationId: 'op', ownerRootRunId: 'root', expectedCount: 1, completedCount: 1, failedReason: null };

function db(gen: unknown = READY, rows: unknown[] = []) {
  return {
    aiRun: { findUnique: vi.fn().mockResolvedValue({ id: 'run-1', rootRunId: 'run-1' }) },
    actionDiscoveryGeneration: { findUnique: vi.fn().mockResolvedValue(gen) },
    customFieldDef: { findMany: async () => [] },
    $queryRaw: vi.fn().mockResolvedValue(rows),
  } as unknown as TenantDb;
}

describe('runFindActions', () => {
  it('không runtime discovery → keyword, reason no_model_route', async () => {
    const r = await runFindActions({ db: db(), now }, t, { query: 'tạo khách hàng' }, all);
    expect(r.discovery).toMatchObject({ strategy: 'keyword', reason: 'no_model_route', cache_hit: false });
    expect(r.actions.length).toBeGreaterThan(0);
    expect(r.actions.length).toBeLessThanOrEqual(8);
  });

  it('câu hỏi rỗng / toàn khoảng trắng → none, không truy vấn generation', async () => {
    const d = db();
    const r = await runFindActions({ db: d, now, discovery: { models: mockEmbedSource(), meter: null } }, t, { query: '   ' }, all);
    expect(r).toEqual({ actions: [], discovery: { strategy: 'none', corpus_version: null, cache_hit: false } });
    expect(d.actionDiscoveryGeneration.findUnique).not.toHaveBeenCalled();
  });

  it('generation ready + embed được → hybrid', async () => {
    const r = await runFindActions({ db: db(READY, [{ action_id: 'contact.create', score: 0.9 }]), now, discovery: { models: mockEmbedSource(), meter: null } }, t, { query: 'thêm khách mới' }, all);
    expect(r.discovery.strategy).toBe('hybrid');
    expect(r.actions.map((a) => a.id)).toContain('contact.create');
  });

  /** Ứng viên embed: lần 1 (resolveEmbeddingSpace) trả ứng viên thật; lần sau (lúc embed) ném lỗi `err`. */
  const failingAfterResolve = (err: Error) => {
    const real = mockEmbedSource();
    let n = 0;
    return { candidates: async (...a: Parameters<typeof real.candidates>) => (n++ === 0 ? real.candidates(...a) : Promise.reject(err)) };
  };

  it('lỗi dừng cứng khi embed (CREDIT_EXHAUSTED) → ném, không fallback', async () => {
    const models = failingAfterResolve(Object.assign(new Error('hết ví'), { code: 'CREDIT_EXHAUSTED' }));
    await expect(runFindActions({ db: db(), now, discovery: { models, meter: null } }, t, { query: 'khách' }, all)).rejects.toMatchObject({ code: 'CREDIT_EXHAUSTED' });
  });

  it('lỗi provider thường → keyword, reason provider_unavailable', async () => {
    const r = await runFindActions({ db: db(), now, discovery: { models: failingAfterResolve(new Error('503')), meter: null } }, t, { query: 'khách' }, all);
    expect(r.discovery.reason).toBe('provider_unavailable');
  });

  it('chuẩn hoá Unicode + khoảng trắng', () => {
    expect(normalizeQuery('  tạo\n\t báo   giá ')).toBe('tạo báo giá');
  });
});

describe('meta-tool find_actions', () => {
  it('envelope giữ {actions} + thêm discovery (đọc ngược tương thích)', async () => {
    const executor = { isImplemented: () => true, execute: vi.fn() } as never;
    const tool = assistantTools({ db: db(), executor, runner: {} as AiRunner, now }, t).find((x) => x.name === 'find_actions')!;
    const out = (await tool.execute({ query: 'khách hàng' }, { stepIdx: 0, toolCallId: 'c' })) as { kind: string; output: { actions: unknown[]; discovery: { strategy: string } } };
    expect(out.kind).toBe('ok');
    expect(Array.isArray(out.output.actions)).toBe(true);
    expect(out.output.discovery.strategy).toBe('keyword');
  });
});
