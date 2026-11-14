// Chunk nguồn của kỹ năng tiện ích (TIP-019c §2.2): id do server cấp, nhãn cho model, binding để kiểm lại nguồn trước khi trả kết quả.
export interface SourceChunk {
  id: string;
  text: string;
  /** Nhãn cho model (vai người gửi / loại dữ kiện) — không chứa danh tính bên thứ ba. */
  label: string;
  binding: Record<string, string>;
}
