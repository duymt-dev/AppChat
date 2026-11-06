// Bảng màu / nhãn Marketing — prototype L8743–8744 (CHM, STM), mkChannelTabs L8768, nhóm khách wizard L9012.
import { color, type IconName } from '@appchat/ui';
import type { CampaignStatus, ChanTab, MkChannel } from './types';

export const STATUS_TABS: (CampaignStatus | 'all')[] = ['all', 'running', 'scheduled', 'completed', 'paused', 'cancelled'];
/** Thêm Chờ duyệt / Đã duyệt / Nháp / Từ chối vào tab vì campaign.approve luôn qua bước duyệt (Blueprint §2.2). */
export const EXTRA_TABS: CampaignStatus[] = ['pending_approval', 'approved', 'draft', 'rejected'];

export const STATUS_TONE: Record<CampaignStatus, string> = {
  draft: color.text4,
  pending_approval: color.amberText,
  approved: color.okStrong,
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

/** Nhóm khách theo `contact.group` của CRM (vip / loyal / new / potential). */
export const GROUP_TONE: Record<string, string> = {
  vip: color.violet,
  loyal: color.successStrong,
  new: color.blue,
  potential: color.amberDeep,
};

/** Trạng thái người nhận theo bằng chứng kênh (không có "đã đọc / click" khi kênh không xác nhận — DC-240). */
export const REC_TONE: Record<string, [string, string]> = {
  converted: [color.brand, color.mkClickBg],
  replied: [color.info, color.sentBg],
  sent: [color.slateAvatar, color.mutedBg],
  pending: [color.text3, color.mutedBg],
  skipped: [color.amberText, color.alertBg],
  failed: [color.dangerStrong, color.hotLeadBg],
};

export const avColor = (name: string) => `hsl(${(name.length * 40) % 360} 55% 48%)`;
