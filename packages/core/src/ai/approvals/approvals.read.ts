// Hàng chờ duyệt (`GET /v1/approvals?status=` — FE `ApprovalRow`, màn Trợ lý › Cần duyệt): pending (partial index
// `approval_request_status_requested_at_idx` theo status) / đã duyệt (gồm sửa & duyệt) / từ chối / hết hạn, mới nhất trước, ≤ 100
// dòng. `can_decide` = có `approvals.decide` VÀ permission duyệt của action gốc. Pending đã quá hạn (job hết hạn chưa chạy) vào tab
// Hết hạn, không vào Chờ duyệt. `fields` = trường cấp 1 kiểu chuỗi / số / boolean của input schema action gốc (nút "Sửa & duyệt").
import { registry, type ActionDef } from '@appchat/actions';
import { can, isPermissionKey, type ApprovalRowDto, type AuthzContext } from '@appchat/shared';
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import { decidableIds, visibleApprovalSql } from './domain-authorization';
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

type Row = Awaited<ReturnType<TenantDb['approvalRequest']['findMany']>>[number];

/** Dòng hàng duyệt cho một tập yêu cầu đã chọn (dùng chung màn Cần duyệt + thẻ Hộp thư — TIP-025b §G). */
export async function approvalRows(db: Pick<TenantDb, 'aiAgent' | '$queryRaw'>, authz: AuthzContext, rows: Row[], now: Date, timeZone: string): Promise<ApprovalRowDto[]> {
  const ids = [...new Set(rows.map((r) => r.agentId).filter((x): x is string => !!x))];
  const agents = new Map((ids.length ? await db.aiAgent.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : []).map((a) => [a.id, a.name]));
  const decide = can(authz, 'approvals.decide');
  // TIP-015d: quyết được theo domain (vd. chuyển phụ trách cần scope ghi khách hiện tại) — không chỉ theo permission.
  const domainOk = decide ? await decidableIds(db, authz, rows) : new Set<string>();
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
    can_decide: decide && domainOk.has(r.id) && (!isPermissionKey(r.permission) || can(authz, r.permission)),
    input: (r.input ?? {}) as Record<string, unknown>,
    fields: editableFields(DEFS.get(r.actionId)),
    ...(r.decisionNote ? { note: r.decisionNote } : {}),
    ...(r.status === 'approved' || r.status === 'edited' ? { executed: !!r.executedAt } : {}),
  }));
}

const tabSql = (tab: ApprovalTab, now: Date): Prisma.Sql => {
  if (tab === 'pending') return Prisma.sql`ar.status = 'pending' AND ar.expires_at > ${now}`;
  if (tab === 'approved') return Prisma.sql`ar.status IN ('approved', 'edited')`;
  if (tab === 'expired') return Prisma.sql`(ar.status = 'expired' OR (ar.status = 'pending' AND ar.expires_at <= ${now}))`;
  if (tab === 'rejected') return Prisma.sql`ar.status = 'rejected'`;
  return Prisma.sql`TRUE`;
};

/** TIP-015d: vị từ thấy được theo domain áp TRƯỚC ORDER BY / LIMIT (dòng ẩn không chiếm chỗ trang, không lộ số lượng). */
export async function listApprovals(db: Pick<TenantDb, 'approvalRequest' | 'aiAgent' | '$queryRaw'>, authz: AuthzContext, tab: ApprovalTab, now: Date, timeZone: string): Promise<ApprovalRowDto[]> {
  const ids = await db.$queryRaw<{ id: string }[]>`
    SELECT ar.id FROM approval_request ar WHERE ${tabSql(tab, now)} AND ${visibleApprovalSql(authz)} ORDER BY ar.requested_at DESC, ar.id DESC LIMIT 100`;
  if (!ids.length) return [];
  const byId = new Map((await db.approvalRequest.findMany({ where: { id: { in: ids.map((r) => r.id) } } })).map((r) => [r.id, r]));
  return approvalRows(db, authz, ids.map((r) => byId.get(r.id)!).filter(Boolean), now, timeZone);
}
