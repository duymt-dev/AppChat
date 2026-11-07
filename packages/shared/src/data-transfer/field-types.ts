// Kiểu trường nhập (TIP-038b) — tách riêng để registry.ts và fields.ts cùng dùng, không import vòng.

/** Kiểu giá trị sau chuẩn hoá (kiểm tất định ở core, không để model tự sửa giá trị). */
export type TransferFieldType = 'text' | 'phone' | 'email' | 'money' | 'number' | 'date' | 'enum';

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
}
