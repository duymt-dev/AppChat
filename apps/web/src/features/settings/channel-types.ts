// Kiểu dữ liệu Kênh kết nối (REQ-B09 một kênh nhiều tài khoản) — tách khỏi types.ts để giữ dưới trần 400 dòng.
export type ChannelAiMode = 'auto' | 'suggest' | 'off';
export type ChannelAssignMode = 'round_robin' | 'least_busy' | 'shift';
export type ChannelHistoryDays = 0 | 7 | 30 | 90;

/** Một tài khoản của một loại kênh (REQ-B09: một kênh nhiều tài khoản). */
export interface ChannelAccount {
  id: string;
  name: string;
  connected: boolean;
  convs: number;
  frt: string;
  health: 'good' | 'slow' | 'down' | 'off';
  agent: string;
  ai_mode: ChannelAiMode;
  hours: string;
  greeting: string;
  assign_mode: ChannelAssignMode;
  sla_policy: string;
  sync_messages: boolean;
  sync_auto_create_contact: boolean;
  history_days: ChannelHistoryDays;
  paused: boolean;
}

/** Một loại kênh (vd Zalo cá nhân) với danh sách tài khoản — trạng thái/hội thoại gộp từ `accounts`. */
export interface Channel {
  type: string;
  name: string;
  short: string;
  color: string;
  group: 'msg' | 'web' | 'shop';
  label: '' | 'pop' | 'beta';
  /** Có manifest (kết nối được); false → "Sắp có". */
  available: boolean;
  accounts: ChannelAccount[];
  /** true nếu có ≥1 tài khoản đang connected. */
  connected: boolean;
  /** Sức khoẻ tệ nhất trong các tài khoản (off nếu chưa có account). */
  health: 'good' | 'slow' | 'down' | 'off';
  /** Tổng hội thoại cộng dồn tất cả tài khoản. */
  convs: number;
  /** FRT của tài khoản tốt nhất, "—" nếu chưa có dữ liệu. */
  frt: string;
  /** Tên tài khoản đầu tiên (hiển thị khi chỉ có 1 tài khoản). */
  account: string;
  /** AI Agent của tài khoản đầu tiên (hiển thị tóm tắt ở danh sách). */
  agent: string;
}
