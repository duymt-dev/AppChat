// Hoàn tác tạo / xoá hợp đồng (TIP-032c §3.6, §3.8): xoá mềm giữ nhật ký ký chỉ thêm (không xoá dòng sự kiện). Tạo: chỉ khi còn nháp nguyên
// trạng — không bản ghi sau khi tạo (`after_version`), chưa người ký / token / gửi / tệp đóng băng, chưa sinh đơn, khách còn. Sự kiện tạo ban
// đầu (`created*`) KHÔNG tính là phụ thuộc. Xoá: khôi phục dòng đã xoá mềm khi vẫn ở đúng phiên bản sau xoá, quyền + scope GHI hiện tại,
// khách còn; báo giá nguồn đã có chuyển đổi khác → 409 (không khôi phục hợp đồng tách liên kết âm thầm).
import { AppError, can } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { ActionLogRow } from '../../kernel/actions/handler';
import { guardRecord, POLICIES } from '../../authz/data-access';
import { lockContactRow } from '../../kernel/ownership/root-lock';
import { UUID } from '../contract-access';
import { lockContractVersion } from './contract-version';

const CREATED = ['created', 'created_from_quote', 'created_from_attachment', 'created_by_ai'];

const needDraft = (ctx: ActionContext) => {
  if (!can(ctx.authz, 'contract.draft')) throw new AppError('FORBIDDEN', 403, { permission: 'contract.draft' });
};

export async function undoContractCreate(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date): Promise<void> {
  needDraft(ctx);
  const a = log.after as { id?: string; after_version?: unknown } | null;
  if (!a?.id || typeof a.after_version !== 'number') throw new AppError('CONFLICT', 409, { receipt: 'legacy' });
  const c = await lockContractVersion(tx, ctx.authz, a.id);
  if (c.status !== 'draft') throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
  if (c.version !== a.after_version) throw new AppError('CONFLICT', 409, { version: 'changed' });
  if (c.sentAt || c.fileId || c.signedFileId || c.approvedBy || c.signedByBusinessAt) throw new AppError('CONFLICT', 409, { contract_id: 'has_dependencies' });
  const [signers, tokens, laterEvents, orders, contact] = await Promise.all([
    tx.contractSigner.count({ where: { contractId: c.id } }),
    tx.contractSignToken.count({ where: { contractId: c.id } }),
    tx.contractSignatureEvent.count({ where: { contractId: c.id, type: { notIn: CREATED } } }),
    tx.order.count({ where: { contractId: c.id } }),
    tx.contact.findUnique({ where: { id: c.contactId }, select: { deletedAt: true } }),
  ]);
  if (signers || tokens || laterEvents || orders) throw new AppError('CONFLICT', 409, { contract_id: 'has_dependencies' });
  if (!contact || contact.deletedAt) throw new AppError('CONFLICT', 409, { contact_id: 'gone' });
  // Gỡ liên kết báo giá để báo giá tạo được hợp đồng lại (unique quote_id).
  await tx.contract.update({ where: { id: c.id }, data: { deletedAt: now, quoteId: null } });
}

export async function undoContractDelete(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date): Promise<void> {
  needDraft(ctx);
  const b = log.before as { id?: string; quote_id?: string | null } | null;
  const af = log.after as { after_version?: unknown } | null;
  if (!b?.id || !UUID.test(b.id) || typeof af?.after_version !== 'number') throw new AppError('CONFLICT', 409, { receipt: 'legacy' });
  // Bộ chọn riêng cho dòng đã xoá mềm (visibleContract chỉ thấy dòng sống): khách gốc → hợp đồng → scope GHI hiện tại.
  const pre = await tx.contract.findUnique({ where: { id: b.id }, select: { contactId: true } });
  if (!pre) throw new AppError('NOT_FOUND', 404, { contract_id: 'not_found' });
  // Thứ tự chung: khách → báo giá nguồn → hợp đồng (không khoá báo giá sau hợp đồng).
  await lockContactRow(tx, pre.contactId);
  if (b.quote_id && UUID.test(b.quote_id)) await tx.$queryRaw`SELECT 1 FROM quote WHERE id = ${b.quote_id}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT 1 FROM contract WHERE id = ${b.id}::uuid FOR UPDATE`;
  const c = await tx.contract.findUniqueOrThrow({ where: { id: b.id } });
  await guardRecord(tx, ctx.authz, POLICIES.sales, 'write', { owner: c.assignedUserId, team: c.teamId, contact: c.contactId }, { contract_id: 'not_found' });
  if (!c.deletedAt || c.status !== 'draft' || c.version !== af.after_version) throw new AppError('CONFLICT', 409, { version: 'changed' });
  const contact = await tx.contact.findUnique({ where: { id: c.contactId }, select: { deletedAt: true } });
  if (!contact || contact.deletedAt) throw new AppError('CONFLICT', 409, { contact_id: 'gone' });
  if (b.quote_id) {
    const [taken, q] = await Promise.all([
      tx.contract.findFirst({ where: { quoteId: b.quote_id }, select: { id: true } }),
      tx.quote.findUnique({ where: { id: b.quote_id }, select: { orderId: true, deletedAt: true } }),
    ]);
    if (taken || q?.orderId || !q || q.deletedAt) throw new AppError('CONFLICT', 409, { quote_id: 'converted' });
  }
  await tx.contract.update({ where: { id: c.id }, data: { deletedAt: null, quoteId: b.quote_id ?? null, updatedAt: now } });
}

