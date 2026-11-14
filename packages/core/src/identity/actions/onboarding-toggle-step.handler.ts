// onboarding.toggle_step (db platform, permission self) — checklist "Bắt đầu với AppChat" ở Tổng quan (prototype L1089–1129).
// Lưu theo workspace ở `workspace.settings.onboarding_steps` (DC-035); Dashboard đọc lại ở TIP-038.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, onboardingToggleStep } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { needPlatform } from './previews/platform-read';
import { togglePreview } from './previews/onboarding-toggle-step.handler.preview';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';

type Input = ActionInput<typeof onboardingToggleStep>;

@Injectable()
@ActionHandler('onboarding.toggle_step')
export class OnboardingToggleStepHandler implements Handler<Input, { done_count: number }> {
  constructor(@Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ done_count: number }>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'onboarding.toggle_step cần PlatformTx');
    // Khoá dòng workspace: hai lần bấm song song không ghi đè nhau (đọc-sửa-ghi trên jsonb).
    await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${ctx.workspaceId}::uuid FOR UPDATE`;
    const w = await ptx.workspace.findUniqueOrThrow({ where: { id: ctx.workspaceId }, select: { settings: true } });
    const settings = (w.settings ?? {}) as Record<string, unknown>;
    const before = { ...((settings.onboarding_steps ?? {}) as Record<string, boolean>) };
    const steps = { ...before, [input.step]: input.done };
    await ptx.workspace.update({ where: { id: ctx.workspaceId }, data: { settings: { ...settings, onboarding_steps: steps } } });
    return { result: { done_count: Object.values(steps).filter(Boolean).length }, before, after: steps };
  }

  async preview(ctx: ActionContext, input: Input) {
    return togglePreview(needPlatform(this.platform, 'onboarding.toggle_step'), ctx.workspaceId, input);
  }
}
