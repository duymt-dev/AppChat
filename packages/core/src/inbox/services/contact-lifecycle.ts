// Port phụ thuộc vòng đời khách (TIP-015f §2.3) — Hộp thư — hội thoại / thành viên nhóm gắn khách: luôn GIỮ (cảnh báo), không đóng / xoá tin. Index: conversation_contact_id_idx,
// conversation_participant_contact_idx.
import type { ContactLifecyclePort } from '../../kernel/contact-lifecycle/ports';
import { idsSql, toDeps, type DepRow } from '../../kernel/contact-lifecycle/sql';

export const inboxLifecyclePort: ContactLifecyclePort = {
  domain: 'inbox',
  async dependencies(tx, contactIds) {
    const ids = idsSql(contactIds);
    return toDeps(await tx.$queryRaw<DepRow[]>`
      SELECT 'conversation' AS kind, count(*) AS n, 'warn' AS level FROM conversation WHERE contact_id = ANY(${ids})
      UNION ALL SELECT 'group_member', count(*), 'warn' FROM conversation_participant WHERE contact_id = ANY(${ids})`);
  },
  async hasRelations(tx, contactIds) {
    const ids = idsSql(contactIds);
    const [r] = await tx.$queryRaw<{ x: boolean }[]>`SELECT (EXISTS (SELECT 1 FROM conversation WHERE contact_id = ANY(${ids})) OR EXISTS (SELECT 1 FROM conversation_participant WHERE contact_id = ANY(${ids}))) AS x`;
    return !!r?.x;
  },
};
