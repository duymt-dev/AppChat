// Đọc ảnh đại diện đã đồng bộ (TIP-014b D) cho Hộp thư / Hồ sơ 360°: (tài khoản, id phía kênh) → link ký của AppChat (không bao giờ URL CDN
// nhà cung cấp). Ảnh nhân viên đặt (`contact.avatar_url`) do người gọi ưu tiên trước khi tra bảng này.
import type { TenantTx } from '../../kernel/actions/action-context';
import { signedFileUrl } from '../../kernel/files/signed-url';
import type { FileLinks } from '../../kernel/files/file-links';

export const avatarKey = (accountId: string, externalId: string) => `${accountId}:${externalId}`;

/** (tài khoản, id phía kênh) → link ký; chỉ dòng `ok`. Tra theo khoá chính — đủ cho một trang danh sách / tin. */
export async function avatarLinks(tx: Pick<TenantTx, 'channelAvatar'>, links: FileLinks | null, ws: string, pairs: { accountId: string; externalId: string }[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const uniq = [...new Map(pairs.filter((p) => p.externalId).map((p) => [avatarKey(p.accountId, p.externalId), p])).values()];
  if (!links || !uniq.length) return out;
  const rows = await tx.channelAvatar.findMany({
    where: { status: 'ok', fileId: { not: null }, OR: uniq.map((p) => ({ channelAccountId: p.accountId, externalId: p.externalId })) },
    select: { channelAccountId: true, externalId: true, fileId: true },
  });
  for (const r of rows) out.set(avatarKey(r.channelAccountId, r.externalId), signedFileUrl(links.apiBase, links.key, ws, r.fileId!));
  return out;
}

/** Ảnh của một khách theo các định danh kênh đã gắn — ảnh đồng bộ gần nhất. */
export async function contactAvatarLink(tx: Pick<TenantTx, 'contactIdentity' | 'channelAvatar'>, links: FileLinks | null, ws: string, contactId: string): Promise<string | null> {
  if (!links) return null;
  const ids = await tx.contactIdentity.findMany({ where: { contactId }, select: { channelAccountId: true, externalId: true }, take: 20 });
  if (!ids.length) return null;
  const row = await tx.channelAvatar.findFirst({
    where: { status: 'ok', fileId: { not: null }, OR: ids.map((i) => ({ channelAccountId: i.channelAccountId, externalId: i.externalId })) },
    orderBy: { syncedAt: 'desc' },
    select: { fileId: true },
  });
  return row?.fileId ? signedFileUrl(links.apiBase, links.key, ws, row.fileId) : null;
}
