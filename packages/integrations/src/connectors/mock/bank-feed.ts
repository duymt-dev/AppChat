// BankFeedProvider `mock` (provider-ports §9): adapter chế độ `sandbox` (ẩn, chỉ test / dev — core cấm ở production) của mọi connector
// port `bank_feed`; chế độ live dùng adapter thật (TIP-012b), không bao giờ lùi về đây. Khoá giả lập = bí mật đầu tiên có của kết nối
// (`api_key` / `hmac_secret` / `webhook_secret`). Kiểm kết nối: khoá bắt đầu bằng `bad` → lỗi. Webhook: header `x-mock-signature` =
// HMAC-SHA256(khoá, raw body) hex — KHÔNG phải giao thức của SePay / Casso.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BankFeedProvider, BankProbeResult, BankPullCursor, BankPullPage, BankTransaction } from '../../ports/bank-feed';
import type { ConnectionCtx, ConnectorManifest, WebhookEvent, WebhookRequest } from '../../types';
import { ProviderError } from '../../provider-errors';

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

  /** Giả lập thăm dò: khoá `bad…` → auth_failed; còn lại thấy đúng tài khoản cấu hình. Không gọi mạng. */
  async probe(conn: ConnectionCtx): Promise<BankProbeResult> {
    if (keyOf(conn).startsWith('bad')) throw new ProviderError('auth_failed');
    return { account_found: !!conn.config.account_number, accounts: 1 };
  }

  /** Giả lập kéo: trang rỗng, con trỏ giữ nguyên (sandbox không có giao dịch kéo — test tiêm adapter riêng khi cần). */
  async pull(_conn: ConnectionCtx, _http: unknown, cursor: BankPullCursor | null): Promise<BankPullPage> {
    return { transactions: [], cursor: cursor ?? { page: 1 }, has_more: false };
  }
}
