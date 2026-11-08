// Gộp khách theo đơn vị (TIP-015e §2–§4): một đơn vị = một bản chính + các bản phụ (cặp cùng bản chính gộp chung). Khoá họ của mọi khách gốc
// theo id tăng dần (dùng lại `lockFamily` 015f — không resolver thứ hai), kiểm sống / ghi được / phiên bản / cùng chủ + ACL (authority.ts),
// dời quan hệ CRM (relations.ts), gộp trí nhớ (015b), lấp trường trống, đánh dấu bản phụ `merged_into` + xoá mềm, ghi biên nhận + dòng con.
// Hoàn tác (7 ngày — cửa sổ yêu cầu, không bảo đảm): khoá lại cùng gốc, mọi phiên bản / dấu ACL phải còn đúng như sau gộp → trả lại đúng
// từng bản ghi đã dời; lệch bất kỳ → 409, KHÔNG đổi gì. Biên nhận dùng một lần (hoàn tác lại trả 409 UNDO).
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { lockFamily } from '../lifecycle/lock';
import { mergeMemory, unmergeMemory } from '../memory/merge';
import { writeTimeline } from '../services/timeline.service';
import { editableContact } from '../services/access';
import { aclFingerprint, assertMergeable } from './authority';
import { fillOf, moveRelations, restoreRelations, type Item } from './relations';

export const MERGE_UNDO_MS = 7 * 86_400_000;
const MAX_FAMILY = 1000;

export type Unit = { primary: string; sources: string[] };

/** Tách cặp `<chính>~<phụ>` thành đơn vị theo bản chính; tự gộp / lặp phụ / phụ cũng là chính / chồng chéo → 422. */
export function unitsOf(pairs: (readonly [string, string])[]): Unit[] {
  const by = new Map<string, string[]>();
  const sources = new Set<string>();
  for (const [p, s] of pairs) {
    if (p === s || sources.has(s)) throw new AppError('VALIDATION_FAILED', 422, { group_ids: 'overlap' });
    sources.add(s);
    by.set(p, [...(by.get(p) ?? []), s]);
  }
  for (const p of by.keys()) if (sources.has(p)) throw new AppError('VALIDATION_FAILED', 422, { group_ids: 'overlap' });
  return [...by].map(([primary, srcs]) => ({ primary, sources: srcs }));
}

/** Khoá họ của mọi khách gốc trong đơn vị (id gốc tăng dần → mỗi họ khoá id tăng dần). */
async function lockUnit(tx: TenantTx, u: Unit) {
  const families = new Map<string, string[]>();
  const roots = new Map<string, Awaited<ReturnType<typeof lockFamily>>['root']>();
  for (const id of [u.primary, ...u.sources].sort()) {
    const f = await lockFamily(tx, id);
    families.set(id, f.ids);
    roots.set(id, f.root);
  }
  if ([...families.values()].reduce((n, ids) => n + ids.length, 0) > MAX_FAMILY) throw new AppError('CONFLICT', 409, { merge: 'family_too_large' });
  return { families, primary: roots.get(u.primary)!, sources: u.sources.map((s) => roots.get(s)!) };
}

export async function mergeUnit(tx: TenantTx, authz: AuthzContext, u: Unit, o: { actorUserId: string | null; actorType: string; now: Date; expected?: Record<string, number> }) {
  const { families, primary, sources } = await lockUnit(tx, u);
  const acl = await assertMergeable(tx, authz, primary, sources, families, o.expected);
  const items: Item[] = await moveRelations(tx, primary.id, u.sources);
  // Mỗi bản phụ một biên nhận trí nhớ (015b) — giữ hết theo thứ tự để hoàn tác ngược đúng.
  let memoryReceipt: string | null = null;
  for (const s of u.sources) {
    memoryReceipt = (await mergeMemory(tx, primary.id, s, o.now)).receiptId;
    items.push({ kind: 'memory', entityId: memoryReceipt, fromContactId: s });
  }
  const fill = fillOf(primary, sources);
  for (const s of u.sources) await tx.contact.update({ where: { id: s }, data: { deletedAt: o.now, mergedIntoId: primary.id } });
  const p = await tx.contact.update({ where: { id: primary.id }, data: { ...fill, updatedAt: o.now }, select: { version: true } });
  const after = await tx.contact.findMany({ where: { id: { in: u.sources } }, select: { id: true, version: true } });
  const event = await writeTimeline(tx, { contactId: primary.id, type: 'merge', key: 'merge', params: { count: u.sources.length }, actor: { type: o.actorType, id: o.actorUserId }, at: o.now });
  const receiptId = uuidv7(o.now.getTime());
  await tx.contactMergeReceipt.create({
    data: {
      id: receiptId,
      operationId: `merge:${receiptId}`,
      primaryId: primary.id,
      sourceIds: u.sources,
      actorUserId: o.actorUserId,
      primaryVersionAfter: p.version,
      sourceVersionsAfter: Object.fromEntries(after.map((r) => [r.id, r.version])),
      aclFingerprint: acl,
      fill,
      memoryReceiptId: memoryReceipt,
      timelineEventId: event ?? null,
      expiresAt: new Date(o.now.getTime() + MERGE_UNDO_MS),
    },
  });
  if (items.length) await tx.contactMergeReceiptItem.createMany({ data: items.map((i) => ({ receiptId, ...i })) });
  return { receiptId, primary: primary.id, sources: u.sources };
}

