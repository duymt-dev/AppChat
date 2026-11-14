// Đọc nhóm phẳng (TIP-042, `GET /v1/teams` — mảng `data`, không phân trang: picker đọc đủ). Ghi qua useAction('team.create' | 'team.update' |
// 'team.set_members') — invalidates `teams` + `members` + `me` làm mới danh sách và quyền phạm vi nhóm.
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Team } from '../roles.types';

export const teamsQuery = () => queryOptions({ queryKey: ['teams', 'list'], queryFn: () => transport.get<Team[]>('/teams') });
