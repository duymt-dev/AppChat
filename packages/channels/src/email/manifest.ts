// Email (Blueprint §6): IMAP poll 60 giây + SMTP, gom thread theo Message-ID. Form IMAP / SMTP + adapter: TIP-018.
import type { ChannelManifest } from '../types';

export const emailManifest: ChannelManifest = {
  type: 'email',
  label: 'channels.email.label',
  icon: 'mail',
  group: 'email',
  status: 'ga',
  display: { name: 'Email', short: '@', color: '#1F8A4D', group: 'web', label: '', sort: 13 },
  connect: { kind: 'credentials' },
  capabilities: {
    direct: true,
    group: false,
    mentions: false,
    reactions: false,
    send: ['text', 'file'],
    maxTextLength: 100000,
    markdown: 'html',
    proactive: 'allowed',
  },
  rateLimit: { perMinute: 30 },
  session: 'poll',
};
