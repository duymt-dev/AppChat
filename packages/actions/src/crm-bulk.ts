// contact.bulk_update (TIP-045b annex D, concurrency §7): sửa nhiều khách một lần theo tập id CHỐT (người chọn) — mọi trường
// `contact.update` cho phép + thêm / bỏ thẻ; không đổi người phụ trách / xoá / tiền (action riêng). ≤ 50 bản ghi chạy ngay, trả kết quả
// TỪNG bản ghi; > 50 → 202 `job_accepted` (việc nền `data_job`, biên nhận từng bản ghi). Quyền + scope kiểm lại từng bản ghi.
import { z } from 'zod';
import { defineAction } from './define';
import { contactBulkPatch } from './crm-schemas';

export const contactBulkUpdate = defineAction({
  id: 'contact.bulk_update',
  module: 'crm',
  title: 'actions.contact.bulk_update.title',
  description:
    'Update many contacts at once (same patch for each): any field contact.update allows plus add/remove tags; cannot change owner, delete or touch money. Up to 50 run now with a per-contact result; more run as a background job. Example: {"contact_ids":["ct_lan","ct_bao"],"patch":{"group":"vip","add_tags":["Khách quen"]}}',
  input: z.object({ contact_ids: z.array(z.string().min(1)).min(1).max(5000), patch: contactBulkPatch }),
  output: z.object({
    updated: z.number().int(),
    failed: z.number().int(),
    items: z.array(z.object({ id: z.string(), status: z.enum(['done', 'failed', 'skipped']), error: z.string().nullable() })),
  }),
  permission: 'crm.edit',
  risk: 'write',
  bulk: true,
  agentGrantable: false,
  invalidates: ['crm', 'data-jobs'],
});
