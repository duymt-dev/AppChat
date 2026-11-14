// Client đọc SePay API v2 (TIP-012b §4.3; hợp đồng test/fixtures/sepay/contracts.json → `read`, nguồn developer.sepay.vn → SePay API
// v2). Header `Authorization: Bearer <api_token>` — API Token của SePay, KHÁC khoá `Apikey` webhook (không suy ra quyền đọc từ khoá
// webhook). Host cố định `userapi.sepay.vn`, chỉ GET.
//   - Thăm dò: GET /v2/bank-accounts?q=<tài khoản> → tài khoản nhận có thuộc token này không.
//   - KHÔNG kéo giao dịch: `GET /v2/transactions` trả `id` UUID, còn webhook gửi `id` số — tài liệu không nói hai mã là một, nên kéo sẽ
//     tạo khoá chuẩn tắc khác webhook (nhận đôi). Kéo SePay chờ hợp đồng định danh (QUESTIONS) — adapter không khai `pull`.
import type { BankProbeResult } from '../../ports/bank-feed';
import type { ConnectionCtx } from '../../types';
import { getJson, type ProviderHttp } from '../../provider-http';
import { normalizeAccount } from '../../bank-validation';
import { ProviderError } from '../../provider-errors';

export const SEPAY_API = 'https://userapi.sepay.vn/v2';

export async function sepayProbe(conn: ConnectionCtx, http: ProviderHttp): Promise<BankProbeResult> {
  const token = conn.secrets.api_token ?? '';
  if (!token) throw new ProviderError('unsupported', 'api_token');
  const want = conn.config.account_number ? normalizeAccount(conn.config.account_number) : '';
  const q = new URLSearchParams({ q: want, per_page: '20' });
  const body = await getJson(http, `${SEPAY_API}/bank-accounts?${q}`, { authorization: `Bearer ${token}` });
  if (body.status !== undefined && body.status !== 'success') throw new ProviderError('provider_unavailable');
  if (!Array.isArray(body.data)) throw new ProviderError('invalid_payload', 'data');
  const rows = body.data as Record<string, unknown>[];
  const found = !!want && rows.some((a) => {
    try {
      return normalizeAccount(a?.account_number) === want;
    } catch {
      return false;
    }
  });
  return { account_found: found, accounts: rows.length };
}
