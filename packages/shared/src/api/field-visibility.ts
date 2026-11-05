// Hợp đồng trường bị ẩn theo quyền (TIP-045b annex C): server BỎ HẲN trường hệ thống bị ẩn (giá vốn …) và key tuỳ biến người xem không
// được thấy; `hidden_fields` liệt kê trường hệ thống đã bỏ để FE hiện "không có quyền xem" — không bao giờ hiện 0 / rỗng thay thế, không
// tự tính tổng / lợi nhuận từ giá trị thiếu.
import { z } from 'zod';

/** Tên trường hệ thống bị ẩn (vd. `cost`). Vắng mặt = không ẩn gì. */
export const hiddenFieldsSchema = z.array(z.string()).optional();

/** Trường có bị ẩn với người xem không (khoá vắng mặt + có trong `hidden_fields`). */
export const isFieldHidden = (row: { hidden_fields?: string[] } | null | undefined, field: string) => !!row?.hidden_fields?.includes(field);
