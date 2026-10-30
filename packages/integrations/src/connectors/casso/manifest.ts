// Casso — BankFeedProvider dự phòng (D35). Adapter: TIP-010 / 032.
import type { ConnectorManifest } from '../../types';

export const cassoManifest: ConnectorManifest = {
  key: 'casso',
  port: 'bank_feed',
  name: 'Casso',
  logo: 'casso',
  group: 'payments',
  status: 'ga',
  auth: { kind: 'api_key' },
  webhooks: true,
  modes: ['sandbox', 'live'],
};
