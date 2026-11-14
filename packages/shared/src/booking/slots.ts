// Tìm khung giờ trống cho lịch hẹn (Blueprint §3.4 appointment.find_slots, §2.2 ràng buộc EXCLUDE staff + khung giờ + buffer).
// Thuần hàm, dùng chung web (mock, chọn slot) và core. Ứng viên chiếm [bắt đầu, kết thúc + đệm đã chọn); lịch có sẵn chiếm
// [bắt đầu, block_end đã lưu) — đúng điều kiện EXCLUDE trên [start_at, block_end_at). Giờ là "HH:mm" theo múi giờ workspace; một ngày, một hoặc nhiều nhân sự.

export interface Busy {
  staff_id: string;
  /** "HH:mm" */
  start: string;
  end: string;
  /**
   * Hết chiếm chỗ đã lưu (TIP-033b §3.4 — `block_end_at`, đệm chụp lúc đặt), phút trong ngày; 1440 = hết ngày. Có thì dùng nguyên, KHÔNG
   * cộng đệm hiện hành; thiếu (người gọi cũ) → `end + buffer`.
   */
  block_end_min?: number;
}

export interface SlotQuery {
  open: { start: string; end: string };
  /** Thời lượng dịch vụ (phút). */
  duration: number;
  /** Nghỉ giữa hai lịch của cùng nhân sự (phút). */
  buffer: number;
  staff_ids: string[];
  busy: Busy[];
  /** Bước lưới slot (phút), mặc định 30. */
  step?: number;
  /** Không trả slot bắt đầu trước mốc này (ví dụ giờ hiện tại nếu là hôm nay). */
  not_before?: string;
}

export interface Slot {
  start: string;
  end: string;
  /** Nhân sự còn trống ở slot này, theo thứ tự `staff_ids`. */
  staff_ids: string[];
}

export const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h! * 60 + m!;
};
export const toHm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

export const findSlots = (q: SlotQuery): Slot[] => {
  const step = q.step ?? 30;
  const open0 = toMin(q.open.start);
  const open1 = toMin(q.open.end);
  const from = Math.max(open0, q.not_before ? Math.ceil(toMin(q.not_before) / step) * step : open0);
  const out: Slot[] = [];
  for (let s = from; s + q.duration <= open1; s += step) {
    const e = s + q.duration;
    const free = q.staff_ids.filter(
      (id) =>
        !q.busy.some(
          (b) => b.staff_id === id && overlaps(s, e + q.buffer, toMin(b.start), b.block_end_min ?? toMin(b.end) + q.buffer),
        ),
    );
    if (free.length) out.push({ start: toHm(s), end: toHm(e), staff_ids: free });
  }
  return out;
};
