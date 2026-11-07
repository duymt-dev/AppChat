// Casso — BankFeedProvider dự phòng (D35). Webhook V2: `webhook_secret` = "Key bảo mật" của tích hợp Webhook V2 (ký HMAC-SHA512).
// `api_key` (tuỳ chọn) là API key gọi ra Casso — tách khỏi khoá webhook, chỉ dùng cho kéo giao dịch (TIP-012b pha 3). Tài khoản nhận
// bắt buộc trước khi bật đối soát.
import type { ConnectorManifest } from '../../types';

export const cassoManifest: ConnectorManifest = {
  key: 'casso',
  port: 'bank_feed',
  name: 'Casso',
  logo: 'casso',
  color: '#1E5BBF',
  group: 'payments',
  status: 'ga',
  auth: {
    kind: 'api_key',
    fields: [
      { key: 'webhook_secret', secret: true },
      { key: 'account_number' },
      { key: 'api_key', secret: true, optional: true },
    ],
  },
  webhooks: true,
  modes: ['sandbox', 'live'],
  docsUrl: 'https://developer.casso.vn/webhook/thiet-lap-webhook-thu-cong',
};
