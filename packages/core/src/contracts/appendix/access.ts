// Quyền trên phụ lục = quyền trên hợp đồng cha (scope sales — contract-access.ts): không thấy hợp đồng cha → 404 phụ lục. Khoá dòng phụ lục
// (concurrency §2) cho chuyển trạng thái; khoá dòng hợp đồng cha khi cấp số PL-n.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, visibleContract, type ContractRecord } from '../contract-access';

export type AppendixRecord = NonNullable<Awaited<ReturnType<TenantTx['contractAppendix']['findUnique']>>>;

const notFound = () => new AppError('NOT_FOUND', 404, { appendix_id: 'not_found' });

export async function visibleAppendix(tx: TenantTx, authz: AuthzContext, id: string): Promise<{ a: AppendixRecord; c: ContractRecord }> {
  const a = UUID.test(id) ? await tx.contractAppendix.findUnique({ where: { id } }) : null;
  if (!a) throw notFound();
  const c = await visibleContract(tx, authz, a.contractId).catch((e: unknown) => {
    throw e instanceof AppError && e.httpStatus === 404 ? notFound() : e;
  });
  return { a, c };
}

export async function lockAppendix(tx: TenantTx, authz: AuthzContext, id: string) {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM contract_appendix WHERE id = ${id}::uuid FOR UPDATE`;
  return visibleAppendix(tx, authz, id);
}

/** Đổi trạng thái có điều kiện (status + version hiện tại) — người khác vừa đổi → 409. */
export async function moveAppendix(tx: TenantTx, a: Pick<AppendixRecord, 'id' | 'status' | 'version'>, to: AppendixRecord['status'], data: Record<string, unknown>, now: Date) {
  const r = await tx.contractAppendix.updateMany({ where: { id: a.id, status: a.status, version: a.version }, data: { ...data, status: to, updatedAt: now } });
  if (!r.count) throw new AppError('INVALID_TRANSITION', 409, { status: a.status });
}
