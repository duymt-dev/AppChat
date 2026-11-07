// Mock thẻ duyệt theo hội thoại (TIP-025b §G): GET /conversations/:id/approvals cùng hợp đồng server — hội thoại `c_hieu` gắn yêu cầu
// duyệt báo giá của fixture Trợ lý (chung dòng với màn Cần duyệt nên duyệt / từ chối ở đâu cũng cập nhật cả hai); không có
// approvals.decide → rỗng.
import { authzForRole, can, type PermissionKey } from '@appchat/shared';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

const LINKED: Record<string, number[]> = { c_hieu: [1] };
const can_ = (db: MockDb, p: string) => can(authzForRole(db.role, 'u_tram'), p as PermissionKey);

/** /conversations/:id/approvals. */
export const inboxApprovalsParamRoute = (path: string): MockRoute | null => {
  const m = path.match(/^\/conversations\/([^/]+)\/approvals$/);
  if (!m) return null;
  return (db) => {
    if (!can_(db, 'approvals.decide')) return { items: [], pending: 0 };
    const items = (LINKED[m[1]!] ?? [])
      .map((i) => db.assistant.approvals[i])
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a) => ({ ...a, can_decide: can_(db, a.permission), ...(a.status === 'approved' || a.status === 'edited' ? { executed: false } : {}) }));
    return { items, pending: items.filter((a) => a.status === 'pending').length };
  };
};
