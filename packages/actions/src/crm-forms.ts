// Ngữ cảnh form sửa khách (TIP-025b §D.3) — đọc, không ghi; form toàn cục (ContactFormHost) và Hộp thư dùng chung. Không cấp cho agent.
import { z } from 'zod';
import { TIMELINE_EXPORT_COLUMNS, TIMELINE_TYPES, contactEditContextSchema } from '@appchat/shared';
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

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Xuất lịch sử một khách (TIP-025b §D.6) — CHỈ xuất, không có nhập lịch sử. Cùng quyền đọc với Hồ sơ 360° + `crm.export`; lọc ngày (theo
 * múi giờ workspace) / loại / thứ tự, cột chọn trong allowlist. ≤ 5.000 dòng trả CSV ngay, > 5.000 → 202 việc nền + tệp tải 24 giờ. Đường
 * tay (nút CSV) không gọi model / không tốn Credit; Trợ lý chỉ chọn bộ lọc, không SQL.
 */
export const contactTimelineExport = defineAction({
  id: 'contact.history_export',
  module: 'crm',
  title: 'actions.contact.history_export.title',
  description:
    'Export one customer\'s history (timeline) as CSV — filters: date range (workspace time zone, inclusive), event types, order, columns. Example: {"contact_id":"ct_lan","from":"2026-10-01","to":"2026-10-31","types":["quote","order"]}',
  input: z.object({
    contact_id: z.string().min(1),
    from: day.optional(),
    to: day.optional(),
    types: z.array(z.enum(TIMELINE_TYPES)).max(TIMELINE_TYPES.length).optional(),
    order: z.enum(['newest', 'oldest']).optional(),
    columns: z.array(z.enum(TIMELINE_EXPORT_COLUMNS)).min(1).max(TIMELINE_EXPORT_COLUMNS.length).optional(),
  }),
  output: z.object({ file_name: z.string(), mime: z.literal('text/csv'), rows: z.number().int(), total: z.number().int(), excluded: z.number().int(), content: z.string() }),
  permission: 'crm.export',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});
