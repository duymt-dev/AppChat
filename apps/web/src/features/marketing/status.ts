// Bảng màu / nhãn Marketing — prototype L8743–8744 (CHM, STM), mkChannelTabs L8768, nhóm khách wizard L9012.
import { color, type IconName } from '@appchat/ui';
import type { CampaignStatus, ChanTab, MkChannel } from './types';

export const STATUS_TABS: (CampaignStatus | 'all')[] = ['all', 'running', 'scheduled', 'completed', 'paused', 'cancelled'];
/** Thêm Chờ duyệt / Nháp / Từ chối vào tab vì campaign.approve luôn qua bước duyệt (Blueprint §2.2). */
export const EXTRA_TABS: CampaignStatus[] = ['pending_approval', 'draft', 'rejected'];

export const STATUS_TONE: Record<CampaignStatus, string> = {
  draft: color.text4,
  pending_approval: color.amberText,
  scheduled: color.info,
  running: color.closedGreen,
  paused: color.amberGold,
  completed: color.violet,
  rejected: color.dangerStrong,
  cancelled: color.mkCancelled,
};

/** [màu, ký hiệu] */
export const CHANNEL_LOOK: Record<MkChannel, [string, string]> = {
  zalo: [color.zalo, 'Z'],
  email: [color.amberGold, '@'],
};

export const CHAN_TABS: [ChanTab, string, IconName][] = [
  ['all', color.text, 'ic-grid'],
  ['email', color.amberGold, 'ic-mail'],
  ['zalo', color.zalo, 'ic-send'],
  ['auto', color.violet, 'ic-flow'],
];

export const GROUP_TONE: Record<string, string> = {
  vip: color.violet,
  returning: color.successStrong,
  cart: color.amberDeep,
  new: color.blue,
  cold: color.text4,
};

export const REC_TONE: Record<string, [string, string]> = {
  clicked: [color.brand, color.mkClickBg],
  opened: [color.info, color.sentBg],
  delivered: [color.slateAvatar, color.mutedBg],
  failed: [color.dangerStrong, color.hotLeadBg],
};

export const avColor = (name: string) => `hsl(${(name.length * 40) % 360} 55% 48%)`;
