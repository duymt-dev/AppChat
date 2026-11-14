// Điều kiện nguồn đọc được cho quan sát tồn ticket (TIP-034d §3) — SQL CHỈ ĐỌC (không khoá dòng nguồn): ticket có khách / hội thoại
// thuộc một lượt "Quên khách" (privacy_family_member — fence ghi ngay lúc chấp nhận, bất kể pha dọn) bị loại khỏi cả hai phía so sánh.
// Ticket gắn hội thoại mà không gắn khách → xét khách của hội thoại. Dùng trong câu lệnh mới (READ COMMITTED) nên thấy fence đã commit.
import { TenantSql as Prisma } from '@appchat/db';

const fenced = (contactCol: Prisma.Sql) => Prisma.sql`EXISTS (SELECT 1 FROM privacy_family_member pm WHERE pm.contact_id = ${contactCol})`;
const fencedConversation = (convCol: Prisma.Sql) =>
  Prisma.sql`EXISTS (SELECT 1 FROM conversation fc JOIN privacy_family_member pm ON pm.contact_id = fc.contact_id WHERE fc.id = ${convCol})`;

/** Khách nguồn GỐC của ticket (alias `t`): khách gắn trực tiếp, không có thì khách của hội thoại nguồn (§2.1 — tổ tiên hội thoại). */
export const sourceContactSql = () =>
  Prisma.sql`coalesce(t.contact_id, (SELECT sc.contact_id FROM conversation sc WHERE sc.id = t.conversation_id))`;

/** Ticket (alias `t`) còn đọc được: nguồn khách / hội thoại không bị fence. */
export const readableTicketSql = () =>
  Prisma.sql`(t.contact_id IS NULL OR NOT ${fenced(Prisma.raw('t.contact_id'))}) AND (t.conversation_id IS NULL OR NOT ${fencedConversation(Prisma.raw('t.conversation_id'))})`;

/** Dòng quan sát (alias `o`) có nguồn GỐC lúc chụp nay đã bị fence → mốc so sánh không dùng được (không nêu nguồn nào). */
export const fencedObservationSql = (alias = 'o') => {
  const a = Prisma.raw(alias);
  return Prisma.sql`((${a}.source_contact_id IS NOT NULL AND ${fenced(Prisma.sql`${a}.source_contact_id`)}) OR (${a}.source_conversation_id IS NOT NULL AND ${fencedConversation(Prisma.sql`${a}.source_conversation_id`)}))`;
};
