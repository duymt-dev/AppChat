// Dời quan hệ CRM khi gộp (TIP-015e §3.2): identity / ghi chú / việc / cơ hội của bản phụ sang bản chính, thẻ chưa có thì thêm vào bản chính.
// TIP-026c: sản phẩm (`contact_opportunity_item`) đi theo cơ hội qua khoá ngoại (không có contact_id); lịch sử cơ hội
// (`contact_opportunity_event`) GIỮ contact_id lúc ghi như timeline (đọc theo cơ hội / họ khách) — không dời, hoàn tác không phải đụng.
// Ghi lại từng bản ghi đã dời (liên kết gốc) vào biên nhận. Timeline KHÔNG dời (bất biến, giữ id gốc — đọc theo họ, lifecycle/family-sql.ts);
// biên nhận cũ (P2) có mục 'timeline' vẫn hoàn tác được. KHÔNG dời: hội thoại, báo giá / đơn / đề nghị / hợp đồng / gói / sổ điểm / lịch hẹn / ticket
// (giữ id khách gốc — lineage, P4 chiếu theo họ). Không chép collaborator / ACL.
import type { TenantTx } from '../../kernel/actions/action-context';

/** `memory` = id biên nhận trí nhớ 015b của từng bản phụ (không phải dòng dời). */
export type ItemKind = 'identity' | 'note' | 'task' | 'opportunity' | 'timeline' | 'tag' | 'memory';
export type Item = { kind: ItemKind; entityId: string; fromContactId: string };

/** Trường liên hệ còn trống ở bản chính lấy từ bản phụ (không chủ / giai đoạn / số dư / đồng thuận / vòng đời; không đổi SĐT chuẩn hoá). */
export const FILL = ['email', 'zalo', 'title', 'city', 'district', 'taxCode', 'address'] as const;
type FillKey = (typeof FILL)[number];
type FillRow = Partial<Record<FillKey, string | null>>;

/** Trường sẽ lấp (bản chính trống, bản phụ có) — bản phụ đầu tiên có giá trị thắng. */
export function fillOf(primary: FillRow, sources: FillRow[]): Partial<Record<FillKey, string>> {
  const out: Partial<Record<FillKey, string>> = {};
  for (const k of FILL) {
    if (primary[k]) continue;
    const v = sources.find((s) => s[k])?.[k];
    if (v) out[k] = v;
  }
  return out;
}

const ids = async (rows: Promise<{ id: string }[]>) => (await rows).map((r) => r.id);

/** Số bản ghi sẽ dời (xem trước). */
export async function relationCounts(tx: TenantTx, sourceIds: string[]) {
  const where = { contactId: { in: sourceIds } };
  const [identities, notes, tasks, opportunities] = await Promise.all([
    tx.contactIdentity.count({ where }),
    tx.contactNote.count({ where }),
    tx.contactTask.count({ where }),
    tx.contactOpportunity.count({ where }),
  ]);
  return { identities, notes, tasks, opportunities };
}

/** Dời quan hệ của từng bản phụ sang bản chính; trả danh sách bản ghi đã dời (để hoàn tác đúng từng dòng). */
export async function moveRelations(tx: TenantTx, primaryId: string, sourceIds: string[]): Promise<Item[]> {
  const items: Item[] = [];
  const have = new Set((await tx.contactTag.findMany({ where: { contactId: primaryId }, select: { tagId: true } })).map((t) => t.tagId));
  for (const from of sourceIds) {
    const where = { contactId: from };
    const groups: [ItemKind, string[]][] = [
      ['identity', await ids(tx.contactIdentity.findMany({ where, select: { id: true } }))],
      ['note', await ids(tx.contactNote.findMany({ where, select: { id: true } }))],
      ['task', await ids(tx.contactTask.findMany({ where, select: { id: true } }))],
      ['opportunity', await ids(tx.contactOpportunity.findMany({ where, select: { id: true } }))],
    ];
    await tx.contactIdentity.updateMany({ where, data: { contactId: primaryId } });
    await tx.contactNote.updateMany({ where, data: { contactId: primaryId } });
    await tx.contactTask.updateMany({ where, data: { contactId: primaryId } });
    await tx.contactOpportunity.updateMany({ where, data: { contactId: primaryId } });
    for (const [kind, list] of groups) for (const entityId of list) items.push({ kind, entityId, fromContactId: from });
    const tags = (await tx.contactTag.findMany({ where, select: { tagId: true } })).map((t) => t.tagId).filter((t) => !have.has(t));
    if (tags.length) await tx.contactTag.createMany({ data: tags.map((tagId) => ({ contactId: primaryId, tagId })), skipDuplicates: true });
    for (const t of tags) {
      have.add(t);
      items.push({ kind: 'tag', entityId: t, fromContactId: from });
    }
  }
  return items;
}

/** Trả bản ghi đã dời về bản phụ gốc — chỉ những dòng còn ở bản chính (bản ghi mới tạo sau gộp không bị dời). */
export async function restoreRelations(tx: TenantTx, primaryId: string, items: Item[]): Promise<void> {
  const by = (k: ItemKind, from: string) => items.filter((i) => i.kind === k && i.fromContactId === from).map((i) => i.entityId);
  for (const from of [...new Set(items.map((i) => i.fromContactId))]) {
    const back = { contactId: from };
    const on = (k: ItemKind) => ({ id: { in: by(k, from) }, contactId: primaryId });
    await tx.contactIdentity.updateMany({ where: on('identity'), data: back });
    await tx.contactNote.updateMany({ where: on('note'), data: back });
    await tx.contactTask.updateMany({ where: on('task'), data: back });
    await tx.contactOpportunity.updateMany({ where: on('opportunity'), data: back });
    await tx.timelineEvent.updateMany({ where: on('timeline'), data: back });
    const tags = by('tag', from);
    if (tags.length) await tx.contactTag.deleteMany({ where: { contactId: primaryId, tagId: { in: tags } } });
  }
}
