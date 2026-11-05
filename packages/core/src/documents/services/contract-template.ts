// Mẫu hợp đồng theo loại (TIP-030b spec 8; COMMERCE §9 "từ mẫu theo loại"). Mặc định chia hai nhóm: chung (`contract_kind` rỗng) và
// riêng từng loại (`service` / `sale` / `framework`) — index unique partial tách theo nhóm (migration 030b). Chọn mẫu: mẫu chỉ định hợp
// lệ (kind contract, cùng loại hoặc chung) → mặc định của loại → mặc định chung; không có → lỗi rõ ràng (không ngầm dùng mẫu khác
// loại). Loại chứng từ khác (báo giá, đề nghị thanh toán, phiếu thu) chỉ có nhóm chung — giữ nguyên hành vi TIP-028.
import { AppError, type DocKind } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export const CONTRACT_KINDS = ['service', 'sale', 'framework'] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];

type Tx = Pick<TenantTx, 'docTemplate'>;
type Picked = { id: string; version: number };

/** `contract_kind` chỉ hợp lệ với mẫu kind=contract; rỗng = mẫu chung. */
export function checkContractKind(kind: DocKind, contractKind: string | null | undefined): ContractKind | null {
  if (contractKind === undefined || contractKind === null || contractKind === '') return null;
  if (kind !== 'contract') throw new AppError('VALIDATION_FAILED', 422, { contract_kind: 'contract_only' });
  if (!(CONTRACT_KINDS as readonly string[]).includes(contractKind)) throw new AppError('VALIDATION_FAILED', 422, { contract_kind: 'invalid' });
  return contractKind as ContractKind;
}

/** Điều kiện nhóm mặc định của một mẫu (cùng kind + cùng `contract_kind`, kể cả rỗng). */
const groupOf = (kind: DocKind, contractKind: string | null) => ({ kind, contractKind: contractKind ?? null, isDefault: true, deletedAt: null });

/**
 * Đặt mẫu làm mặc định trong NHÓM của nó (kind + contract_kind): tắt cờ mẫu cũ trước rồi bật mẫu mới trong cùng transaction (unique
 * partial theo nhóm). Trả id mẫu mặc định cũ của nhóm (hoàn tác đặt lại đúng nhóm).
 */
export async function makeGroupDefault(tx: Tx, kind: DocKind, contractKind: string | null, id: string): Promise<string | null> {
  const prev = await tx.docTemplate.findFirst({ where: groupOf(kind, contractKind), select: { id: true } });
  if (prev?.id === id) return null;
  if (prev) await tx.docTemplate.update({ where: { id: prev.id }, data: { isDefault: false } });
  await tx.docTemplate.update({ where: { id }, data: { isDefault: true } });
  return prev?.id ?? null;
}

/** Nhóm đã có mặc định chưa (mẫu đầu tiên của nhóm thành mặc định). */
export async function groupHasDefault(tx: Tx, kind: DocKind, contractKind: string | null): Promise<boolean> {
  return (await tx.docTemplate.count({ where: groupOf(kind, contractKind) })) > 0;
}

/**
 * Mẫu cho hợp đồng loại `kind`: `explicitId` (phải là mẫu contract còn dùng, cùng loại hoặc chung) → mặc định của loại → mặc định
 * chung. Không có mẫu nào → null (caller quyết lỗi: tạo nháp vẫn được, render / duyệt báo `template_id: missing`).
 */
export async function pickContractTemplate(tx: Tx, kind: ContractKind, explicitId?: string | null): Promise<Picked | null> {
  if (explicitId) {
    const t = /^[0-9a-f-]{36}$/i.test(explicitId) ? await tx.docTemplate.findFirst({ where: { id: explicitId, kind: 'contract', deletedAt: null }, select: { id: true, version: true, contractKind: true } }) : null;
    if (!t) throw new AppError('VALIDATION_FAILED', 422, { template_id: 'not_found' });
    if (t.contractKind && t.contractKind !== kind) throw new AppError('VALIDATION_FAILED', 422, { template_id: 'kind_mismatch' });
    return { id: t.id, version: t.version };
  }
  const own = await tx.docTemplate.findFirst({ where: groupOf('contract', kind), select: { id: true, version: true } });
  return own ?? (await tx.docTemplate.findFirst({ where: groupOf('contract', null), select: { id: true, version: true } }));
}
