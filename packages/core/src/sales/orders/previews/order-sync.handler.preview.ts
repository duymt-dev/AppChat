// Preview đồng bộ đơn ngay (TIP-023b R2.8): số kết nối sàn / POS đang kết nối sẽ được kéo + tên từng kết nối + lần đồng bộ trước. Chỉ đọc
// — không gọi sàn (số đơn thật chỉ biết sau khi kéo); chưa có kết nối → cảnh báo `no_connection` (chạy vẫn trả 0 đơn).
import type { ActionPreview } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview } from '../../../kernel/actions/preview-kit';

export async function syncPreview(tx: TenantTx): Promise<ActionPreview> {
  const conns = await tx.integrationConnection.findMany({ where: { port: 'order_sync', status: 'connected' }, select: { id: true, name: true, lastSyncAt: true }, orderBy: { name: 'asc' } });
  return preview('write', `${conns.length}`, {
    count: conns.length,
    changes: conns.map((c) => ({ entity: 'integration_connection', id: c.id, before: { last_sync_at: c.lastSyncAt?.toISOString() ?? null }, after: { name: c.name } })),
    ...(conns.length ? {} : { warnings: ['no_connection'] }),
  });
}
