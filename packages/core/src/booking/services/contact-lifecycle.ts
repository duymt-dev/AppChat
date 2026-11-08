// Port phụ thuộc vòng đời khách (TIP-015f §2.3) — Lịch hẹn — giữ lại (cảnh báo), không tự huỷ. Index: appointment_contact_idx.
import type { ContactLifecyclePort } from '../../kernel/contact-lifecycle/ports';
import { idsSql, toDeps, type DepRow } from '../../kernel/contact-lifecycle/sql';

export const bookingLifecyclePort: ContactLifecyclePort = {
  domain: 'booking',
  async dependencies(tx, contactIds) {
    const ids = idsSql(contactIds);
    return toDeps(await tx.$queryRaw<DepRow[]>`
      SELECT 'appointment' AS kind, count(*) AS n, 'warn' AS level FROM appointment WHERE contact_id = ANY(${ids}) AND deleted_at IS NULL`);
  },
  async hasRelations(tx, contactIds) {
    const ids = idsSql(contactIds);
    const [r] = await tx.$queryRaw<{ x: boolean }[]>`SELECT EXISTS (SELECT 1 FROM appointment WHERE contact_id = ANY(${ids})) AS x`;
    return !!r?.x;
  },
};
