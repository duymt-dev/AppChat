// Kiểu web của Cơ hội / Sales Pipeline (TIP-026c) — DTO từ @appchat/shared; màu giai đoạn là dữ liệu (bảng hằng shared — prototype
// `dealStages()` L9226), nền chip = màu + alpha 0x1A như prototype.
import { color } from '@appchat/ui';
import { OPPORTUNITY_PIPELINE, OPPORTUNITY_STAGE_COLOR, type OpportunityStage } from '@appchat/shared';

export type { OpenOpportunitySummaryDto, OpportunityCardDto, OpportunityDetailDto, OpportunityItemDto, OpportunityStage } from '@appchat/shared';

/** 6 bước của thanh giai đoạn (Thua nằm ngoài thanh — prototype L2396). */
export const PIPELINE_STEPS: readonly OpportunityStage[] = OPPORTUNITY_PIPELINE;
export const stageColor = (s: OpportunityStage) => OPPORTUNITY_STAGE_COLOR[s];
export const stageTint = (s: OpportunityStage) => `${OPPORTUNITY_STAGE_COLOR[s]}1A`;
export type OppStatus = 'open' | 'won' | 'lost';
export const statusOf = (s: OpportunityStage): OppStatus => (s === 'won' || s === 'lost' ? s : 'open');
/** Chip trạng thái + chấm lịch sử — prototype `ppVals().B` L9620 (Đang mở / Đã mua / Thua). */
export const STATUS_TONE: Record<OppStatus, { color: string; background: string }> = {
  open: { color: color.paidText, background: color.oppOpenBg },
  won: { color: color.oppWonText, background: color.oppWonBg },
  lost: { color: color.oppLostText, background: color.hotLeadBg },
};
export const STATUS_DOT: Record<OppStatus, string> = { open: color.blueAvatar, won: color.successStrong, lost: color.text4 };
/** Nhãn trạng thái chứng từ: dùng lại khoá của module chứng từ (`quotes.status.*` …) — messages nạp toàn cục. */
export const DOC_STATUS_NS = { quote: 'quotes.status', contract: 'contracts.status', order: 'orders.status', invoice: 'invoices.status' } as const;

/** Giá trị nhập ở thêm nhanh tính bằng TRIỆU (prototype "Giá trị (tr)") → chuỗi VND nguyên; "2,5" → "2500000". Sai → undefined. */
export function millionsToVnd(raw: string): string | null | undefined {
  const v = raw.trim().replace(/tr$/i, '').trim().replace(',', '.');
  if (!v) return null;
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(v)) return undefined;
  const [i, f = ''] = v.split('.');
  return String(BigInt(i!) * 1_000_000n + BigInt((f + '000000').slice(0, 6)));
}
