// Ghi hợp đồng dùng chung các handler: kiểm trường (khách thấy được, người làm là thành viên, ngày kết thúc sau ngày bắt đầu — hợp
// đồng chưa có trường tuỳ biến, D56), chuyển trạng thái có điều kiện (UPDATE … WHERE status = cũ — concurrency §2), nhật ký ký chỉ thêm.
import { AppError } from '@appchat/shared';
import type { ActionInput, contractCreate } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { actorUserId, editableContact, type CrmMembers } from '../../crm/public';
import type { ContractRecord } from '../contract-access';
import { lockContactRow } from '../../kernel/ownership/root-lock';

export type ContractFields = Partial<Omit<ActionInput<typeof contractCreate>, 'conversation_id' | 'source_message_id'>>;

const day = (v: string | undefined) => (v ? new Date(`${v}T00:00:00.000Z`) : undefined);

/** Cột ghi từ input (chỉ trường có mặt). Tiền là chuỗi số VND. */
export function fieldCols(f: ContractFields) {
  return {
    ...(f.number !== undefined ? { number: f.number.trim() } : {}),
    ...(f.kind !== undefined ? { kind: f.kind } : {}),
    ...(f.title !== undefined ? { title: f.title.trim() } : {}),
    ...(f.value !== undefined ? { value: BigInt(f.value) } : {}),
    ...(f.signed_date !== undefined ? { signedDate: day(f.signed_date) } : {}),
    ...(f.start_date !== undefined ? { startDate: day(f.start_date) } : {}),
    ...(f.end_date !== undefined ? { endDate: day(f.end_date) } : {}),
    ...(f.file_name !== undefined ? { fileName: f.file_name.trim() } : {}),
    ...(f.note !== undefined ? { note: f.note.trim() } : {}),
  };
}

/** Ngày kết thúc phải sau ngày bắt đầu (validation-defaults §4). */
export function checkDates(start: Date | null | undefined, end: Date | null | undefined) {
  if (start && end && end <= start) throw new AppError('VALIDATION_FAILED', 422, { end_date: 'before_start' });
}

export async function checkContractParties(ctx: ActionContext, tx: TenantTx, members: CrmMembers, f: { contactId: string; ownerUserId?: string }) {
  // TIP-015f §2.5: khoá khách gốc TRƯỚC khoá con / ghi quan hệ mới — tuần tự với xoá khách (không tạo nghiệp vụ mới trên khách vừa xoá).
  await lockContactRow(tx, f.contactId);
  const { contact } = await editableContact(tx, ctx.authz, f.contactId);
  if (f.ownerUserId) await members.assertMember(ctx.workspaceId, f.ownerUserId, 'owner_user_id');
  const owner = f.ownerUserId ?? (ctx.actor.type === 'user' ? actorUserId(ctx) : null) ?? contact.ownerUserId ?? actorUserId(ctx);
  return { contact, ownerUserId: owner };
}

/** Chuyển trạng thái có điều kiện; trạng thái đổi giữa chừng → INVALID_TRANSITION. */
export async function moveContract(tx: TenantTx, c: Pick<ContractRecord, 'id' | 'status'>, to: ContractRecord['status'], data: Record<string, unknown>, now: Date) {
  const r = await tx.contract.updateMany({ where: { id: c.id, status: c.status, deletedAt: null }, data: { ...data, status: to, updatedAt: now } });
  if (!r.count) throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
}

export interface SignEventIn {
  contractId: string;
  type: string;
  actorName: string;
  signerId?: string | null;
  docSha256?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
  at: Date;
}

/** Nhật ký ký (chỉ thêm — bảng đã thu hồi UPDATE / DELETE). */
export async function logSignEvent(tx: Pick<TenantTx, 'contractSignatureEvent'>, e: SignEventIn) {
  await tx.contractSignatureEvent.create({
    data: {
      id: uuidv7(e.at.getTime()),
      contractId: e.contractId,
      signerId: e.signerId ?? null,
      type: e.type,
      actorName: e.actorName.slice(0, 200),
      docSha256: e.docSha256 ?? null,
      ip: e.ip?.slice(0, 64) ?? null,
      userAgent: e.userAgent?.slice(0, 300) ?? null,
      meta: (e.meta ?? {}) as object,
      createdAt: e.at,
    },
  });
}

export const actorNameOf = async (ctx: ActionContext, members: CrmMembers) => {
  const me = actorUserId(ctx);
  return me ? ((await members.names([me])).get(me) ?? '') : '';
};
