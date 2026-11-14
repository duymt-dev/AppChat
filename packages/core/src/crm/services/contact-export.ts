// CSV khách hàng (contact.export — TIP-026, TIP-045b annex D): dùng chung đường chạy ngay (≤ 5.000 dòng) và việc nền (> 5.000, lô theo
// keyset seq của tập id CHỐT lúc nhận việc). Ô bắt đầu bằng = + - @ được chặn công thức (thêm '), BOM UTF-8 cho Excel. Không cắt ngầm:
// mọi id trong tập chốt còn thấy được theo quyền HIỆN TẠI đều có dòng (khách bị xoá / ra ngoài scope sau khi nhận việc thì bỏ).
import { SOURCE_STYLE, createFmt, serverMessages, type AuthzContext, type ContactSource } from '@appchat/shared';
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { scopeSql } from './access';
import type { CrmMembers } from './members.service';

export const EXPORT_BATCH = 1000;
export const EXPORT_TTL_MS = 24 * 60 * 60_000;
const BOM = '﻿';

export const csvCell = (v: string) => (/[",\n\r]/.test(v) || /^[=+\-@]/.test(v) ? `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"` : v);

export const exportFileName = (now: Date) => `khach-hang-${now.toISOString().slice(0, 10)}.csv`;

export function csvHead(): string {
  const m = serverMessages('vi').crm;
  return BOM + [m.export.code, m.export.name, m.export.phone, m.export.email, m.export.stage, m.export.owner, m.export.city, m.export.source, m.export.created].join(',');
}

type Db = Pick<TenantTx, 'contact' | '$queryRaw'>;

/** Dòng CSV của một lô id (giữ thứ tự id), chỉ khách còn hiệu lực + trong scope hiện tại của người xuất (`ids` = id đã ra dòng). */
export async function csvLines(db: Db, authz: AuthzContext, members: Pick<CrmMembers, 'names'>, ids: string[]): Promise<{ lines: string[]; ids: string[] }> {
  if (!ids.length) return { lines: [], ids: [] };
  const visible = await db.$queryRaw<{ id: string }[]>`
    SELECT c.id FROM contact c WHERE c.id IN (${Prisma.join(ids.map((x) => Prisma.sql`${x}::uuid`))}) AND c.deleted_at IS NULL AND ${scopeSql(authz)}`;
  const rows = await db.contact.findMany({ where: { id: { in: visible.map((v) => v.id) } }, select: { id: true, code: true, name: true, phone: true, email: true, stage: true, ownerUserId: true, city: true, source: true, createdAt: true } });
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  const names = await members.names(rows.map((r) => r.ownerUserId));
  const m = serverMessages('vi').crm;
  const fmt = createFmt({ locale: 'vi' });
  const lines = rows.map((r) =>
    [r.code, r.name, r.phone ?? '', r.email ?? '', m.stage[r.stage], r.ownerUserId ? (names.get(r.ownerUserId) ?? '') : '', r.city ?? '', (SOURCE_STYLE[r.source as ContactSource] ?? SOURCE_STYLE.manual).label, fmt.date(r.createdAt)]
      .map(csvCell)
      .join(','),
  );
  return { lines, ids: rows.map((r) => r.id) };
}
