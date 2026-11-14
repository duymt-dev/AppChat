// Dữ liệu cho TIP-042c (record scope): khách + hội thoại + báo giá / hợp đồng / đơn / đề nghị / lịch hẹn của một người phụ trách, ghi thẳng
// DB tenant (luồng tạo thật đã kiểm ở test domain) — để so list / detail / ghi theo policy, không phụ thuộc luồng nghiệp vụ.
import { uuidv7 } from '@appchat/core';
import type { TenantDb } from '@appchat/db';

export interface RecordSet {
  contact: string;
  conversation: string;
  quote: string;
  contract: string;
  order: string;
  invoice: string;
  appointment: string;
}

let seq = 0;

/** Bộ chứng từ của `owner` (nhóm `team` — null = mơ hồ) cho một khách mới. */
export async function seedRecords(db: TenantDb, o: { owner: string; team: string | null; account: string; service: string; staff: string; at: Date }): Promise<RecordSet> {
  seq++;
  const n = `${Date.now() % 100000}${seq}`;
  const ids = { contact: uuidv7(), conversation: uuidv7(), quote: uuidv7(), contract: uuidv7(), order: uuidv7(), invoice: uuidv7(), appointment: uuidv7() };
  await db.contact.create({ data: { id: ids.contact, code: `KH-RS${n}`, name: `Khách scope ${n}`, source: 'manual', ownerUserId: o.owner, teamId: o.team, createdAt: o.at } });
  await db.conversation.create({ data: { id: ids.conversation, channelAccountId: o.account, channelType: 'webchat', externalThreadId: `rs-${n}`, contactId: ids.contact, assigneeUserId: o.owner, teamId: o.team, lastMessageAt: o.at } });
  await db.quote.create({ data: { id: ids.quote, code: `BG-RS${n}`, rootQuoteId: ids.quote, contactId: ids.contact, ownerUserId: o.owner, assignedUserId: o.owner, teamId: o.team } });
  await db.contract.create({ data: { id: ids.contract, code: `HĐ-RS${n}`, contactId: ids.contact, quoteId: ids.quote, ownerUserId: o.owner, teamId: o.team, title: 'Hợp đồng scope' } });
  await db.order.create({ data: { id: ids.order, code: `DH-RS${n}`, contactId: ids.contact, quoteId: ids.quote, ownerUserId: o.owner, teamId: o.team } });
  await db.invoice.create({ data: { id: ids.invoice, code: `DN-RS${n}`, contactId: ids.contact, orderId: ids.order, ownerUserId: o.owner, teamId: o.team, amount: 1_000_000n, dueDate: o.at } });
  const start = new Date(o.at.getTime() + seq * 3_600_000);
  await db.appointment.create({
    data: { id: ids.appointment, code: `LH-RS${n}`, contactId: ids.contact, ownerUserId: o.owner, teamId: o.team, serviceId: o.service, staffId: o.staff, startAt: start, endAt: new Date(start.getTime() + 1_800_000), blockEndAt: new Date(start.getTime() + 1_800_000) },
  });
  return ids;
}

/** Dịch vụ + nhân viên + tài khoản kênh dùng chung cho các bộ chứng từ. */
export async function seedBase(db: TenantDb, at: Date): Promise<{ account: string; service: string; staff: string }> {
  const account = uuidv7();
  const service = uuidv7();
  const staff = uuidv7();
  await db.channelAccount.create({ data: { id: account, type: 'webchat', name: 'Web scope', status: 'connected', settings: {}, createdAt: at } });
  await db.product.create({ data: { id: service, code: `DV-RS${Date.now() % 100000}`, name: 'Dịch vụ scope', type: 'service', price: 100000n, unit: 'lần', durationMin: 30 } });
  await db.staff.create({ data: { id: staff, name: 'KTV scope' } });
  return { account, service, staff };
}
