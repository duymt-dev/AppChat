// Kênh chưa có adapter — hiện thẻ "Sắp có", không cho kết nối (D04, D28; danh sách theo prototype Cài đặt → Kênh).
import type { ChannelManifest, ConnectKind } from './types';

type Soon = [type: string, icon: string, group: ChannelManifest['group'], connect: ConnectKind];

const SOON: Soon[] = [
  ['zalo_oa', 'zalo', 'chat', 'oauth'],
  ['facebook', 'facebook', 'social', 'oauth'],
  ['messenger', 'messenger', 'social', 'oauth'],
  ['instagram', 'instagram', 'social', 'oauth'],
  ['whatsapp', 'whatsapp', 'chat', 'qr'],
  ['whatsapp_business', 'whatsapp', 'chat', 'oauth'],
  ['telegram', 'telegram', 'chat', 'credentials'],
  ['tiktok_messaging', 'tiktok', 'social', 'oauth'],
  ['viber', 'viber', 'chat', 'credentials'],
  ['line', 'line', 'chat', 'credentials'],
  ['wechat', 'wechat', 'chat', 'oauth'],
  ['tiktok_shop', 'tiktok', 'commerce', 'oauth'],
  ['shopee', 'shopee', 'commerce', 'oauth'],
];

export const comingSoonChannels: ChannelManifest[] = SOON.map(([type, icon, group, kind]) => ({
  type,
  label: `channels.${type}.label`,
  icon,
  group,
  status: 'coming_soon',
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
