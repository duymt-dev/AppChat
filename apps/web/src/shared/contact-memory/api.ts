// Trí nhớ khách + tóm tắt 360° (TIP-015b) — dùng chung Khách hàng và Hộp thư (không import chéo feature). Key `crm` → action
// contact.remember / memory_forget (invalidates `crm`) làm mới khối "AI ghi nhớ" cả hai nơi.
import { queryOptions } from '@tanstack/react-query';
import type { ContactMemoryDto } from '@appchat/shared';
import { transport } from '../api/client';

export const contactMemoryQuery = (id: string) =>
  queryOptions({ queryKey: ['crm', 'contact-memory', id], queryFn: () => transport.get<ContactMemoryDto>(`/contacts/${id}/memory`) });
