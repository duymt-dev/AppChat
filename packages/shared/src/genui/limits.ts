// Giới hạn cây giao diện do Trợ lý ghép (standards/ai/generative-ui.md §8, §9 — D55 / D55b). Schema chặn phần đo được trên cây
// (độ sâu, số khối, số cột, số nút); phần phụ thuộc dữ liệu `$ref` (số dòng, số điểm biểu đồ) renderer cắt + nút "Xem đầy đủ".
export const GENUI_LIMITS = {
  depth: 4,
  blocks: 30,
  tableColumns: 6,
  tableRows: 20,
  chartPoints: 24,
  buttonGroup: 4,
  statGroup: 6,
  listItems: 20,
  formFields: 12,
  text: 2000,
  label: 120,
} as const;

/** Chế độ compact (drawer ~400px) — §9. */
export const GENUI_COMPACT = {
  statsPerRow: 3,
  rows: 5,
  columns: 3,
  formFields: 4,
} as const;

/** Khung stream (TIP-023c AC vận hành): gộp delta ≤ 50ms, frame ≤ 64KiB, hàng đợi mỗi subscriber ≤ 256 frame. */
export const GENUI_STREAM = {
  coalesceMs: 50,
  frameBytes: 64 * 1024,
  queueFrames: 256,
  heartbeatMs: 15_000,
} as const;
