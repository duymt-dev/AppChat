// Hàng rào nguồn khách (TIP-022c §2.3): MỌI người ghi làm đổi tin khách có thể là nguồn của quyết định báo giá (xoá / hoàn xoá cục bộ, thu
// hồi cục bộ / sự kiện kênh / ACK lệnh thu hồi, xoá lịch sử) đi qua đây với CÙNG thứ tự khoá như cổng ý định khách: khách gốc (015f — khoá
// trước) → hội thoại → tin (id tăng dần) → biên nhận. Biên nhận `ai_sales_intent` còn `prepared` có tin trong tập nguồn bị vô hiệu NGAY
// trong cùng transaction — hoàn xoá / bỏ xoá lịch sử sau đó không hồi sinh căn cứ cũ (khách phải nói lại → tin nguồn mới). Không gọi model /
// mạng; không khoá khách sau hội thoại. Inbox không import AiModule — chỉ chạm bảng biên nhận theo khoá đã công bố.
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockRootOf } from '../../kernel/ownership/root-lock';

type Tx = Pick<TenantTx, '$queryRaw' | '$executeRaw'>;

/** Lý do vô hiệu ghi lên biên nhận (an toàn để hiện, không lộ nội dung tin). */
export type SourceFenceReason = 'source_deleted' | 'source_restored' | 'source_recalled' | 'history_cleared';

/**
 * Khoá theo thứ tự chuẩn rồi vô hiệu biên nhận còn `prepared` của hội thoại dựa trên `messageIds` (null = mọi tin — xoá lịch sử). Gọi TRƯỚC
 * khi ghi tin; trả số biên nhận vừa vô hiệu. Khách của hội thoại đổi trong lúc chờ khoá → 409 (người gọi thử lại).
 */
export async function fenceCustomerSource(tx: Tx, conversationId: string, messageIds: readonly string[] | null, reason: SourceFenceReason, now: Date): Promise<number> {
  await lockRootOf(tx, 'conversation', conversationId);
  await tx.$queryRaw`SELECT id FROM conversation WHERE id = ${conversationId}::uuid FOR UPDATE`;
  if (!messageIds) {
    return tx.$executeRaw`
      UPDATE ai_sales_intent SET state = 'invalidated', invalid_reason = ${reason}, updated_at = ${now}
       WHERE conversation_id = ${conversationId}::uuid AND state = 'prepared'`;
  }
  const ids = [...new Set(messageIds)].sort();
  if (!ids.length) return 0;
  await tx.$queryRaw`SELECT id FROM message WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
  return tx.$executeRaw`
    UPDATE ai_sales_intent SET state = 'invalidated', invalid_reason = ${reason}, updated_at = ${now}
     WHERE conversation_id = ${conversationId}::uuid AND state = 'prepared' AND source_ids && ${ids}::uuid[]`;
}

/**
 * Người ghi thu hồi DUY NHẤT (thu hồi cục bộ, sự kiện thu hồi của kênh, ACK lệnh thu hồi): khoá theo thứ tự chuẩn → `recalled_at` (một lần,
 * giữ mốc đầu) → căn cứ dựa trên tin này vô hiệu. Trả true khi lần này mới ghi thu hồi.
 */
export async function markRecalled(tx: Tx & Pick<TenantTx, 'message'>, messageId: string, now: Date): Promise<boolean> {
  const m = await tx.message.findUnique({ where: { id: messageId }, select: { conversationId: true } });
  if (!m) return false;
  await fenceCustomerSource(tx, m.conversationId, [messageId], 'source_recalled', now);
  const r = await tx.message.updateMany({ where: { id: messageId, recalledAt: null }, data: { recalledAt: now } });
  return r.count > 0;
}
