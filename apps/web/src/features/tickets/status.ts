// Màu trạng thái / ưu tiên / SLA / kênh của Ticket — prototype TKST · TKPR · TKSL · TKCH L8686–8689 (kênh theo channel registry).
import { color } from '@appchat/ui';
import type { Channel, Priority, SlaState, TicketStatus } from './types';

export const STATUS_TONE: Record<TicketStatus, string> = {
  open: color.info,
  in_progress: color.amberGold,
  waiting: color.violet,
  closed: color.closedGreen,
};
export const PRIORITY_TONE: Record<Priority, string> = {
  high: color.dangerStrong,
  medium: color.amberGold,
  low: color.slateAvatar,
};
export const SLA_TONE: Record<SlaState, string> = {
  breach: color.dangerStrong,
  risk: color.amberGold,
  ok: color.okStrong,
};
/** Ô kênh: chữ + màu (Zalo cá nhân · Web chat · Email). */
export const CHANNEL_LOOK: Record<Channel, [glyph: string, tone: string]> = {
  zalo_personal: ['Z', color.zalo],
  webchat: ['⌘', color.webDark],
  email: ['@', color.emailGreen],
};

export const STATUSES: TicketStatus[] = ['open', 'in_progress', 'waiting', 'closed'];
export const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
export const SLA_STATES: SlaState[] = ['breach', 'risk', 'ok'];

/** Avatar người phụ trách (prototype avBg: hsl theo độ dài tên). */
export const avColor = (name: string) => `hsl(${(name.length * 34) % 360} 50% 48%)`;
