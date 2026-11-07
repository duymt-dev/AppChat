// Ngữ cảnh form sửa khách (TIP-025b §D.3) — đọc, không ghi; form toàn cục (ContactFormHost) và Hộp thư dùng chung. Không cấp cho agent.
import { z } from 'zod';
import { contactEditContextSchema } from '@appchat/shared';
import { defineAction } from './define';

export const contactGetEditContext = defineAction({
  id: 'contact.get_edit_context',
  module: 'crm',
  title: 'actions.contact.get_edit_context.title',
  description: 'Read the editable fields, current version and owner of one contact for the edit form (hidden fields are omitted). Example: {"contact_id":"ct_lan"}',
  input: z.object({ contact_id: z.string().min(1) }),
  output: contactEditContextSchema,
  permission: 'crm.view',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});
