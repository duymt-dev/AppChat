// Preview đồng bộ ngay (TIP-012b P3, risk write): tên kết nối + lượt kéo chỉ đọc sẽ xếp hàng (hoặc gộp vào lượt đang chờ); không kéo được
// → cảnh báo unsupported. Không gọi provider, không ghi. Kết nối lạ → 404 như execute.
import { AppError } from '@appchat/shared';
import { connectorRegistry } from '@appchat/integrations';
import type { ActionInput, ActionPreview, integrationSyncNow } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview } from '../../../kernel/actions/preview-kit';
import { capabilitiesOf } from '../../services/connection-health';
import { BANK_PULL_OP } from '../../operations/bank-pull';

export async function syncNowPreview(tx: TenantTx, i: ActionInput<typeof integrationSyncNow>): Promise<ActionPreview> {
  const row = await tx.integrationConnection.findUnique({ where: { id: i.connection_id }, select: { id: true, name: true, status: true, connectorKey: true, mode: true } });
  if (!row || row.status === 'disconnected') throw new AppError('NOT_FOUND', 404, { connection: 'not_found' });
  const pull = capabilitiesOf(connectorRegistry.get(row.connectorKey), row.mode).pull;
  const pending = pull ? await tx.integrationCallLog.count({ where: { connectionId: row.id, op: BANK_PULL_OP, nextAttemptAt: { not: null } } }) : 0;
  return preview('write', row.name, {
    changes: [{ entity: 'integration_call', id: row.id, after: { op: BANK_PULL_OP, read_only: true } }],
    warnings: [...(pull ? [] : ['unsupported']), ...(pending ? ['coalesced'] : [])],
  });
}
