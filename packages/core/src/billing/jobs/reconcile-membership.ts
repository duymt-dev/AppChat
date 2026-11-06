// Đối soát ghế (TIP-045b annex E): thành viên active + lời mời còn hạn ở DB nền tảng so với `plan.max_users`. Chỉ đọc dữ liệu đã chốt trước
// mốc cắt (lời mời / thành viên tạo sau mốc không tính — đang có thao tác, không phải lệch). Vượt hạn mức → finding `mismatch`.
import type { PlatformDb } from '@appchat/db';
import type { Finding, ReconcileInput } from './reconcile-types';

type Db = Pick<PlatformDb, 'membership' | 'invite'>;

export async function checkSeats(db: Db, r: ReconcileInput): Promise<Finding[]> {
  if (r.limits.users === null) return [];
  const before = { lte: r.cutoff };
  const [members, invites] = await Promise.all([
    db.membership.count({ where: { workspaceId: r.workspaceId, status: 'active', createdAt: before } }),
    db.invite.count({ where: { workspaceId: r.workspaceId, acceptedAt: null, revokedAt: null, expiresAt: { gt: r.cutoff }, createdAt: before } }),
  ]);
  if (members + invites <= r.limits.users) return [];
  return [{ check: 'membership_seats', reference: 'users', severity: 'mismatch', detail: { members, invites, limit: r.limits.users } }];
}
