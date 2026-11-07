// Hàng chờ duyệt (`GET /v1/approvals?status=` — FE `ApprovalRow`, màn Trợ lý › Cần duyệt): pending (partial index
// `approval_request_status_requested_at_idx` theo status) / đã duyệt (gồm sửa & duyệt) / từ chối / hết hạn, mới nhất trước, ≤ 100
// dòng. `can_decide` = có `approvals.decide` VÀ permission duyệt của action gốc. Pending đã quá hạn (job hết hạn chưa chạy) vào tab
// Hết hạn, không vào Chờ duyệt. `fields` = trường cấp 1 kiểu chuỗi / số / boolean của input schema action gốc (nút "Sửa & duyệt").
import { registry, type ActionDef } from '@appchat/actions';
import { can, isPermissionKey, type ApprovalRowDto, type AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { inputSchemaOf } from '../runs/tools';

const TABS = ['pending', 'approved', 'rejected', 'expired'] as const;
export type ApprovalTab = (typeof TABS)[number] | 'all';
export const isApprovalTab = (v: string): v is ApprovalTab => v === 'all' || (TABS as readonly string[]).includes(v);
const DEFS = new Map(registry.map((a) => [a.id, a]));

/** Ngày / giờ theo múi giờ workspace: hôm nay / hôm qua / 2 ngày / 3 ngày / cũ hơn (= 7 ngày qua — nhãn FE). */
function dayOf(at: Date, now: Date, timeZone: string): { day: ApprovalRowDto['day']; time: string } {
  const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const diff = Math.round((Date.parse(ymd(now)) - Date.parse(ymd(at))) / 86_400_000);
  const day = diff <= 0 ? 'today' : diff === 1 ? 'yesterday' : diff === 2 ? '2d' : diff === 3 ? '3d' : '7d';
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(at);
  return { day, time };
}

type Field = ApprovalRowDto['fields'][number];
const SCALAR: Record<string, Field['type']> = { string: 'string', number: 'number', integer: 'number', boolean: 'boolean' };

/** Trường sửa được của input action gốc (cấp 1, kiểu vô hướng; mảng / object giữ nguyên khi sửa). */
export function editableFields(def: ActionDef | undefined): Field[] {
  if (!def) return [];
  const s = inputSchemaOf(def) as { properties?: Record<string, { type?: string | string[] }>; required?: string[] };
  const req = new Set(s.required ?? []);
  const out: Field[] = [];
  for (const [key, p] of Object.entries(s.properties ?? {})) {
    const t = SCALAR[Array.isArray(p.type) ? (p.type.find((x) => x !== 'null') ?? '') : (p.type ?? '')];
    if (t) out.push({ key, type: t, required: req.has(key) });
  }
  return out;
}

const whereOf = (tab: ApprovalTab, now: Date) => {
  if (tab === 'pending') return { status: 'pending' as const, expiresAt: { gt: now } };
  if (tab === 'approved') return { status: { in: ['approved' as const, 'edited' as const] } };
  if (tab === 'expired') return { OR: [{ status: 'expired' as const }, { status: 'pending' as const, expiresAt: { lte: now } }] };
  if (tab === 'rejected') return { status: 'rejected' as const };
  return {};
};

type Row = Awaited<ReturnType<TenantDb['approvalRequest']['findMany']>>[number];

/** Dòng hàng duyệt cho một tập yêu cầu đã chọn (dùng chung màn Cần duyệt + thẻ Hộp thư — TIP-025b §G). */
export async function approvalRows(db: Pick<TenantDb, 'aiAgent'>, authz: AuthzContext, rows: Row[], now: Date, timeZone: string): Promise<ApprovalRowDto[]> {
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
    status: r.status === 'pending' && r.expiresAt <= now ? 'expired' : r.status,
    can_decide: decide && (!isPermissionKey(r.permission) || can(authz, r.permission)),
    input: (r.input ?? {}) as Record<string, unknown>,
    fields: editableFields(DEFS.get(r.actionId)),
    ...(r.decisionNote ? { note: r.decisionNote } : {}),
    ...(r.status === 'approved' || r.status === 'edited' ? { executed: !!r.executedAt } : {}),
  }));
}

export async function listApprovals(db: Pick<TenantDb, 'approvalRequest' | 'aiAgent'>, authz: AuthzContext, tab: ApprovalTab, now: Date, timeZone: string): Promise<ApprovalRowDto[]> {
  const rows = await db.approvalRequest.findMany({ where: whereOf(tab, now), orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }], take: 100 });
  return approvalRows(db, authz, rows, now, timeZone);
}
