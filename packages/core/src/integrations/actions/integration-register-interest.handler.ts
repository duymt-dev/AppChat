// integration.register_interest (integrations.manage, write, db platform) — thẻ "Sắp có" → `integration_interest` ở DB nền tảng
// (đội AppChat đếm nhu cầu trên mọi workspace — D28). Chỉ connector `coming_soon`; gọi lại không lỗi.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { connectorRegistry } from '@appchat/integrations';
import type { ActionInput, integrationRegisterInterest } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { interestPreview } from './previews/integration-register-interest.handler.preview';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { needPlatform } from '../../kernel/tenant/platform-read';

type Input = ActionInput<typeof integrationRegisterInterest>;

@Injectable()
@ActionHandler('integration.register_interest')
export class IntegrationRegisterInterestHandler implements Handler<Input, { ok: boolean }> {
  constructor(@Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'integration.register_interest cần PlatformTx');
    const e = connectorRegistry.get(input.provider);
    if (!e) throw new AppError('NOT_FOUND', 404, { provider: 'unknown' });
    if (e.manifest.status !== 'coming_soon') throw new AppError('VALIDATION_FAILED', 422, { provider: 'available' });
    const workspaceId = ctx.workspaceId;
    const key = { workspaceId_connectorKey: { workspaceId, connectorKey: input.provider } };
    const before = await ptx.integrationInterest.findUnique({ where: key });
    if (!before) await ptx.integrationInterest.create({ data: { workspaceId, connectorKey: input.provider, userId: ctx.onBehalfOfUserId ?? ctx.actor.id } });
    return { result: { ok: true }, before: before ? { connector_key: input.provider } : null, after: { connector_key: input.provider, interest: true } };
  }

  async preview(ctx: ActionContext, input: Input) {
    return interestPreview(needPlatform(this.platform, 'integration.register_interest'), ctx.workspaceId, input);
  }
}
