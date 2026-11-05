// Thao tác trên tin / nhóm ngoài gửi tin (TIP-014b A, omnichannel-adapter §Thao tác): kiểu trung lập với nhà cung cấp. Mỗi thao tác
// khai năng lực riêng `local | remote | unsupported` trong manifest — vắng = unsupported (không suy từ `reactions: true` hay từ việc
// SDK có hàm). `local`: chỉ ghi trong AppChat (commit ngay); `remote`: phải có lệnh bền + ACK nhà cung cấp mới đổi trạng thái tin.
// Core / UI / AI chỉ đọc năng lực ở đây, không `switch (type)` theo kênh.

export type OperationMode = 'local' | 'remote' | 'unsupported';

export type OperationKind = 'recall' | 'react' | 'group_info' | 'group_members' | 'group_link' | 'group_add_members' | 'profiles';

/** Năng lực thao tác theo kênh (manifest). Thiếu khoá = unsupported. */
export type OperationCapabilities = Partial<Record<OperationKind, OperationMode>>;

export const operationMode = (caps: OperationCapabilities | undefined, kind: OperationKind): OperationMode => caps?.[kind] ?? 'unsupported';

/**
 * Tham chiếu tin phía nhà cung cấp — đủ để gọi lệnh trên đúng tin (Zalo: msgId + cliMsgId + thread + loại thread). Lưu riêng ở
 * `message_provider_ref` (không phải payload thô có credential). `cliMsgId` null = chưa biết (tin cũ / chưa thấy self-event):
 * thao tác remote cần nó phải báo `pending_ref`, không đoán.
 */
export interface ProviderMessageRef {
  threadId: string;
  isGroup: boolean;
  msgId: string;
  cliMsgId: string | null;
  /** Id người gửi phía kênh (tin ra = uid tài khoản). */
  senderId?: string;
}

/** Cảm xúc AppChat (enum của `message.react`) — adapter tự map sang mã của kênh. null = bỏ cảm xúc. */
export type ReactionEmoji = '👍' | '❤️' | '😂' | '😮' | '😢' | '🙏';

export interface GroupInfo {
  groupId: string;
  name: string;
  /** Tổng thành viên nhà cung cấp báo (nếu có) — khác số đã quan sát trong AppChat. */
  totalMembers: number | null;
  /** Id thành viên nhà cung cấp trả (có thể không đủ — `complete=false`). */
  memberIds: string[];
  complete: boolean;
}

