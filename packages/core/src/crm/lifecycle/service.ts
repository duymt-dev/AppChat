// Xoá mềm / khôi phục khách (TIP-015f §1.3–§1.6): khoá họ khách (id tăng dần) → đọc lại → quyền xoá hiện tại → `if_version` → phụ thuộc
// (chặn → 409, không id / tiền) → ghi deleted_at = đồng hồ server + lifecycle_revision + 1 (trigger chặn nhảy / đặt lùi) + biên nhận + event
// + hàng rào AI (ai_epoch hội thoại của khách tăng — lượt AI cũ không gửi được). Xoá lại cùng thế hệ = no-op giữ hạn cũ. Khôi phục chỉ đổi
// deleted_at + lifecycle_revision; không đổi người phụ trách / ACL / tiền / giai đoạn / AI cũ.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { accessOf } from '../services/access';
import { assertDeleteAuthority } from './authority';
import { assertNoBlockers, familyDependencies } from './dependencies';
import { lockFamily } from './lock';
import { currentReceipt, receiptStatus, writeDeleteReceipt, type LifecycleReceipt } from './receipts';

type Ev = { topic: string; payload: Record<string, unknown> };
export interface DeleteOutcome {
  result: { deleted: true; status: 'deleted' | 'already_deleted'; receipt_id: string; version: number; restore_until: string };
  receipt: LifecycleReceipt;
  noop: boolean;
  events: Ev[];
}

const stale = () => new AppError('STALE_VERSION', 409, { if_version: 'stale' });

/** Hàng rào AI: mọi hội thoại của họ khách tăng ai_epoch + bỏ lượt đang giữ (lượt / bản nháp cũ không gửi / không chạy tiếp). */
async function fenceAi(tx: TenantTx, ids: readonly string[], now: Date): Promise<void> {
  await tx.$executeRaw`UPDATE conversation SET ai_epoch = ai_epoch + 1, ai_turn_until = NULL, ai_turn_owner = NULL, updated_at = ${now}
    WHERE id IN (SELECT id FROM conversation WHERE contact_id = ANY(${[...ids]}::uuid[]) ORDER BY id FOR UPDATE)`;
}

export async function deleteContact(tx: TenantTx, authz: AuthzContext, a: { contactId: string; ifVersion?: number; operationId: string; actorUserId: string | null; now: Date }): Promise<DeleteOutcome> {
  const fam = await lockFamily(tx, a.contactId);
  const c = fam.root;
  const readable = !!(await accessOf(tx, authz, c));
  if (c.deletedAt) {
    // Đã xoá cùng thế hệ: kết quả bỏ qua, giữ biên nhận / hạn gốc, không event / undo mới. Không đọc được → 404.
    if (!readable) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
    const r = await currentReceipt(tx, c.id, c.lifecycleRevision);
    if (!r) throw new AppError('CONFLICT', 409, { receipt: 'legacy' });
    return { result: { deleted: true, status: 'already_deleted', receipt_id: r.id, version: c.version, restore_until: r.restoreUntil.toISOString() }, receipt: r, noop: true, events: [] };
  }
  assertDeleteAuthority(authz, c, readable);
  if (a.ifVersion !== undefined && c.version !== a.ifVersion) throw stale();
  assertNoBlockers(await familyDependencies(tx, fam.ids));
  const revision = c.lifecycleRevision + 1;
  const row = await tx.contact.update({ where: { id: c.id }, data: { deletedAt: a.now, lifecycleRevision: revision }, select: { version: true } });
  const receipt = await writeDeleteReceipt(tx, { contactId: c.id, revision, deletedAt: a.now, operationId: a.operationId, actorUserId: a.actorUserId });
  await fenceAi(tx, fam.ids, a.now);
  return {
    result: { deleted: true, status: 'deleted', receipt_id: receipt.id, version: row.version, restore_until: receipt.restoreUntil.toISOString() },
    receipt,
    noop: false,
    events: [{ topic: 'contact.deleted', payload: { contact_id: c.id, lifecycle_revision: revision, receipt_id: receipt.id } }],
  };
}

export async function restoreContact(
  tx: TenantTx,
  authz: AuthzContext,
  a: { contactId: string; ifVersion?: number; generation?: number; actorUserId: string | null; now: Date },
): Promise<{ result: { contact_id: string; version: number }; events: Ev[] }> {
  const fam = await lockFamily(tx, a.contactId);
  const c = fam.root;
  if (!c.deletedAt) throw new AppError('INVALID_STATE', 409, { contact_id: 'not_deleted' });
  const readable = !!(await accessOf(tx, authz, c));
  assertDeleteAuthority(authz, c, readable);
  if (a.ifVersion !== undefined && c.version !== a.ifVersion) throw stale();
  if (a.generation !== undefined && c.lifecycleRevision !== a.generation) throw new AppError('CONFLICT', 409, { lifecycle_revision: 'changed' });
  const r = await currentReceipt(tx, c.id, c.lifecycleRevision);
  const st = receiptStatus(r, a.now);
  if (st === 'expired') throw new AppError('INVALID_STATE', 409, { contact_id: 'restore_expired' });
  if (st === 'blocked') throw new AppError('CONFLICT', 409, { receipt: r ? r.state : 'missing' });
  // Một khách đang sống giữ cùng SĐT → không khôi phục (không lộ khách kia).
  if (c.phoneNorm) {
    const dup = await tx.contact.findFirst({ where: { phoneNorm: c.phoneNorm, deletedAt: null, id: { not: c.id } }, select: { id: true } });
    if (dup) throw new AppError('CONFLICT', 409, { phone: 'taken' });
  }
  const revision = c.lifecycleRevision + 1;
  const row = await tx.contact.update({ where: { id: c.id }, data: { deletedAt: null, lifecycleRevision: revision }, select: { version: true } });
  await tx.contactLifecycleReceipt.update({ where: { id: r!.id }, data: { state: 'restored', restoredAt: a.now, restoredByUserId: a.actorUserId } });
  return { result: { contact_id: c.id, version: row.version }, events: [{ topic: 'contact.restored', payload: { contact_id: c.id, lifecycle_revision: revision } }] };
}
