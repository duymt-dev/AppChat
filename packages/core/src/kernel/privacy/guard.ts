// Guard đọc nhanh "khách đã quên" (TIP-015c §5.4 — chặn trước khi vật chất hoá / cấp quyền / công bố). Pha 1: kiểm theo
// PrivacyFamilyMember — có mặt trong MỘT operation đã accepted (bất kỳ pha) nghĩa là contact đã bị fence (terminal). Domain gọi guard
// này TRƯỚC khi đưa dữ liệu ra ngoài biên (model / export / publish) — không tự suy luận "chưa thấy fence = an toàn".
import type { TenantTx } from '../actions/action-context';

/** `contactId` có đang nằm trong MỘT lượt "Quên khách" (bất kỳ pha, kể cả completed_with_exceptions — vẫn chặn vĩnh viễn). */
export async function isPrivacyFenced(tx: Pick<TenantTx, '$queryRaw'>, contactId: string): Promise<boolean> {
  const [r] = await tx.$queryRaw<{ x: boolean }[]>`SELECT EXISTS (SELECT 1 FROM "privacy_family_member" WHERE "contact_id" = ${contactId}::uuid) AS x`;
  return !!r?.x;
}

/** Nhiều contact cùng lúc (ví dụ danh sách tin nhắn) — trả tập id đã bị fence. */
export async function fencedContactIds(tx: Pick<TenantTx, '$queryRaw'>, contactIds: readonly string[]): Promise<Set<string>> {
  if (!contactIds.length) return new Set();
  const rows = await tx.$queryRaw<{ contact_id: string }[]>`SELECT DISTINCT "contact_id" FROM "privacy_family_member" WHERE "contact_id" = ANY(${[...contactIds]}::uuid[])`;
  return new Set(rows.map((r) => r.contact_id));
}
