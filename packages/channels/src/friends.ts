// Bạn bè kênh (TIP-014b E — DC nới DC-247): kiểu trung lập với nhà cung cấp cho lời mời kết bạn + tra một SĐT. Chỉ nhân viên bấm (không AI /
// agent / hàng loạt) — core giữ trần / ngày, kiểm định danh đã biết, ghi nhật ký. Năng lực khai trong manifest (`operations.friend_requests`,
// `operations.find_user`); vắng = unsupported.

/** Lời nhắn kèm lời mời tối đa (Zalo giới hạn ~150 ký tự). */
export const FRIEND_MESSAGE_MAX = 150;

/** Trạng thái quan hệ với một định danh phía kênh. */
export interface FriendStatus {
  isFriend: boolean;
  /** Tài khoản đã gửi lời mời, chờ họ đồng ý. */
  requested: boolean;
  /** Họ đã gửi lời mời tới tài khoản. */
  requesting: boolean;
}

/** Kết quả tra một SĐT (hồ sơ công khai tối thiểu) — tạm, không tự lưu. */
export interface FoundUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

/** Cổng bạn bè của adapter. Lỗi nhà cung cấp rõ → ChannelOperationError('rejected'); chưa chạy phiên → ChannelNotRunningError. */
export interface ChannelFriends {
  accept(accountId: string, userId: string): Promise<void>;
  reject(accountId: string, userId: string): Promise<void>;
  send(accountId: string, userId: string, message: string): Promise<void>;
  undo(accountId: string, userId: string): Promise<void>;
  status(accountId: string, userId: string): Promise<FriendStatus>;
  /** Tra MỘT số (đã chuẩn hoá 0xxxxxxxxx). Không thấy → null. */
  findUser(accountId: string, phone: string): Promise<FoundUser | null>;
}

/** Sự kiện bạn bè từ kênh: lời mời tới / bị huỷ / bị từ chối / đã thành bạn. `self` = do chính tài khoản. */
export interface FriendEvent {
  kind: 'friend';
  type: 'request' | 'undo_request' | 'reject_request' | 'added' | 'removed';
  accountId: string;
  key: string;
  userId: string;
  self: boolean;
  message?: string;
  at: string;
}
