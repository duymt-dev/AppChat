// Tạo bản nháp hợp đồng dùng chung (create / create_from_quote / renew / create_from_attachment — TIP-030 + 030b). Mã `HĐ-{n}` theo
// sequence; nguồn mẫu ghi mẫu theo loại (spec 8); nguồn tệp ghi cột nguồn bất biến (`files/source.ts`) và không gắn mẫu.
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { ActionLogRow } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { nextCode } from '../../kernel/sequence';
import { actorUserId, type CrmMembers } from '../../crm/public';
import { pickContractTemplate } from '../../documents/public';
import { actorNameOf, checkContractParties, checkDates, fieldCols, logSignEvent, type ContractFields } from '../services/contract-write';
import type { SourceCols } from '../files/source';
import { snapshotTeam } from '../../authz/data-access';
import { undoContractCreate } from '../editing/contract-create-undo';
import { contractVersion } from '../editing/contract-version';

export interface NewContract extends Omit<ContractFields, 'source'> {
  contact_id: string;
  quote_id?: string;
  renewal_of_id?: string;
  /** Hội thoại nguồn đã kiểm qua `linkConversation` (TIP-025b §D.1). */
  conversation_id?: string | null;
}

/** Cột nguồn tệp + gốc tin nhắn (nguồn mẫu: vắng). */
export type FileOrigin = SourceCols & { originMessageId?: string; originAttachmentIdx?: number };

/** Nhóm của bản ghi nguồn (báo giá → hợp đồng gốc khi gia hạn). */
async function sourceTeam(tx: TenantTx, i: { quote_id?: string | null; renewal_of_id?: string | null }): Promise<string | null> {
  const q = i.quote_id ? await tx.quote.findUnique({ where: { id: i.quote_id }, select: { teamId: true } }) : null;
  if (q?.teamId) return q.teamId;
  const r = i.renewal_of_id ? await tx.contract.findUnique({ where: { id: i.renewal_of_id }, select: { teamId: true } }) : null;
  return r?.teamId ?? null;
}

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
      conversationId: input.conversation_id ?? null,
      ownerUserId,
      // DC-299: nhóm theo nguồn (báo giá / hợp đồng gia hạn) → nhóm duy nhất của người phụ trách.
      teamId: await snapshotTeam(tx, { from: await sourceTeam(tx, input), owner: ownerUserId }),
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

/** Hoàn tác tạo (TIP-032c): nháp nguyên trạng, quyền + scope hiện tại, không phụ thuộc — xoá mềm (`editing/contract-create-undo.ts`). */
export async function undoCreate(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date) {
  await undoContractCreate(ctx, log, tx, now);
}

/** `after` của action tạo: id + phiên bản cuối sau toàn bộ đường tạo (gồm cả ghi sau insert như gắn đề xuất AI). */
export const createdAfter = async (tx: TenantTx, id: string) => ({ id, after_version: await contractVersion(tx, id) });
