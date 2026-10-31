// Nhật ký hành động (Blueprint §4.4 `GET /v1/action-logs`, FE `ActionLogScreen` — prototype L1480): action_log = audit log của
// workspace. Theo quyền: người có `audit.view` (Owner) thấy hết; người khác chỉ thấy việc của mình (tự làm hoặc Trợ lý / agent làm
// thay mình — `on_behalf_of_user_id`). Lọc `kind` (create / update / send / export / delete) · `status` (done / pending / undone) ·
// `day` (today / yesterday / 7d — theo giờ VN) · `q` (không dấu trên tiêu đề / đối tượng / action). Bỏ action đọc (risk read).
// "Đang chờ" = yêu cầu duyệt còn hạn (TIP-024). Index: `action_log_created_at_cover_idx (created_at DESC) INCLUDE (action_id,
// actor_type, status)` + deferred join tới hàng đầy đủ; chờ duyệt: `approval_request_status_requested_at_idx`.
import { registry } from '@appchat/actions';
import { TenantSql, type TenantDb } from '@appchat/db';
import { can, foldText, interpolate, serverMessages, type ActionLogRowDto, type AuthzContext } from '@appchat/shared';
import { confirmCard } from './card';

export const LOG_KINDS = ['create', 'update', 'send', 'export', 'delete'] as const;
export const LOG_STATUSES = ['done', 'pending', 'undone'] as const;
export const LOG_DAYS = ['today', 'yesterday', '7d'] as const;
const LIMIT = 200;
const VN_OFFSET_MS = 7 * 3600_000;
const DAY_MS = 86_400_000;

const DEFS = new Map(registry.map((a) => [a.id, a]));
const NAME_KEYS = ['full_name', 'name', 'title', 'subject', 'number', 'code'];
type Kind = (typeof LOG_KINDS)[number];

export interface LogFilter {
  kind?: Kind;
  status?: (typeof LOG_STATUSES)[number];
  day?: (typeof LOG_DAYS)[number];
  q?: string;
  locale?: string;
}

export const kindOf = (actionId: string, risk: string): Kind =>
  risk === 'delete' ? 'delete' : risk === 'send' ? 'send' : /\.export$|^insight\./.test(actionId) ? 'export' : /\.create(_\w+)?$/.test(actionId) ? 'create' : 'update';

/** Nửa đêm VN của ngày chứa `now` (UTC ms). */
const vnMidnight = (now: Date) => Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;

function dayLabel(at: Date, now: Date): string {
  const d = Math.round((vnMidnight(now) - vnMidnight(at)) / DAY_MS);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 7 ? `${d}d` : '7d';
}

const hhmm = (at: Date) => new Date(at.getTime() + VN_OFFSET_MS).toISOString().slice(11, 16);

/** Khoảng thời gian của bộ lọc ngày (UTC). */
function range(day: LogFilter['day'], now: Date): { from?: Date; to?: Date } {
  const mid = vnMidnight(now);
  if (day === 'today') return { from: new Date(mid) };
  if (day === 'yesterday') return { from: new Date(mid - DAY_MS), to: new Date(mid) };
  if (day === '7d') return { from: new Date(mid - 6 * DAY_MS) };
  return {};
}

type Row = { id: string; action_id: string; risk: string; status: string; source: string; undo_until: Date | null; input: unknown; result: unknown; created_at: Date; actor_id: string | null; on_behalf: string | null };

/** Tiêu đề hiển thị: tên / tiêu đề trong kết quả action nếu có; đối tượng = tên module. */
function titleOf(r: Row, locale: string): { title?: string; object: string } {
  const def = DEFS.get(r.action_id);
  const m = serverMessages(locale).ai.assistant;
  const object = def ? ((m.module as Record<string, string>)[def.module] ?? def.module) : r.action_id;
  // Tên bản ghi: trong input (tạo / sửa) hoặc kết quả (số chứng từ) — input đã che PII khi ghi log.
  const src = [(r.input ?? {}) as Record<string, unknown>, (r.result ?? {}) as Record<string, unknown>];
  const name = src.flatMap((o) => NAME_KEYS.map((k) => o[k])).find((v) => typeof v === 'string' && v) as string | undefined;
  const base = def ? confirmCard(def, null, '', locale).title : r.action_id;
  return { title: name ? interpolate('{base} "{name}"', { base, name }) : base, object };
}

/** Loại → điều kiện SQL (cùng luật `kindOf`): lọc trong SQL để `total` và LIMIT đúng theo bộ lọc. */
function kindSql(kind: Kind | undefined) {
  const create = TenantSql.sql`action_id ~ '[.]create(_[a-z0-9_]+)?$'`;
  const exp = TenantSql.sql`(action_id ~ '[.]export$' OR action_id LIKE 'insight.%')`;
  if (kind === 'delete') return TenantSql.sql`AND risk = 'delete'`;
  if (kind === 'send') return TenantSql.sql`AND risk = 'send'`;
  if (kind === 'export') return TenantSql.sql`AND risk NOT IN ('delete','send') AND ${exp}`;
  if (kind === 'create') return TenantSql.sql`AND risk NOT IN ('delete','send') AND NOT ${exp} AND ${create}`;
  if (kind === 'update') return TenantSql.sql`AND risk NOT IN ('delete','send') AND NOT ${exp} AND NOT ${create}`;
  return TenantSql.empty;
}

