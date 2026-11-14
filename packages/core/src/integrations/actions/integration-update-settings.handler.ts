// integration.update_settings (TIP-031c, COMMERCE §4b L109): đổi bên giữ tồn chuẩn (`appchat` | `external`) cho kết nối `order_sync`.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionOutput, integrationUpdateSettings } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { ConnectionsService } from '../services/connections.service';
import { updateIntegrationSettingsPreview } from './previews/integration-update-settings.handler.preview';

type In = ActionInput<typeof integrationUpdateSettings>;
type Out = ActionOutput<typeof integrationUpdateSettings>;

@Injectable()
@ActionHandler('integration.update_settings')
export class IntegrationUpdateSettingsHandler implements Handler<In, Out> {
  constructor(@Inject(ConnectionsService) private readonly svc: ConnectionsService | null) {}

  async execute(_ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    if (!this.svc) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '031c' });
    const r = await this.svc.updateSettings(tx, input.provider, { stock_master: input.stock_master });
    return {
      result: { connection_id: r.connection_id, stock_master: r.stock_master },
      before: { stock_master: r.before },
      after: { stock_master: r.stock_master },
      noUndo: true,
    };
  }

  async preview(_ctx: ActionContext, input: In, tx: TenantTx) {
    return updateIntegrationSettingsPreview(tx, input);
  }
}
