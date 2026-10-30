// Kênh chưa có adapter — hiện thẻ "Sắp có", không cho kết nối (D04, D28; danh sách theo prototype Cài đặt → Kênh).
import type { ChannelManifest, ConnectKind } from './types';

type Soon = [type: string, icon: string, group: ChannelManifest['group'], connect: ConnectKind, display: ChannelManifest['display']];

const d = (name: string, short: string, color: string, group: 'msg' | 'web' | 'shop', label: '' | 'pop' | 'beta', sort: number) => ({ name, short, color, group, label, sort });

const SOON: Soon[] = [
  ['zalo_oa', 'zalo', 'chat', 'oauth', d('Zalo OA', 'Z', '#0068FF', 'msg', 'pop', 1)],
  ['facebook', 'facebook', 'social', 'oauth', d('Facebook Page', 'f', '#1877F2', 'msg', 'pop', 3)],
  ['messenger', 'messenger', 'social', 'oauth', d('Messenger', 'f', '#1877F2', 'msg', 'pop', 4)],
  ['instagram', 'instagram', 'social', 'oauth', d('Instagram', '◎', '#E1306C', 'msg', 'pop', 5)],
  ['whatsapp', 'whatsapp', 'chat', 'qr', d('WhatsApp', 'W', '#25D366', 'msg', 'pop', 6)],
  ['whatsapp_business', 'whatsapp', 'chat', 'oauth', d('WhatsApp Business (API)', 'W', '#25D366', 'msg', 'pop', 7)],
  ['telegram', 'telegram', 'chat', 'credentials', d('Telegram', '✈', '#229ED9', 'msg', '', 8)],
  ['tiktok_messaging', 'tiktok', 'social', 'oauth', d('TikTok Messaging', '♪', '#111111', 'msg', 'beta', 9)],
  ['viber', 'viber', 'chat', 'credentials', d('Viber', 'V', '#7360F2', 'msg', '', 10)],
  ['line', 'line', 'chat', 'credentials', d('LINE', 'L', '#06C755', 'msg', '', 11)],
  ['wechat', 'wechat', 'chat', 'oauth', d('WeChat', '微', '#07C160', 'msg', '', 12)],
  ['tiktok_shop', 'tiktok', 'commerce', 'oauth', d('TikTok Shop', '♪', '#111111', 'shop', '', 14)],
  ['shopee', 'shopee', 'commerce', 'oauth', d('Shopee', 'S', '#EE4D2D', 'shop', '', 15)],
];

export const comingSoonChannels: ChannelManifest[] = SOON.map(([type, icon, group, kind, display]) => ({
  type,
  label: `channels.${type}.label`,
  icon,
  group,
  status: 'coming_soon',
  display,
  connect: { kind },
  capabilities: {
    direct: true,
    group: false,
    mentions: false,
    reactions: false,
    send: ['text'],
    maxTextLength: 2000,
    markdown: 'none',
    proactive: 'disallowed',
  },
  rateLimit: { perMinute: 20 },
  session: kind === 'oauth' ? 'webhook' : 'lease',
}));
