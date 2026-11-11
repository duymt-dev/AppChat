// Kho artifact đầu vào Trợ lý (TIP-023f §1.3-1.5): truy vấn theo chủ sở hữu (sai chủ = 404 như không có), tạo idempotent theo
// (chủ, nháp, digest, parser_version), giành lease nguyên tử có fence, công bố kết quả chỉ khi revision + fence + phase còn khớp (kết
// quả trễ của worker hết hạn bị loại). Không đường dẫn lưu trữ, không văn bản rộng trong DTO.
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { AppError, INPUT_DRAFT_TTL_MS, INPUT_ERROR_REASONS, type InputArtifactDto, type InputErrorReason, type InputKind } from '@appchat/shared';
import { uuidv7 } from '../../../kernel/ids';
import type { ParsedPart } from './parse-bounds';

type Db = Pick<TenantDb | TenantTx, 'assistantInputArtifact' | 'assistantInputPart'>;
export type ArtifactRow = NonNullable<Awaited<ReturnType<TenantTx['assistantInputArtifact']['findUnique']>>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const LEASE_MS = 60_000;

export async function ownArtifact(db: Db, userId: string, id: string): Promise<ArtifactRow> {
  const a = UUID.test(id) ? await db.assistantInputArtifact.findUnique({ where: { id } }) : null;
  if (!a || a.ownerUserId !== userId) throw new AppError('NOT_FOUND', 404, { artifact_id: 'not_found' });
  return a;
}

export function toDto(a: ArtifactRow, sourceAvailable = true): InputArtifactDto {
  const reason = (INPUT_ERROR_REASONS as readonly string[]).includes(a.errorReason ?? '') ? (a.errorReason as InputErrorReason) : null;
  return {
    artifact_id: a.id,
    revision: a.revision,
    phase: a.phase,
    name: a.name,
    kind: (a.kind as InputKind | null) ?? null,
    size: Number(a.size),
    session_id: a.sessionId,
    part_count: a.partCount,
    error_reason: reason,
    source_available: sourceAvailable,
    expires_at: a.expiresAt ? a.expiresAt.toISOString() : null,
  };
}

/** Tạo hoặc trả artifact đã có cùng định danh (prepare chạy lại / song song → một hàng). */
export async function upsertArtifact(
  db: Db,
  a: { ownerUserId: string; draftNonce: string; sessionId: string | null; fileId: string; fileDigest: string; parserVersion: number; name: string; size: number; now: Date },
): Promise<{ row: ArtifactRow; created: boolean }> {
  const key = { ownerUserId: a.ownerUserId, draftNonce: a.draftNonce, fileDigest: a.fileDigest, parserVersion: a.parserVersion };
  const found = await db.assistantInputArtifact.findUnique({ where: { ownerUserId_draftNonce_fileDigest_parserVersion: key } });
  if (found) return { row: found, created: false };
  const row = await db.assistantInputArtifact.upsert({
    where: { ownerUserId_draftNonce_fileDigest_parserVersion: key },
    create: { id: uuidv7(a.now.getTime()), ...key, sessionId: a.sessionId, fileId: a.fileId, name: a.name, size: BigInt(a.size), createdAt: a.now, updatedAt: a.now, expiresAt: new Date(a.now.getTime() + INPUT_DRAFT_TTL_MS) },
    update: {},
  });
  return { row, created: row.createdAt.getTime() === a.now.getTime() };
}

/** Giành lease: hàng queued, hoặc preparing đã hết lease. Tăng fence; trả null nếu người khác đang giữ. */
export async function claimLease(db: Db, id: string, owner: string, now: Date): Promise<ArtifactRow | null> {
  const n = await db.assistantInputArtifact.updateMany({
    where: { id, OR: [{ phase: 'queued' }, { phase: 'preparing', OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }] },
    data: { phase: 'preparing', leaseOwner: owner, leaseUntil: new Date(now.getTime() + LEASE_MS), fence: { increment: 1 }, updatedAt: now },
  });
  return n.count ? db.assistantInputArtifact.findUnique({ where: { id } }) : null;
}

/** Công bố phần đã trích — chỉ khi revision + fence + phase preparing còn khớp (gỡ / hết lease / bản mới thắng kết quả trễ). */
export async function publishParts(tx: TenantTx, a: { id: string; revision: number; fence: number; kind: InputKind; parts: readonly ParsedPart[]; imageFileId: string; now: Date }): Promise<boolean> {
  const n = await tx.assistantInputArtifact.updateMany({
    where: { id: a.id, revision: a.revision, fence: a.fence, phase: 'preparing' },
    data: { phase: 'ready', kind: a.kind, partCount: a.parts.length, charCount: a.parts.reduce((s, p) => s + (p.text?.length ?? 0), 0), errorReason: null, leaseOwner: null, leaseUntil: null, updatedAt: a.now },
  });
  if (!n.count) return false;
  await tx.assistantInputPart.deleteMany({ where: { artifactId: a.id } });
  if (a.parts.length)
    await tx.assistantInputPart.createMany({
      data: a.parts.map((p, i) => ({ artifactId: a.id, id: uuidv7(a.now.getTime()), position: i, locatorKind: p.locator.kind, locator: p.locator, text: p.text ?? null, imageFileId: p.image ? a.imageFileId : null })),
    });
  return true;
}

/** Kết thúc lỗi có lý do (cùng điều kiện fence) — không để phần dở dang. */
export async function failArtifact(db: Db, a: { id: string; revision: number; fence: number; reason: InputErrorReason; now: Date }): Promise<boolean> {
  const phase = a.reason === 'unsupported_type' ? 'unsupported' : 'failed';
  const n = await db.assistantInputArtifact.updateMany({ where: { id: a.id, revision: a.revision, fence: a.fence, phase: 'preparing' }, data: { phase, errorReason: a.reason, partCount: 0, leaseOwner: null, leaseUntil: null, updatedAt: a.now } });
  return n.count > 0;
}