/** Hoàn tác một biên nhận — mọi điều kiện kiểm TRƯỚC khi ghi; lệch → 409 và không đổi gì. */
export async function undoMerge(tx: TenantTx, authz: AuthzContext, receiptId: string, now: Date): Promise<void> {
  // Khoá biên nhận trước (job dọn dùng SKIP LOCKED → không xoá payload khi đang hoàn tác), rồi mới khoá khách.
  await tx.$queryRaw`SELECT id FROM contact_merge_receipt WHERE id = ${receiptId}::uuid FOR UPDATE`;
  const r = await tx.contactMergeReceipt.findUnique({ where: { id: receiptId }, include: { items: true } });
  if (!r) throw new AppError('UNDO_NOT_SUPPORTED', 409, { merge: 'receipt_missing' });
  if (r.state !== 'merged') throw new AppError('UNDO_EXPIRED', 409, { merge: r.state });
  if (now.getTime() >= r.expiresAt.getTime()) throw new AppError('UNDO_EXPIRED', 409, { merge: 'expired' });
  const ids = [r.primaryId, ...r.sourceIds].sort();
  await tx.$queryRaw`SELECT id FROM contact WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
  const rows = await tx.contact.findMany({ where: { id: { in: ids } } });
  const by = new Map(rows.map((c) => [c.id, c]));
  const p = by.get(r.primaryId);
  const want = r.sourceVersionsAfter as Record<string, number>;
  const changed = !p || p.deletedAt || p.mergedIntoId || p.version !== r.primaryVersionAfter || r.sourceIds.some((s) => by.get(s)?.version !== want[s] || by.get(s)?.mergedIntoId !== r.primaryId);
  if (changed) throw new AppError('CONFLICT', 409, { merge: 'changed_since' });
  // Quyền hiện tại: ghi được bản chính; ACL / chủ không đổi từ lúc gộp (không thu hồi grant mới, không hồi sinh ACL cũ).
  await editableContact(tx, authz, r.primaryId);
  const fam = await tx.contact.findMany({ where: { mergedIntoId: r.primaryId }, select: { id: true } });
  const famIds = [...new Set([r.primaryId, ...fam.map((f) => f.id)])];
  if ((await aclFingerprint(tx, famIds, p.ownerUserId)) !== r.aclFingerprint) throw new AppError('CONFLICT', 409, { merge: 'changed_since' });
  // Bản ghi đã dời mà nay không còn ở bản chính (bị dời / xoá sau gộp) → không đủ điều kiện.
  const moved = r.items.filter((i) => i.kind !== 'tag' && i.kind !== 'memory');
  const still = await Promise.all(
    (['identity', 'note', 'task', 'opportunity', 'timeline'] as const).map(async (k) => {
      const list = moved.filter((i) => i.kind === k).map((i) => i.entityId);
      if (!list.length) return 0;
      const where = { id: { in: list }, contactId: r.primaryId };
      const n = k === 'identity' ? await tx.contactIdentity.count({ where }) : k === 'note' ? await tx.contactNote.count({ where }) : k === 'task' ? await tx.contactTask.count({ where }) : k === 'opportunity' ? await tx.contactOpportunity.count({ where }) : await tx.timelineEvent.count({ where });
      return list.length - n;
    }),
  );
  if (still.some((n) => n > 0)) throw new AppError('CONFLICT', 409, { merge: 'changed_since' });

  // Trí nhớ: hoàn tác ngược thứ tự gộp; chỉ biên nhận cuối kiểm bản sửa (các biên nhận trước đã bị bản phụ sau đẩy bản sửa lên).
  const mem = r.items.filter((i) => i.kind === 'memory').reverse();
  for (const [k, i] of mem.entries()) await unmergeMemory(tx, i.entityId, now, k === 0);
  await restoreRelations(tx, r.primaryId, r.items.filter((i) => i.kind !== 'memory').map((i) => ({ kind: i.kind as Item['kind'], entityId: i.entityId, fromContactId: i.fromContactId })));
  for (const s of r.sourceIds) await tx.contact.update({ where: { id: s }, data: { deletedAt: null, mergedIntoId: null } });
  const fill = r.fill as Record<string, string>;
  const clear = Object.fromEntries(Object.entries(fill).filter(([k, v]) => (p as unknown as Record<string, unknown>)[k] === v).map(([k]) => [k, null]));
  if (Object.keys(clear).length) await tx.contact.update({ where: { id: r.primaryId }, data: clear });
  if (r.timelineEventId) await tx.timelineEvent.deleteMany({ where: { id: r.timelineEventId } });
  await tx.contactMergeReceipt.update({ where: { id: r.id }, data: { state: 'undone', undoneAt: now } });
}
