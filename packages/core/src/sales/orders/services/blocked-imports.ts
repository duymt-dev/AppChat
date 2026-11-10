// Biên nhận đơn sàn bị chặn (TIP-015f §3.4–§3.6): đơn MỚI của người mua mà khách gốc đã xoá mềm / định danh không xác định → một dòng riêng
// tư mỗi (kết nối, mã ngoài) trong cùng transaction tenant, không tạo đơn / khách, không đếm đã nhập. Giao lại: mốc sàn mới hơn → thay
// payload chờ; cũ hơn → bỏ qua; bằng mốc mà khác hash → `conflict` (chờ bản làm mới đã kiểm, không đoán). Sau khôi phục, poll / sync_now
// thử lại các dòng `pending` với trạng thái kết nối / khách hiện tại — vẫn chỉ một đơn (unique đơn theo kết nối + mã ngoài).
import type { ExternalOrder } from '@appchat/integrations';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';

export type BlockReason = 'contact_deleted' | 'identity_unavailable';
export type BlockOutcome = 'recorded' | 'replaced' | 'unchanged' | 'conflict';

export interface BlockInput {
  connectionId: string;
  order: ExternalOrder;
  hash: string;
  providerUpdatedAt: Date;
  contactRef: string | null;
  reason: BlockReason;
  sourceEventId: string | null;
}

export async function recordBlocked(tx: TenantTx, b: BlockInput, now: Date): Promise<BlockOutcome> {
  const key = { connectionId_externalId: { connectionId: b.connectionId, externalId: b.order.external_id } };
  await tx.$executeRaw`INSERT INTO blocked_external_order (id, connection_id, external_id, payload, payload_hash, provider_updated_at, contact_ref, reason, source_event_id, received_at, updated_at)
    VALUES (${uuidv7(now.getTime())}::uuid, ${b.connectionId}::uuid, ${b.order.external_id}, ${JSON.stringify(b.order)}::jsonb, ${b.hash}, ${b.providerUpdatedAt}, ${b.contactRef}::uuid,
            ${b.reason}::blocked_order_reason, ${b.sourceEventId}::uuid, ${now}, ${now})
    ON CONFLICT (connection_id, external_id) DO NOTHING`;
  const cur = await tx.$queryRaw<{ id: string; payload_hash: string; provider_updated_at: Date; state: string; received_at: Date }[]>`
    SELECT id, payload_hash, provider_updated_at, state::text AS state, received_at FROM blocked_external_order
    WHERE connection_id = ${b.connectionId}::uuid AND external_id = ${b.order.external_id} FOR UPDATE`;
  const r = cur[0]!;
  if (r.received_at.getTime() === now.getTime() && r.payload_hash === b.hash) return 'recorded';
  if (r.state === 'imported') return 'unchanged';
  const at = r.provider_updated_at.getTime();
  const next = b.providerUpdatedAt.getTime();
  if (next < at || (next === at && r.payload_hash === b.hash)) {
    // Cùng bản / bản cũ: giữ payload; lý do / khách tham chiếu theo trạng thái hiện tại.
    await tx.blockedExternalOrder.update({ where: key, data: { reason: b.reason, contactRef: b.contactRef, updatedAt: now } });
    return 'unchanged';
  }
  if (next === at) {
    await tx.blockedExternalOrder.update({ where: key, data: { state: 'conflict', updatedAt: now } });
    return 'conflict';
  }
  await tx.blockedExternalOrder.update({
    where: key,
    data: { payload: b.order as unknown as object, payloadHash: b.hash, providerUpdatedAt: b.providerUpdatedAt, reason: b.reason, contactRef: b.contactRef, state: 'pending', sourceEventId: b.sourceEventId, updatedAt: now },
  });
  return 'replaced';
}

/** Đơn đã thực sự tạo (lần đầu / thử lại sau khôi phục) → biên nhận chặn của cùng mã ngoài thành `imported`. */
export async function settleBlocked(tx: TenantTx, connectionId: string, externalId: string, orderId: string, now: Date): Promise<void> {
  await tx.blockedExternalOrder.updateMany({ where: { connectionId, externalId, state: { in: ['pending', 'conflict'] } }, data: { state: 'imported', orderId, updatedAt: now } });
}

/** Id các biên nhận còn chờ của một kết nối (lô có giới hạn, theo index thử lại) — người gọi lấy payload từng dòng. */
export async function pendingBlocked(tx: Pick<TenantTx, 'blockedExternalOrder'>, connectionId: string, limit = 100): Promise<{ id: string; payload: ExternalOrder; providerUpdatedAt: Date; payloadHash: string; sourceEventId: string | null; contactRef: string | null }[]> {
  const ids = await tx.blockedExternalOrder.findMany({ where: { connectionId, state: 'pending' }, orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }], take: limit, select: { id: true } });
  if (!ids.length) return [];
  const rows = await tx.blockedExternalOrder.findMany({ where: { id: { in: ids.map((r) => r.id) } }, select: { id: true, payload: true, providerUpdatedAt: true, payloadHash: true, sourceEventId: true, contactRef: true, receivedAt: true } });
  return rows.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime() || a.id.localeCompare(b.id)).map((r) => ({ id: r.id, payload: r.payload as unknown as ExternalOrder, providerUpdatedAt: r.providerUpdatedAt, payloadHash: r.payloadHash, sourceEventId: r.sourceEventId, contactRef: r.contactRef }));
}
