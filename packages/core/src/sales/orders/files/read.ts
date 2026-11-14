// Cổng bản ghi ĐƠN cho tệp đính kèm (TIP-032d §1.2, §4.1): khoá khách gốc → đơn FOR UPDATE + scope sales GHI (người phụ trách vận hành —
// 032c); đọc theo scope sales ĐỌC. Tệp đính kèm là tài liệu bổ sung — đơn huỷ / hoàn tất vẫn gắn được (không đổi tiền / trạng thái).
import type { TenantTx } from '../../../kernel/actions/action-context';
import { lockContactRow } from '../../../kernel/ownership/root-lock';
import type { RecordPort } from '../../files/handlers-kit';
import { lockOrder, visibleOrder } from '../order-access';
import { orderAttachments } from './source';

async function lockWritable(tx: TenantTx, authz: Parameters<RecordPort['lockWritable']>[1], id: string) {
  const o = await visibleOrder(tx, authz, id);
  await lockContactRow(tx, o.contactId);
  const cur = await lockOrder(tx, authz, id);
  return { code: cur.code };
}

export const orderPort: RecordPort = {
  table: orderAttachments,
  sql: 'order_attachment',
  idField: 'order_id',
  lockWritable,
  readable: async (tx, authz, id) => ({ code: (await visibleOrder(tx, authz, id)).code }),
  writable: (tx, authz, id) => visibleOrder(tx, authz, id, 'write').then(() => authz.isOwner || authz.permissions.has('order.manage'), () => false),
};
