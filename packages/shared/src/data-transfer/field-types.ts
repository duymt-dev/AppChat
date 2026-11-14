// Kiểu trường nhập (TIP-038b) — tách riêng để registry.ts và fields.ts cùng dùng, không import vòng.

/** Kiểu giá trị sau chuẩn hoá (kiểm tất định ở core, không để model tự sửa giá trị). */
/** `description_doc` (TIP-027b): JSON theo schema đóng của mô tả có định dạng — không HTML / không đoán Markdown. */
export type TransferFieldType = 'text' | 'phone' | 'email' | 'money' | 'number' | 'date' | 'enum' | 'description_doc';

export interface TransferField {
  key: string;
  type: TransferFieldType;
  required?: boolean;
  max?: number;
  options?: readonly string[];
  /** Giá trị enum viết kiểu người dùng (không dấu, thường) → giá trị chuẩn — "Dịch vụ" → `service`. */
  optionAliases?: Readonly<Record<string, string>>;
  /** `item` = trường của dòng hàng (commerce, nhiều dòng cùng khoá nhóm); mặc định trường đầu chứng từ. */
  scope?: 'item';
  /** Tên cột thường gặp (không dấu, thường) — đoán ánh xạ thủ công / gợi ý cho model. */
  aliases: readonly string[];
  /**
   * Ghi chú hợp đồng cột (TIP-027b): `plain_projection` = chữ thuần dẫn ra từ tài liệu định dạng (không mang định dạng); `structured_json` =
   * JSON schema đóng khứ hồi định dạng. Mẫu / schema / màn ánh xạ hiển thị để người nhập biết cột nào giữ định dạng.
   */
  hint?: 'plain_projection' | 'structured_json';
  /** Mã cảnh báo không chặn cột này có thể sinh ở xem trước (`<key>_warning: <code>`) — người dùng thấy trước khi xác nhận. */
  warnings?: readonly string[];
}
