// profile.update (db platform, permission self) — đổi hồ sơ CHÍNH người gọi.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, profileUpdate } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { needPlatform } from './previews/platform-read';
import { profilePreview } from './previews/profile-update.handler.preview';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';

type Input = ActionInput<typeof profileUpdate>;

@Injectable()
@ActionHandler('profile.update')
export class ProfileUpdateHandler implements Handler<Input, { user_id: string }> {
  constructor(@Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ user_id: string }>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'profile.update cần PlatformTx');
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    const before = await ptx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, phone: true, locale: true } });
    const after = await ptx.user.update({
      where: { id: userId },
      data: { ...(input.name ? { name: input.name } : {}), ...(input.phone !== undefined ? { phone: input.phone } : {}), ...(input.locale ? { locale: input.locale } : {}) },
      select: { name: true, phone: true, locale: true },
    });
    return { result: { user_id: userId }, before, after };
  }

  async preview(ctx: ActionContext, input: Input) {
    return profilePreview(needPlatform(this.platform, 'profile.update'), ctx.onBehalfOfUserId ?? ctx.actor.id, input);
  }
}
