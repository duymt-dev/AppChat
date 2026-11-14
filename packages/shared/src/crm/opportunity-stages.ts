// Cơ hội / Sales Pipeline (COMMERCE §8 bản 2026-11-12, D60, DC-901 — TIP-026c): MỘT nguồn cho giai đoạn, xác suất cố định, màu, ánh xạ
// sang giai đoạn khách và lý do Thua — core (luật chuyển, dự báo), web (thanh giai đoạn, nhãn), mock FE và dataset 038b cùng dùng.
// Xác suất KHÔNG phải cột (không nhập tay); đổi xác suất = sửa bảng này một chỗ.
import type { ContactStage } from './labels';

export const OPPORTUNITY_STAGES = ['lead', 'qualified', 'demo', 'quote', 'negotiation', 'won', 'lost'] as const;
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

/** Sáu bước thanh giai đoạn (Thua hiển thị riêng). */
export const OPPORTUNITY_PIPELINE: readonly OpportunityStage[] = ['lead', 'qualified', 'demo', 'quote', 'negotiation', 'won'];
export const OPPORTUNITY_CLOSED: readonly OpportunityStage[] = ['won', 'lost'];

/** Xác suất theo giai đoạn (%), COMMERCE §8. */
export const OPPORTUNITY_PROBABILITY: Record<OpportunityStage, number> = { lead: 10, qualified: 25, demo: 50, quote: 70, negotiation: 85, won: 100, lost: 0 };

/** Màu giai đoạn — prototype `dealStages()` L9226 (giá trị thương hiệu giữ nguyên — prototype-parity §5). */
export const OPPORTUNITY_STAGE_COLOR: Record<OpportunityStage, string> = {
  lead: '#2B9EF3',
  qualified: '#F59E0B',
  demo: '#7C3AED',
  quote: '#EC4899',
  negotiation: '#0F6E50',
  won: '#22C55E',
  lost: '#9CA3AF',
};

/** Giai đoạn khách tương ứng (khoá enum khách giữ nguyên — `potential` = Đủ điều kiện, `consulting` = Tư vấn / Demo, `contract` = Đàm phán). */
export const OPPORTUNITY_TO_CONTACT_STAGE: Record<Exclude<OpportunityStage, 'lost'>, Exclude<ContactStage, 'lost'>> = {
  lead: 'lead',
  qualified: 'potential',
  demo: 'consulting',
  quote: 'quote',
  negotiation: 'contract',
  won: 'won',
};

export const OPPORTUNITY_LOST_REASONS = ['price', 'competitor', 'no_need', 'unreachable'] as const;
export type OpportunityLostReason = (typeof OPPORTUNITY_LOST_REASONS)[number];

export const OPPORTUNITY_SOURCES = ['manual', 'conversation', 'campaign', 'renewal', 'referral', 'call'] as const;
export type OpportunitySource = (typeof OPPORTUNITY_SOURCES)[number];

/** Sản phẩm của một cơ hội: tối đa 20 dòng. */
export const OPPORTUNITY_ITEMS_MAX = 20;

export const isOpportunityClosed = (s: OpportunityStage) => OPPORTUNITY_CLOSED.includes(s);
/** Hạng trong pipeline (Thua = -1, ngoài thứ tự tiến). */
export const opportunityRank = (s: OpportunityStage) => (s === 'lost' ? -1 : OPPORTUNITY_PIPELINE.indexOf(s));
/** Giai đoạn kế (nút "Chuyển giai đoạn"); Đàm phán → Đã mua cần chứng từ nên không tự đề xuất; đã đóng → null. */
export function nextOpportunityStage(s: OpportunityStage): OpportunityStage | null {
  if (isOpportunityClosed(s) || s === 'negotiation') return null;
  return OPPORTUNITY_PIPELINE[opportunityRank(s) + 1] ?? null;
}

/** Dự báo = giá trị × xác suất / 100, làm tròn half-up về đồng (money-time-numbering §1.2). Giá trị null / ẩn → null. */
export function forecastOf(amountVnd: string | bigint | null | undefined, stage: OpportunityStage): string | null {
  if (amountVnd === null || amountVnd === undefined || amountVnd === '') return null;
  const n = BigInt(amountVnd) * BigInt(OPPORTUNITY_PROBABILITY[stage]);
  return String((n + 50n) / 100n);
}

/** Giai đoạn khách của tập cơ hội MỞ (hạng cao nhất); không có cơ hội mở → null. */
export function contactStageOfOpen(stages: readonly OpportunityStage[]): Exclude<ContactStage, 'lost'> | null {
  let best = -1;
  for (const s of stages) if (!isOpportunityClosed(s)) best = Math.max(best, opportunityRank(s));
  return best < 0 ? null : OPPORTUNITY_TO_CONTACT_STAGE[OPPORTUNITY_PIPELINE[best] as Exclude<OpportunityStage, 'lost'>];
}
