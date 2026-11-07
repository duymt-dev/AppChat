// Port `bank_feed` (provider-ports §1, D35): đối soát chuyển khoản — SePay (chính), Casso, `mock`. Webhook vào → giao dịch chuẩn hoá;
// khớp mã thanh toán là việc của core (TIP-010 nền tảng / 032 DN).
import type { ConnectorAdapter, ConnectionCtx } from '../types';
import type { ProviderHttp } from '../provider-http';

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

/** Bằng chứng thăm dò đọc (TIP-012b §1.3): khoá đọc hợp lệ + tài khoản nhận có thuộc tài khoản provider — không dữ liệu khách. */
export interface BankProbeResult {
  account_found: boolean;
  /** Số tài khoản ngân hàng provider thấy (chỉ đếm). */
  accounts: number;
}

/** Con trỏ kéo mờ, có giới hạn (≤ 2 KB JSON) — adapter tự định nghĩa nội dung; core chỉ lưu / trả lại nguyên vẹn. */
export type BankPullCursor = Record<string, string | number>;

export interface BankPullPage {
  transactions: BankTransaction[];
  cursor: BankPullCursor;
  has_more: boolean;
}

export interface BankFeedProvider extends ConnectorAdapter {
  /** Chuẩn hoá payload webhook đã xác thực thành giao dịch. */
  parseTransactions(conn: ConnectionCtx, payload: unknown): BankTransaction[];
  /**
   * Thăm dò đọc (tuỳ chọn): GET cố định tới provider bằng khoá ĐỌC (tách khoá webhook). Không có khoá đọc → ProviderError('unsupported').
   * Không ghi gì phía provider.
   */
  probe?(conn: ConnectionCtx, http: ProviderHttp): Promise<BankProbeResult>;
  /**
   * Kéo một trang giao dịch (tuỳ chọn) từ `cursor` (null = từ mốc `since` — ngày kích hoạt). Chỉ adapter mà mã giao dịch kéo TRÙNG
   * mã giao dịch webhook (cùng khoá chuẩn tắc) mới khai — khác định danh thì không khai (tránh nhận đôi).
   */
  pull?(conn: ConnectionCtx, http: ProviderHttp, cursor: BankPullCursor | null, since: Date): Promise<BankPullPage>;
}
