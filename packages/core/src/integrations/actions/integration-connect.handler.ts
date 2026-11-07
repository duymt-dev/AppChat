// integration.connect (integrations.manage, config) — kết nối connector theo trường của manifest (provider-ports §2–§4).
// Bí mật chỉ vào `secret_enc`; action_log input do executor che (`api_key`, `password`…); before / after không chứa bí mật.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, integrationConnect } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { connectPreview } from './previews/integration-connect.handler.preview';
import { ConnectionsService } from '../services/connections.service';

type Input = ActionInput<typeof integrationConnect>;
type Output = { connection_id: string; status: string };

@Injectable()
@ActionHandler('integration.connect')
export class IntegrationConnectHandler implements Handler<Input, Output> {
  constructor(@Inject(ConnectionsService) private readonly connections: ConnectionsService | null) {}

  async execute(ctx: ActionContext, input: Input, tx: TenantTx): Promise<HandlerOutcome<Output>> {
    if (!this.connections) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'integrations chưa cấu hình (APP_ENC_KEY)');
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    const { row, existed } = await this.connections.connect(tx, ctx.workspaceId, userId, input.provider, input.fields, input.mode);
    const view = { connector_key: row.connectorKey, status: row.status, mode: row.mode, config: row.config };
    return {
      result: { connection_id: row.id, status: 'connected' },
      before: existed ? { connector_key: row.connectorKey, reconnected: true } : null,
      after: view,
      events: [{ topic: 'integration.connected', payload: { connection_id: row.id, connector_key: row.connectorKey } }],
    };
  }

  async preview(_ctx: ActionContext, input: Input, tx: TenantTx) {
    return connectPreview(tx, this.connections, input);
  }
}
