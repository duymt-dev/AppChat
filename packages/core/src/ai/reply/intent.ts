// Ý định của lượt (TIP-022b C): bộ từ vựng đóng buy / question / complaint / booking / other. Output model chuẩn hoá qua bí danh; chữ tự do
// / lạ → other (không bao giờ hiển thị chữ thô). Lưu kèm tin nguồn / run / fence; CAS: run cũ không ghi đè lượt mới hơn. Nhãn chỉ để
// tham khảo — không phải quyền đổi báo giá / đơn / tiền.
import { foldText, type AgentIntent } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';

const ALIASES: Record<string, AgentIntent> = {
  buy: 'buy', purchase: 'buy', order: 'buy', price: 'buy', quote: 'buy', sales: 'buy', mua: 'buy', 'hoi gia': 'buy', 'bao gia': 'buy', 'dat hang': 'buy',
  question: 'question', faq: 'question', info: 'question', support: 'question', inquiry: 'question', 'hoi dap': 'question', 'tu van': 'question',
  complaint: 'complaint', complain: 'complaint', incident: 'complaint', refund: 'complaint', 'khieu nai': 'complaint', 'phan nan': 'complaint',
  booking: 'booking', appointment: 'booking', schedule: 'booking', reschedule: 'booking', 'dat lich': 'booking', 'lich hen': 'booking', 'doi lich': 'booking',
};

export function normalizeIntent(raw: unknown): AgentIntent {
  if (typeof raw !== 'string') return 'other';
  const k = foldText(raw).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return ALIASES[k] ?? 'other';
}

export interface IntentStamp {
  source_message_id: string | null;
  run_id: string;
  fence: number;
}

/**
 * Ghi ý định nếu không có lượt mới hơn: fence lượt ≥ fence đã ghi (cùng hội thoại). Một câu UPDATE có điều kiện — hai run cũ / mới chạy
 * song song thì chỉ run fence cao nhất thắng.
 */
export async function recordIntent(db: Pick<TenantDb, '$executeRaw'>, conversationId: string, intent: AgentIntent, s: IntentStamp): Promise<boolean> {
  const stamp = JSON.stringify(s);
  const n = await db.$executeRaw`
    UPDATE conversation SET intent = ${intent}, intent_source = ${stamp}::jsonb
    WHERE id = ${conversationId}::uuid AND COALESCE((intent_source->>'fence')::int, -1) <= ${s.fence}`;
  return n === 1;
}
