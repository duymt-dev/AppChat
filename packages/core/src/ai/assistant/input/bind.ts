// Buộc tệp đã chuẩn bị vào lượt gửi (TIP-023f §1.4): trong CÙNG transaction tạo phiên / run — artifact `ready` của chủ, đúng bản nháp
// (lượt đầu) hoặc đúng phiên (lượt sau), chưa buộc phiên khác → gắn session_id + bound_at. Hash yêu cầu gồm id + revision + digest đã
// sắp xếp (gửi lại cùng lượt → cùng run; đổi danh sách → 409). Tin user lưu THAM CHIẾU `appchat-input`, không bytes.
import type { TenantDb } from '@appchat/db';
import { AppError, INPUT_MAX_ATTACHMENTS } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';

export interface InputHandle {
  artifact_id: string;
  revision: number;
}

export interface BoundInput {
  artifact_id: string;
  revision: number;
  name: string;
  kind: string | null;
}

/** Kiểm trước transaction (sớm báo lỗi, không mở phiên rỗng): artifact của chủ, `ready`, đúng revision, chưa buộc phiên khác. */
export async function checkInputs(db: Pick<TenantDb, 'assistantInputArtifact'>, userId: string, handles: readonly InputHandle[], sessionId: string | undefined): Promise<{ rows: BoundInput[]; digest: string[] }> {
  if (!handles.length) return { rows: [], digest: [] };
  if (handles.length > INPUT_MAX_ATTACHMENTS) throw new AppError('VALIDATION_FAILED', 422, { attachments: 'too_many' });
  const ids = [...new Set(handles.map((h) => h.artifact_id))];
  const found = await db.assistantInputArtifact.findMany({ where: { id: { in: ids } }, select: { id: true, ownerUserId: true, revision: true, phase: true, sessionId: true, name: true, kind: true, fileDigest: true } });
  const by = new Map(found.map((a) => [a.id, a]));
  const rows: BoundInput[] = [];
  const digest: string[] = [];
  for (const h of handles) {
    const a = by.get(h.artifact_id);
    if (!a || a.ownerUserId !== userId) throw new AppError('NOT_FOUND', 404, { attachments: 'not_found' });
    if (a.revision !== h.revision) throw new AppError('CONFLICT', 409, { attachments: 'stale_revision' });
    if (a.phase !== 'ready') throw new AppError('ATTACHMENT_NOT_PREPARED', 409, { attachments: a.phase }, 'Tệp chưa chuẩn bị xong — chờ trạng thái ready rồi gửi lại');
    // Đã buộc phiên khác: chỉ hợp lệ khi đây là gửi lại đúng lượt đã buộc (replay — cùng request_id, cùng hash, cùng run); lượt mới
    // thì bindInputs trong transaction sẽ từ chối (409) — không kiểm ở đây vì lượt đầu chưa biết session_id.
    if (a.sessionId && sessionId && a.sessionId !== sessionId) throw new AppError('CONFLICT', 409, { attachments: 'bound_elsewhere' });
    rows.push({ artifact_id: a.id, revision: a.revision, name: a.name, kind: a.kind });
    digest.push(`${a.id}:${a.revision}:${a.fileDigest}`);
  }
  return { rows, digest: digest.sort() };
}

/** Trong transaction của lượt: gắn phiên cho artifact (chỉ khi chưa buộc hoặc đã buộc đúng phiên, revision không đổi). */
export async function bindInputs(tx: TenantTx, rows: readonly BoundInput[], sessionId: string, now: Date): Promise<void> {
  for (const r of rows) {
    const n = await tx.assistantInputArtifact.updateMany({
      where: { id: r.artifact_id, revision: r.revision, phase: 'ready', OR: [{ sessionId: null }, { sessionId }] },
      data: { sessionId, boundAt: now, expiresAt: null, updatedAt: now },
    });
    if (!n.count) throw new AppError('CONFLICT', 409, { attachments: 'changed' });
  }
}

/** Phần tin user: chữ + tham chiếu (engine dựng nội dung ngay trước lời gọi). */
export const inputRefParts = (rows: readonly BoundInput[]) => rows.map((r) => ({ type: 'input' as const, artifact_id: r.artifact_id, revision: r.revision, name: r.name, kind: r.kind }));
