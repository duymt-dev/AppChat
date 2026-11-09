// Port phụ thuộc vòng đời khách (TIP-015f §2.3) — Marketing — lịch sử người nhận chiến dịch giữ nguyên (cảnh báo); xoá mềm không phải huỷ đăng ký.
// Index: campaign_recipient_contact_idx.
import type { ContactLifecyclePort } from '../../kernel/contact-lifecycle/ports';
import { idsSql, toDeps, type DepRow } from '../../kernel/contact-lifecycle/sql';

export const marketingLifecyclePort: ContactLifecyclePort = {
  domain: 'marketing',
  async dependencies(tx, contactIds) {
    const ids = idsSql(contactIds);
    return toDeps(await tx.$queryRaw<DepRow[]>`
      SELECT 'campaign_recipient' AS kind, count(*) AS n, 'warn' AS level FROM campaign_recipient WHERE contact_id = ANY(${ids})`);
  },
  async hasRelations(tx, contactIds) {
    const ids = idsSql(contactIds);
    const [r] = await tx.$queryRaw<{ x: boolean }[]>`SELECT EXISTS (SELECT 1 FROM campaign_recipient WHERE contact_id = ANY(${ids})) AS x`;
    return !!r?.x;
  },
};
