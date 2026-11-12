// Đọc từ điển gợi ý danh mục ticket (TIP-034b §3.2): `GET /settings/ticket-categories` (settings.manage) — CHỈ bộ cấu hình. Khoá đầu
// 'settings' khớp `invalidates` của `ticket_categories.replace`; WS `ticket_categories.config` cũng làm mới khoá này.
import { queryOptions } from '@tanstack/react-query';
import type { TicketCategoryConfig } from '@appchat/shared';
import { transport } from '@/shared/api/client';

export const ticketCategoriesQuery = () =>
  queryOptions({
    queryKey: ['settings', 'ticket-categories'],
    queryFn: () => transport.get<TicketCategoryConfig>('/settings/ticket-categories'),
  });
