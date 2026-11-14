// Đọc cấu hình chia lead (TIP-042b, `GET /v1/settings/lead-routing` — crm.reassign): rule mặc định + ghi đè từng tài khoản kênh, ứng
// viên (thành viên, nhóm, tài khoản kênh). Ghi qua useAction('lead_routing.update') — invalidates `lead_routing` + `channels`.
import { queryOptions } from '@tanstack/react-query';
import type { LeadRoutingDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';

export const leadRoutingQuery = () => queryOptions({ queryKey: ['lead_routing', 'settings'], queryFn: () => transport.get<LeadRoutingDto>('/settings/lead-routing') });
