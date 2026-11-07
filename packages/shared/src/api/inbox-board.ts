// Bảng tin nhóm (TIP-025b §A.7) — shape dùng chung api ↔ web ↔ mock. Mỗi mục là tin THẬT trong hội thoại (sau mốc xoá lịch sử, chưa xoá /
// thu hồi): tin ghim, ghi chú nội bộ (note.add của hội thoại này — không phải ghi chú CRM), ảnh, tệp, link http(s) trong nội dung. Tệp chỉ
// trả tên / loại / kích thước + link ký (không URL gốc nhà cung cấp). Link chỉ chữ (không tự tải trước). Trang theo cursor mờ.
import { z } from 'zod';

export const GROUP_BOARD_KINDS = ['media', 'files', 'links', 'notes'] as const;
export type GroupBoardKind = (typeof GROUP_BOARD_KINDS)[number];
export const GROUP_BOARD_PAGE = 24;

export const groupBoardItemSchema = z.object({
  message_id: z.string(),
  at: z.string(),
  sender: z.string(),
  /** Ảnh / tệp: tên + loại + kích thước + link ký; link: URL http(s) đã kiểm; ghi chú: nội dung chữ. */
  name: z.string().optional(),
  mime: z.string().optional(),
  size: z.number().int().optional(),
  url: z.string().optional(),
  text: z.string().optional(),
});

export const groupBoardSchema = z.object({
  pinned: groupBoardItemSchema.nullable(),
  kind: z.enum(GROUP_BOARD_KINDS),
  items: z.array(groupBoardItemSchema),
  next_cursor: z.string().nullable(),
});
export type GroupBoardDto = z.infer<typeof groupBoardSchema>;
export type GroupBoardItemDto = z.infer<typeof groupBoardItemSchema>;
