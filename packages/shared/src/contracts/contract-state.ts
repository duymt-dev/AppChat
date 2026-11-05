// Luồng trạng thái hợp đồng (standards/domain/state-machine.md §4, COMMERCE §9 — D25) — dùng chung handler, mock FE, nút UI, Trợ lý.
// Owner "Duyệt & ký" (OTP + ký tay) = duyệt + ký phía DN; khách ký trên trang công khai; hết hạn link / khách từ chối → `declined`.
// Sau khi ký nội dung khoá (đổi bằng phụ lục / hợp đồng mới); hết ngày kết thúc → `expired` (hệ thống); chấm dứt có lý do (Owner).
import { defineFlow } from '../state/flow';

export const CONTRACT_STATUSES = ['draft', 'pending_approval', 'pending_signature', 'signed', 'declined', 'expired', 'terminated'] as const;
export type ContractStatusKey = (typeof CONTRACT_STATUSES)[number];
export const CONTRACT_KINDS = ['service', 'sale', 'framework'] as const;
/** Gia hạn = tạo hợp đồng MỚI (`renewal_of_id`, lại qua duyệt + ký) — bản gốc giữ trạng thái; chỉ từ hợp đồng đã ký / hết hạn. */
export const CONTRACT_RENEWABLE: readonly ContractStatusKey[] = ['signed', 'expired'];

export const CONTRACT_FLOW = defineFlow<ContractStatusKey>({
  draft: { 'contract.update': 'draft', 'contract.submit': 'pending_approval', 'contract.delete': 'draft' },
  pending_approval: { 'contract.request_changes': 'draft', 'contract.reject_internal': 'draft', 'contract.approve_and_sign': 'pending_signature' },
  pending_signature: {
    'contract.send_for_signature': 'pending_signature',
    'contract.remind_signer': 'pending_signature',
    'contract.extend_sign_link': 'pending_signature',
    'contract.sign': 'signed',
    'contract.decline': 'declined',
    'contract.link_expire': 'declined',
  },
  signed: { 'contract.expire': 'expired', 'contract.terminate': 'terminated' },
  declined: {},
  expired: {},
  terminated: {},
  terminal: ['declined', 'expired', 'terminated'],
});

/**
 * Phụ lục (TIP-030b F3 spec 13): như hợp đồng nhưng ký riêng — Owner ký trước (OTP riêng của phụ lục), khách ký link phụ lục; yêu cầu
 * sửa → nháp; khách từ chối / link quá hạn → `declined`. Sửa chỉ khi nháp (version +1, token / OTP cũ hết hiệu lực).
 */
export const APPENDIX_FLOW = defineFlow<ContractStatusKey>({
  draft: { 'contract.appendix_update': 'draft', 'contract.appendix_submit': 'pending_approval' },
  pending_approval: { 'contract.appendix_request_changes': 'draft', 'contract.appendix_approve_and_sign': 'pending_signature' },
  pending_signature: { 'contract.appendix_send': 'pending_signature', 'contract.appendix_public_sign': 'signed', 'contract.appendix_public_decline': 'declined', 'appendix.link_expire': 'declined' },
  signed: {},
  declined: {},
  expired: {},
  terminated: {},
  terminal: ['signed', 'declined', 'expired', 'terminated'],
});

/** Chip lọc / cột kanban (COMMERCE §9: 4 cột prototype; "Chờ duyệt" gộp vào Nháp kèm badge; Từ chối / Đã chấm dứt chỉ ở "Tất cả"). */
export const contractChipOf = (s: ContractStatusKey): string => (s === 'pending_approval' ? 'draft' : s === 'pending_signature' ? 'pending' : s);
export const CONTRACT_CHIP_STATUSES: Record<string, readonly ContractStatusKey[]> = {
  draft: ['draft', 'pending_approval'],
  pending: ['pending_signature'],
  signed: ['signed'],
  expired: ['expired'],
};

/** Link ký một lần: 7 ngày, OTP 6 số hiệu lực 10 phút, sai 5 lần khoá link (Blueprint §4.4 public). */
export const SIGN_LINK_DAYS = 7;
export const SIGN_OTP_MAX_FAILS = 5;
/** Nhắc gia hạn trước ngày kết thúc (COMMERCE §9). */
export const CONTRACT_RENEW_NOTICE_DAYS = 30;
