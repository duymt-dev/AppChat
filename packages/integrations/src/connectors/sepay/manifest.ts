// SePay — BankFeedProvider chính (D35): đối soát chuyển khoản qua webhook. Hai cách xác thực webhook SePay (developer.sepay.vn → Xác
// thực): API Key (`api_key`) hoặc HMAC-SHA256 (`hmac_secret`) — cần ít nhất một. Số tài khoản nhận bắt buộc (gắn feed với đúng tài khoản).
// `api_token` (tuỳ chọn, TIP-012b P3) = API Token gọi SePay API v2 (Bearer) — chỉ để thăm dò đọc; tách khỏi khoá webhook.
import type { ConnectorManifest } from '../../types';

export const sepayManifest: ConnectorManifest = {
  key: 'sepay',
  port: 'bank_feed',
  name: 'SePay',
  logo: 'sepay',
  color: '#0E7C66',
  group: 'payments',
  status: 'ga',
  auth: {
    kind: 'api_key',
    fields: [
      { key: 'api_key', secret: true, optional: true },
      { key: 'hmac_secret', secret: true, optional: true },
      { key: 'account_number' },
      { key: 'api_token', secret: true, optional: true },
    ],
  },
  webhooks: true,
  modes: ['sandbox', 'live'],
  docsUrl: 'https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook',
  validate: ({ secrets }) => (secrets.api_key || secrets.hmac_secret ? null : { api_key: 'required' }),
};
