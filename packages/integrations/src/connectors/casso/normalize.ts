// Chuẩn hoá webhook Casso V2 → BankTransaction (TIP-012b §2.2; hợp đồng test/fixtures/casso/contracts.json, nguồn developer.casso.vn
// → Webhook V2). Body `{ error: 0, data: {...} }` — một giao dịch. `amount` có dấu: âm = tiền ra, dương = tiền vào (mẫu API Casso
// `amount: -193000`). `transactionDateTime` giờ Việt Nam không múi giờ. Sự kiện thử của Casso có `data.id = 0` → không phải giao dịch.
import type { BankTransaction } from '../../ports/bank-feed';
import { externalId, normalizeAccount, strictAmount, text, vnLocalTime } from '../../bank-validation';
import { ProviderError } from '../../provider-errors';

export interface CassoWebhookData {
  id: number;
  reference?: string;
  description?: string;
  amount: number;
  runningBalance?: number;
  transactionDateTime: string;
  accountNumber: string;
  bankName?: string;
  bankAbbreviation?: string;
  virtualAccountNumber?: string;
  virtualAccountName?: string;
  counterAccountName?: string;
  counterAccountNumber?: string;
  counterAccountBankId?: string;
  counterAccountBankName?: string;
}

/** `data` của webhook V2 (đã xác thực). Sự kiện thử (id 0) → null. */
export function normalizeCasso(body: Record<string, unknown>): BankTransaction | null {
  if (body.error !== 0 && body.error !== '0') throw new ProviderError('invalid_payload', 'error');
  const d = body.data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new ProviderError('invalid_payload', 'data');
  const data = d as Record<string, unknown>;
  const id = externalId(data.id, 'data.id');
  if (id === '0') return null;
  const amount = strictAmount(data.amount, 'data.amount', true);
  return {
    external_id: id,
    account_number: normalizeAccount(data.accountNumber, 'data.accountNumber'),
    amount: amount.abs,
    direction: amount.negative ? 'out' : 'in',
    content: text(data.description),
    occurred_at: vnLocalTime(data.transactionDateTime, 'data.transactionDateTime'),
  };
}
