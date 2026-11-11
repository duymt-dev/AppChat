// Còn báo giá mở trong HỌ khách chuẩn (TIP-015g §3.2): khách gốc + mọi nguồn đã gộp (ràng buộc khoá họ của transaction — 015e/f), không
// chỉ id khách cũ lưu trên báo giá. EXISTS hẹp trên index `quote_contact_status_idx (contact_id, status, id) WHERE deleted_at IS NULL`
// (015d) — đúng `OPEN_QUOTE_STATUSES`, không đọc payload / không N+1 theo từng thành viên họ.
import { OPEN_QUOTE_STATUSES } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';

export async function familyHasOpenQuote(tx: Pick<TenantTx, '$queryRaw'>, familyIds: readonly string[], exceptId: string): Promise<boolean> {
  const [r] = await tx.$queryRaw<{ x: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM quote WHERE contact_id = ANY(${[...familyIds]}::uuid[]) AND status = ANY(${[...OPEN_QUOTE_STATUSES]}::quote_status[])
         AND deleted_at IS NULL AND id <> ${exceptId}::uuid
    ) AS x`;
  return !!r?.x;
}
