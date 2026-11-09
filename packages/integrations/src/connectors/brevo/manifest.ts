// Brevo — MailProvider chính (D34). Thư hệ thống nền tảng: BrevoMailProvider (env, TIP-004). Kết nối của DN (Email Marketing — TIP-012c):
// khoá API + người gửi đã kích hoạt trong tài khoản Brevo + token webhook riêng (bearer — Brevo không ký HMAC) để nhận sự kiện giao thư.
import type { ConnectorManifest } from '../../types';
import { mailConfigErrors } from '../../tenant-mail-validation';

export const brevoManifest: ConnectorManifest = {
  key: 'brevo',
  port: 'mail',
  name: 'Brevo',
  logo: 'brevo',
  color: '#0B996E',
  group: 'marketing',
  status: 'ga',
  auth: {
    kind: 'api_key',
    fields: [
      { key: 'api_key', secret: true },
      { key: 'sender_email' },
      { key: 'sender_name', optional: true },
      { key: 'reply_to', optional: true },
      { key: 'webhook_token', secret: true, optional: true },
    ],
  },
  webhooks: true,
  modes: ['live'],
  validate: ({ config, secrets }) => {
    const e = mailConfigErrors(config, 'brevo') ?? {};
    if (secrets.webhook_token !== undefined && secrets.webhook_token !== '' && !/^[A-Za-z0-9._~-]{16,200}$/.test(secrets.webhook_token)) e.webhook_token = 'invalid';
    return Object.keys(e).length ? e : null;
  },
};
