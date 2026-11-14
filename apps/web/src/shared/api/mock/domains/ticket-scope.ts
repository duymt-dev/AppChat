// Phạm vi Ticket của mock (scope support theo vai trò mock): ticket chưa xoá, `all` thấy hết, `own` chỉ ticket mình phụ trách. Tách riêng
// để danh sách Ticket và nhãn đã dùng của từ điển danh mục (TIP-034b) dùng CÙNG một vị từ mà không import vòng.
import { ROLE_DEFS } from '@appchat/shared';
import type { MockDb } from '../store';
import { ME } from './customers';

type Scoped = { deleted?: boolean; assignee_user_id: string | null };

export const ticketVisible = (db: MockDb, t: Scoped): boolean => {
  if (t.deleted) return false;
  const scope = ROLE_DEFS[db.role].scope.support;
  return scope === 'all' || (scope === 'own' && t.assignee_user_id === ME);
};
