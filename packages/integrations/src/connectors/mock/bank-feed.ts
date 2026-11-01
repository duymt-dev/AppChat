// BankFeedProvider `mock` (provider-ports §9): sandbox / test cho mọi connector port `bank_feed` khi chưa có adapter thật.
// Kiểm kết nối: `api_key` bắt đầu bằng `bad` → lỗi. Webhook: header `x-mock-signature` = HMAC-SHA256(api_key, raw body) hex.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BankFeedProvider, BankTransaction } from '../../ports/bank-feed';
import type { ConnectionCtx, ConnectorManifest, WebhookEvent, WebhookRequest } from '../../types';

interface MockBody {
  id: string;
  transactions?: BankTransaction[];
}

export const mockSignature = (apiKey: string, rawBody: string) => createHmac('sha256', apiKey).update(rawBody).digest('hex');

export class MockBankFeedProvider implements BankFeedProvider {
  constructor(readonly manifest: ConnectorManifest) {}

  async test(conn: ConnectionCtx): Promise<void> {
    if ((conn.secrets.api_key ?? '').startsWith('bad')) throw new Error('mock: api_key bị từ chối');
  }

  verifyWebhook(conn: ConnectionCtx, req: WebhookRequest): WebhookEvent | null {
    const sig = req.headers['x-mock-signature'] ?? '';
    const want = mockSignature(conn.secrets.api_key ?? '', req.rawBody);
    if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
    let body: MockBody;
    try {
      body = JSON.parse(req.rawBody) as MockBody;
    } catch {
      return null;
    }
    return typeof body.id === 'string' && body.id ? { id: body.id, kind: 'transactions', payload: body } : null;
  }

  parseTransactions(_conn: ConnectionCtx, payload: unknown): BankTransaction[] {
    return (payload as MockBody).transactions ?? [];
  }
}
