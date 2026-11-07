// Đo từng lô embedding (TIP-019b §3.2–3.3): mỗi (ứng viên, lô) là một lần gọi thật có biên nhận riêng — `before` ghi biên nhận + nhận
// chỗ của gốc TRƯỚC khi gửi, `after` ghi kết quả (usage / từ chối / không rõ). Chuyển ứng viên chỉ khi nhà cung cấp từ chối rõ ràng,
// bắt đầu lại từ lô 0 (không trộn vector hai model); lô đã có usage của ứng viên trước vẫn được tính, không tính lại khi chạy lại.
import type { AttemptOutcome } from '../gateway/attempts';

export interface EmbedAttempt {
  candidate: number;
  batch: number;
  provider: string;
  model: string;
}

export interface EmbedHooks {
  before(a: EmbedAttempt): Promise<void>;
  after(a: EmbedAttempt, o: AttemptOutcome): Promise<void>;
}
