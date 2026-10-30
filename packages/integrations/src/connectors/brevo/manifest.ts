// Brevo — MailProvider chính (D34): email hệ thống + webhook bounce / complaint. Adapter: TIP-004 / 006.
import type { ConnectorManifest } from '../../types';

export const brevoManifest: ConnectorManifest = {
  key: 'brevo',
  port: 'mail',
  name: 'Brevo',
  logo: 'brevo',
  color: '#0B996E',
  group: 'marketing',
  status: 'ga',
  auth: { kind: 'api_key', fields: [{ key: 'api_key', secret: true }] },
  webhooks: true,
  modes: ['live'],
};
