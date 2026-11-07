// BankFeedProvider Casso (D35 — dự phòng), Webhook V2 (developer.casso.vn; mã mẫu chính thức CassoHQ/casso-webhook-v2-verify-signature):
// header `X-Casso-Signature: t=<ms>,v1=<hex>`; chữ ký = hex HMAC-SHA512(webhook_secret, `${t}.${JSON body sắp key A→Z đệ quy}`).
// Casso không công bố ngưỡng lệch giờ (gửi lại tới 24 giờ) → không chặn theo `t`; chống lặp bằng `data.id` (unique ở core).
// Mã mẫu JS và Python của Casso khác nhau ở ký tự ngoài ASCII (Python `json.dumps` thoát thành \uXXXX, JS giữ nguyên) và Casso không nói
// máy chủ ký dạng nào → chấp nhận cả hai dạng; cả hai đều cần đúng khoá bí mật.
// Webhook cũ (header `secure-token`, data là mảng) KHÔNG hỗ trợ — chỉ V2. Không có bí mật → mọi request bị từ chối.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BankFeedProvider, BankProbeResult, BankPullCursor, BankPullPage, BankTransaction } from '../../ports/bank-feed';
import type { ConnectionCtx, ConnectorManifest, WebhookEvent, WebhookRequest } from '../../types';
import { parseJsonObject } from '../../bank-validation';
import { normalizeCasso } from './normalize';
import { cassoProbe, cassoPull } from './client';
import type { ProviderHttp } from '../../provider-http';

export type { CassoWebhookData } from './normalize';

/** Sắp key A→Z đệ quy như mã mẫu Casso (`sortObjDataByKey`); null / mảng giữ nguyên. */
export function cassoSorted(v: unknown): unknown {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
  const o = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o).sort()) out[k] = cassoSorted(o[k]);
  return out;
}

/** JSON như Python `json.dumps(ensure_ascii=True)`: ký tự ngoài ASCII → `\u` + 4 hex. */
const asciiJson = (s: string) => s.replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const sign = (secret: string, t: string, json: string) => createHmac('sha512', secret).update(`${t}.${json}`).digest('hex');

/** Chữ ký Casso V2 dạng mã mẫu JS — cho test / fixture. `ascii` = dạng mã mẫu Python. */
export const cassoSignature = (secret: string, t: string, body: unknown, ascii = false) => {
  const json = JSON.stringify(cassoSorted(body));
  return `t=${t},v1=${sign(secret, t, ascii ? asciiJson(json) : json)}`;
};

const SIG = /^t=(\d{1,16}),v1=([a-f0-9]{128})$/;

export class CassoBankFeed implements BankFeedProvider {
  constructor(readonly manifest: ConnectorManifest) {}

  verifyWebhook(conn: ConnectionCtx, req: WebhookRequest): WebhookEvent | null {
    const secret = conn.secrets.webhook_secret ?? '';
    const m = SIG.exec((req.headers['x-casso-signature'] ?? '').trim());
    if (!secret || !m) return null;
    let body: Record<string, unknown>;
    try {
      body = parseJsonObject(req.rawBody);
    } catch {
      return null;
    }
    const json = JSON.stringify(cassoSorted(body));
    const got = Buffer.from(m[2]!);
    if (![json, asciiJson(json)].some((j) => timingSafeEqual(got, Buffer.from(sign(secret, m[1]!, j))))) return null;
    const data = body.data as { id?: unknown } | undefined;
    const id = data && typeof data === 'object' ? data.id : undefined;
    if ((typeof id !== 'string' && typeof id !== 'number') || String(id) === '') return null;
    return { id: String(id), kind: 'transaction', payload: body };
  }

  parseTransactions(_conn: ConnectionCtx, payload: unknown): BankTransaction[] {
    const t = normalizeCasso(payload as Record<string, unknown>);
    return t ? [t] : [];
  }

  /** Thăm dò đọc qua API key Casso (tuỳ chọn trong manifest) — không có → unsupported. */
  probe(conn: ConnectionCtx, http: ProviderHttp): Promise<BankProbeResult> {
    return cassoProbe(conn, http);
  }

  pull(conn: ConnectionCtx, http: ProviderHttp, cursor: BankPullCursor | null, since: Date): Promise<BankPullPage> {
    return cassoPull(conn, http, cursor, since);
  }
}
