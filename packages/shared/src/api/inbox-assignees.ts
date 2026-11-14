// Ứng viên phụ trách hội thoại (TIP-025b §B.6) — shape dùng chung api ↔ web ↔ mock. Người: thành viên đang hoạt động + số hội thoại đang mở
// (open / pending / snoozed, chưa lưu trữ / ẩn — cùng nghĩa "tải" của chia khách 042b). Agent: đang chạy (active), nhận đúng loại kênh của
// hội thoại, phiên bản đang chạy + tải mở. Trang theo cursor; không thu hẹp ở trang đầu. `co_assignee` = đồng phụ trách (thêm bằng tay
// qua conversation.add_assignee, mirror D32) — tách khỏi `current` (phụ trách CHÍNH, conversation.assign).
import { z } from 'zod';

export const ASSIGNEE_PAGE = 30;

export const assigneeCandidateSchema = z.object({
  kind: z.enum(['user', 'agent']),
  id: z.string(),
  name: z.string(),
  /** Người: tên vai trò; agent: nhãn vai trò agent. */
  role: z.string(),
  load: z.number().int(),
  current: z.boolean(),
  /** Đã là đồng phụ trách (conversation_assignee) — khác `current` (phụ trách chính). */
  co_assignee: z.boolean(),
  /** Agent: phiên bản đang chạy. */
  version: z.number().int().optional(),
});

export const assigneeCandidatesSchema = z.object({
  data: z.array(assigneeCandidateSchema),
  next_cursor: z.string().nullable(),
});
export type AssigneeCandidateDto = z.infer<typeof assigneeCandidateSchema>;
export type AssigneeCandidatesDto = z.infer<typeof assigneeCandidatesSchema>;
