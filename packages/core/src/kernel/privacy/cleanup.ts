// Erase Kernel (TIP-015c §2.3 hàng 7) — legacy-scanner quét JSON theo contact, scrub content giữ action/entity/event/actor/time/outcome;
// cài ở pha sau (ingress/evidence).
// TIP-003b §6.1: event outbox v2 của stream khách → thay payload bằng tham chiếu tối thiểu (ws + occurred_at + id aggregate + cờ đã
// xoá); GIỮ id / topic / seq / biên nhận để chống trùng và giữ thứ tự (không xoá dòng → không lỗ seq). Dispatch chưa xong của event đó
// thành `blocked_unknown` (privacy_suppressed) — consumer không đọc lại được thân đã xoá, không bao giờ coi là hoàn tất giả.
import type { TenantTx } from '../actions/action-context';

export async function eraseOutboxEvent(tx: TenantTx, recordId: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE outbox_event SET payload = jsonb_build_object('ws', payload->'ws', 'occurred_at', payload->'occurred_at', 'privacy_erased', true,
           'aggregate_id', aggregate_id::text), last_error = NULL
     WHERE id = ${recordId}::uuid AND aggregate_seq IS NOT NULL`;
  await tx.$executeRaw`
    UPDATE event_dispatch SET phase = 'blocked_unknown', last_error_code = 'privacy_suppressed', dispatch_lease_until = NULL
     WHERE event_id = ${recordId}::uuid AND phase NOT IN ('completed')`;
  await eraseDeliveries(tx, recordId);
}

/**
 * TIP-006b §6.3: thông báo + ý định giao sinh từ event đã xoá — bỏ tiêu đề / liên kết / thân (đọc hiện chữ chung theo locale người xem),
 * GIỮ id tất định + dòng ý định làm khoá chống trùng (phát lại không tạo lại). Mail chưa gọi provider → `suppressed`; đang gọi
 * (`dispatching`) giữ nguyên — có thể đã tới provider, không thu hồi được (thành `unknown` khi hết hạn). Realtime chưa publish → thay gói
 * bằng tham chiếu tối thiểu + `failed` (client làm mới khi nối lại, đọc REST đã xoá).
 */
async function eraseDeliveries(tx: TenantTx, eventId: string): Promise<void> {
  await tx.$executeRaw`UPDATE notification SET title = '', link = NULL, body = NULL, source_entity_id = NULL WHERE source_event_id = ${eventId}::uuid`;
  await tx.$executeRaw`
    UPDATE notification_delivery SET phase = 'suppressed', safe_code = 'source_gone', updated_at = now()
     WHERE source_event_id = ${eventId}::uuid AND phase = 'pending'`;
  await tx.$executeRaw`
    UPDATE realtime_delivery SET phase = 'failed', envelope = jsonb_build_object('ws', envelope->'ws', 'privacy_erased', true)
     WHERE source_event_id = ${eventId}::uuid AND phase = 'pending'`;
}
