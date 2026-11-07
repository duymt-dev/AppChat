// Preview ngắt connector (TIP-023b R2.8, risk delete): tên connector + trạng thái → disconnected, cảnh báo xoá bí mật + webhook ngừng nhận;
// chưa kết nối → 404 như execute. Chỉ đọc.
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, integrationDisconnect } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview } from '../../../kernel/actions/preview-kit';
import { IN_USE } from '../../services/connections.service';

export async function disconnectPreview(tx: TenantTx, i: ActionInput<typeof integrationDisconnect>): Promise<ActionPreview> {
  const row = await tx.integrationConnection.findFirst({ where: { connectorKey: i.provider, ...IN_USE }, select: { id: true, name: true, status: true } });
  if (!row) throw new AppError('NOT_FOUND', 404, { provider: 'not_connected' });
  return preview('delete', row.name, {
    changes: [{ entity: 'integration_connection', id: row.id, before: { connector_key: i.provider, status: row.status }, after: { status: 'disconnected' } }],
    warnings: ['secrets_erased', 'webhook_stopped'],
  });
}
