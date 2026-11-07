// Client đọc Casso API v2 (TIP-012b §4.3; hợp đồng test/fixtures/casso/contracts.json → `read`, nguồn developer.casso.vn → API lấy
// giao dịch / userInfo). Header `Authorization: Apikey <api_key>` — khoá API tách khỏi "Key bảo mật" webhook. Chỉ GET tới host cố định.
//   - Thăm dò: GET /v2/userInfo → `data.bankAccs[].bankSubAccId` (tài khoản nhận có thuộc khoá này không).
//   - Kéo: GET /v2/transactions?fromDate=YYYY-MM-DD&page&pageSize&sort=ASC → `data.records[]` { id, description, amount có dấu, when,
//     bankSubAccId }; `id` là mã giao dịch Casso — cùng định danh với `data.id` của webhook V2 (Casso: "mỗi giao dịch định danh bằng id";
//     dùng API để rà giao dịch webhook bỏ sót) → webhook và kéo hội tụ cùng biên nhận chuẩn tắc.
import type { BankProbeResult, BankPullCursor, BankPullPage, BankTransaction } from '../../ports/bank-feed';
import type { ConnectionCtx } from '../../types';
import { getJson, type ProviderHttp } from '../../provider-http';
import { MAX_BATCH, externalId, normalizeAccount, strictAmount, text, vnLocalTime } from '../../bank-validation';
import { ProviderError } from '../../provider-errors';

export const CASSO_API = 'https://oauth.casso.vn/v2';
/** Casso không công bố trần `pageSize` (mặc định 10) — 100 là giá trị dùng trong mã mẫu tích hợp; trang lớn hơn MAX_BATCH bị từ chối. */
export const CASSO_PAGE_SIZE = 100;
/** Lần quét kế tiếp sau trang cuối: lùi 1 ngày so với giao dịch cuối (bản ghi cùng ngày có thể chen sau) — trùng chỉ tăng `deliveries`. */
const OVERLAP_DAYS = 1;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function auth(conn: ConnectionCtx): Record<string, string> {
  const key = conn.secrets.api_key ?? '';
  if (!key) throw new ProviderError('unsupported', 'api_key');
  return { authorization: `Apikey ${key}` };
}

/** `error` của envelope Casso phải là 0; 401 trong body (một số lỗi trả 200) → auth_failed. */
function ok(body: Record<string, unknown>): Record<string, unknown> {
  if (body.error === 401 || body.error === '401') throw new ProviderError('auth_failed');
  if (body.error !== 0 && body.error !== '0') throw new ProviderError('provider_unavailable');
  const d = body.data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new ProviderError('invalid_payload', 'data');
  return d as Record<string, unknown>;
}

/** `when`: "YYYY-MM-DD HH:mm:ss" | "YYYY-MM-DDTHH:mm:ss" | "YYYY-MM-DD" (mẫu API) — giờ Việt Nam; dạng khác → lỗi. */
export function cassoWhen(v: unknown): string {
  if (typeof v !== 'string') throw new ProviderError('invalid_payload', 'when');
  const s = DATE.test(v) ? `${v} 00:00:00` : v.replace('T', ' ');
  return vnLocalTime(s, 'when');
}

/** Một bản ghi API → giao dịch chuẩn (cùng luật chặt với webhook). */
export function normalizeCassoRecord(r: unknown): BankTransaction {
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw new ProviderError('invalid_payload', 'records');
  const o = r as Record<string, unknown>;
  const amount = strictAmount(o.amount, 'amount', true);
  return {
    external_id: externalId(o.id, 'id'),
    account_number: normalizeAccount(o.bankSubAccId, 'bankSubAccId'),
    amount: amount.abs,
    direction: amount.negative ? 'out' : 'in',
    content: text(o.description),
    occurred_at: cassoWhen(o.when),
  };
}

/** Ngày giờ VN (YYYY-MM-DD) của một thời điểm. */
export const vnDate = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

function cursorOf(c: BankPullCursor | null, since: Date): { from: string; page: number } {
  const from = typeof c?.from === 'string' && DATE.test(c.from) ? c.from : vnDate(since);
  const page = typeof c?.page === 'number' && Number.isSafeInteger(c.page) && c.page >= 1 && c.page <= 100_000 ? c.page : 1;
  return { from, page };
}

export async function cassoProbe(conn: ConnectionCtx, http: ProviderHttp): Promise<BankProbeResult> {
  const data = ok(await getJson(http, `${CASSO_API}/userInfo`, auth(conn)));
  const accs = Array.isArray(data.bankAccs) ? (data.bankAccs as Record<string, unknown>[]) : [];
  const want = conn.config.account_number ? normalizeAccount(conn.config.account_number) : '';
  const found = !!want && accs.some((a) => {
    try {
      return normalizeAccount(a?.bankSubAccId) === want;
    } catch {
      return false;
    }
  });
  return { account_found: found, accounts: accs.length };
}

export async function cassoPull(conn: ConnectionCtx, http: ProviderHttp, cursor: BankPullCursor | null, since: Date): Promise<BankPullPage> {
  const c = cursorOf(cursor, since);
  const q = new URLSearchParams({ fromDate: c.from, page: String(c.page), pageSize: String(CASSO_PAGE_SIZE), sort: 'ASC' });
  const data = ok(await getJson(http, `${CASSO_API}/transactions?${q}`, auth(conn)));
  const records = data.records;
  if (!Array.isArray(records) || records.length > MAX_BATCH) throw new ProviderError('invalid_payload', 'records');
  // Cả trang chuẩn hoá trước khi trả: một bản ghi hỏng → cả trang bị từ chối (không ghi phần nào).
  const transactions = records.map(normalizeCassoRecord);
  const next = typeof data.nextPage === 'number' ? data.nextPage : null;
  const total = typeof data.totalPages === 'number' ? data.totalPages : 0;
  const has_more = records.length > 0 && ((next !== null && next > c.page) || c.page < total);
  if (has_more) return { transactions, cursor: { from: c.from, page: c.page + 1 }, has_more };
  // Hết trang: lần sau quét lại từ (ngày giao dịch cuối − 1) — không tăng số trang vô hạn.
  const last = transactions.at(-1);
  const lastDay = last ? vnDate(new Date(new Date(last.occurred_at).getTime() - OVERLAP_DAYS * 86_400_000)) : c.from;
  return { transactions, cursor: { from: lastDay > c.from ? lastDay : c.from, page: 1 }, has_more: false };
}
