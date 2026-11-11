// Hoàn tác đổi giai đoạn tay (TIP-015g §2.4–§2.5): cùng cổng khoá họ khách + quyền ghi hiện tại + "Quên khách". Chỉ khi khách vẫn đúng
// bản sau-ghi của lần đổi đó (version sau-ghi + vân tay trường đã chạm + cùng lifecycle_revision, không gộp / xoá) — có đổi tay / tự động /
// ABA sau đó → 409, không đè. Khôi phục đúng trường đã chạm (mốc kéo tay + lần tương tác dạng chữ micro giây, cast timestamptz), không trả
// version cũ (trigger tăng tiếp). Biên nhận cũ thiếu vân tay → 409. No-op đã chứng minh → hoàn tác cũng no-op. Lịch sử chỉ ghi thêm.
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { ActionLogRow } from '../../kernel/actions/handler';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { isPrivacyFenced } from '../../kernel/privacy/guard';
import { actorUserId, editableContact } from '../services/access';
import { writeTimeline } from '../services/timeline.service';
import { lockFamily } from '../lifecycle/lock';
import { fingerprint, stageSnap, type StageSnap } from './snapshot';

type Fields = Pick<StageSnap, 'stage' | 'manual_at' | 'last_at'>;
type Receipt = { id: string; changed?: boolean; version?: number; lifecycle_revision?: number } & Partial<Fields>;

const conflict = (why: string) => new AppError('CONFLICT', 409, { contact_id: why });

/** UPDATE theo id + version đã khoá; mốc chữ → timestamptz trong SQL. Trả version mới (trigger 025b). Không đúng một dòng → 409. */
export async function moveStage(tx: TenantTx, id: string, version: number, f: Fields, now: Date): Promise<number> {
  const rows = await tx.$queryRaw<{ version: number }[]>`
    UPDATE contact SET stage = ${f.stage}::contact_stage, stage_set_manually_at = ${f.manual_at}::timestamptz,
           last_interaction_at = ${f.last_at}::timestamptz, updated_at = ${now.toISOString()}::timestamptz
     WHERE id = ${id}::uuid AND version = ${version} AND deleted_at IS NULL AND merged_into_id IS NULL
     RETURNING version`;
  if (rows.length !== 1) throw new AppError('STALE_VERSION', 409, { version: 'changed' });
  return rows[0]!.version;
}

export async function undoManualStage(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date): Promise<void> {
  const b = log.before as Receipt;
  const a = (log.after ?? {}) as Receipt;
  if (b.changed === false) return;
  if (b.changed !== true || a.version === undefined || a.lifecycle_revision === undefined || a.stage === undefined || b.stage === undefined || b.last_at === undefined) throw conflict('legacy_receipt');
  // Bản gốc phải còn là gốc sống (không tự đi theo bí danh sau gộp) + người hoàn tác còn quyền ghi + chưa vào "Quên khách".
  await lockFamily(tx, b.id).catch((e: unknown) => {
    throw e instanceof AppError && e.httpStatus === 404 ? conflict('not_live') : e;
  });
  if (await isPrivacyFenced(tx, b.id)) throw conflict('erased');
  const live = await tx.contact.findUnique({ where: { id: b.id }, select: { deletedAt: true } });
  if (!live || live.deletedAt) throw conflict('not_live');
  await editableContact(tx, ctx.authz, b.id);
  const s = await stageSnap(tx, b.id);
  if (!s || s.version !== a.version || s.lifecycle_revision !== a.lifecycle_revision) throw conflict('changed');
  if (JSON.stringify(fingerprint(s)) !== JSON.stringify(fingerprint(a as Fields))) throw conflict('changed');
  await moveStage(tx, b.id, s.version, { stage: b.stage, manual_at: b.manual_at ?? null, last_at: b.last_at }, now);
  await writeTimeline(tx, { contactId: b.id, type: 'stage', key: 'stage', params: { from: s.stage, to: b.stage }, actor: { type: ctx.actor.type, id: actorUserId(ctx) }, at: now });
  await writeOutbox(tx, ctx.workspaceId, [{ topic: 'contact.stage_changed', payload: { contact_id: b.id, from: s.stage, to: b.stage, manual: true } }], now);
}
