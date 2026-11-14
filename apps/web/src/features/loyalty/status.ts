// Màu hạng / trạng thái / rủi ro — prototype lyMembers L11689, lyChurn L11476, LADDER L11674.
import { color } from '@appchat/ui';
import type { TierKey } from './types';

export const TIERS: TierKey[] = ['member', 'silver', 'gold', 'diamond'];

export const TIER_TONE: Record<string, string> = {
  member: color.slateAvatar,
  silver: color.slateAvatar,
  gold: color.lyGold,
  diamond: color.violet,
};

export const STATUS_TONE: Record<string, string> = {
  active: color.successStrong,
  inactive: color.amberDeep,
  new: color.blue,
  churn_risk: color.hotText,
};

export const RISK_TONE: Record<string, string> = {
  high: color.hotText,
  medium: color.amberDeep,
  low: color.lyLowRisk,
};

export const avColor = (name: string) => `hsl(${(name.length * 40) % 360} 55% 48%)`;
export const initial = (name: string) => name.replace(/^(Chị|Anh) /, '').charAt(0);
