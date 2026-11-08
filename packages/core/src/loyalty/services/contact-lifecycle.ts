// Port phụ thuộc vòng đời khách (TIP-015f §2.3) — Khách thân thiết — sổ điểm giữ nguyên (cảnh báo). Index: loyalty_ledger_contact_recent_idx.
import type { ContactLifecyclePort } from '../../kernel/contact-lifecycle/ports';
import { idsSql, toDeps, type DepRow } from '../../kernel/contact-lifecycle/sql';

export const loyaltyLifecyclePort: ContactLifecyclePort = {
  domain: 'loyalty',
  async dependencies(tx, contactIds) {
    const ids = idsSql(contactIds);
    return toDeps(await tx.$queryRaw<DepRow[]>`
      SELECT 'loyalty_entry' AS kind, count(*) AS n, 'warn' AS level FROM loyalty_ledger WHERE contact_id = ANY(${ids})`);
  },
  async hasRelations(tx, contactIds) {
    const ids = idsSql(contactIds);
    const [r] = await tx.$queryRaw<{ x: boolean }[]>`SELECT EXISTS (SELECT 1 FROM loyalty_ledger WHERE contact_id = ANY(${ids})) AS x`;
    return !!r?.x;
  },
};
