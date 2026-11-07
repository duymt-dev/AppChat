// Màu theo trạng thái / dữ liệu khách (prototype L8630). Màu avatar = hsl theo tên — giá trị động từ dữ liệu.
import { color } from '@appchat/ui';
import type { ContactRow } from './types';

export const STATUS_TONE: Record<ContactRow['status'], { fg: string; bg: string }> = {
  active: { fg: color.statusActive, bg: color.brandBg },
  potential: { fg: color.paidText, bg: color.statusPotentialBg },
  inactive: { fg: color.text3, bg: color.muteBg },
};

export const avatarBg = (hue: number) => `hsl(${hue} 55% 48%)`;
export const ownerBg = (c: Pick<ContactRow, 'owner_user_id' | 'owner_hue'>) =>
  c.owner_user_id === 'agent_cowork' ? undefined : `hsl(${c.owner_hue} 50% 48%)`;
