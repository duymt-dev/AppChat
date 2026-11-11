// Harness đơn vị cho đường ống soạn agent (TIP-021b): DB giả có `agent_draft_publication` (CAS theo phase / thế hệ như Prisma
// `updateMany`) + `ai_run` tối thiểu; runner giả đếm lời gọi + ghi spec; quyền người ra lệnh đổi được giữa chừng (thu hồi / ABA).
import { authzForRole, type AuthzContext } from '@appchat/shared';
import { TenantSql } from '@appchat/db';
import { AgentDraftingService } from '../../src/ai/agents/drafting/providers';
import type { ActionContext } from '../../src/kernel/actions/action-context';

type Row = Record<string, unknown> & { id: string; phase: string; validationGeneration: number; actorId: string; requestKeyHash: string };
export type RunOut = { status: string; text?: string; error?: { code: string; message: string } };

export function draftHarness(o: { results?: RunOut[]; runner?: boolean; implemented?: (id: string) => boolean; authz?: AuthzContext | null } = {}) {
  const rows: Row[] = [];
  const runs: Record<string, unknown>[] = [];
  const finished: { id: string; status: string; error?: string }[] = [];
  const specs: { system: string; messages: { content: string }[]; tools: unknown[]; responseSchema?: { schema: { properties: { tools: { items: { enum: string[] } } } } }; protectedOutput?: boolean }[] = [];
  const queue = [...(o.results ?? [])];
  let authz: AuthzContext | null = o.authz === undefined ? authzForRole('owner', 'u1') : o.authz;
  const hooks: { beforeStart?: () => void } = {};

  const match = (r: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => (v && typeof v === 'object' && 'in' in (v as object) ? ((v as { in: unknown[] }).in).includes(r[k]) : v && typeof v === 'object' && 'lt' in (v as object) ? (r[k] as Date) < (v as { lt: Date }).lt : r[k] === v));
  const apply = (r: Row, data: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(data)) r[k] = v && typeof v === 'object' && 'increment' in (v as object) ? (r[k] as number) + (v as { increment: number }).increment : v === TenantSql.DbNull ? null : v;
  };
  const db = {
    agentDraftPublication: {
      findUnique: async ({ where }: { where: { id?: string; actorId_requestKeyHash?: { actorId: string; requestKeyHash: string } } }) => {
        const k = where.actorId_requestKeyHash;
        const r = k ? rows.find((x) => x.actorId === k.actorId && x.requestKeyHash === k.requestKeyHash) : rows.find((x) => x.id === where.id);
        return r ? { ...r } : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const r = { protectedResult: null, publishedResult: null, safeReason: null, phase: 'awaiting_generation', validationGeneration: 0, updatedAt: new Date(), ...data } as unknown as Row;
        rows.push(r);
        return { ...r };
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const hit = rows.filter((r) => match(r, where));
        hit.forEach((r) => apply(r, data));
        return { count: hit.length };
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) => rows.filter((r) => match(r, where)).map((r) => ({ ...r })),
    },
    aiRun: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => (runs.push(data), { ...data, rootRunId: data.rootRunId ?? data.id, status: 'queued' }),
      updateMany: async ({ where, data }: { where: { id: string }; data: { status?: string; error?: string } }) => {
        if (data.status) finished.push({ id: where.id, status: data.status, ...(data.error ? { error: data.error } : {}) });
        return { count: 1 };
      },
    },
    actionDiscoveryGeneration: { findUnique: async () => null },
    $queryRaw: async () => [],
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  let calls = 0;
  const runner = {
    start: async (_ws: string, _s: unknown, _r: unknown, spec: (typeof specs)[number]) => {
      hooks.beforeStart?.();
      specs.push(spec);
      calls++;
      const r = queue.shift() ?? { status: 'completed', text: '{}' };
      return { creditsUsed: 1, text: '', ...r };
    },
  };
  const tenants = { get: async () => db };
  const clock = { now: () => new Date('2026-11-11T03:00:00Z') };
  const executor = { isImplemented: o.implemented ?? (() => true) };
  const svc = new AgentDraftingService(tenants as never, null, o.runner === false ? null : (runner as never), clock as never, executor as never, null, null, null);
  // Không AuthzResolver (đơn vị): service đọc ctx.authz — harness thay ctx.authz bằng getter để đổi quyền giữa chừng.
  const ctx = (): ActionContext => ({ workspaceId: 'w', source: 'ui', actor: { type: 'user', id: 'u1' }, get authz() { return authz as AuthzContext; } }) as unknown as ActionContext;
  return {
    svc, db, rows, runs, specs, finished, hooks, ctx,
    get calls() { return calls; },
    setAuthz: (a: AuthzContext | null) => (authz = a),
    draft: (description: string, request_id: string) => svc.draft(ctx(), { description, request_id }),
  };
}

export const RID = '5f0e7c1a-2b3d-4e5f-8a9b-0c1d2e3f4a5b';
export const RID2 = '6a1f8d2b-3c4e-4f60-9bac-1d2e3f4a5b6c';
export const modelDraft = (tools: string[], over: Record<string, unknown> = {}) =>
  JSON.stringify({ name: 'CSKH Spa', emoji: '🎧', role: 'cs', role_label: 'Chăm sóc', language: 'vi', prompt: 'Bạn là CSKH.', intents: [2], model_tier: 'standard', tools, channels: ['zalo_personal'], threshold: 75, ...over });
