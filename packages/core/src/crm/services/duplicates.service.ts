// Phát hiện khách trùng (F03, C06 "khớp không chắc chắn → đề xuất gộp"). SĐT chuẩn hoá là unique (khách mới trùng SĐT bị chặn
// ngay), nên nhóm trùng còn lại đến từ email / mã số thuế / họ tên không dấu. Khoá trùng lọc bằng GROUP BY HAVING count > 1
// (index lower(email), f_unaccent(lower(name))) rồi ghép cặp trong bộ nhớ. Id nhóm = `<bản chính>~<bản phụ>` (bản cũ hơn là chính).
import { TenantSql as Prisma } from '@appchat/db';
import { SOURCE_STYLE, createFmt, serverMessages, type AuthzContext, type ContactSource } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { scopeSql } from './access';

interface Cand {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  created_at: Date;
  ek: string | null;
  tk: string | null;
  nk: string;
}

const LIMIT = 500;

export async function duplicateGroups(tx: TenantTx, authz: AuthzContext, locale: string, timeZone: string) {
  const live = Prisma.sql`deleted_at IS NULL`;
  const rows = await tx.$queryRaw<Cand[]>`
    SELECT c.id, c.name, c.email, c.phone, c.source, c.created_at,
           lower(c.email) AS ek, c.tax_code AS tk, f_unaccent(lower(c.name)) AS nk
    FROM contact c
    WHERE c.deleted_at IS NULL AND ${scopeSql(authz)} AND (
      lower(c.email) IN (SELECT lower(email) FROM contact WHERE ${live} AND email IS NOT NULL GROUP BY 1 HAVING count(*) > 1)
      OR c.tax_code IN (SELECT tax_code FROM contact WHERE ${live} AND tax_code IS NOT NULL GROUP BY 1 HAVING count(*) > 1)
      OR f_unaccent(lower(c.name)) IN (SELECT f_unaccent(lower(name)) FROM contact WHERE ${live} GROUP BY 1 HAVING count(*) > 1)
    )
    ORDER BY c.created_at, c.id
    LIMIT ${LIMIT}`;
  const m = serverMessages(locale).crm.dup;
  const fmt = createFmt({ locale, timeZone });
  const side = (c: Cand) => ({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', src: `${(SOURCE_STYLE[c.source as ContactSource] ?? SOURCE_STYLE.manual).label} · ${fmt.date(c.created_at).slice(0, 5)}` });
  const groups: { id: string; pct: number; by: string; a: ReturnType<typeof side>; b: ReturnType<typeof side> }[] = [];
  const paired = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i]!;
      const b = rows[j]!;
      const email = !!a.ek && a.ek === b.ek;
      const tax = !!a.tk && a.tk === b.tk;
      const name = a.nk === b.nk;
      if (!email && !tax && !name) continue;
      if (paired.has(b.id)) continue;
      const by = [...(email ? [m.email] : []), ...(tax ? ['MST'] : []), ...(name && !email && !tax ? [m.name] : [])].join(' · ');
      const pct = email && name ? 96 : email ? 90 : tax ? 88 : 70;
      groups.push({ id: `${a.id}~${b.id}`, pct, by, a: side(a), b: side(b) });
      paired.add(b.id);
    }
  }
  groups.sort((x, y) => y.pct - x.pct);
  const records = new Set(groups.flatMap((g) => g.id.split('~'))).size;
  return { summary: { groups: groups.length, records, auto: groups.filter((g) => g.pct >= 90).length }, groups };
}
