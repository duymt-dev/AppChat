// Port phụ thuộc vòng đời khách (TIP-015f §2.3) — Ticket — giữ lại (cảnh báo), không đóng / tách khách. Index: ticket_contact_idx.
import type { ContactLifecyclePort } from '../../kernel/contact-lifecycle/ports';
import { idsSql, toDeps, type DepRow } from '../../kernel/contact-lifecycle/sql';

export const supportLifecyclePort: ContactLifecyclePort = {
  domain: 'support',
  async dependencies(tx, contactIds) {
    const ids = idsSql(contactIds);
    return toDeps(await tx.$queryRaw<DepRow[]>`
      SELECT 'ticket' AS kind, count(*) AS n, 'warn' AS level FROM ticket WHERE contact_id = ANY(${ids})`);
  },
  async hasRelations(tx, contactIds) {
    const ids = idsSql(contactIds);
    const [r] = await tx.$queryRaw<{ x: boolean }[]>`SELECT EXISTS (SELECT 1 FROM ticket WHERE contact_id = ANY(${ids})) AS x`;
    return !!r?.x;
  },
};
