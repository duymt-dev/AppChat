// Đọc trạng thái chuyển phụ trách (TIP-015d §2.8) — cùng reader với `GET /v1/contacts/:id/transfers/:transferId`. Cho người / Trợ lý biết
// lần chuyển đã commit thật chưa (sau duyệt / hết giờ mạng) thay vì đoán; không tiền, không nội dung. Bulk wrapper ở pha sau.
import { z } from 'zod';
import { contactTransferStatusSchema } from '@appchat/shared';
import { defineAction } from './define';

export const contactTransferStatus = defineAction({
  id: 'contact.transfer_status',
  module: 'crm',
  title: 'actions.contact.transfer_status.title',
  description:
    'Read the committed result of one contact owner transfer (status applied / undone, from / to owner, moved counts, paged moved records you may see). Use it after approval or an uncertain result — never claim a transfer happened without it. Example: {"contact_id":"0190f000-0000-7000-8000-000000000001","transfer_id":"0190f000-0000-7000-8000-0000000000c1"}',
  input: z.object({ contact_id: z.string().min(1).max(64), transfer_id: z.string().min(1).max(64), cursor: z.string().max(200).optional(), limit: z.number().int().min(1).max(100).optional() }),
  output: contactTransferStatusSchema,
  permission: 'crm.reassign',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
