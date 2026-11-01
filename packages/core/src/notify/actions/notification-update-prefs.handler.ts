// notification.update_prefs (db platform, permission self) — tuỳ chọn thông báo của CHÍNH người gọi (DC-028).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, isNotifyKind, type NotifyPrefsData } from '@appchat/shared';
import type { ActionInput, notificationUpdatePrefs } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { NotifyPrefsService } from '../services/prefs.service';

type Input = ActionInput<typeof notificationUpdatePrefs>;

@Injectable()
@ActionHandler('notification.update_prefs')
export class NotificationUpdatePrefsHandler implements Handler<Input, { ok: boolean }> {
  constructor(@Inject(NotifyPrefsService) private readonly prefs: NotifyPrefsService | null) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    if (!ptx || !this.prefs) throw new AppError('INTERNAL', 500, undefined, 'notification.update_prefs cần PlatformTx');
    const unknown = Object.keys(input.events ?? {}).find((k) => !isNotifyKind(k));
    if (unknown) throw new AppError('VALIDATION_FAILED', 400, { [`events.${unknown}`]: 'unknown_event' });
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    const { before, after } = await this.prefs.update(ptx, userId, input as Partial<NotifyPrefsData>);
    return { result: { ok: true }, before, after };
  }
}
