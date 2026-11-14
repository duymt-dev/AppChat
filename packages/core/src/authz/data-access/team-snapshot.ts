// `team_id` của bản ghi mới (DC-299): chụp lúc tạo, không đổi theo khi người phụ trách đổi nhóm sau đó.
// Thứ tự: nhóm của bản ghi NGUỒN (đề nghị ← đơn, đơn ← báo giá / hợp đồng, hợp đồng ← báo giá, bản sửa ← báo giá gốc) → nhóm DUY NHẤT
// của người phụ trách / được gán. Người ở 0 hoặc ≥ 2 nhóm → null (mơ hồ — không chọn "nhóm đầu tiên"); bản ghi team null chỉ còn
// owner / assignee / quan hệ khách / scope all thấy. Index `team_member_user_idx (user_id) INCLUDE (team_id)`.
import type { TenantTx } from '../../kernel/actions/action-context';

/** Nhóm duy nhất của người dùng (0 hoặc nhiều nhóm → null). */
export async function soleTeamOf(tx: Pick<TenantTx, 'teamMember'>, userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const rows = await tx.teamMember.findMany({ where: { userId }, select: { teamId: true }, take: 2 });
  return rows.length === 1 ? rows[0]!.teamId : null;
}

/** Nhóm cho bản ghi mới: nhóm nguồn (nếu có) → nhóm duy nhất của người phụ trách. */
export async function snapshotTeam(tx: Pick<TenantTx, 'teamMember'>, s: { from?: string | null; owner?: string | null }): Promise<string | null> {
  return s.from ?? soleTeamOf(tx, s.owner);
}
