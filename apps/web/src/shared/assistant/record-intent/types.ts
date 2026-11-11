// Kiểu của lối vào Trợ lý theo bản ghi (TIP-023g §1.4): một phạm vi gọi có kiểu (workspace, thực thể, id, thế hệ) — KHÔNG giữ nguyên dòng.
import type { RecordEntity, RecordIntentKind } from '@appchat/shared';

export interface RecordScope {
  /** Module của màn (khoá phiên drawer) — `quotes`, `calendar`… */
  module: string;
  entity: RecordEntity;
  id: string;
  /** Mã / tiêu đề hiển thị — chỉ để người dùng thấy đang gắn bản ghi nào; không gửi server làm dữ liệu. */
  label: string;
  /** Phiên bản dòng đang thấy — chỉ gợi ý phát hiện cũ. */
  version?: number;
  /** Tăng mỗi lần mở bản ghi khác — callback trễ của phạm vi cũ bị bỏ. */
  generation: number;
}

export interface RecordIntentChoice {
  intent: RecordIntentKind;
  /** Khoá i18n của nhãn lựa chọn. */
  labelKey: string;
  /** Nhãn hiển thị nguyên văn (gợi ý của bản ghi — dữ liệu, không phải lệnh); có thì thay labelKey. */
  label?: string;
  /** Việc soạn sẵn (người dùng sửa được) — chữ được TRÍCH, không phải lệnh. */
  task?: string;
}
