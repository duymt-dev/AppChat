// SMTP — MailProvider dự phòng (nodemailer). Adapter: TIP-004 / 006.
import type { ConnectorManifest } from '../../types';

export const smtpManifest: ConnectorManifest = {
  key: 'smtp',
  port: 'mail',
  name: 'SMTP',
  logo: 'mail',
  group: 'marketing',
  status: 'ga',
  auth: { kind: 'basic' },
  modes: ['live'],
};
