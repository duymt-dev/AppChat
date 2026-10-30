// Port `bank_feed` (provider-ports §1, D35): đối soát chuyển khoản — SePay (chính), Casso, `mock`. Webhook vào → giao dịch chuẩn hoá;
// khớp mã thanh toán là việc của core (TIP-010 nền tảng / 032 DN).
import type { ConnectorAdapter, ConnectionCtx } from '../types';

export interface BankTransaction {
  /** Id giao dịch phía provider — khoá idempotent. */
  external_id: string;
  account_number: string;
  /** Tiền VND (chuỗi số nguyên — response-envelope §6). */
  amount: string;
  direction: 'in' | 'out';
  /** Nội dung chuyển khoản (chứa mã TT-… để khớp). */
  content: string;
  occurred_at: string;
}

export interface BankFeedProvider extends ConnectorAdapter {
  /** Chuẩn hoá payload webhook đã xác thực thành giao dịch. */
  parseTransactions(conn: ConnectionCtx, payload: unknown): BankTransaction[];
}
