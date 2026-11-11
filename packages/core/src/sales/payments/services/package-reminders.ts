// Nhắc liệu trình (TIP-032b, COMMERCE §6 "Còn 1 buổi hoặc còn 7 ngày tới hạn thì nhắc khách gia hạn hoặc mua thêm"): quét gói đang dùng
// còn đúng 1 buổi (mốc `remaining_1`, một lần mỗi gói) hoặc hạn trong 7 ngày lịch giờ workspace (mốc `expiry_t7`). Biên nhận
// `package_reminder` (gói, mốc, bản hạn) unique → quét lại / chạy song song / event trùng không nhân thông báo; gia hạn tăng bản hạn → T-7 nhắc lại theo hạn
// mới, nhắc của bản hạn cũ không gửi (kiểm bản hạn trong transaction). Event `package.reminder_due` → luật thông báo người phụ trách đơn
// (package-notification.rules.ts) kèm gợi ý liên hệ khách; KHÔNG tự gửi tin cho khách — gửi qua action / duyệt như mọi lệnh gửi khác.
import type { TenantDb } from '@appchat/db';
import { dayEndAfter, daysLeft } from '@appchat/shared';
import { uuidv7 } from '../../../kernel/ids';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { writeOutbox, type OutboxEventInput } from '../../../kernel/outbox/outbox';
import { inEventTransaction } from '../../../kernel/outbox/transaction';

export const PACKAGE_REMIND_DAYS = 7;
const BATCH = 200;
const cut = (s: string) => s.slice(0, 200);

export type PackageMilestone = 'remaining_1' | 'expiry_t7';

/** Biên nhận + event một mốc trong transaction của caller (khoá gói). null = đã nhắc / gói đổi giữa chừng. TIP-003c: dùng chung cho action riêng. */
export async function packageReminderIn(tx: TenantTx, packageId: string, milestone: PackageMilestone, now: Date, timeZone: string): Promise<OutboxEventInput[] | null> {
  await tx.$queryRaw`SELECT 1 FROM customer_package WHERE id = ${packageId}::uuid FOR UPDATE`;
  const p = await tx.customerPackage.findUnique({ where: { id: packageId } });
  if (!p || p.status !== 'active') return null;
  const left = p.totalSessions - p.usedSessions;
  if (milestone === 'remaining_1' && left !== 1) return null;
  if (milestone === 'expiry_t7' && (!p.expiresAt || p.expiresAt < now || p.expiresAt > dayEndAfter(now, PACKAGE_REMIND_DAYS, timeZone))) return null;
  // "Còn 1 buổi" không phụ thuộc hạn → một lần mỗi gói (bản 0); T-7 một lần mỗi bản hạn.
  const version = milestone === 'remaining_1' ? 0 : p.expiryVersion;
  const r = await tx.$executeRaw`INSERT INTO package_reminder (id, package_id, milestone, expiry_version, created_at)
    VALUES (${uuidv7(now.getTime())}::uuid, ${p.id}::uuid, ${milestone}, ${version}, ${now})
    ON CONFLICT (package_id, milestone, expiry_version) DO NOTHING`;
  if (!r) return null;
  const [o, c] = await Promise.all([
    tx.order.findUnique({ where: { id: p.orderId }, select: { ownerUserId: true } }),
    tx.contact.findUnique({ where: { id: p.contactId }, select: { name: true } }),
  ]);
  const days = milestone === 'expiry_t7' ? Math.max(0, daysLeft(now, p.expiresAt!, timeZone)) : null;
  return [
    {
      topic: 'package.reminder_due',
      payload: { package_id: p.id, contact_id: p.contactId, order_id: p.orderId, milestone, expiry_version: p.expiryVersion, owner_user_id: o?.ownerUserId ?? null, name: cut(p.name), contact: cut(c?.name ?? ''), days },
    },
  ];
}

/** Ghi biên nhận + thông báo một mốc cho một gói (transaction riêng). false = đã nhắc / gói đổi giữa chừng. */
async function remindOne(db: TenantDb, ws: string, packageId: string, milestone: PackageMilestone, now: Date, timeZone: string): Promise<boolean> {
  return inEventTransaction(db, ws, async (tx) => {
    const events = await packageReminderIn(tx, packageId, milestone, now, timeZone);
    if (!events) return false;
    await writeOutbox(tx, ws, events, now);
    return true;
  });
}

/** Quét (scheduler `sales.payment-sweep`): mọi gói đang dùng chạm mốc. Trả số thông báo đã ghi. */
export async function remindPackages(db: TenantDb, ws: string, now: Date, timeZone: string): Promise<number> {
  const [ending, last] = await Promise.all([
    db.customerPackage.findMany({ where: { status: 'active', expiresAt: { gte: now, lte: dayEndAfter(now, PACKAGE_REMIND_DAYS, timeZone) } }, select: { id: true }, take: BATCH }),
    db.$queryRaw<{ id: string }[]>`SELECT id FROM customer_package WHERE status = 'active' AND (total_sessions - used_sessions) = 1 LIMIT ${BATCH}`,
  ]);
  let n = 0;
  for (const { id } of ending) if (await remindOne(db, ws, id, 'expiry_t7', now, timeZone)) n++;
  for (const { id } of last) if (await remindOne(db, ws, id, 'remaining_1', now, timeZone)) n++;
  return n;
}

/** Event trừ buổi (`appointment.completed` có `package_id`): nhắc "còn 1 buổi" ngay, không chờ lượt quét. */
export const remindRemaining = (db: TenantDb, ws: string, packageId: string, now: Date, timeZone: string) => remindOne(db, ws, packageId, 'remaining_1', now, timeZone);
