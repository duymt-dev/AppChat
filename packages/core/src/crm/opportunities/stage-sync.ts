// Giai đoạn khách suy từ cơ hội (TIP-026c §3.2, COMMERCE §8, D60, DC-901). Đích = max(M, F):
//   M = ánh xạ khách của hạng cao nhất trong các cơ hội MỞ (chưa lưu trữ, không won / lost) của họ khách;
//   F = sàn từ chứng từ KHÔNG gắn cơ hội của họ: báo giá sent · viewed → quote; hợp đồng pending_signature · signed → contract.
// Cả hai rỗng: `allowLower` → lùi về consulting (luật lùi cũ), không thì no-op. Đích cao hơn → `applyStageRule` raise; thấp hơn và
// `allowLower` → fallback. Đã mua của khách chỉ do order.completed (M không tính cơ hội won); giữ tay 24 giờ / không hạ Đã mua / không đụng
// Thất bại khi lùi nằm sẵn trong applyStageRule — KHÔNG có đường UPDATE contact.stage thứ hai. Người gọi đã khoá họ khách (stageBinding).
import { contactStageOfOpen, type OpportunityStage } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { applyStageRule } from '../stage/rules';
import { stageBinding, type AutoStage } from '../stage/types';
import type { Actor } from './history';

const ORDER = ['lead', 'potential', 'consulting', 'quote', 'contract'] as const;
type Floor = (typeof ORDER)[number];
const rank = (s: Floor | null) => (s ? ORDER.indexOf(s) : -1);

export interface RecomputeOpts {
  /** Cho phép hạ khách: cơ hội lùi / Thua / lưu trữ, báo giá bị từ chối / hết hạn. Tạo / nâng cơ hội chỉ nâng khách. */
  allowLower: boolean;
  actor: Actor;
  now: Date;
}

/** M: giai đoạn khách của tập cơ hội mở trong họ (null = không có cơ hội mở). */
async function openStageOf(tx: TenantTx, ids: string[]): Promise<Floor | null> {
  const rows = await tx.$queryRaw<{ stage: OpportunityStage }[]>`
    SELECT DISTINCT stage::text AS stage FROM contact_opportunity
     WHERE contact_id = ANY(${ids}::uuid[]) AND archived_at IS NULL AND stage NOT IN ('won', 'lost')`;
  return contactStageOfOpen(rows.map((r) => r.stage)) as Floor | null;
}

/** F: sàn từ chứng từ không gắn cơ hội (hợp đồng đi qua báo giá nguồn — báo giá có cơ hội thì hợp đồng tính vào cơ hội). */
async function documentFloorOf(tx: TenantTx, ids: string[]): Promise<Floor | null> {
  const [r] = await tx.$queryRaw<{ contract: boolean; quote: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM contract k LEFT JOIN quote q ON q.id = k.quote_id
                    WHERE k.contact_id = ANY(${ids}::uuid[]) AND k.deleted_at IS NULL AND k.status IN ('pending_signature', 'signed')
                      AND q.opportunity_id IS NULL) AS contract,
           EXISTS (SELECT 1 FROM quote q
                    WHERE q.contact_id = ANY(${ids}::uuid[]) AND q.deleted_at IS NULL AND q.status IN ('sent', 'viewed')
                      AND q.opportunity_id IS NULL) AS quote`;
  return r?.contract ? 'contract' : r?.quote ? 'quote' : null;
}

/** Đích giai đoạn khách (thuần — để unit test): null = không đổi. `lowerOnly` = đích mặc định chỉ được dùng để lùi, không nâng. */
export function stageTarget(m: Floor | null, f: Floor | null, allowLower: boolean): { to: Floor; lowerOnly: boolean } | null {
  if (m || f) return { to: rank(m) >= rank(f) ? m! : f!, lowerOnly: false };
  return allowLower ? { to: 'consulting', lowerOnly: true } : null;
}

/** Tính lại giai đoạn khách sau mọi đổi giai đoạn cơ hội (tay / tự động) và khi báo giá kết thúc không thành. Trả event outbox. */
export async function recomputeContactStage(tx: TenantTx, contactId: string, o: RecomputeOpts): Promise<{ topic: string; payload: Record<string, unknown> }[]> {
  const { ids, rootId } = stageBinding(tx, contactId);
  if (!rootId) return [];
  const [m, f] = await Promise.all([openStageOf(tx, ids), documentFloorOf(tx, ids)]);
  const t = stageTarget(m, f, o.allowLower);
  if (!t) return [];
  const rule = { contactId, to: t.to as AutoStage, actor: o.actor, now: o.now };
  // Ví dụ D60: khách `lead` có cơ hội Thua → đích mặc định consulting nhưng chỉ dùng để lùi — khách giữ `lead`.
  const raised = t.lowerOnly ? [] : await applyStageRule(tx, { ...rule, mode: 'raise' });
  if (raised.length || !o.allowLower) return raised;
  return applyStageRule(tx, { ...rule, mode: 'fallback' });
}
