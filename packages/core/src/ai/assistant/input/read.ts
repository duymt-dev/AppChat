// Đọc phần đã trích (TIP-023f §2.2, §5.3) — chủ sở hữu, đúng revision, artifact `ready`; tối đa 8 đoạn / lần, con trỏ = vị trí tiếp
// theo (tất định), `has_more` trung thực. Phần ảnh trả tham chiếu `image:<artifact>:<position>`, không URL lưu trữ / bytes.
import type { TenantTx } from '../../../kernel/actions/action-context';
import { AppError, type InputLocator, type InputReadDto } from '@appchat/shared';
import { ownArtifact } from './artifact-store';

export async function readParts(tx: Pick<TenantTx, 'assistantInputArtifact' | 'assistantInputPart'>, userId: string, i: { artifact_id: string; revision: number; cursor?: string; limit?: number }): Promise<InputReadDto> {
  const a = await ownArtifact(tx, userId, i.artifact_id);
  if (a.revision !== i.revision) throw new AppError('CONFLICT', 409, { revision: 'stale' });
  if (a.phase !== 'ready') throw new AppError('INVALID_STATE', 409, { phase: a.phase });
  const from = i.cursor && /^\d{1,6}$/.test(i.cursor) ? Number(i.cursor) : 0;
  const limit = Math.min(Math.max(i.limit ?? 8, 1), 8);
  const rows = await tx.assistantInputPart.findMany({ where: { artifactId: a.id, position: { gte: from } }, orderBy: [{ position: 'asc' }, { id: 'asc' }], take: limit + 1, select: { position: true, locator: true, text: true, imageFileId: true } });
  const page = rows.slice(0, limit);
  const more = rows.length > limit;
  return {
    artifact_id: a.id,
    revision: a.revision,
    parts: page.map((p) => ({ locator: p.locator as InputLocator, ...(p.text !== null ? { text: p.text } : {}), ...(p.imageFileId ? { image_ref: `image:${a.id}:${p.position}` } : {}) })),
    has_more: more,
    next_cursor: more ? String(rows[limit]!.position) : null,
  };
}
