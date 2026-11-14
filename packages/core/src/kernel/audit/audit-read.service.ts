// Đọc audit workspace + AI audit (TIP-045b annex A2) cho GET /v1/settings/audit và /v1/settings/ai-audit. Người gọi đã qua `audit.view`
// + membership hiện tại (controller). Trang 50, created_at DESC, id DESC, con trỏ `<at>|<id>`; deferred join: chọn id theo index
// (`action_log_created_at_cover_idx` · `action_log_actor_page_idx` · `action_log_action_page_idx` · `action_log_audit_page_idx` ·
// `ai_run_audit_page_idx`) rồi mới đọc cột cho đúng số dòng. Chiếu an toàn: KHÔNG trả input / kết quả / prompt / nội dung tin; chủ thể =
// tên + vai trò HIỆN TẠI (membership), không phải bản chụp quyền lúc ghi. Audit nền tảng của admin KHÔNG lộ ở đây (khác tenant).
import { TenantSql, type PlatformDb, type TenantDb } from '@appchat/db';
import { AUDIT_PAGE_SIZE, type AiAuditRowDto, type AuditQuery, type AuditRowDto } from '@appchat/shared';
import { aiActorOf, aiAuditStatusOf, auditStatusOf, SESSION_NEW_DEVICE } from './audit-projection';

type Db = Pick<TenantDb, '$queryRaw'>;
type Platform = Pick<PlatformDb, 'workspace' | 'membership' | 'user' | 'platformAuditLog'>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const encodeCursor = (at: Date, id: string) => Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');

export function decodeCursor(c: string | undefined): { at: Date; id: string } | null {
  if (!c) return null;
  const [at, id] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  const d = at ? new Date(at) : null;
  return d && !Number.isNaN(d.getTime()) && id && UUID.test(id) ? { at: d, id } : null;
}

const sql = TenantSql.sql;
const none = TenantSql.empty;

/** Điều kiện chung: con trỏ (tuple so sánh để giữ thứ tự ổn định) + khoảng thời gian. */
function window(col: 'created_at' | 'started_at', q: AuditQuery) {
  const c = decodeCursor(q.cursor);
  const at = TenantSql.raw(col);
  return sql`${c ? sql`AND (${at}, id) < (${c.at}, ${c.id}::uuid)` : none}
    ${q.from ? sql`AND ${at} >= ${new Date(q.from)}` : none} ${q.to ? sql`AND ${at} < ${new Date(q.to)}` : none}`;
}

type LogRow = { id: string; action_id: string; status: string; source: string; actor_type: string; actor_id: string | null; on_behalf: string | null; trace_id: string | null; created_at: Date; correction?: unknown };

export class AuditReadService {
  constructor(private readonly platform: Platform) {}

  /** Tên + vai trò hiện tại của những người xuất hiện trong trang (một truy vấn mỗi bảng). */
  private async people(ws: string, ids: string[]) {
    const uniq = [...new Set(ids.filter((x) => UUID.test(x)))];
    const [w, ms, us] = await Promise.all([
      this.platform.workspace.findUnique({ where: { id: ws }, select: { ownerUserId: true } }),
      this.platform.membership.findMany({ where: { workspaceId: ws, userId: { in: uniq } }, select: { userId: true, roleKey: true, status: true } }),
      this.platform.user.findMany({ where: { id: { in: uniq } }, select: { id: true, name: true } }),
    ]);
    const role = new Map(ms.map((m) => [m.userId, m.userId === w?.ownerUserId ? 'owner' : m.status === 'active' ? m.roleKey : 'removed']));
    const name = new Map(us.map((u) => [u.id, u.name]));
    return (id: string | null) => (id && name.has(id) ? { name: name.get(id)!, role: role.get(id) ?? 'removed' } : null);
  }

  async workspaceAudit(db: Db, ws: string, q: AuditQuery): Promise<{ data: AuditRowDto[]; next_cursor: string | null }> {
    const status = q.status === 'ok' ? sql`AND status = 'succeeded'` : q.status === 'warn' ? sql`AND status <> 'succeeded'` : q.status === 'escalated' ? sql`AND false` : none;
    const actor = q.actor ? (q.actor === 'system' ? sql`AND actor_type = 'system'` : sql`AND actor_id = ${q.actor}`) : none;
    const action = q.action ? (q.action === 'security' ? sql`AND audit` : sql`AND action_id = ${q.action}`) : none;
    const where = sql`risk <> 'read' ${actor} ${action} ${status} ${window('created_at', q)}`;
    const rows = await db.$queryRaw<LogRow[]>(sql`
      SELECT l.id, l.action_id, l.status::text AS status, l.source::text AS source, l.actor_type::text AS actor_type, l.actor_id,
             l.on_behalf_of_user_id::text AS on_behalf, l.trace_id, l.created_at, l.correction
      FROM (SELECT id FROM action_log WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ${AUDIT_PAGE_SIZE + 1}) s
      JOIN action_log l ON l.id = s.id
      ORDER BY l.created_at DESC, l.id DESC`);
    // Sự kiện phiên (đăng nhập thiết bị mới) nằm ở audit nền tảng — chỉ dòng CỦA workspace này, chỉ loại phiên (không lộ admin.*).
    const sessions = await this.sessionRows(ws, q);
    const merged = [...rows, ...sessions].sort((x, y) => y.created_at.getTime() - x.created_at.getTime() || (y.id > x.id ? 1 : -1));
    const page = merged.slice(0, AUDIT_PAGE_SIZE);
    const who = await this.people(ws, page.flatMap((r) => [r.actor_id ?? '', r.on_behalf ?? '']));
    const data = page.map((r): AuditRowDto => {
      // Agent / Trợ lý làm thay người: hiện người ra lệnh; hệ thống / agent trực kênh: không tên.
      const p = r.actor_type === 'user' ? who(r.actor_id) : who(r.on_behalf);
      const role = p?.role ?? (r.actor_type === 'system' ? 'system' : 'ai');
      const fixes = Array.isArray(r.correction) ? (r.correction as { note: string; at: string }[]).map((c) => ({ note: c.note, at: c.at })) : [];
      return { id: r.id, time: r.created_at.toISOString(), name: p?.name ?? null, role, actor_id: r.actor_id, action_id: r.action_id, action: r.action_id, source: r.source, status: auditStatusOf(r.status), ip: null, trace_id: r.trace_id, ...(fixes.length ? { corrections: fixes } : {}) };
    });
    const last = page.at(-1);
    return { data, next_cursor: merged.length > AUDIT_PAGE_SIZE && last ? encodeCursor(last.created_at, last.id) : null };
  }

