// Vị từ phạm vi + quyền nguồn (TIP-020c §2.4, §3.2) — áp TRƯỚC khi chọn ứng viên vector / từ khoá (không lấy hết rồi lọc top-6).
// Thành viên: (thư mục HOẶC thẻ của phạm vi nhận) VÀ (thư mục HOẶC thẻ của phạm vi hiện hành) — hai vị từ độc lập, không giao mảng (một
// nguồn có thể khớp thư mục ở bên này và thẻ ở bên kia). Index: `kb_source_scope_ready_idx` (folder_id, visibility, id) INCLUDE
// (ingest_seq, origin) + `kb_source_tags_ready_gin_idx` — chỉ nguồn sống đã nạp.
import { TenantSql as Prisma } from '@appchat/db';
import { convScopeSql } from '../../../inbox/services/access';
import { internalRights, type Restriction } from './authority';
import type { KbScope } from './types';

/** Thư mục HOẶC thẻ (rag §2). Rỗng cả hai → FALSE (người gọi đã chặn trước — đây là lưới an toàn). */
export function memberSql(s: KbScope): Prisma.Sql {
  const or: Prisma.Sql[] = [];
  if (s.folder_ids.length) or.push(Prisma.sql`s.folder_id = ANY(${s.folder_ids}::uuid[])`);
  if (s.tags.length) or.push(Prisma.sql`s.tags && ${s.tags}::text[]`);
  return or.length ? Prisma.sql`(${Prisma.join(or, ' OR ')})` : Prisma.sql`FALSE`;
}

/** Nguồn gắn bản ghi còn hợp lệ cho mọi người xem: sản phẩm còn sống; nguồn hội thoại có nguồn gốc + khách chưa bị "Quên". */
const LINKED = Prisma.sql`(s.product_id IS NULL OR EXISTS (SELECT 1 FROM product p WHERE p.id = s.product_id AND p.deleted_at IS NULL))
  AND (s.origin <> 'conversation' OR EXISTS (
    SELECT 1 FROM kb_suggestion g JOIN conversation cv ON cv.id = g.conversation_id
    WHERE g.kb_source_id = s.id AND (cv.contact_id IS NULL OR NOT EXISTS (SELECT 1 FROM privacy_family_member pm WHERE pm.contact_id = cv.contact_id))))`;

/** Quyền nguồn theo người hiệu lực: public cho mọi người; internal theo module gốc (authority.ts). */
function authoritySql(r: Restriction): Prisma.Sql {
  if (r.principal.kind === 'public') return Prisma.sql`s.visibility = 'public'`;
  const a = r.principal.authz;
  const x = internalRights(a);
  const internal: Prisma.Sql[] = [];
  if (x.documents) internal.push(Prisma.sql`(s.product_id IS NULL AND s.origin IN ('upload', 'url', 'text', 'drive'))`);
  if (x.catalog) internal.push(Prisma.sql`s.product_id IS NOT NULL`);
  if (x.inbox) internal.push(Prisma.sql`(s.origin = 'conversation' AND EXISTS (SELECT 1 FROM kb_suggestion g JOIN conversation cv ON cv.id = g.conversation_id WHERE g.kb_source_id = s.id AND ${convScopeSql(a)}))`);
  return internal.length ? Prisma.sql`(s.visibility = 'public' OR (s.visibility = 'internal' AND (${Prisma.join(internal, ' OR ')})))` : Prisma.sql`s.visibility = 'public'`;
}

/** Điều kiện nguồn (alias `s`) cho một restriction đã nhận — nguồn sống, đã nạp, đúng phạm vi, đúng quyền, bản ghi gắn còn hợp lệ. */
export function sourceSql(r: Restriction): Prisma.Sql {
  const parts = [Prisma.sql`s.deleted_at IS NULL`, Prisma.sql`s.status = 'ready'`, authoritySql(r), LINKED];
  if (r.admitted) parts.push(memberSql(r.admitted));
  if (r.current) parts.push(memberSql(r.current));
  return Prisma.join(parts, ' AND ');
}
