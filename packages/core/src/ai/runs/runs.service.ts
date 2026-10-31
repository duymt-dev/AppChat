// Đọc run (REQ-E14 "Trợ lý AI đang điều phối" — FE `features/assistant/types.ts` Run, schema `runRowSchema`) + huỷ cây run.
// `GET /v1/runs?root_run_id=&status=`: run con (delegate) của một run gốc, hoặc mọi run đang sống; `pct` = bước đã chạy / maxSteps.
// Lệnh huỷ phát qua Redis pub/sub `appchat:ai:cancel` → AiRunner ở mọi process dừng run đó ở bước kế tiếp.
import type { Redis } from 'ioredis';
import type { TenantDb } from '@appchat/db';
import type { z } from 'zod';
import type { runRowSchema } from '@appchat/shared';
import { MAX_STEPS } from './runner';

export const AI_CANCEL_CHANNEL = 'appchat:ai:cancel';
export type RunRowDto = z.infer<typeof runRowSchema>;

const LIVE = ['queued', 'running', 'waiting_approval'] as const;

export interface RunFilter {
  rootRunId?: string;
  status?: 'live' | 'running' | 'waiting_approval' | 'done';
  limit?: number;
}

const statusOf = (s: string): RunRowDto['status'] => (s === 'waiting_approval' ? 'waiting_approval' : s === 'queued' || s === 'running' ? 'running' : 'done');

export async function listRuns(db: Pick<TenantDb, 'aiRun' | 'aiRunStep'>, f: RunFilter): Promise<RunRowDto[]> {
  const status =
    f.status === 'done' ? { notIn: [...LIVE] } : f.status === 'running' ? { in: ['queued' as const, 'running' as const] } : f.status === 'waiting_approval' ? { equals: 'waiting_approval' as const } : f.status === 'live' ? { in: [...LIVE] } : undefined;
  // Theo gốc: chỉ run con (run gốc là chính cuộc trò chuyện của Trợ lý) — index (root_run_id, started_at).
  const rows = await db.aiRun.findMany({
    where: { ...(f.rootRunId ? { rootRunId: f.rootRunId, parentRunId: { not: null } } : {}), ...(status ? { status } : {}) },
    orderBy: { startedAt: f.rootRunId ? 'asc' : 'desc' },
    take: Math.min(f.limit ?? 50, 100),
    select: { id: true, rootRunId: true, kind: true, title: true, agentId: true, status: true, state: true, creditsUsed: true },
  });
  if (!rows.length) return [];
  const steps = await db.aiRunStep.groupBy({ by: ['runId'], where: { runId: { in: rows.map((r) => r.id) }, type: 'llm' }, _count: { _all: true } });
  const n = new Map(steps.map((s) => [s.runId, s._count._all]));
  return rows.map((r) => {
    const max = r.kind === 'assistant' ? MAX_STEPS.assistant : MAX_STEPS.agent;
    const st = statusOf(r.status);
    const pending = (r.state as { approval_id?: string } | null)?.approval_id;
    return {
      id: r.id,
      root_run_id: r.rootRunId,
      task: r.title,
      agent: r.agentId ?? '',
      meta: `${n.get(r.id) ?? 0} bước · ${r.creditsUsed} credit`,
      pct: st === 'done' ? 100 : Math.min(95, Math.round(((n.get(r.id) ?? 0) / max) * 100)),
      status: st,
      ...(pending ? { approval_id: pending } : {}),
    };
  });
}

export async function publishCancel(redis: Pick<Redis, 'publish'> | null | undefined, runIds: string[]): Promise<void> {
  if (redis && runIds.length) await redis.publish(AI_CANCEL_CHANNEL, JSON.stringify({ run_ids: runIds }));
}
