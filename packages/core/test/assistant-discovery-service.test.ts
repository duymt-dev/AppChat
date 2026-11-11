// TIP-023e §2, §4.2: discoverActions — hợp nhất vector+từ khoá khi có generation ready khớp corpus+space hiện hành; honest keyword
// fallback khi thiếu route embed / chưa build / đang build / build lỗi / provider tạm không gọi được; luôn lọc quyền hiện hành.
import { describe, expect, it, vi } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { discoverActions, type DiscoveryDeps } from '../src/ai/assistant/discovery/service';
import type { EmbeddingSpace } from '../src/ai/assistant/discovery/types';

const owner = authzForRole('owner', 'u1');
const implementedAll = () => true;
const SPACE: EmbeddingSpace = { provider: 'mock', model: 'embed-1', dimension: 1536, configRevision: 'rev-1' };

function baseInput(query = 'khach hang') {
  return { authz: owner, mode: 'cowork' as const, query, limit: 8, implemented: implementedAll };
}

/** DB giả chỉ cần `actionDiscoveryGeneration.findUnique` + `$queryRaw` (pattern dùng chung với assistant-discovery-generation.test.ts) —
 *  cast cho khớp `DiscoveryDeps['db']` (Prisma Client thật có hàng chục method khác mà service này không gọi tới). */
const asDb = (db: unknown) => db as DiscoveryDeps['db'];

describe('discoverActions (TIP-023e §2, §4.2)', () => {
  it('thiếu ModelSource (space null) → keyword fallback, reason no_model_route', async () => {
    const db = asDb({ actionDiscoveryGeneration: { findUnique: vi.fn() }, $queryRaw: vi.fn() });
    const deps: DiscoveryDeps = { db, space: null, queryVector: null };
    const out = await discoverActions(deps, baseInput());
    expect(out.discovery.strategy).toBe('keyword');
    expect(out.discovery.reason).toBe('no_model_route');
    expect(out.actions.length).toBeGreaterThan(0);
    expect(db.actionDiscoveryGeneration.findUnique).not.toHaveBeenCalled();
  });

  it('chưa từng build generation cho corpus+space hiện hành → keyword fallback, reason corpus_not_ready', async () => {
    const db = asDb({ actionDiscoveryGeneration: { findUnique: vi.fn().mockResolvedValue(null) }, $queryRaw: vi.fn() });
    const deps: DiscoveryDeps = { db, space: SPACE, queryVector: vi.fn() };
    const out = await discoverActions(deps, baseInput());
    expect(out.discovery.strategy).toBe('keyword');
    expect(out.discovery.reason).toBe('corpus_not_ready');
    expect(deps.queryVector).not.toHaveBeenCalled();
  });

  it('generation đang building → keyword fallback, reason corpus_building, không gọi vector', async () => {
    const db = asDb({ actionDiscoveryGeneration: { findUnique: vi.fn().mockResolvedValue({ id: 'gen-1', phase: 'building', buildOperationId: 'op', ownerRootRunId: 'root', expectedCount: 10, completedCount: 1, failedReason: null }) }, $queryRaw: vi.fn() });
    const deps: DiscoveryDeps = { db, space: SPACE, queryVector: vi.fn() };
    const out = await discoverActions(deps, baseInput());
    expect(out.discovery.reason).toBe('corpus_building');
    expect(deps.queryVector).not.toHaveBeenCalled();
  });

  it('generation đã failed → keyword fallback, reason corpus_failed', async () => {
    const db = asDb({ actionDiscoveryGeneration: { findUnique: vi.fn().mockResolvedValue({ id: 'gen-1', phase: 'failed', buildOperationId: 'op', ownerRootRunId: 'root', expectedCount: 10, completedCount: 3, failedReason: 'no_model_route' }) }, $queryRaw: vi.fn() });
    const deps: DiscoveryDeps = { db, space: SPACE, queryVector: vi.fn() };
    const out = await discoverActions(deps, baseInput());
    expect(out.discovery.reason).toBe('corpus_failed');
  });

  it('generation ready nhưng embed câu hỏi lỗi (queryVector trả null) → keyword fallback, reason provider_unavailable', async () => {
    const db = asDb({ actionDiscoveryGeneration: { findUnique: vi.fn().mockResolvedValue({ id: 'gen-1', phase: 'ready', buildOperationId: 'op', ownerRootRunId: 'root', expectedCount: 10, completedCount: 10, failedReason: null }) }, $queryRaw: vi.fn() });
    const deps: DiscoveryDeps = { db, space: SPACE, queryVector: vi.fn().mockResolvedValue(null) };
    const out = await discoverActions(deps, baseInput());
    expect(out.discovery.reason).toBe('provider_unavailable');
  });

  it('generation ready + vector OK → strategy hybrid, hợp nhất với từ khoá, lọc quyền hiện hành', async () => {
    const db = asDb({
      actionDiscoveryGeneration: { findUnique: vi.fn().mockResolvedValue({ id: 'gen-1', phase: 'ready', buildOperationId: 'op', ownerRootRunId: 'root', expectedCount: 10, completedCount: 10, failedReason: null }) },
      $queryRaw: vi.fn().mockResolvedValue([{ action_id: 'contact.create', score: 0.9 }, { action_id: 'contact.search', score: 0.8 }]),
    });
    const deps: DiscoveryDeps = { db, space: SPACE, queryVector: vi.fn().mockResolvedValue([1, 0, 0]) };
    const out = await discoverActions(deps, baseInput('khach hang'));
    expect(out.discovery.strategy).toBe('hybrid');
    expect(out.discovery.corpus_version).toBeTruthy();
    expect(out.actions.some((a) => a.id === 'contact.create' || a.id === 'contact.search')).toBe(true);
  });

  it('không action nào khớp cả hai nhánh và không có quyền → strategy none', async () => {
    const stranger = authzForRole('cs', 'u3');
    const db = asDb({ actionDiscoveryGeneration: { findUnique: vi.fn().mockResolvedValue(null) }, $queryRaw: vi.fn() });
    const deps: DiscoveryDeps = { db, space: SPACE, queryVector: vi.fn() };
    const out = await discoverActions(deps, { ...baseInput('xyz khong ton tai gi ca'), authz: stranger });
    expect(out.discovery.strategy).toBe('none');
    expect(out.actions).toEqual([]);
  });
});