  private async sessionRows(ws: string, q: AuditQuery): Promise<LogRow[]> {
    if (q.status && q.status !== 'ok') return [];
    if (q.action && q.action !== 'security' && q.action !== SESSION_NEW_DEVICE) return [];
    if (q.actor && !UUID.test(q.actor)) return [];
    const c = decodeCursor(q.cursor);
    const rows = await this.platform.platformAuditLog.findMany({
      where: {
        workspaceId: ws,
        actionId: SESSION_NEW_DEVICE,
        ...(q.actor ? { actorUserId: q.actor } : {}),
        ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lt: new Date(q.to) } : {}) } } : {}),
        ...(c ? { OR: [{ createdAt: { lt: c.at } }, { createdAt: c.at, id: { lt: c.id } }] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: AUDIT_PAGE_SIZE + 1,
      select: { id: true, actorUserId: true, actionId: true, traceId: true, createdAt: true },
    });
    return rows.map((r) => ({ id: r.id, action_id: r.actionId, status: 'succeeded', source: 'ui', actor_type: 'user', actor_id: r.actorUserId, on_behalf: null, trace_id: r.traceId, created_at: r.createdAt }));
  }

  async aiAudit(db: Db, q: AuditQuery): Promise<{ data: AiAuditRowDto[]; next_cursor: string | null }> {
    const st = q.status === 'ok' ? sql`AND status IN ('completed', 'running', 'queued')` : q.status === 'warn' ? sql`AND status IN ('failed', 'cancelled')` : q.status === 'escalated' ? sql`AND status IN ('handoff', 'waiting_approval')` : none;
    const actor = q.actor ? (q.actor === 'copilot' ? sql`AND kind = 'assistant'` : UUID.test(q.actor) ? sql`AND initiated_by_user_id = ${q.actor}::uuid` : sql`AND agent_id = ${q.actor}`) : none;
    const where = sql`dry_run = false ${actor} ${st} ${window('started_at', q)}`;
    type Run = { id: string; kind: string; status: string; tier: string; title: string; credits_used: number; agent_id: string | null; agent_name: string | null; conversation_id: string | null; task_id: string | null; started_at: Date; tokens: bigint | null; trace_id: string | null };
    // Chỉ metadata run + tổng token của step (không input / output / state / prompt); trace = trace của action đầu tiên trong run.
    const rows = await db.$queryRaw<Run[]>(sql`
      SELECT r.id, r.kind::text AS kind, r.status::text AS status, r.tier, r.title, r.credits_used, r.agent_id, a.name AS agent_name,
             r.conversation_id::text AS conversation_id, r.task_id, r.started_at,
             (SELECT sum(st.tokens_in + st.tokens_out) FROM ai_run_step st WHERE st.run_id = r.id) AS tokens,
             (SELECT l.trace_id FROM action_log l WHERE l.run_id = r.id AND l.trace_id IS NOT NULL ORDER BY l.created_at LIMIT 1) AS trace_id
      FROM (SELECT id FROM ai_run WHERE ${where} ORDER BY started_at DESC, id DESC LIMIT ${AUDIT_PAGE_SIZE + 1}) s
      JOIN ai_run r ON r.id = s.id
      LEFT JOIN ai_agent a ON a.id::text = r.agent_id
      ORDER BY r.started_at DESC, r.id DESC`);
    const page = rows.slice(0, AUDIT_PAGE_SIZE);
    const data = page.map(
      (r): AiAuditRowDto => ({
        id: r.id,
        time: r.started_at.toISOString(),
        actor: aiActorOf(r.kind),
        agent_name: r.agent_name,
        action: r.title || r.kind,
        // Ngữ cảnh = loại nơi chạy, không có nội dung (mở hội thoại / tác vụ cần quyền riêng của tài nguyên đó).
        context: r.conversation_id ? 'conversation' : r.task_id ? 'task' : r.kind === 'assistant' ? 'assistant' : r.kind,
        tier: r.tier,
        credits: r.credits_used,
        tokens: Number(r.tokens ?? 0),
        status: aiAuditStatusOf(r.status),
        trace_id: r.trace_id,
      }),
    );
    const last = page.at(-1);
    return { data, next_cursor: rows.length > AUDIT_PAGE_SIZE && last ? encodeCursor(last.started_at, last.id) : null };
  }
}