/**
 * Nhật ký = `action_log` (đã chạy / đã hoàn tác) ∪ `approval_request` còn chờ, chưa hết hạn (trạng thái "Đang chờ" — agent xin làm,
 * chưa chạy). Lọc loại / trạng thái / ngày trong SQL; `q` lọc sau (tiêu đề dựng từ i18n + input). `undoable` chỉ khi người gọi là
 * người làm (actor / người ra lệnh) hoặc Owner — đúng luật `UndoService`.
 */
export async function listActionLogs(db: Pick<TenantDb, '$queryRaw'>, authz: AuthzContext, f: LogFilter, now: Date): Promise<{ data: ActionLogRowDto[]; total: number; next_cursor: null }> {
  const all = authz.isOwner || can(authz, 'audit.view');
  const mine = all ? TenantSql.empty : TenantSql.sql`AND (actor_id = ${authz.userId} OR on_behalf_of_user_id = ${authz.userId}::uuid)`;
  const mineAp = all ? TenantSql.empty : TenantSql.sql`AND on_behalf_of_user_id = ${authz.userId}::uuid`;
  const { from, to } = range(f.day, now);
  const at = (col: string) =>
    TenantSql.sql`${from ? TenantSql.sql`AND ${TenantSql.raw(col)} >= ${from}` : TenantSql.empty} ${to ? TenantSql.sql`AND ${TenantSql.raw(col)} < ${to}` : TenantSql.empty}`;
  const status = f.status === 'undone' ? TenantSql.sql`AND status = 'undone'` : f.status === 'done' ? TenantSql.sql`AND status = 'succeeded'` : TenantSql.empty;
  const logs = f.status !== 'pending';
  const approvals = !f.status || f.status === 'pending';
  const where = TenantSql.sql`risk <> 'read' ${mine} ${status} ${kindSql(f.kind)} ${at('created_at')}`;
  const apWhere = TenantSql.sql`status = 'pending' AND expires_at > ${now} ${mineAp} ${kindSql(f.kind)} ${at('requested_at')}`;
  // Deferred join: chọn id theo index (created_at DESC), rồi mới đọc cột rộng (input / result) cho đúng số dòng.
  const rows = logs
    ? await db.$queryRaw<Row[]>(TenantSql.sql`
    SELECT l.id, l.action_id, l.risk, l.status, l.source::text AS source, l.undo_until, l.input, l.result, l.created_at, l.actor_id, l.on_behalf_of_user_id::text AS on_behalf
    FROM (SELECT id FROM action_log WHERE ${where} ORDER BY created_at DESC LIMIT ${LIMIT}) s
    JOIN action_log l ON l.id = s.id
    ORDER BY l.created_at DESC`)
    : [];
  const pend = approvals
    ? await db.$queryRaw<Row[]>(TenantSql.sql`
    SELECT id, action_id, risk, 'pending' AS status, source, NULL::timestamptz AS undo_until, input, NULL::jsonb AS result, requested_at AS created_at, NULL AS actor_id, on_behalf_of_user_id::text AS on_behalf
    FROM approval_request WHERE ${apWhere} ORDER BY requested_at DESC LIMIT ${LIMIT}`)
    : [];
  const [c1] = logs ? await db.$queryRaw<{ n: bigint }[]>(TenantSql.sql`SELECT count(*) AS n FROM action_log WHERE ${where}`) : [];
  const [c2] = approvals ? await db.$queryRaw<{ n: bigint }[]>(TenantSql.sql`SELECT count(*) AS n FROM approval_request WHERE ${apWhere}`) : [];
  const locale = f.locale ?? 'vi';
  const q = foldText(f.q ?? '');
  const data: ActionLogRowDto[] = [];
  const merged = [...pend, ...rows].sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).slice(0, LIMIT);
  for (const r of merged) {
    const { title, object } = titleOf(r, locale);
    if (q && !foldText(`${title ?? ''} ${object} ${r.action_id}`).includes(q)) continue;
    const undone = r.status === 'undone';
    const pending = r.status === 'pending';
    const own = authz.isOwner || r.actor_id === authz.userId || r.on_behalf === authz.userId;
    data.push({
      id: r.id,
      kind: kindOf(r.action_id, r.risk),
      ...(title ? { title } : {}),
      object,
      day: dayLabel(r.created_at, now),
      time: hhmm(r.created_at),
      undoable: own && !undone && !pending && !!r.undo_until && r.undo_until > now,
      status: pending ? 'pending' : 'done',
      action_id: r.action_id,
      source: r.source,
      ...(undone ? { undone: true } : {}),
    });
  }
  return { data, total: Number(c1?.n ?? 0) + Number(c2?.n ?? 0), next_cursor: null };
}
