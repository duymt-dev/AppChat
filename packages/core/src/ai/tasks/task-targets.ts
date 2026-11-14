// Thu đối tượng cho mẫu chủ động (Blueprint §5.4): follow-up khách im lặng N ngày, báo giá treo > N ngày, lịch hẹn trong N giờ tới, đơn
// hoàn tất cách đây N ngày. Lọc theo data scope của người tạo (crm alias `c` — crmScopeSql; báo giá / đơn theo sales; lịch theo booking),
// chỉ khách có hội thoại còn mở, bỏ hội thoại đã có tin ra trong 24 giờ (không nhắn dồn), trần `limit` (≤ 50). Agent nhận danh sách
// trong mục tiêu và tự soạn + gửi.
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import { AI_TASK_MAX_TARGETS, AI_TASK_QUIET_HOURS, type AuthzContext } from '@appchat/shared';
import { crmScopeSql } from '../../crm/public';
import { POLICIES, docColumns, recordScopeSql } from '../../authz/data-access';

export interface Target {
  contact: string;
  conversation_id: string;
  ref?: string;
  at: Date;
  amount?: bigint;
}

const DAY = 86_400_000;

/** Hội thoại gần nhất còn mở của khách, chưa có tin ra trong 24 giờ (subquery theo `conversation_contact_id_idx`). */
const conv = (now: Date) => Prisma.sql`(
  SELECT v.id FROM conversation v
  WHERE v.contact_id = c.id AND v.archived_at IS NULL AND v.hidden_at IS NULL AND v.status <> 'closed'
    AND NOT EXISTS (SELECT 1 FROM message m WHERE m.conversation_id = v.id AND m.direction = 'out' AND m.created_at > ${new Date(now.getTime() - AI_TASK_QUIET_HOURS * 3_600_000)})
  ORDER BY v.last_message_at DESC LIMIT 1)`;

type Row = { contact: string; conversation_id: string | null; ref: string | null; at: Date; amount: bigint | null };

/**
 * Lọc chứng từ theo policy ĐỌC chung (TIP-042c — owner / nhóm `team_id` / quan hệ khách). Mẫu chủ động chạy trên khách của chứng từ
 * nên dùng cùng predicate với màn danh sách — không tự suy team từ thành viên nhóm.
 */
const ownSql = (authz: AuthzContext, module: 'sales' | 'booking', alias: string): Prisma.Sql => recordScopeSql(authz, POLICIES[module], 'read', docColumns(alias));

export async function collectTargets(db: TenantDb, template: string, params: Record<string, number>, authz: AuthzContext, now: Date): Promise<Target[]> {
  const limit = Math.min(Math.max(1, params.limit ?? 20), AI_TASK_MAX_TARGETS);
  const scope = crmScopeSql(authz);
  const days = params.days ?? 3;
  let rows: Row[] = [];
  if (template === 'follow_up') {
    const before = new Date(now.getTime() - (params.days ?? 7) * DAY);
    rows = await db.$queryRaw<Row[]>`
      SELECT c.name AS contact, ${conv(now)} AS conversation_id, NULL AS ref, c.last_interaction_at AS at, NULL::bigint AS amount
      FROM contact c
      WHERE c.deleted_at IS NULL AND c.stage NOT IN ('won', 'lost') AND c.last_interaction_at < ${before} AND ${scope}
      ORDER BY c.last_interaction_at DESC LIMIT ${limit * 2}`;
  } else if (template === 'stale_quote') {
    const before = new Date(now.getTime() - days * DAY);
    rows = await db.$queryRaw<Row[]>`
      SELECT c.name AS contact, ${conv(now)} AS conversation_id, q.code AS ref, q.sent_at AS at, q.total AS amount
      FROM quote q JOIN contact c ON c.id = q.contact_id
      WHERE q.deleted_at IS NULL AND q.status IN ('sent', 'viewed') AND q.sent_at < ${before} AND (q.valid_until IS NULL OR q.valid_until > ${now})
        AND ${ownSql(authz, 'sales', 'q')} AND c.deleted_at IS NULL AND ${scope}
      ORDER BY q.sent_at LIMIT ${limit * 2}`;
  } else if (template === 'appointment_reminder') {
    const until = new Date(now.getTime() + (params.hours ?? 24) * 3_600_000);
    rows = await db.$queryRaw<Row[]>`
      SELECT c.name AS contact, COALESCE(a.conversation_id, ${conv(now)}) AS conversation_id, a.code AS ref, a.start_at AS at, NULL::bigint AS amount
      FROM appointment a JOIN contact c ON c.id = a.contact_id
      WHERE a.deleted_at IS NULL AND a.status IN ('pending', 'confirmed') AND a.start_at > ${now} AND a.start_at <= ${until}
        AND ${ownSql(authz, 'booking', 'a')} AND c.deleted_at IS NULL AND ${scope}
      ORDER BY a.start_at LIMIT ${limit * 2}`;
  } else if (template === 'aftercare') {
    const from = new Date(now.getTime() - (days + 1) * DAY);
    const to = new Date(now.getTime() - days * DAY);
    rows = await db.$queryRaw<Row[]>`
      SELECT c.name AS contact, ${conv(now)} AS conversation_id, o.code AS ref, o.completed_at AS at, o.total AS amount
      FROM "order" o JOIN contact c ON c.id = o.contact_id
      WHERE o.deleted_at IS NULL AND o.status = 'completed' AND o.completed_at >= ${from} AND o.completed_at < ${to}
        AND ${ownSql(authz, 'sales', 'o')} AND c.deleted_at IS NULL AND ${scope}
      ORDER BY o.completed_at LIMIT ${limit * 2}`;
  }
  return rows
    .filter((r): r is Row & { conversation_id: string } => !!r.conversation_id)
    .slice(0, limit)
    .map((r) => ({ contact: r.contact, conversation_id: r.conversation_id, at: r.at, ...(r.ref ? { ref: r.ref } : {}), ...(r.amount !== null ? { amount: r.amount } : {}) }));
}
