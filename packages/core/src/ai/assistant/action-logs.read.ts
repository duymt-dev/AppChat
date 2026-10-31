// Nhật ký hành động (Blueprint §4.4 `GET /v1/action-logs`, FE `ActionLogScreen` — prototype L1480): action_log = audit log của
// workspace. Theo quyền: người có `audit.view` (Owner) thấy hết; người khác chỉ thấy việc của mình (tự làm hoặc Trợ lý / agent làm
// thay mình — `on_behalf_of_user_id`). Lọc `kind` (create / update / send / export / delete) · `status` (done / pending / undone) ·
// `day` (today / yesterday / 7d — theo giờ VN) · `q` (không dấu trên tiêu đề / đối tượng / action). Bỏ action đọc (risk read).
// Index: `action_log_created_at_cover_idx (created_at DESC) INCLUDE (action_id, actor_type, status)`; deferred join tới hàng đầy đủ.
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

type Row = { id: string; action_id: string; risk: string; status: string; source: string; undo_until: Date | null; input: unknown; result: unknown; created_at: Date };

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

export async function listActionLogs(db: Pick<TenantDb, '$queryRaw'>, authz: AuthzContext, f: LogFilter, now: Date): Promise<{ data: ActionLogRowDto[]; total: number; next_cursor: null }> {
  const all = authz.isOwner || can(authz, 'audit.view');
  const mine = all ? TenantSql.empty : TenantSql.sql`AND (actor_id = ${authz.userId} OR on_behalf_of_user_id = ${authz.userId}::uuid)`;
  const { from, to } = range(f.day, now);
  const status =
    f.status === 'undone' ? TenantSql.sql`AND status = 'undone'` : f.status === 'done' ? TenantSql.sql`AND status = 'succeeded'` : f.status === 'pending' ? TenantSql.sql`AND false` : TenantSql.empty;
  const where = TenantSql.sql`risk <> 'read' ${mine} ${status}
    ${from ? TenantSql.sql`AND created_at >= ${from}` : TenantSql.empty} ${to ? TenantSql.sql`AND created_at < ${to}` : TenantSql.empty}`;
  // Deferred join: chọn id theo index (created_at DESC), rồi mới đọc cột rộng (result) cho đúng số dòng.
  const rows = await db.$queryRaw<Row[]>(TenantSql.sql`
    SELECT l.id, l.action_id, l.risk, l.status, l.source::text AS source, l.undo_until, l.input, l.result, l.created_at
    FROM (SELECT id FROM action_log WHERE ${where} ORDER BY created_at DESC LIMIT ${LIMIT}) s
    JOIN action_log l ON l.id = s.id
    ORDER BY l.created_at DESC`);
  const [cnt] = await db.$queryRaw<{ n: bigint }[]>(TenantSql.sql`SELECT count(*) AS n FROM action_log WHERE risk <> 'read' ${mine}`);
  const locale = f.locale ?? 'vi';
  const q = foldText(f.q ?? '');
  const data: ActionLogRowDto[] = [];
  for (const r of rows) {
    const kind = kindOf(r.action_id, r.risk);
    if (f.kind && f.kind !== kind) continue;
    const { title, object } = titleOf(r, locale);
    if (q && !foldText(`${title ?? ''} ${object} ${r.action_id}`).includes(q)) continue;
    const undone = r.status === 'undone';
    data.push({
      id: r.id,
      kind,
      ...(title ? { title } : {}),
      object,
      day: dayLabel(r.created_at, now),
      time: hhmm(r.created_at),
      undoable: !undone && !!r.undo_until && r.undo_until > now,
      status: 'done',
      action_id: r.action_id,
      source: r.source,
      ...(undone ? { undone: true } : {}),
    });
  }
  return { data, total: Number(cnt?.n ?? 0), next_cursor: null };
}
