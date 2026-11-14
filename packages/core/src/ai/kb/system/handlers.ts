// Handler action riêng `kb.system_publish` (TIP-003c §2, §4.6): chỉ tới đây sau cổng capability + biên nhận trigger. Lần nạp lấy từ
// capability đã niêm phong; ứng viên (đoạn / vector / lỗi) lấy từ tiến trình nạp, không từ input.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, SystemOutput, kbSystemPublish } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { systemCapabilityOf } from '../../../kernel/actions/system';
import { CLOCK, type Clock } from '../../../kernel/clock';
import { takeCandidate } from './candidates';
import { publishSource } from './effects';
import type { KbPublishOp } from './sources';

@Injectable()
@ActionHandler('kb.system_publish')
export class KbSystemPublishHandler implements Handler<ActionInput<typeof kbSystemPublish>, SystemOutput> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof kbSystemPublish>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    const cap = systemCapabilityOf(ctx);
    if (!cap || cap.targetId !== i.entity_id) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
    const e = await publishSource(tx, i.entity_id, i.operation as KbPublishOp, Number(cap.generation), takeCandidate(ctx.workspaceId, i.entity_id, cap.generation), this.clock.now());
    return { result: e.out, events: e.events, noUndo: true };
  }
}