export interface GroupMember {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

/** Hồ sơ công khai của một định danh phía kênh (TIP-014b D — ảnh đại diện). `avatarUrl` là URL CDN nhà cung cấp: core tải về Storage,
 *  không bao giờ đưa thẳng cho trình duyệt. */
export interface ProviderProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

/** Số định danh tối đa mỗi lần đọc hồ sơ (một lô). */
export const MAX_PROFILE_BATCH = 20;

export interface GroupLink {
  enabled: boolean;
  /** Chỉ có khi đang bật — nhạy cảm: chỉ trả cho người có quyền yêu cầu, không log / không đưa vào prompt. */
  url: string | null;
  expiresAt: string | null;
}

export interface AddMembersResult {
  added: string[];
  /** Từng thành viên lỗi kèm mã nhà cung cấp — không gộp thành "thành công hết". */
  failed: { id: string; error: string }[];
}

/** Cổng thao tác của adapter: chỉ hàm ứng với năng lực `remote` được gắn. Chưa chạy phiên → ChannelNotRunningError TRƯỚC khi gọi. */
export interface ChannelOperations {
  recall?(accountId: string, ref: ProviderMessageRef): Promise<void>;
  /** Đặt cảm xúc cuối cùng của TÀI KHOẢN (một danh tính phía kênh) — null = gỡ. Không phải bật / tắt. */
  setReaction?(accountId: string, ref: ProviderMessageRef, emoji: ReactionEmoji | null): Promise<void>;
  groupInfo?(accountId: string, groupId: string): Promise<GroupInfo>;
  groupMembers?(accountId: string, memberIds: string[]): Promise<GroupMember[]>;
  groupLink?(accountId: string, groupId: string): Promise<GroupLink>;
  addGroupMembers?(accountId: string, groupId: string, memberIds: string[]): Promise<AddMembersResult>;
  /** Hồ sơ công khai theo lô ≤ MAX_PROFILE_BATCH (chỉ đọc). Id không thấy → vắng trong kết quả (không lỗi). */
  profiles?(accountId: string, ids: string[]): Promise<ProviderProfile[]>;
}

/**
 * Sự kiện nhà cung cấp ngoài tin vào (TIP-014b): core xử lý idempotent theo `key`, chỉ trong đúng tài khoản. Không tạo tin / khách.
 * - `self_ref`: tin do chính tài khoản gửi (self-listen) — bổ sung `cliMsgId` cho tin ra đã có msgId (khớp đúng msgId, không đoán).
 * - `recalled`: tin bị thu hồi phía kênh (khách thu hồi, hoặc tài khoản thu hồi từ điện thoại).
 * - `reaction`: cảm xúc trên tin (`actorId` = id phía kênh; `self` = chính tài khoản).
 */
export type ProviderEvent =
  | { kind: 'self_ref'; accountId: string; key: string; ref: ProviderMessageRef; at: string }
  | { kind: 'recalled'; accountId: string; key: string; threadId: string; isGroup: boolean; msgId: string; actorId: string; self: boolean; at: string }
  | { kind: 'reaction'; accountId: string; key: string; threadId: string; isGroup: boolean; msgIds: string[]; actorId: string; self: boolean; emoji: ReactionEmoji | null; at: string }
  | ReceiptEvent;

/**
 * Sổ gửi từng phần (TIP-014b B) — core cấp cho `send` để lưu bền trước / sau mỗi lần gọi kênh:
 * - `reserve(partNo, hash)` TRƯỚC khi gọi kênh cho phần: `send` = gọi; `{ skip: ref }` = phần đã xác nhận ở lần chạy trước (không gọi lại);
 *   ném lỗi = dừng (phần đang treo từ lần trước → không biết đã tới khách chưa, không gửi lại mù).
 * - `confirm(partNo, ref)` ngay sau ACK của phần, trước khi sang phần kế.
 * Lỗi trong lúc gọi kênh sau `reserve`: adapter ném nguyên lỗi — core phân loại (từ chối rõ → lỗi chắc chắn; còn lại → chưa rõ).
 */
export interface SendLedger {
  reserve(partNo: number, hash: string): Promise<'send' | { skip: ProviderMessageRef }>;
  confirm(partNo: number, ref: ProviderMessageRef): Promise<void>;
}

/** Biên nhận đã nhận / đã xem từ kênh (TIP-014b B). Nhóm: `recipients` = người có bằng chứng (không suy cả nhóm). */
export interface ReceiptEvent {
  kind: 'delivered' | 'seen';
  accountId: string;
  key: string;
  threadId: string;
  isGroup: boolean;
  msgIds: string[];
  recipients: string[];
  at: string;
}

/** Thao tác bị từ chối trước khi gọi kênh (không có tham chiếu / không hỗ trợ / tài khoản thiếu quyền phía kênh). */
export class ChannelOperationError extends Error {
  /**
   * `rejected` = nhà cung cấp trả lỗi rõ ràng (đã nhận lệnh, không thực hiện) → thất bại chắc chắn. Lỗi mạng / hết giờ KHÔNG dùng lớp
   * này: core ghi `unknown`, không tự thử lại.
   */
  constructor(readonly reason: 'unsupported' | 'pending_ref' | 'unsafe_ref' | 'forbidden' | 'invalid' | 'rejected', detail?: string) {
    super(detail ? `${reason}:${detail}` : reason);
    this.name = 'ChannelOperationError';
  }
}
