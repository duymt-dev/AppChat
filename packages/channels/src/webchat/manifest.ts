// Website Chat (Blueprint §6): widget nhúng, socket /widget, chỉ chạy trên allowed_domains. Adapter: TIP-017.
import type { ChannelManifest } from '../types';

export const webchatManifest: ChannelManifest = {
  type: 'webchat',
  label: 'channels.webchat.label',
  icon: 'globe',
  group: 'web',
  status: 'ga',
  display: { name: 'Website Chat', short: '⌘', color: '#2DC56A', group: 'web', label: 'pop', sort: 16 },
  connect: { kind: 'embed' },
  capabilities: {
    direct: true,
    group: false,
    mentions: false,
    reactions: false,
    send: ['text', 'image', 'file', 'card'],
    maxTextLength: 4000,
    markdown: 'rich',
    proactive: 'window_24h',
  },
  rateLimit: { perMinute: 60 },
  session: 'webhook',
};
