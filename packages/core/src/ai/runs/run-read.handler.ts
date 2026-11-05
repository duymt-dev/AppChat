// run.search (TIP-023b R2 · DC-224): Trợ lý liệt kê run gần đây để báo tiến độ / huỷ. Cùng phạm vi với GET /runs (`runScope` — không có
// ai.governance thì chỉ run mình khởi tạo, DC-308). Không trả input / output / bước của run.
import { Injectable } from '@nestjs/common';
import type { ActionInput, runSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { runScope } from './runs.service';

const LIVE = ['queued', 'running'] as const;
type Out = { runs: { id: string; kind: string; title: string; status: string; credits: number; started_at: string }[] };

@Injectable()
@ActionHandler('run.search')
export class RunSearchHandler implements Handler<ActionInput<typeof runSearch>, Out> {
  async execute(ctx: ActionContext, i: ActionInput<typeof runSearch>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const scope = runScope(ctx.authz);
    const status =
      i.status === 'running' ? { in: [...LIVE] } : i.status === 'waiting_approval' ? { equals: 'waiting_approval' as const } : i.status === 'done' ? { notIn: [...LIVE, 'waiting_approval' as const] } : undefined;
    // Index (status, started_at DESC) của ai_run.
    const rows = await tx.aiRun.findMany({
      where: { ...(status ? { status } : {}), ...(scope.initiatedBy ? { initiatedByUserId: scope.initiatedBy } : {}) },
      orderBy: { startedAt: 'desc' },
      take: i.limit ?? 10,
      select: { id: true, kind: true, title: true, status: true, creditsUsed: true, startedAt: true },
    });
    return { result: { runs: rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, status: r.status, credits: r.creditsUsed, started_at: r.startedAt.toISOString() })) } };
  }
}
