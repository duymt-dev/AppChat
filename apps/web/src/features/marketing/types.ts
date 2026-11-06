// Kiểu dữ liệu Marketing — khớp shape packages/shared/src/api/marketing.ts (TIP-037, Blueprint §2.2 campaign, §4.4 marketing).
// Mock và HTTP trả cùng DTO; chỉ số kênh không đo được (đọc / click) là null — UI hiện "không có dữ liệu", không phải 0.
import type { CampaignDetailDto, CampaignDto, CampaignStatusKey, CampaignSuggestionDto, MarketingCustomer, RecipientDto, SenderAccount } from '@appchat/shared';

export type CampaignStatus = CampaignStatusKey;
export type MkChannel = 'zalo' | 'email';
export type ChanTab = 'all' | MkChannel | 'auto';
export type SendMode = 'now' | 'schedule' | 'ai_time';

export type Campaign = CampaignDto;
export type CampaignDetail = CampaignDetailDto;
export type Recipient = RecipientDto;
export type Suggestion = CampaignSuggestionDto;
export type Customer = MarketingCustomer;

export interface MarketingMeta {
  now: string;
  /** [khoá KPI, giá trị, xu hướng] — giá trị '—' khi không đo được. */
  kpis: [string, string, string][];
  /** [khoá chỉ số, giá trị] theo kênh — nhãn là khoá (FE dịch). */
  hero: Record<'email' | 'zalo' | 'auto', [string, string][]>;
  ab_tests: [string, string, string, string, string][];
  /** [ISO giờ gửi, tên, kênh, số người nhận ước tính] */
  schedule: [string, string, MkChannel, string][];
  /** [tiêu đề, loại, lý do, id gợi ý] — gợi ý AI mới nhất. */
  ai: [string, string, string, string?][];
  /** [id, tên, số khách lần đếm gần nhất] */
  segments: [string, string, number][];
  customers: Customer[];
  accounts: SenderAccount[];
  /** Khoá nhóm tín hiệu CDP AI đọc (FE dịch). */
  signals: string[];
  pending: number;
}

export interface CampaignFilter {
  status: CampaignStatus | 'all';
  channel: ChanTab;
  q: string;
}
