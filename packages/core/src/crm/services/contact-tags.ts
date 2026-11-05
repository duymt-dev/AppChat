// Thẻ của khách theo TÊN (một nguồn thẻ với hội thoại — Blueprint §2.2 tag): dùng chung contact.tag và contact.bulk_update (TIP-045b).
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';

/** Thẻ theo TÊN (không phân biệt hoa thường); chưa có → tạo thẻ mới (một nguồn thẻ với hội thoại — Blueprint §2.2 tag). */
export async function tagByName(tx: TenantTx, name: string, me: string | null, now: Date, create: boolean) {
  const rows = await tx.$queryRaw<{ id: string; name: string }[]>`SELECT id, name FROM tag WHERE lower(name) = lower(${name.trim()}) LIMIT 1`;
  if (rows[0] || !create) return rows[0] ?? null;
  const id = uuidv7(now.getTime());
  await tx.tag.create({ data: { id, name: name.trim(), createdByUserId: me, createdAt: now } });
  return { id, name: name.trim() };
}

export async function tagNames(tx: TenantTx, contactId: string) {
  const links = await tx.contactTag.findMany({ where: { contactId }, select: { tagId: true }, orderBy: { createdAt: 'asc' } });
  const tags = await tx.tag.findMany({ where: { id: { in: links.map((l) => l.tagId) } }, select: { id: true, name: true } });
  const by = new Map(tags.map((t) => [t.id, t.name]));
  return links.map((l) => by.get(l.tagId) ?? '').filter(Boolean);
}
