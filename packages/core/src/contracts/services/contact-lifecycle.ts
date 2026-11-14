// Port phụ thuộc vòng đời khách — Hợp đồng (TIP-015f §2.2): chặn = nháp / chờ duyệt / chờ ký / đã ký (còn nghĩa vụ); cảnh báo = từ chối /
// hết hạn / chấm dứt (giữ lại). Tồn tại không theo scope. Index: contract_contact_status_idx.
import type { ContactLifecyclePort } from '../../kernel/contact-lifecycle/ports';
import { idsSql, toDeps, type DepRow } from '../../kernel/contact-lifecycle/sql';

export const contractsLifecyclePort: ContactLifecyclePort = {
  domain: 'contracts',
  async dependencies(tx, contactIds) {
    const ids = idsSql(contactIds);
    const rows = await tx.$queryRaw<DepRow[]>`
      SELECT 'open_contract' AS kind, count(*) AS n, 'block' AS level FROM contract WHERE contact_id = ANY(${ids}) AND deleted_at IS NULL AND status IN ('draft', 'pending_approval', 'pending_signature', 'signed')
      UNION ALL SELECT 'closed_contract', count(*), 'warn' FROM contract WHERE contact_id = ANY(${ids}) AND deleted_at IS NULL AND status IN ('declined', 'expired', 'terminated')`;
    return toDeps(rows);
  },
  async hasRelations(tx, contactIds) {
    const [r] = await tx.$queryRaw<{ x: boolean }[]>`SELECT EXISTS (SELECT 1 FROM contract WHERE contact_id = ANY(${idsSql(contactIds)})) AS x`;
    return !!r?.x;
  },
};
