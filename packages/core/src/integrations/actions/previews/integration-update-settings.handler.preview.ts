import { AppError } from '@appchat/shared';
import { stockMasterOf } from '@appchat/integrations';
import type { ActionInput, integrationUpdateSettings } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { IN_USE } from '../../services/connections.service';

type In = ActionInput<typeof integrationUpdateSettings>;

export async function updateIntegrationSettingsPreview(tx: TenantTx, input: In) {
  const existing = await tx.integrationConnection.findFirst({
    where: { connectorKey: input.provider, ...IN_USE },
    select: { id: true, connectorKey: true, name: true, port: true, config: true },
  });
  if (!existing) throw new AppError('NOT_FOUND', 404, { provider: 'not_connected' });
  if (existing.port !== 'order_sync') throw new AppError('VALIDATION_FAILED', 422, { provider: 'not_order_sync' });
  const before = stockMasterOf((existing.config ?? {}) as Record<string, unknown>);
  return preview('config', line(existing.connectorKey, existing.name, input.stock_master), {
    changes: updated('integration_connection', existing.id, { stock_master: before }, { stock_master: input.stock_master }),
  });
}
