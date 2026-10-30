// Brevo — MailProvider chính (D34): email hệ thống + webhook bounce / complaint. Adapter: TIP-004 / 006.
import type { ConnectorManifest } from '../../types';

export const brevoManifest: ConnectorManifest = {
  key: 'brevo',
  port: 'mail',
  name: 'Brevo',
  logo: 'brevo',
  group: 'marketing',
  status: 'ga',
  auth: { kind: 'api_key' },
  webhooks: true,
  modes: ['live'],
};
