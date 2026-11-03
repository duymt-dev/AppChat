// Tạo bản nháp hợp đồng dùng chung (create / create_from_quote / renew / create_from_attachment — TIP-030 + 030b). Mã `HĐ-{n}` theo
// sequence; nguồn mẫu ghi mẫu theo loại (spec 8); nguồn tệp ghi cột nguồn bất biến (`files/source.ts`) và không gắn mẫu.
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { ActionLogRow } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { nextCode } from '../../kernel/sequence';
import { actorUserId, type CrmMembers } from '../../crm/public';
import { pickContractTemplate } from '../../documents/public';
import { actorNameOf, checkContractParties, checkDates, fieldCols, logSignEvent, type ContractFields } from '../services/contract-write';
import type { SourceCols } from '../files/source';

export interface NewContract extends Omit<ContractFields, 'source'> {
  contact_id: string;
  quote_id?: string;
  renewal_of_id?: string;
}

/** Cột nguồn tệp + gốc tin nhắn (nguồn mẫu: vắng). */
export type FileOrigin = SourceCols & { originMessageId?: string; originAttachmentIdx?: number };

export async function insertContract(ctx: ActionContext, tx: TenantTx, members: CrmMembers, input: NewContract, now: Date, event: string, file?: FileOrigin) {
  const { ownerUserId } = await checkContractParties(ctx, tx, members, { contactId: input.contact_id, ownerUserId: input.owner_user_id });
  const cols = fieldCols(input);
  checkDates(cols.startDate, cols.endDate);
  const id = uuidv7(now.getTime());
  const code = await nextCode(tx, 'contract');
  // Mẫu theo loại hợp đồng → mặc định chung (TIP-030b spec 8). Chưa có mẫu nào vẫn tạo nháp được; duyệt / render báo `template_id: missing`.
  const tpl = file ? null : await pickContractTemplate(tx, input.kind ?? 'service');
  await tx.contract.create({
    data: {
      id,
      code,
      contactId: input.contact_id,
      quoteId: input.quote_id ?? null,
      renewalOfId: input.renewal_of_id ?? null,
      ownerUserId,
      templateId: tpl?.id ?? null,
      templateVersion: tpl?.version ?? null,
      ...cols,
      ...(file ?? {}),
      createdByType: ctx.actor.type === 'user' ? 'user' : ctx.actor.type,
      createdById: ctx.actor.type === 'agent' ? ctx.actor.id : actorUserId(ctx),
      createdAt: now,
      updatedAt: now,
    },
  });
  await logSignEvent(tx, { contractId: id, type: event, actorName: await actorNameOf(ctx, members), ...(file ? { docSha256: file.sourceHash } : {}), at: now });
  return { id, code };
}

/** Hoàn tác tạo: chỉ khi vẫn là nháp — nhật ký ký là chỉ thêm nên xoá mềm thay vì xoá dòng. */
export async function undoCreate(log: ActionLogRow, tx: TenantTx, now: Date) {
  const id = (log.after as { id: string }).id;
  const c = await tx.contract.findUnique({ where: { id }, select: { status: true, quoteId: true } });
  if (c && c.status !== 'draft') throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
  // Gỡ liên kết báo giá để báo giá tạo được hợp đồng lại (unique quote_id).
  await tx.contract.updateMany({ where: { id }, data: { deletedAt: now, quoteId: null } });
}
