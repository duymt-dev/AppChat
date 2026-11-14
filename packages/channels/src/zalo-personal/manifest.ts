// Zalo cá nhân (Blueprint §6): QR login, giữ phiên bằng lease, chống khoá 1 tin / 2–6 giây. Adapter zca-js: TIP-014.
import type { ChannelManifest } from '../types';

export const ZALO_PROACTIVE_CAP_DEFAULT = 200;
export const ZALO_PROACTIVE_CAP_RANGE = [50, 500] as const;

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
    // TIP-014b (+ TIP-025b group_settings / group_mute) — chỉ thao tác đã map SDK zca-js 2.2.0 (provider-capabilities.md); cần ACK nhà cung cấp.
    operations: { recall: 'remote', react: 'remote', group_info: 'remote', group_members: 'remote', group_link: 'remote', group_add_members: 'remote', group_settings: 'remote', group_mute: 'remote', profiles: 'remote', friends: 'remote', friend_requests: 'remote', find_user: 'remote' },
    send: ['text', 'image', 'file', 'sticker'],
    maxTextLength: 2000,
    markdown: 'rich',
    proactive: 'disallowed',
  },
  // D35: tin chủ động (chiến dịch / mở chuỗi) mặc định 200 / ngày / tài khoản — chỉnh 50–500 ở Cài đặt kênh kèm cảnh báo (TIP-022d / TIP-037).
  rateLimit: { perMinute: 15, perDayProactive: ZALO_PROACTIVE_CAP_DEFAULT, jitterMs: [2000, 6000] },
  session: 'lease',
};
