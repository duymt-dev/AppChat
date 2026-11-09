// Vòng đời khách (TIP-015f §1.4): khôi phục khách đã xoá mềm trong 30 ngày + đọc thùng rác theo scope. Khôi phục cần crm.delete (cùng điều
// kiện xoá hiện tại — scope ghi CRM; watcher / collaborator-only không đủ), không cấp cho agent; đọc thùng rác cần crm.delete VÀ crm.view
// (handler kiểm thêm crm.view + scope). Không cấp quyền tự động; khôi phục không đổi người phụ trách / tiền / giai đoạn.
import { z } from 'zod';
import { contactRestoreResultSchema, deletedContactsPageSchema } from '@appchat/shared';
import { defineAction } from './define';

export const contactRestore = defineAction({
  id: 'contact.restore',
  module: 'crm',
  title: 'actions.contact.restore.title',
  description:
    'Restore a soft-deleted customer within 30 days of deletion (same eligibility as delete: crm.delete + current write scope). Only restores the record itself — never changes owner, money, stage or reconnects old AI drafts. Fails after 30 days, for merged sources, or when a live customer now holds the same phone. Send if_version from contact.deleted_list. Example: {"contact_id":"0190f000-0000-7000-8000-000000000001","if_version":4}',
  input: z.object({ contact_id: z.string().min(1).max(64), if_version: z.number().int().positive().optional() }),
  output: contactRestoreResultSchema,
  permission: 'crm.delete',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['crm', 'inbox'],
});

export const contactDeletedList = defineAction({
  id: 'contact.deleted_list',
  module: 'crm',
  title: 'actions.contact.deleted_list.title',
  description:
    'List soft-deleted customers you may restore (current scope, newest deletion first): code, name, deleted_at, restore_until, version, status restorable / expired / blocked. Example: {"q":"Lan","limit":20}',
  input: z.object({ q: z.string().trim().max(120).optional(), cursor: z.string().max(200).optional(), limit: z.number().int().min(1).max(100).optional() }),
  output: deletedContactsPageSchema,
  permission: 'crm.delete',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});
