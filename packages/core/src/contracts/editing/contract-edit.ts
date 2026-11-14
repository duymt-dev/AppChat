// Sửa hợp đồng nháp có CAS (TIP-032c §2–§3, COMMERCE §9): khoá khách gốc → hợp đồng → quyền GHI hiện tại → `if_version` → CONTRACT_FLOW.
// Người tạo bất biến; người phụ trách là `assigned_user_id`. Biên nhận chỉ giữ trường đổi + giá trị trước của chính chúng + `after_version`.
import { AppError, CONTRACT_FLOW, assertTransition } from '@appchat/shared';
import type { ActionInput, contractUpdate } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { CrmMembers } from '../../crm/public';
import { checkDates, fieldCols } from '../services/contract-write';
import { checkContractAssignee, checkContractOwnerEcho } from './contract-assignment';
import { contractVersion, lockContractVersion } from './contract-version';

/** Cột sửa được (tên cột Prisma) — hoàn tác chỉ khôi phục các cột có trong biên nhận. */
export const EDITABLE = ['number', 'kind', 'title', 'value', 'signedDate', 'startDate', 'endDate', 'fileName', 'note', 'assignedUserId'] as const;
type Col = (typeof EDITABLE)[number];

export interface ContractReceipt {
  schema_version: 2;
  op: 'contract.update';
  id: string;
  fields: Col[];
  /** Giá trị trước — ngày ISO, tiền chuỗi VND. */
  before: Partial<Record<Col, string | null>>;
  after_version: number;
}

const ser = (v: unknown): string | null => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : String(v));

export async function editContract(ctx: ActionContext, tx: TenantTx, members: CrmMembers, input: ActionInput<typeof contractUpdate>, now: Date) {
  const c = await lockContractVersion(tx, ctx.authz, input.contract_id, input.if_version);
  assertTransition(CONTRACT_FLOW, c.status, 'contract.update');
  const p = input.patch;
  // Khách / báo giá nguồn cố định sau khi tạo (bản ghi chứng từ — đổi khách thì tạo hợp đồng mới).
  if (p.contact_id && p.contact_id !== c.contactId) throw new AppError('VALIDATION_FAILED', 422, { contact_id: 'immutable' });
  if (p.quote_id !== undefined && p.quote_id !== (c.quoteId ?? undefined)) throw new AppError('VALIDATION_FAILED', 422, { quote_id: 'immutable' });
  checkContractOwnerEcho(p.owner_user_id, c.ownerUserId);
  await checkContractAssignee(ctx, members, p.assigned_user_id);
  const cols: Record<string, unknown> = { ...fieldCols({ ...p, owner_user_id: undefined }) };
  if (p.assigned_user_id !== undefined) cols.assignedUserId = p.assigned_user_id;
  checkDates((cols.startDate as Date | undefined) === undefined ? c.startDate : (cols.startDate as Date), (cols.endDate as Date | undefined) === undefined ? c.endDate : (cols.endDate as Date));
  const cur = c as unknown as Record<Col, unknown>;
  const fields = EDITABLE.filter((k) => k in cols && ser(cols[k]) !== ser(cur[k]));
  const before = Object.fromEntries(fields.map((k) => [k, ser(cur[k])])) as ContractReceipt['before'];
  await tx.contract.update({ where: { id: c.id }, data: { ...cols, updatedAt: now } });
  const version = await contractVersion(tx, c.id);
  const receipt: ContractReceipt = { schema_version: 2, op: 'contract.update', id: c.id, fields, before, after_version: version };
  return { result: { contract_id: c.id, version }, before: receipt };
}
