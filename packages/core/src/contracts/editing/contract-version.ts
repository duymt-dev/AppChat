// Phiên bản dòng hợp đồng (TIP-032c §2): trigger `commerce_row_guard` tăng `version` mỗi UPDATE thành công của dòng cha — gồm cả seam 030b
// (thay tệp nguồn, đề xuất AI, gắn đề xuất soạn) vì chúng ghi chính dòng `contract`; `source_version` / chữ ký 030b độc lập. Khoá theo thứ
// tự chung (khách gốc → hợp đồng) rồi so `if_version` trên dòng đã khoá trước khi dựng patch.
import { AppError, assertVersion, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockContactRow } from '../../kernel/ownership/root-lock';
import { UUID, visibleContract, type ContractRecord } from '../contract-access';

export async function lockContractVersion(tx: TenantTx, authz: AuthzContext, id: string, ifVersion?: number): Promise<ContractRecord> {
  if (!UUID.test(id)) return visibleContract(tx, authz, id, 'write');
  const pre = (await tx.$queryRaw<{ contact_id: string }[]>`SELECT contact_id FROM contract WHERE id = ${id}::uuid`)[0];
  await lockContactRow(tx, pre?.contact_id);
  await tx.$queryRaw`SELECT 1 FROM contract WHERE id = ${id}::uuid FOR UPDATE`;
  const c = await visibleContract(tx, authz, id, 'write');
  if (pre && c.contactId !== pre.contact_id) throw new AppError('CONFLICT', 409, { contact_id: 'changed' });
  assertVersion(c.version, ifVersion);
  return c;
}

export async function contractVersion(tx: TenantTx, id: string): Promise<number> {
  return (await tx.contract.findUniqueOrThrow({ where: { id }, select: { version: true } })).version;
}
