// integration.disconnect (integrations.manage, delete) — ngắt kết nối: `disconnected`, xoá bí mật, route webhook ngừng nhận.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, integrationDisconnect } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { ConnectionsService } from '../services/connections.service';

type Input = ActionInput<typeof integrationDisconnect>;

@Injectable()
@ActionHandler('integration.disconnect')
export class IntegrationDisconnectHandler implements Handler<Input, { ok: boolean }> {
  constructor(@Inject(ConnectionsService) private readonly connections: ConnectionsService | null) {}

  async execute(ctx: ActionContext, input: Input, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    if (!this.connections) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'integrations chưa cấu hình (APP_ENC_KEY)');
    const row = await this.connections.disconnect(tx, ctx.workspaceId, input.provider);
    return {
      result: { ok: true },
      before: { connector_key: row.connectorKey, status: row.status },
      after: { connector_key: row.connectorKey, status: 'disconnected' },
      events: [{ topic: 'integration.disconnected', payload: { connection_id: row.id, connector_key: row.connectorKey } }],
    };
  }
}
