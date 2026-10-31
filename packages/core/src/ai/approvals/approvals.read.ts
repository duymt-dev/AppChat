// Hàng chờ duyệt (`GET /v1/approvals?status=` — FE `ApprovalRow`, màn Trợ lý › Cần duyệt): pending (partial index
// `approval_request_status_requested_at_idx` theo status) / đã duyệt / từ chối, mới nhất trước, ≤ 100 dòng. `can_decide` = có
// `approvals.decide` VÀ permission duyệt của action gốc. Pending đã quá hạn hiện như hết hạn → không trả trong tab Chờ duyệt.
import { can, isPermissionKey, type ApprovalRowDto, type AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';

const STATUS = ['pending', 'approved', 'rejected'] as const;
export type ApprovalTab = (typeof STATUS)[number] | 'all';
export const isApprovalTab = (v: string): v is ApprovalTab => v === 'all' || (STATUS as readonly string[]).includes(v);

/** Ngày / giờ theo múi giờ workspace: hôm nay / hôm qua / 2 ngày / 3 ngày / cũ hơn (= 7 ngày qua — nhãn FE). */
function dayOf(at: Date, now: Date, timeZone: string): { day: ApprovalRowDto['day']; time: string } {
  const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const diff = Math.round((Date.parse(ymd(now)) - Date.parse(ymd(at))) / 86_400_000);
  const day = diff <= 0 ? 'today' : diff === 1 ? 'yesterday' : diff === 2 ? '2d' : diff === 3 ? '3d' : '7d';
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(at);
  return { day, time };
}

export async function listApprovals(db: Pick<TenantDb, 'approvalRequest' | 'aiAgent'>, authz: AuthzContext, tab: ApprovalTab, now: Date, timeZone: string): Promise<ApprovalRowDto[]> {
  const rows = await db.approvalRequest.findMany({
    where: tab === 'all' ? { status: { in: [...STATUS] } } : tab === 'pending' ? { status: 'pending', expiresAt: { gt: now } } : { status: tab },
    orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
    take: 100,
  });
  const ids = [...new Set(rows.map((r) => r.agentId).filter((x): x is string => !!x))];
  const agents = new Map((ids.length ? await db.aiAgent.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : []).map((a) => [a.id, a.name]));
  const decide = can(authz, 'approvals.decide');
  return rows.map((r) => ({
    id: r.id,
    action_id: r.actionId,
    risk: r.risk,
    permission: r.permission,
    agent: (r.agentId && agents.get(r.agentId)) || '—',
    title: r.title,
    summary: r.summary,
    reason: r.reason,
    ...dayOf(r.requestedAt, now, timeZone),
    status: r.status === 'approved' || r.status === 'edited' ? 'approved' : r.status === 'pending' ? 'pending' : 'rejected',
    can_decide: decide && (!isPermissionKey(r.permission) || can(authz, r.permission)),
  }));
}
