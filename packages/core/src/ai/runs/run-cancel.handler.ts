// `run.cancel` (Blueprint §4.5 `POST /v1/runs/:id/cancel`, §5.1 "run.cancel huỷ cả cây"): huỷ run + run con chưa kết thúc,
// SAU commit phát lệnh huỷ để runner đang chạy dừng ở bước kế tiếp. Run đã kết thúc → trả trạng thái hiện tại (idempotent).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AppError } from '@appchat/shared';
import type { ActionInput, runCancel } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { REDIS } from '../../kernel/redis';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { RunStore } from './run.store';
import { publishCancel } from './runs.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
@ActionHandler('run.cancel')
export class RunCancelHandler implements Handler<ActionInput<typeof runCancel>, { run_id: string; status: string }> {
  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof runCancel>, tx: TenantTx): Promise<HandlerOutcome<{ run_id: string; status: string }>> {
    const run = UUID.test(input.run_id) ? await tx.aiRun.findUnique({ where: { id: input.run_id }, select: { id: true, status: true } }) : null;
    if (!run) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
    const ids = await new RunStore(tx, () => this.clock.now()).cancelTree(run.id);
    const status = ids.includes(run.id) ? 'cancelled' : run.status;
    return {
      result: { run_id: run.id, status },
      before: { id: run.id, status: run.status },
      after: { id: run.id, status, cancelled: ids },
      events: ids.length ? [{ topic: 'run.cancelled', payload: { run_id: run.id, run_ids: ids } }] : [],
      ...(ids.length ? { afterCommit: () => publishCancel(this.redis, ids) } : {}),
    };
  }
}
