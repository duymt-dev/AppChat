// BankFeedProvider SePay (D35 — chính). Hai cách xác thực webhook SePay hỗ trợ (developer.sepay.vn → Xác thực):
//   - API Key: header `Authorization: Apikey <key>` (secrets.api_key);
//   - HMAC-SHA256: `X-SePay-Signature: sha256=<hex>` trên chuỗi `{X-SePay-Timestamp}.{raw body}` bằng secrets.hmac_secret, lệch giờ
//     > 300 giây → từ chối.
// So sánh hằng thời gian; xác thực trên byte gốc TRƯỚC khi parse. OAuth2 Bearer của SePay chưa hỗ trợ (không khai trong manifest).
// Nền tảng (thu phí AppChat — TIP-010) dùng adapter này qua env; kết nối SePay của DN gắn vào registry (TIP-012b).
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BankFeedProvider, BankTransaction } from '../../ports/bank-feed';
import type { ConnectionCtx, ConnectorManifest, WebhookEvent, WebhookRequest } from '../../types';
import { parseJsonObject, vnLocalTime } from '../../bank-validation';
import { normalizeSepay } from './normalize';

export type { SepayWebhookBody } from './normalize';

const PREFIX = 'apikey ';
export const SEPAY_MAX_SKEW_S = 300;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Chữ ký HMAC SePay (cho test / fixture): `sha256=` + hex HMAC-SHA256(secret, `${ts}.${raw}`). */
export const sepaySignature = (secret: string, ts: string, raw: string) => `sha256=${createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')}`;

/** "2026-10-30 14:02:37" (giờ VN) → ISO UTC; sai định dạng → ném (không rơi về giờ máy chủ). */
export const sepayTime = (s: string): string => vnLocalTime(s, 'transactionDate');

export class SepayBankFeed implements BankFeedProvider {
  constructor(
    readonly manifest: ConnectorManifest,
    private readonly nowMs: () => number = Date.now,
  ) {}

  private authentic(conn: ConnectionCtx, req: WebhookRequest): boolean {
    const sig = req.headers['x-sepay-signature'];
    if (sig !== undefined) {
      const secret = conn.secrets.hmac_secret ?? '';
      const ts = req.headers['x-sepay-timestamp'] ?? '';
      if (!secret || !/^\d{1,12}$/.test(ts) || Math.abs(this.nowMs() / 1000 - Number(ts)) > SEPAY_MAX_SKEW_S) return false;
      return same(sig, sepaySignature(secret, ts, req.rawBody));
    }
    const key = conn.secrets.api_key ?? '';
    const auth = req.headers.authorization ?? '';
    return !!key && auth.slice(0, PREFIX.length).toLowerCase() === PREFIX && same(auth.slice(PREFIX.length).trim(), key);
  }

  verifyWebhook(conn: ConnectionCtx, req: WebhookRequest): WebhookEvent | null {
    if (!this.authentic(conn, req)) return null;
    let body: Record<string, unknown>;
    try {
      body = parseJsonObject(req.rawBody);
    } catch {
      return null;
    }
    const id = body.id;
    if ((typeof id !== 'string' && typeof id !== 'number') || String(id) === '') return null;
    return { id: String(id), kind: 'transaction', payload: body };
  }

  /** Đã xác thực → một giao dịch chuẩn; payload sai → ProviderError (người gọi từ chối cả request). */
  parseTransactions(_conn: ConnectionCtx, payload: unknown): BankTransaction[] {
    return [normalizeSepay(payload as Record<string, unknown>)];
  }
}
