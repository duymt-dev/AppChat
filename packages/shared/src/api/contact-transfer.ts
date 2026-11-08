// Trạng thái một lần chuyển phụ trách (TIP-015d §2.8): `GET /v1/contacts/:id/transfers/:transferId` + action `contact.transfer_status`
// dùng chung reader. Số đếm / trạng thái cần crm.reassign + scope khách hiện tại; chi tiết từng bản ghi chỉ domain người xem có quyền xem
// (không tiền, không nội dung, không ghi chú). Phân trang theo cursor, mặc định 30, tối đa 100.
import { z } from 'zod';

export const transferItemSchema = z.object({
  domain: z.enum(['conversation', 'quote', 'appointment']),
  entity_id: z.string(),
  /** Mã hiển thị (báo giá / lịch hẹn) hoặc tiêu đề hội thoại — chỉ khi xem được domain đó. */
  label: z.string(),
});

export const contactTransferStatusSchema = z.object({
  transfer_id: z.string(),
  contact_id: z.string(),
  status: z.enum(['applied', 'undone']),
  from_user_id: z.string().nullable(),
  to_user_id: z.string(),
  moved: z.object({ conversations: z.number(), quotes: z.number(), appointments: z.number() }),
  created_at: z.string(),
  undone_at: z.string().nullable(),
  items: z.array(transferItemSchema),
  next_cursor: z.string().nullable(),
});
export type ContactTransferStatusDto = z.infer<typeof contactTransferStatusSchema>;
