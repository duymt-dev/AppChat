// Kiểu dùng chung của job đối soát (TIP-045b annex E).
import type { PlanLimits } from '../services/quota.service';

export type ReconcileCheck = 'membership_seats' | 'quota_channels' | 'quota_agents' | 'wallet_ledger' | 'wallet_usage';

/** Một lệch phát hiện được — `detail` chỉ số đếm / id kỹ thuật (không PII, không bí mật). */
export interface Finding {
  check: ReconcileCheck;
  reference: string;
  /** mismatch: lệch đã chốt · pending: có thao tác gần mốc cắt chưa xong (không coi là sai tiền). */
  severity: 'mismatch' | 'pending';
  detail: Record<string, string | number | null>;
}

export interface ReconcileInput {
  workspaceId: string;
  /** Mốc cắt nhất quán (giờ tròn trước lúc chạy) — chỉ so dữ liệu ghi trước mốc. */
  cutoff: Date;
  limits: PlanLimits;
}
