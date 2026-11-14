// Port chuyển phụ trách theo domain (TIP-015d §2.2): CRM chuyển khách gọi port của Hộp thư / Báo giá / Lịch hẹn TRONG transaction của nó
// (TenantTx do người gọi cấp — port không tự mở transaction, không gọi mạng / provider / LLM). Hợp đồng thuần — không import CRM hay
// module domain nào, tránh vòng SalesModule / BookingModule → CrmModule.
import type { TenantTx } from '../actions/action-context';

export type OwnershipDomain = 'conversation' | 'quote' | 'appointment';
export const OWNERSHIP_DOMAINS: readonly OwnershipDomain[] = ['conversation', 'quote', 'appointment'];

export interface OwnershipMove {
  contactId: string;
  contactName: string;
  /** Người nhận (thành viên active — CRM đã kiểm). */
  toUserId: string;
  /** Nhóm của khách theo người nhận (DC-299) — domain tự quyết có ghi hay không. */
  toTeamId: string | null;
  /** Mốc tuyến tính hoá (đồng hồ server) — lịch hẹn chỉ chuyển cái bắt đầu SAU mốc này. */
  cutoff: Date;
}

/** Biên nhận một bản ghi đã chuyển: trước / sau + revision gán sau khi chuyển (so khi hoàn tác — chống ABA). */
export interface OwnershipReceipt {
  entityId: string;
  beforeUserId: string | null;
  beforeAgentId?: string | null;
  beforeTeamId?: string | null;
  afterTeamId?: string | null;
  afterRevision: number;
}

export interface OwnershipApplied {
  receipts: OwnershipReceipt[];
  events: { topic: string; payload: Record<string, unknown> }[];
}

export interface OwnershipPort {
  readonly domain: OwnershipDomain;
  /**
   * Khoá (thứ tự id tăng dần) + chuyển tập ứng viên của khách (khách ĐÃ được người gọi khoá trước) — set-based, không vòng N+1.
   * Trả biên nhận + event mô tả đúng trạng thái đã lưu.
   */
  apply(tx: TenantTx, m: OwnershipMove): Promise<OwnershipApplied>;
  /**
   * Hoàn tác đúng các id đã ghi: khoá theo thứ tự tăng dần, mọi dòng phải còn đúng revision sau chuyển + còn đủ điều kiện, không thì ném
   * 409 cho CẢ lần hoàn tác (không khôi phục một phần). Không quét lại quan hệ của khách.
   */
  undo(tx: TenantTx, receipts: readonly OwnershipReceipt[], toUserId: string): Promise<{ events: { topic: string; payload: Record<string, unknown> }[] }>;
}
