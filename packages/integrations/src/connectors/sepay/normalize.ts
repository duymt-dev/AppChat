// Chuẩn hoá payload webhook SePay → BankTransaction (TIP-012b §2.2; hợp đồng test/fixtures/sepay/contracts.json, nguồn
// developer.sepay.vn → SePay Webhooks). Một request = một giao dịch. `transferAmount` luôn dương, chiều ở `transferType` (in / out);
// `transactionDate` giờ Việt Nam không múi giờ. Thiếu / sai trường → ProviderError('invalid_payload', trường) — không đoán.
import type { BankTransaction } from '../../ports/bank-feed';
import { externalId, normalizeAccount, strictAmount, text, vnLocalTime } from '../../bank-validation';
import { ProviderError } from '../../provider-errors';

/** Payload webhook SePay (docs: id, gateway, transactionDate, accountNumber, subAccount, code, content, transferType, description, transferAmount, accumulated, referenceCode). */
export interface SepayWebhookBody {
  id: number | string;
  gateway?: string;
  transactionDate: string;
  accountNumber: string;
  subAccount?: string | null;
  code?: string | null;
  content: string;
  transferType: 'in' | 'out';
  transferAmount: number | string;
  accumulated?: number;
  referenceCode?: string;
  description?: string;
}

export function normalizeSepay(b: Record<string, unknown>): BankTransaction {
  const direction = b.transferType;
  if (direction !== 'in' && direction !== 'out') throw new ProviderError('invalid_payload', 'transferType');
  return {
    external_id: externalId(b.id),
    account_number: normalizeAccount(b.accountNumber, 'accountNumber'),
    amount: strictAmount(b.transferAmount, 'transferAmount').abs,
    direction,
    content: text(b.content) || text(b.description),
    occurred_at: vnLocalTime(b.transactionDate, 'transactionDate'),
  };
}
