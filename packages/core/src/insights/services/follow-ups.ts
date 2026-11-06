// Việc follow khách bền (TIP-038 mục 3, DC-241) — một nguồn cho dashboard, lịch hẹn, bản tin và `follow_up.complete`:
//   · sinh: khách còn sống (chưa xoá / gộp), giai đoạn khác won / lost, `last_interaction_at` ≤ now − 7 ngày → một việc mỗi `source_key`
//     (khách + mốc tương tác). Hạn = mốc + 7 ngày. Không bao giờ tự gửi tin.
//   · thay: khách có tương tác mới (mốc khác `source_at`) / đã won / lost / bị xoá → việc còn mở thành `superseded`.
//   · đọc: theo data scope crm của người xem (`crmScopeSql`) — đếm "còn lại" là số người xem thấy, không phải tổng tenant.
// Không so mốc bằng hằng SQL / `now()` — mốc tính ở JS rồi truyền tham số (Q-053).
import { TenantSql as Prisma } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { crmScopeSql } from '../../crm/public';

export const FOLLOW_UP_DAYS = 7;
const DAY = 86_400_000;
/** Trần một lượt sweep (bounded) — lượt sau tiếp phần còn lại. */
export const FOLLOW_UP_BATCH = 200;

type Tx = Pick<TenantTx, '$queryRaw' | 'followUp' | 'contact'>;

export const sourceKey = (contactId: string, at: Date) => `${contactId}:${at.toISOString()}`;

/** Việc còn mở nhưng nguồn đã đổi (tương tác mới / won / lost / xoá / gộp) → `superseded`. Trả số dòng. */
export async function supersedeStale(tx: Tx): Promise<number> {
  const stale = await tx.$queryRaw<{ id: string }[]>`
    SELECT f.id FROM follow_up f JOIN contact c ON c.id = f.contact_id
    WHERE f.status = 'pending' AND (c.deleted_at IS NOT NULL OR c.merged_into_id IS NOT NULL OR c.stage IN ('won', 'lost') OR c.last_interaction_at <> f.source_at)
    LIMIT ${FOLLOW_UP_BATCH}`;
  if (!stale.length) return 0;
  const r = await tx.followUp.updateMany({ where: { id: { in: stale.map((s) => s.id) }, status: 'pending' }, data: { status: 'superseded', version: { increment: 1 } } });
  return r.count;
}

/** Khách tới hạn chưa có việc cho mốc hiện tại → tạo (ON CONFLICT source_key: sweep song song / chạy lại không trùng, việc đã xong không sinh lại). */
export async function seedDue(tx: Tx, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - FOLLOW_UP_DAYS * DAY);
  const due = await tx.$queryRaw<{ id: string; at: Date }[]>`
    SELECT c.id, c.last_interaction_at AS at FROM contact c
    WHERE c.deleted_at IS NULL AND c.merged_into_id IS NULL AND c.stage NOT IN ('won', 'lost') AND c.last_interaction_at <= ${cutoff}
      AND NOT EXISTS (SELECT 1 FROM follow_up f WHERE f.contact_id = c.id AND f.source_at = c.last_interaction_at)
    ORDER BY c.last_interaction_at DESC, c.id DESC LIMIT ${FOLLOW_UP_BATCH}`;
  let n = 0;
  for (const c of due) {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO follow_up (id, contact_id, source_key, source_at, due_at, created_at)
      VALUES (${uuidv7(now.getTime())}::uuid, ${c.id}::uuid, ${sourceKey(c.id, c.at)}, ${c.at}, ${new Date(c.at.getTime() + FOLLOW_UP_DAYS * DAY)}, ${now})
      ON CONFLICT (source_key) DO NOTHING RETURNING id`;
    n += rows.length;
  }
  return n;
}

/** Việc còn hiệu lực ngay lúc đọc (chưa chờ sweep): khách sống, chưa won / lost, chưa có tương tác mới sau mốc sinh việc. */
const LIVE = Prisma.sql`c.deleted_at IS NULL AND c.merged_into_id IS NULL AND c.stage NOT IN ('won', 'lost') AND c.last_interaction_at = f.source_at`;

export interface FollowUpRow {
  id: string;
  contact_id: string;
  due_at: Date;
  version: number;
  name: string;
  stage: string;
  owner_user_id: string | null;
  last_channel: string | null;
}

/** Việc còn mở người xem thấy (scope crm), theo hạn rồi id — `limit` dòng + tổng còn lại. */
export async function visibleFollowUps(tx: Tx, authz: AuthzContext, limit: number, before?: Date): Promise<{ rows: FollowUpRow[]; total: number }> {
  const until = before ? Prisma.sql`AND f.due_at < ${before}` : Prisma.empty;
  const [rows, count] = await Promise.all([
    tx.$queryRaw<FollowUpRow[]>`
      SELECT f.id, f.contact_id, f.due_at, f.version, c.name, c.stage::text AS stage, c.owner_user_id,
        (SELECT ci.channel_type FROM contact_identity ci WHERE ci.contact_id = c.id ORDER BY ci.created_at DESC LIMIT 1) AS last_channel
      FROM follow_up f JOIN contact c ON c.id = f.contact_id
      WHERE f.status = 'pending' AND ${LIVE} ${until} AND ${crmScopeSql(authz)}
      ORDER BY f.due_at, f.id LIMIT ${limit}`,
    tx.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM follow_up f JOIN contact c ON c.id = f.contact_id
      WHERE f.status = 'pending' AND ${LIVE} ${until} AND ${crmScopeSql(authz)}`,
  ]);
  return { rows, total: Number(count[0]?.n ?? 0n) };
}
