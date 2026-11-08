// Preview kết nối connector (TIP-023b R2.8, risk config): tên connector + cấu hình KHÔNG bí mật; đã có kết nối → kết nối lại (cảnh báo);
// connector "Sắp có" / thiếu trường bắt buộc → 422 như execute. Không gọi provider test, không hiện secret. Chỉ đọc.
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, integrationConnect } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, preview } from '../../../kernel/actions/preview-kit';
import { IN_USE, type ConnectionsService } from '../../services/connections.service';
import { defaultAdapter } from '../../services/adapter-selection';

export async function connectPreview(tx: TenantTx, connections: ConnectionsService | null, i: ActionInput<typeof integrationConnect>): Promise<ActionPreview> {
  if (!connections) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'integrations chưa cấu hình (APP_ENC_KEY)');
  const e = connections.entry(i.provider);
  const { config } = connections.split(e, i.fields);
  const existing = await tx.integrationConnection.findFirst({ where: { connectorKey: i.provider, ...IN_USE }, select: { id: true } });
  return preview('config', e.manifest.name, {
    changes: [created('integration_connection', { connector_key: i.provider, ...config }, existing?.id)],
    warnings: [...(defaultAdapter(e)?.test ? ['verify_connection'] : []), ...(existing ? ['reconnect'] : [])],
  });
}
