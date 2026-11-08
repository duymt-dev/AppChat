// Đọc trạng thái chuyển phụ trách (TIP-015d §2.8) — cùng reader với `GET /v1/contacts/:id/transfers/:transferId`. Cho người / Trợ lý biết
// lần chuyển đã commit thật chưa (sau duyệt / hết giờ mạng) thay vì đoán; không tiền, không nội dung.
// `contact.transfer_owner_bulk` (TIP-015d §2.6, 045b annex D): nhiều khách cùng người nhận — MỖI khách một lần chuyển riêng (transaction +
// biên nhận + thông báo của khách đó, công thức con = contact.transfer_owner), kết quả từng khách; ≤ 50 chạy ngay, > 50 việc nền.
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

const moveFlags = z.object({ conversations: z.boolean(), quotes: z.boolean(), appointments: z.boolean() });

export const contactTransferOwnerBulk = defineAction({
  id: 'contact.transfer_owner_bulk',
  module: 'crm',
  title: 'actions.contact.transfer_owner_bulk.title',
  description:
    'Transfer many contacts to one new owner (managers only). Each contact is its own atomic transfer with its own result (transferred / already owner / failed); up to 50 run now, more run as a background job. From the Assistant, an agent or a task this ALWAYS goes to human approval. Example: {"contact_ids":["ct_lan","ct_bao"],"to_user_id":"u_minh","move":{"conversations":true,"quotes":true,"appointments":false}}',
  input: z.object({ contact_ids: z.array(z.string().min(1)).min(1).max(1000), to_user_id: z.string().min(1), move: moveFlags, note: z.string().max(500).optional() }),
  output: z.object({
    transferred: z.number().int(),
    skipped: z.number().int(),
    failed: z.number().int(),
    items: z.array(z.object({ id: z.string(), status: z.enum(['transferred', 'skipped_already_owner', 'failed']), transfer_id: z.string().nullable(), error: z.string().nullable() })),
  }),
  permission: 'crm.reassign',
  risk: 'write',
  bulk: true,
  agentGrantable: false,
  requiredApprovalSources: ['assistant', 'agent', 'task'],
  invalidates: ['crm', 'inbox', 'quotes', 'calendar', 'data-jobs'],
});
