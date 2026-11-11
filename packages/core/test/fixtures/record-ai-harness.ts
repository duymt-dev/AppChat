// Harness đơn vị cho lối vào theo bản ghi (TIP-023g): DB giả có `record_proposal` (CAS theo phase / thế hệ như Prisma `updateMany`) +
// `ai_run` tối thiểu; executor giả với bảng bản ghi đọc được (theo vai trò) + đếm lời gọi ghi; runner giả đếm lời gọi + ghi spec.
import { AppError, authzForRole, type AuthzContext } from '@appchat/shared';
import { TenantSql } from '@appchat/db';
import type { AssistantTurnCtx } from '../../src/ai/assistant/types';
import type { ProposeDeps } from '../../src/ai/assistant/record-intent/proposal';

type Row = Record<string, unknown> & { id: string; phase: string; validationGeneration: number; userId: string; requestId: string };
export type RunOut = { status: string; text?: string; error?: { code: string; message: string } };

export const P1 = '0190f000-0000-7000-8000-0000000000a1';
export const P2 = '0190f000-0000-7000-8000-0000000000a2';
export const P3 = '0190f000-0000-7000-8000-0000000000a3';
export const Q1 = '0190f000-0000-7000-8000-0000000000b1';

export function recordHarness(o: { results?: RunOut[]; role?: string } = {}) {
  const rows: Row[] = [];
  const runs: Record<string, unknown>[] = [];
  const specs: { system: string; messages: { content: string }[]; tools: unknown[]; responseSchema?: { schema: Record<string, unknown> }; protectedOutput?: boolean; maxSteps?: number }[] = [];
  const executed: { id: string; input: unknown }[] = [];
  const queue = [...(o.results ?? [])];
  const now = { t: new Date('2026-11-11T03:00:00Z') };
  let authz: AuthzContext = authzForRole((o.role ?? 'owner') as never, 'u1');
  // Bản ghi đọc được: sản phẩm P1/P2/P3 + báo giá Q1. `hidden` mô phỏng mất quyền / xoá giữa chừng.
  const products: Record<string, { name: string; price: string; type: string; category: string; status: string }> = {
    [P1]: { name: 'Gội đầu dưỡng sinh', price: '200000', type: 'service', category: 'Spa', status: 'active' },
    [P2]: { name: 'Dầu gội thảo mộc', price: '150000', type: 'physical', category: 'Shop', status: 'active' },
    [P3]: { name: 'Massage cổ vai', price: '300000', type: 'service', category: 'Spa', status: 'active' },
  };
  const hidden = new Set<string>();

  const match = (r: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => (v && typeof v === 'object' && 'in' in (v as object) ? (v as { in: unknown[] }).in.includes(r[k]) : v && typeof v === 'object' && 'lt' in (v as object) ? (r[k] as Date) < (v as { lt: Date }).lt : r[k] === v));
  const apply = (r: Row, data: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(data)) r[k] = v && typeof v === 'object' && 'increment' in (v as object) ? (r[k] as number) + (v as { increment: number }).increment : v === TenantSql.DbNull ? null : v;
    r.updatedAt = now.t;
  };
  const db = {
    recordProposal: {
      findUnique: async ({ where }: { where: { id?: string; userId_requestId?: { userId: string; requestId: string } } }) => {
        const k = where.userId_requestId;
        const r = k ? rows.find((x) => x.userId === k.userId && x.requestId === k.requestId) : rows.find((x) => x.id === where.id);
        return r ? { ...r } : null;
      },
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => ({ ...rows.find((x) => x.id === where.id)! }),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (rows.some((x) => x.userId === data.userId && x.requestId === data.requestId)) throw Object.assign(new Error('dup'), { code: 'P2002' });
        const r = { privateGeneration: null, publishedResult: null, safeReason: null, phase: 'awaiting_generation', validationGeneration: 0, updatedAt: now.t, ...data } as unknown as Row;
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
      create: async ({ data }: { data: Record<string, unknown> }) => (runs.push(data), { ...data, rootRunId: data.rootRunId ?? data.id, status: 'queued' }),
    },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  const executor = {
    isImplemented: () => true,
    execute: async (_ctx: unknown, id: string, input: Record<string, string>) => {
      executed.push({ id, input });
      const can = (p: string) => authz.isOwner || authz.permissions.has(p as never);
      if (id === 'product.get') {
        if (!can('catalog.view')) throw new AppError('FORBIDDEN', 403, { permission: 'catalog.view' });
        const p = products[input.product_id!];
        if (!p || hidden.has(input.product_id!)) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
        return { status: 200, data: { result: { product_id: input.product_id, code: `SP-${input.product_id!.slice(-2)}`, ...p } } };
      }
      if (id === 'product.search') {
        if (!can('catalog.view')) throw new AppError('FORBIDDEN', 403, { permission: 'catalog.view' });
        return { status: 200, data: { result: { items: Object.entries(products).filter(([k]) => !hidden.has(k)).map(([k, p]) => ({ product_id: k, ...p })) } } };
      }
      if (id === 'quote.get') {
        if (!can('quote.view')) throw new AppError('FORBIDDEN', 403, { permission: 'quote.view' });
        if (input.quote_id !== Q1 || hidden.has(Q1)) throw new AppError('NOT_FOUND', 404, { quote_id: 'not_found' });
        return { status: 200, data: { result: { id: Q1, code: 'BG-0001', version: 3, title: 'Báo giá spa' } } };
      }
      throw new AppError('ACTION_NOT_FOUND', 404);
    },
  };
  let calls = 0;
  const runner = {
    start: async (_ws: string, _s: unknown, _r: unknown, spec: (typeof specs)[number]) => {
      specs.push(spec);
      calls++;
      const r = queue.shift() ?? { status: 'completed', text: '{}' };
      return { creditsUsed: 1, text: '', ...r };
    },
  };
  const deps: ProposeDeps = { db: db as never, executor: executor as never, runner: runner as never, now: () => now.t };
  let runSeq = 0;
  const turn = (): AssistantTurnCtx => ({ ws: 'w', runId: `0190f000-0000-7000-8000-${String(++runSeq).padStart(12, '0')}`, userId: '0190f000-0000-7000-8000-0000000000u1'.replace('u1', '0e'), get authz() { return authz; }, mode: 'chat', locale: 'vi' }) as AssistantTurnCtx;
  return {
    deps, db, rows, runs, specs, executed, hidden, products, now, turn,
    get calls() { return calls; },
    setRole: (role: string) => (authz = authzForRole(role as never, 'u1')),
    /** Thành viên không quyền đọc domain nào (mô phỏng vai trò bị thu hồi quyền). */
    revokeAll: () => (authz = { ...authzForRole('sales', 'u1'), isOwner: false, permissions: new Set() } as AuthzContext),
    writes: () => executed.filter((e) => !/\.(get|search)$/.test(e.id)),
  };
}
