// Tệp gửi kèm tin (TIP-025, REQ-C05): `message.send { attachments: file_id[] }` — tệp do chính người gửi tải lên (`POST /files`,
// purpose `attachment`; Owner dùng được tệp của người khác), đổi thành link ký (`signedFileUrl`) để worker kênh tải về khi gửi và
// FE hiện ảnh / tệp. Kênh không hỗ trợ loại tệp (manifest `capabilities.send`) → 422 `attachments: unsupported_by_channel`.
import type { ChannelRegistry } from '@appchat/channels';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { signedFileUrl } from '../../kernel/files/signed-url';

export interface Attachment {
  url: string;
  mime: string;
  name: string;
  size: number;
}

export type { FileLinks } from '../../kernel/files/file-links';
import type { FileLinks } from '../../kernel/files/file-links';

const IMAGE = /^image\/(png|jpe?g|gif|webp)$/i;

/** Kiểu tin theo tệp + kênh: toàn ảnh và kênh gửi được ảnh → `image`; còn lại `file` (email gửi ảnh như tệp). */
export function sendKindOf(registry: ChannelRegistry, channelType: string, files: Pick<Attachment, 'mime'>[]): 'image' | 'file' {
  const can = new Set<string>(registry.get(channelType)?.manifest.capabilities.send ?? []);
  if (files.every((f) => IMAGE.test(f.mime)) && can.has('image')) return 'image';
  if (can.has('file')) return 'file';
  throw new AppError('VALIDATION_FAILED', 422, { attachments: 'unsupported_by_channel' });
}

export async function resolveAttachments(tx: TenantTx, ctx: ActionContext, links: FileLinks | null, ids: readonly string[]): Promise<Attachment[]> {
  if (!ids.length) return [];
  if (!links) throw new AppError('NOT_IMPLEMENTED', 501, { attachments: 'file_links' });
  const want = [...new Set(ids)];
  const rows = await tx.file.findMany({ where: { id: { in: want.filter((id) => /^[0-9a-f-]{36}$/i.test(id)) } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: Attachment[] = [];
  for (const id of want) {
    const f = byId.get(id);
    const mine = f && f.purpose === 'attachment' && (f.uploadedBy === ctx.authz.userId || ctx.authz.isOwner);
    if (!f || !mine) throw new AppError('VALIDATION_FAILED', 422, { attachments: 'not_found' });
    out.push({ url: signedFileUrl(links.apiBase, links.key, ctx.workspaceId, f.id), mime: f.mime, name: f.name, size: Number(f.size) });
  }
  await tx.file.updateMany({ where: { id: { in: want } }, data: { confirmed: true } });
  return out;
}
