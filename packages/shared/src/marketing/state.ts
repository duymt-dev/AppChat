// Trạng thái chiến dịch + người nhận (REQ-I03 / I04, Blueprint §2.2 marketing, state-machine §campaign, D52): bảng chuyển dùng chung BE +
// mock FE + nút UI + Trợ lý. Không chiến dịch nào tự gửi: draft → pending_approval → (người có campaign.approve) approved → scheduled /
// running. Đang chạy phải tạm dừng trước khi huỷ (D52); tin đã gửi giữ nguyên, người nhận chưa gửi → skipped.
import { defineFlow } from '../state/flow';

export const CAMPAIGN_STATUSES = ['draft', 'pending_approval', 'approved', 'scheduled', 'running', 'paused', 'completed', 'rejected', 'cancelled'] as const;
export type CampaignStatusKey = (typeof CAMPAIGN_STATUSES)[number];
export const CAMPAIGN_KINDS = ['reactivation', 'upsell', 'conversion', 'aftercare', 'manual'] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];
export const CAMPAIGN_CHANNELS = ['zalo', 'email'] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];
/** Loại kênh tài khoản gửi theo kênh chiến dịch. */
export const CAMPAIGN_ACCOUNT_TYPE: Record<CampaignChannel, string> = { zalo: 'zalo_personal', email: 'email' };

export const RECIPIENT_STATUSES = ['pending', 'skipped', 'sent', 'failed', 'replied', 'converted'] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];
/** Lý do loại người nhận — snapshot (trước duyệt) hoặc kiểm lại ngay trước khi gọi kênh. */
export const SKIP_REASONS = ['opt_out', 'no_endpoint', 'cooldown', 'deleted', 'out_of_scope', 'cancelled', 'unsupported', 'invalid_content'] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];
/** Kết quả gửi: `unknown` = đã gọi kênh mà không biết tới khách chưa — KHÔNG tự gửi lại (DC-240). */
export const DELIVERY_OUTCOMES = ['accepted', 'unknown', 'failed'] as const;
export type DeliveryOutcome = (typeof DELIVERY_OUTCOMES)[number];

/** Khoảng cách tối thiểu giữa hai chiến dịch bất kỳ tới cùng một khách (REQ-I03). */
export const CAMPAIGN_COOLDOWN_HOURS = 48;
/** Quy tắc gán chuyển đổi (DC-240): chiến dịch đã gửi gần nhất trong 7 ngày trước đơn — mỗi đơn tối đa một chiến dịch. */
export const ATTRIBUTION_WINDOW_DAYS = 7;
/** Zalo cá nhân: tin chủ động / ngày / tài khoản mặc định (D35) — chỉnh được kèm cảnh báo. */
export const ZALO_DEFAULT_DAILY_CAP = 200;
/** Hạn mức tối đa nhập tay (cảnh báo rủi ro khoá tài khoản khi vượt mặc định). */
export const DAILY_CAP_MAX = 5000;
/** Nhập danh sách: tối đa số dòng một file; trên ngưỡng xử lý nền. */
export const AUDIENCE_IMPORT_MAX_ROWS = 10_000;
export const AUDIENCE_IMPORT_SYNC_ROWS = 50;

export const CAMPAIGN_FLOW = defineFlow<CampaignStatusKey>({
  draft: { 'campaign.submit': 'pending_approval', 'campaign.update': 'draft', 'campaign.cancel': 'cancelled' },
  pending_approval: { 'campaign.approve': 'approved', 'campaign.reject': 'rejected', 'campaign.cancel': 'cancelled', 'campaign.submit:undo': 'draft' },
  rejected: { 'campaign.update': 'draft' },
  approved: { 'campaign.schedule': 'scheduled', 'campaign.start': 'running', 'campaign.cancel': 'cancelled' },
  scheduled: { 'campaign.start': 'running', 'campaign.pause': 'paused', 'campaign.cancel': 'cancelled' },
  running: { 'campaign.pause': 'paused', 'campaign.complete': 'completed' },
  paused: { 'campaign.resume': 'running', 'campaign.resume:scheduled': 'scheduled', 'campaign.cancel': 'cancelled' },
  completed: {},
  cancelled: {},
  terminal: ['completed', 'cancelled'],
});

/** Xoá (mềm) chỉ khi chưa từng gửi: nháp / bị từ chối / đã huỷ. */
export const CAMPAIGN_DELETABLE: readonly CampaignStatusKey[] = ['draft', 'rejected', 'cancelled'];
/** Sau duyệt nội dung + người nhận khoá cứng — muốn sửa thì nhân bản thành nháp mới. */
export const CAMPAIGN_EDITABLE: readonly CampaignStatusKey[] = ['draft', 'rejected'];

/** Trạng thái người nhận đã kết thúc (không còn việc gửi). */
export const recipientTerminal = (s: RecipientStatus) => s !== 'pending';
