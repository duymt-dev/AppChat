'use client';
// Trường bị ẩn theo quyền (TIP-045b annex C): đọc `hidden_fields` server trả về — FE KHÔNG tự suy từ vai trò, không coi khoá vắng mặt
// là 0. Dùng cho cột bảng / ô chi tiết / form (ô bị ẩn không gửi lên khi lưu).
import { isFieldHidden } from '@appchat/shared';

type Row = { hidden_fields?: string[] } | null | undefined;

export function useFieldVisibility(row: Row) {
  return { hidden: (field: string) => isFieldHidden(row, field) };
}

/** Có dòng nào trong danh sách bị ẩn trường này không (ẩn cả cột khi mọi dòng bị ẩn). */
export const allHidden = (rows: readonly Row[], field: string) => rows.length > 0 && rows.every((r) => isFieldHidden(r, field));
