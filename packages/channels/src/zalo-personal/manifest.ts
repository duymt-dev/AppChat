// Zalo cá nhân (Blueprint §6): QR login, giữ phiên bằng lease, chống khoá 1 tin / 2–6 giây. Adapter zca-js: TIP-014.
import type { ChannelManifest } from '../types';

export const zaloPersonalManifest: ChannelManifest = {
  type: 'zalo_personal',
  label: 'channels.zalo_personal.label',
  icon: 'zalo',
  group: 'chat',
  status: 'ga',
  display: { name: 'Zalo cá nhân', short: 'Z', color: '#0068FF', group: 'msg', label: '', sort: 2 },
  connect: { kind: 'qr', riskNotice: 'channels.zalo_personal.risk' },
  capabilities: {
    direct: true,
    group: true,
    createGroup: true,
    mentions: true,
    reactions: true,
    // TIP-014b — chỉ thao tác đã map SDK zca-js 2.2.0 (provider-capabilities.md); cần ACK nhà cung cấp.
    operations: { recall: 'remote', react: 'remote', group_info: 'remote', group_members: 'remote', group_link: 'remote', group_add_members: 'remote', profiles: 'remote', friends: 'remote', friend_requests: 'remote', find_user: 'remote' },
    send: ['text', 'image', 'file', 'sticker'],
    maxTextLength: 2000,
    markdown: 'rich',
    proactive: 'disallowed',
  },
  rateLimit: { perMinute: 15, jitterMs: [2000, 6000] },
  session: 'lease',
};
