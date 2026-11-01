// SMTP — MailProvider dự phòng (nodemailer). Adapter: TIP-004 / 006. Thẻ prototype "Google Workspace" (SMTP của Google).
import type { ConnectorManifest } from '../../types';

export const smtpManifest: ConnectorManifest = {
  key: 'smtp',
  port: 'mail',
  name: 'Google Workspace',
  logo: 'mail',
  color: '#4285F4',
  group: 'marketing',
  status: 'ga',
  auth: { kind: 'basic', fields: [{ key: 'host' }, { key: 'username' }, { key: 'password', secret: true }] },
  modes: ['live'],
};
