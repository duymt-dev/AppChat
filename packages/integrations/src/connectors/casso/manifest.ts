// Casso — BankFeedProvider dự phòng (D35). Adapter: TIP-010 / 032.
import type { ConnectorManifest } from '../../types';

export const cassoManifest: ConnectorManifest = {
  key: 'casso',
  port: 'bank_feed',
  name: 'Casso',
  logo: 'casso',
  color: '#1E5BBF',
  group: 'payments',
  status: 'ga',
  auth: { kind: 'api_key', fields: [{ key: 'api_key', secret: true }] },
  webhooks: true,
  modes: ['sandbox', 'live'],
};
