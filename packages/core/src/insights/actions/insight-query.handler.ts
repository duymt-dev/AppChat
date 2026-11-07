// insight.query (Blueprint §3.4 insights, TIP-038 mục 1): risk read, không undo / outbox — gọi đúng registry mà GET /v1/insights/:metric dùng,
// với quyền của người gọi (Trợ lý / Cowork / agent: executor đã giao quyền agent ∩ người ra lệnh trong `ctx.authz`).
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, insightQuery } from '@appchat/actions';
import type { InsightResultDto } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler } from '../../kernel/actions/handler';
import { InsightsService } from '../metrics/registry';

@Injectable()
@ActionHandler('insight.query')
export class InsightQueryHandler implements Handler<ActionInput<typeof insightQuery>, InsightResultDto> {
  constructor(@Inject(InsightsService) private readonly insights: InsightsService) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof insightQuery>, tx: TenantTx) {
    return { result: await this.insights.query(tx, ctx.authz, ctx.workspaceId, input.metric, input.params ?? {}) };
  }
}
