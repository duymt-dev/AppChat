// Gợi ý bước tiếp theo cho cột "AI gợi ý" của danh sách khách (TIP-015b mục 5, REQ-F01-c) — BỘ LUẬT xác định, không gọi model mỗi GET / dòng
// (`source: 'rule'` ghi rõ, không giả model). Ưu tiên: công nợ quá hạn → nhắc thu · lâu không tương tác (≥ 14 ngày) → chăm sóc lại · đang Báo
// giá → nhắc chốt · Lead / Tiềm năng → tư vấn · đã mua / thất bại → không cần (`kind: 'user'`). `wait` = có việc nên giao AI (nút ⚡). Công nợ
// chỉ vào luật khi người xem có quyền thấy (debtOf null → bỏ). Một truy vấn công nợ cho cả trang (không N+1).
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { debtOf } from './customer-debt';

export const IDLE_DAYS = 14;
const DAY = 86_400_000;

export type NextKey = 'collect' | 'reengage' | 'close_quote' | 'consult' | 'none';
export interface NextAction {
  key: NextKey;
  kind: 'wait' | 'user';
  source: 'rule';
  params: Record<string, string | number>;
}

export interface NextInput {
  id: string;
  stage: string;
  lastInteractionAt: Date;
}

/** Luật thuần (test được không DB). */
export function nextActionOf(c: NextInput, overdue: string | null, now: Date): NextAction {
  const idle = Math.floor((now.getTime() - c.lastInteractionAt.getTime()) / DAY);
  const r = (key: NextKey, params: Record<string, string | number> = {}): NextAction => ({ key, kind: key === 'none' ? 'user' : 'wait', source: 'rule', params });
  if (overdue && overdue !== '0') return r('collect', { amount: overdue });
  if (c.stage === 'won' || c.stage === 'lost') return r('none');
  if (idle >= IDLE_DAYS) return r('reengage', { days: idle });
  if (c.stage === 'quote') return r('close_quote');
  if (c.stage === 'lead' || c.stage === 'potential' || c.stage === 'consulting') return r('consult');
  return r('none');
}

/** Gợi ý cho một trang khách (công nợ gom một lần). */
export async function nextActions(tx: Pick<TenantTx, '$queryRaw'>, a: AuthzContext, rows: NextInput[], today: string, now: Date): Promise<Map<string, NextAction>> {
  const debt = await debtOf(tx, a, rows.map((r) => r.id), today);
  return new Map(rows.map((c) => [c.id, nextActionOf(c, debt ? (debt.get(c.id)?.overdue ?? '0') : null, now)]));
}
