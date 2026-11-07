// BankFeedProvider `mock` (provider-ports §9): adapter chế độ `sandbox` (ẩn, chỉ test / dev — core cấm ở production) của mọi connector
// port `bank_feed`; chế độ live dùng adapter thật (TIP-012b), không bao giờ lùi về đây. Khoá giả lập = bí mật đầu tiên có của kết nối
// (`api_key` / `hmac_secret` / `webhook_secret`). Kiểm kết nối: khoá bắt đầu bằng `bad` → lỗi. Webhook: header `x-mock-signature` =
// HMAC-SHA256(khoá, raw body) hex — KHÔNG phải giao thức của SePay / Casso.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BankFeedProvider, BankTransaction } from '../../ports/bank-feed';
import type { ConnectionCtx, ConnectorManifest, WebhookEvent, WebhookRequest } from '../../types';

interface MockBody {
  id: string;
  transactions?: BankTransaction[];
}

const keyOf = (c: ConnectionCtx) => c.secrets.api_key || c.secrets.hmac_secret || c.secrets.webhook_secret || '';

export const mockSignature = (apiKey: string, rawBody: string) => createHmac('sha256', apiKey).update(rawBody).digest('hex');

export class MockBankFeedProvider implements BankFeedProvider {
  constructor(readonly manifest: ConnectorManifest) {}

  async test(conn: ConnectionCtx): Promise<void> {
    if (keyOf(conn).startsWith('bad')) throw new Error('mock: api_key bị từ chối');
  }

  verifyWebhook(conn: ConnectionCtx, req: WebhookRequest): WebhookEvent | null {
    const sig = req.headers['x-mock-signature'] ?? '';
    const key = keyOf(conn);
    if (!key) return null;
    const want = mockSignature(key, req.rawBody);
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
