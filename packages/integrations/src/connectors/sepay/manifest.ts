// SePay — BankFeedProvider chính (D35): đối soát chuyển khoản qua webhook. Adapter: TIP-010 (nền tảng) / 032 (DN).
import type { ConnectorManifest } from '../../types';

export const sepayManifest: ConnectorManifest = {
  key: 'sepay',
  port: 'bank_feed',
  name: 'SePay',
  logo: 'sepay',
  color: '#0E7C66',
  group: 'payments',
  status: 'ga',
  auth: { kind: 'api_key', fields: [{ key: 'api_key', secret: true }, { key: 'account_number' }] },
  webhooks: true,
  modes: ['sandbox', 'live'],
};
