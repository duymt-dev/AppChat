// working_hours.update (db platform, settings.manage) — Cài đặt › SLA › Giờ làm việc: 7 ngày (0 = Thứ Hai) + tạm dừng đồng hồ SLA
// người ngoài giờ. Lưu `workspace.settings.working_hours` (Blueprint §2.2 workspace.settings "giờ mở cửa"; DC-049) — TIP-034 đọc.
import { Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, workingHoursUpdate } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { lockSettings, workingHoursOf } from '../settings/workspace-settings';

type Input = ActionInput<typeof workingHoursUpdate>;

@Injectable()
@ActionHandler('working_hours.update')
export class WorkingHoursUpdateHandler implements Handler<Input, { ok: boolean }> {
  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'working_hours.update cần PlatformTx');
    const days = [...input.days].sort((a, b) => a.day - b.day);
    if (new Set(days.map((d) => d.day)).size !== 7) throw new AppError('VALIDATION_FAILED', 422, { days: 'duplicate_day' });
    const bad = days.find((d) => d.on && d.from >= d.to);
    if (bad) throw new AppError('VALIDATION_FAILED', 422, { [`days.${bad.day}`]: 'from_after_to' });
    const settings = await lockSettings(ptx, ctx.workspaceId);
    const before = workingHoursOf(settings);
    const after = { days, pause_sla: input.pause_sla };
    await ptx.workspace.update({ where: { id: ctx.workspaceId }, data: { settings: { ...settings, working_hours: after } as object } });
    return { result: { ok: true }, before, after };
  }
}
