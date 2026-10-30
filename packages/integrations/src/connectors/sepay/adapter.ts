// BankFeedProvider SePay (D35 — chính). Webhook SePay: POST JSON một giao dịch, header `Authorization: Apikey <API key>` do chủ
// tài khoản đặt trong SePay (secrets.api_key). `transactionDate` là giờ Việt Nam không kèm múi giờ ("2026-10-30 14:02:37").
// Nền tảng (thu phí AppChat — TIP-010) dùng adapter này qua env; kết nối SePay của DN (TIP-032) gắn vào registry.
import { timingSafeEqual } from 'node:crypto';
import type { BankFeedProvider, BankTransaction } from '../../ports/bank-feed';
import type { ConnectionCtx, ConnectorManifest, WebhookEvent, WebhookRequest } from '../../types';

/** Payload webhook SePay (docs.sepay.vn → Webhooks). */
export interface SepayWebhookBody {
  id: number | string;
  gateway?: string;
  transactionDate: string;
  accountNumber: string;
  code?: string | null;
  content: string;
  transferType: 'in' | 'out';
  transferAmount: number | string;
  referenceCode?: string;
  description?: string;
}

const PREFIX = 'apikey ';

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** "2026-10-30 14:02:37" (giờ VN) → ISO UTC. */
export function sepayTime(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return new Date(s).toISOString();
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+07:00`).toISOString();
}

export class SepayBankFeed implements BankFeedProvider {
  constructor(readonly manifest: ConnectorManifest) {}

  verifyWebhook(conn: ConnectionCtx, req: WebhookRequest): WebhookEvent | null {
    const key = conn.secrets.api_key ?? '';
    const auth = req.headers.authorization ?? '';
    if (!key || auth.slice(0, PREFIX.length).toLowerCase() !== PREFIX || !same(auth.slice(PREFIX.length).trim(), key)) return null;
    let body: SepayWebhookBody;
    try {
      body = JSON.parse(req.rawBody) as SepayWebhookBody;
    } catch {
      return null;
    }
    if (body?.id === undefined || body.id === null || String(body.id) === '') return null;
    return { id: String(body.id), kind: 'transaction', payload: body };
  }

  parseTransactions(_conn: ConnectionCtx, payload: unknown): BankTransaction[] {
    const b = payload as SepayWebhookBody;
    const amount = String(Math.trunc(Number(b.transferAmount)));
    if (!/^\d+$/.test(amount)) return [];
    return [
      {
        external_id: String(b.id),
        account_number: String(b.accountNumber ?? '').replace(/\s/g, ''),
        amount,
        direction: b.transferType === 'out' ? 'out' : 'in',
        content: String(b.content ?? b.description ?? ''),
        occurred_at: sepayTime(String(b.transactionDate)),
      },
    ];
  }
}
