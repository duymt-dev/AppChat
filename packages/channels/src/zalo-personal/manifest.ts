// Zalo cá nhân (Blueprint §6): QR login, giữ phiên bằng lease, chống khoá 1 tin / 2–6 giây. Adapter zca-js: TIP-014.
import type { ChannelManifest } from '../types';

export const zaloPersonalManifest: ChannelManifest = {
  type: 'zalo_personal',
  label: 'channels.zalo_personal.label',
  icon: 'zalo',
  group: 'chat',
  status: 'ga',
  connect: { kind: 'qr', riskNotice: 'channels.zalo_personal.risk' },
  capabilities: {
    direct: true,
    group: true,
    mentions: true,
    reactions: true,
    send: ['text', 'image', 'file', 'sticker'],
    maxTextLength: 2000,
    markdown: 'rich',
    proactive: 'disallowed',
  },
  rateLimit: { perMinute: 15, jitterMs: [2000, 6000] },
  session: 'lease',
};
