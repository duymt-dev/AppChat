// Port kiểm kê/xoá theo domain cho "Quên khách" (TIP-015c §2.2): mỗi domain tự chứa SQL — không import kernel DB của domain khác,
// không gọi mạng/LLM/Storage. Đăng ký qua registry.ts (mirror kernel/contact-lifecycle — fail-closed, 13 domain cố định).
import type { TenantTx } from '../actions/action-context';

export type PrivacyDomain =
  | 'crm'
  | 'inbox'
  | 'channels'
  | 'ai'
  | 'sales'
  | 'contracts'
  | 'booking'
  | 'support'
  | 'loyalty'
  | 'marketing'
  | 'integrations'
  | 'data-transfer'
  | 'kernel';

export const PRIVACY_DOMAINS: readonly PrivacyDomain[] = [
  'ai',
  'booking',
  'channels',
  'contracts',
  'crm',
  'data-transfer',
  'inbox',
  'integrations',
  'kernel',
  'loyalty',
  'marketing',
  'sales',
  'support',
];

/** Một artifact đã liệt kê (TIP-015c §2.2.1) — không nội dung, chỉ đủ để fence/erase/quarantine theo kind + record id. */
export interface InventoryArtifact {
  kind: string;
  recordId: string;
  revision: number;
  /** `exclusive` = chỉ thuộc subject này; `shared` = nhiều subject / nhóm (DC-265 cách ly thay vì xoá); `legacy_unbound` = chưa rõ chủ thể. */
  ownership: 'exclusive' | 'shared' | 'legacy_unbound';
  /** DC259: artifact thuộc tập chứng từ đã phát hành/ký — domain tự biết (quote.sentAt, contract.signedAt, invoice đã gửi/thu...). */
  retainedIssued?: boolean;
}

export interface PrivacyAdapter {
  readonly domain: PrivacyDomain;
  /** Liệt kê mọi artifact của họ khách trong domain (phân trang bằng cursor nội bộ domain nếu cần — pha 1 trả hết, domain nhỏ). */
  inventory(tx: TenantTx, contactIds: readonly string[]): Promise<InventoryArtifact[]>;
  /**
   * Xoá/ẩn danh MỘT artifact đã xác định ownership=exclusive (hoặc disposition erase_exclusive/redact_shared đã duyệt cho shared).
   * Domain tự quyết cách xoá (scrub cột, xoá dòng con, giữ tombstone id) — không bao giờ xoá root Contact.
   */
  erase(tx: TenantTx, artifact: Pick<InventoryArtifact, 'kind' | 'recordId'>, disposition: 'erase_exclusive' | 'redact_shared', proofRef?: string): Promise<void>;
}
