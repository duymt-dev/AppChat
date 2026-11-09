// Hoàn tác sửa hợp đồng theo trường (TIP-032c §3.1–3.3): quyền `contract.draft` hiện tại + scope GHI hiện tại → khoá khách gốc → hợp đồng →
// còn nháp + phiên bản hiện tại = `after_version` của biên nhận (bản ghi sau bất kỳ — kể cả thay tệp nguồn / đề xuất AI — → 409). Chỉ khôi
// phục trường đã đổi, không bao giờ người tạo; không khôi phục token / chữ ký / tệp đã phát hành. Biên nhận cũ (ảnh chụp) → 409.
import { AppError, can } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { ActionLogRow } from '../../kernel/actions/handler';
import { EDITABLE, type ContractReceipt } from './contract-edit';
import { lockContractVersion } from './contract-version';

const DATES = new Set(['signedDate', 'startDate', 'endDate']);

export async function undoContractEdit(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date): Promise<void> {
  if (!can(ctx.authz, 'contract.draft')) throw new AppError('FORBIDDEN', 403, { permission: 'contract.draft' });
  const r = log.before as Partial<ContractReceipt> | null;
  if (!r || r.schema_version !== 2 || r.op !== 'contract.update' || typeof r.id !== 'string' || typeof r.after_version !== 'number') throw new AppError('CONFLICT', 409, { receipt: 'legacy' });
  const c = await lockContractVersion(tx, ctx.authz, r.id);
  if (c.status !== 'draft') throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
  if (c.version !== r.after_version) throw new AppError('CONFLICT', 409, { version: 'changed' });
  const data: Record<string, unknown> = { updatedAt: now };
  for (const k of r.fields ?? []) {
    if (!(EDITABLE as readonly string[]).includes(k)) continue;
    const v = r.before?.[k] ?? null;
    data[k] = k === 'value' ? BigInt(v ?? '0') : DATES.has(k) ? (v ? new Date(v) : null) : k === 'assignedUserId' ? v : (v ?? '');
  }
  await tx.contract.update({ where: { id: c.id }, data });
}
