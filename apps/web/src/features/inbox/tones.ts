// Màu thẻ / timeline của hộp thư (prototype L1650–1734, L2026–2210) — chỉ trỏ token.
import { color } from '@appchat/ui';
import type { TagTone, TimelineItem } from './types';

export const TAG_TONE: Record<TagTone, { bg: string; fg: string }> = {
  vip: { bg: color.vipBg, fg: color.vipText },
  channel: { bg: color.chanBg, fg: color.chanText },
  hot: { bg: color.dangerBg, fg: color.hotText },
  group: { bg: color.groupBg, fg: color.groupText },
  warn: { bg: color.vipBg, fg: color.vipText },
  ai: { bg: color.brandBg, fg: color.brandInk },
  violet: { bg: color.violetBg, fg: color.violetInk },
};

export const TIMELINE_TONE: Record<TimelineItem['tone'], string> = {
  zalo: color.zalo,
  ok: color.brandInk,
  red: color.red,
  brand: color.brand,
  amber: color.amberGold,
  violet: color.violet,
  muted: color.text4,
};
