// Từ điển gợi ý danh mục ticket (TIP-034b §1, DC-215): đọc / thay cả bộ cấu hình (settings.manage, không cấp agent — tool cấu hình) và
// đọc gợi ý cho người xử lý ticket (ticket.view — kỹ năng AI đọc, Builder chọn cấp; không tự cấp). Ticket vẫn nhận danh mục tự do.
import { z } from 'zod';
import { CATEGORY_LABELS_MAX, listExportResultSchema } from '@appchat/shared';
import { defineAction } from './define';

const config = z.object({ version: z.number().int(), labels: z.array(z.string()), default: z.string() });

export const ticketCategoriesGet = defineAction({
  id: 'ticket_categories.get',
  module: 'support',
  title: 'actions.ticket_categories.get.title',
  description: 'Read the configured ticket category suggestions (ordered; first = default for new tickets) and their version. Version 0 = not configured yet (prototype defaults). Example: {}',
  input: z.object({}),
  output: config,
  permission: 'settings.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const ticketCategoriesReplace = defineAction({
  id: 'ticket_categories.replace',
  module: 'support',
  title: 'actions.ticket_categories.replace.title',
  description:
    'Replace the whole ordered list of ticket category suggestions (1–100 labels, each 1–60 characters, unique ignoring case; first = default). Needs the current version (if_version) from ticket_categories.get. Existing tickets keep their category. Example: {"labels":["Hoàn tiền","Giao hàng","Khiếu nại"],"if_version":3}',
  input: z.object({ labels: z.array(z.string().max(400)).max(CATEGORY_LABELS_MAX * 2), if_version: z.number().int().min(0) }),
  output: config,
  permission: 'settings.manage',
  risk: 'config',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['settings', 'tickets'],
});

export const ticketCategorySuggestions = defineAction({
  id: 'ticket.category_suggestions',
  module: 'support',
  title: 'actions.ticket.category_suggestions.title',
  description:
    'List ticket category suggestions: the configured labels plus a page of categories already used on tickets the caller can see (max 50 per page, pass next_cursor for more). Categories stay free text. Example: {}',
  input: z.object({ cursor: z.string().max(400).optional() }),
  output: z.object({ config, used: z.array(z.string()), next_cursor: z.string().nullable() }),
  permission: 'ticket.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});

/**
 * Xuất bộ gợi ý danh mục ra CSV / XLSX (TIP-034b §4.1): CHỈ bộ cấu hình (vị trí + nhãn) — không nhãn lấy từ ticket, không id / dữ liệu khách.
 * Tệp qua việc dữ liệu (`data_job`, tải `/v1/data-jobs/:id/download`, chỉ người tạo, 24 giờ). Nhập lại bằng transfer.plan entity
 * `ticket_category_suggestions` (cùng engine 038b).
 */
export const ticketCategoriesExport = defineAction({
  id: 'ticket_categories.export',
  module: 'support',
  title: 'actions.ticket_categories.export.title',
  description:
    'Export the configured ticket category suggestions (position + label, in order; never labels taken from tickets) as an XLSX or CSV file the caller downloads. Import a file back with transfer.plan entity "ticket_category_suggestions" (replaces the whole list after confirmation). Example: {"format":"csv"}',
  input: z.object({ format: z.enum(['xlsx', 'csv']).optional() }),
  output: listExportResultSchema,
  permission: 'settings.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});
