// Chính sách đồng bộ của tài khoản kênh cho tin vào (TIP-014b D) — pipeline đọc TRƯỚC mọi ghi. `sync_messages = false`: tin không được lưu
// (không khách / hội thoại / AI), chỉ đếm chẩn đoán gộp trên `channel_account.health` (không nội dung, không người gửi); không phải ngắt kết
// nối — phiên và theo dõi trạng thái vẫn chạy; bật lại chỉ áp tin mới (lịch sử chỉ qua hành động lấy lịch sử, không phát lại tin đã bỏ).
import type { TenantTx } from '../../kernel/actions/action-context';

/** Tin bị chặn vì tắt `sync_messages`: chỉ đếm chẩn đoán gộp (không nội dung / người gửi). */
export async function suppressed(tx: TenantTx, accountId: string, now: Date): Promise<void> {
  await tx.$executeRaw`
    UPDATE channel_account SET health = jsonb_set(jsonb_set(health, '{suppressed}', to_jsonb(COALESCE((health->>'suppressed')::int, 0) + 1)), '{suppressed_at}', to_jsonb(${now.toISOString()}::text)),
      last_event_at = ${now}
    WHERE id = ${accountId}::uuid`;
}
