// Hoàn tác hoạt động CRM theo version (TIP-026b §2): chỉ khi bản ghi còn đúng version sau-action + người gọi còn quyền sửa khách; đã bị
// sửa / tham chiếu sau đó → 409 (không ghi đè). Bản ghi mới tạo hoàn tác = xoá mềm / huỷ / lưu trữ (giữ audit), không xoá cứng. Timeline
// chỉ lưu khoá thao tác + trạng thái an toàn — không thân ghi chú / tiêu đề / số tiền.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { writeTimeline, type TimelineKey } from '../services/timeline.service';
import { writableParent } from './authority';
import { lockRow } from './repository';

export type ActivityTable = 'contact_note' | 'contact_task' | 'contact_opportunity';

/** Khoá + kiểm version sau-action cho hoàn tác; trả contact_id. */
export async function lockForUndo(tx: TenantTx, authz: AuthzContext, table: ActivityTable, id: string, version: number): Promise<string> {
  if (!(await lockRow(tx, table, id))) throw new AppError('CONFLICT', 409, { undo: 'gone' });
  const row =
    table === 'contact_note'
      ? await tx.contactNote.findUnique({ where: { id }, select: { contactId: true, version: true } })
      : table === 'contact_task'
        ? await tx.contactTask.findUnique({ where: { id }, select: { contactId: true, version: true } })
        : await tx.contactOpportunity.findUnique({ where: { id }, select: { contactId: true, version: true } });
  if (!row || row.version !== version) throw new AppError('CONFLICT', 409, { undo: 'changed_since' });
  await writableParent(tx, authz, row.contactId);
  return row.contactId;
}

/** Ghi timeline tham chiếu hoạt động — tham số chỉ là trạng thái an toàn (enum), không nội dung. */
export function activityTimeline(tx: TenantTx, a: { contactId: string; type: 'note' | 'comment' | 'contact_task' | 'contact_opportunity'; key: TimelineKey; ref: { type: ActivityTable; id: string }; actor: { type: string; id: string | null }; at: Date; state?: string }) {
  return writeTimeline(tx, { contactId: a.contactId, type: a.type, key: a.key, params: a.state ? { state: a.state } : {}, actor: a.actor, ref: a.ref, at: a.at });
}

/** Sự kiện tối thiểu (id hoạt động + khách + version) — không thân / tiền. */
export const activityEvent = (topic: string, contactId: string, id: string, version: number) => ({ topic, payload: { contact_id: contactId, activity_id: id, version } });
