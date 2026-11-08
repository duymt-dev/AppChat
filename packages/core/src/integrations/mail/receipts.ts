// Biên nhận giao thư của DN (TIP-012c §3.1): một dòng `tenant_mail_delivery` mỗi lượt gửi (dispatch_ref `cr_<recipient>` / `ct_<test>`),
// trạng thái queued → reserved → accepted | failed_before_accept | unknown. Mọi chuyển trạng thái là CAS theo trạng thái nguồn (hai worker
// / lượt cũ hết lease không ghi đè nhau). Không lưu địa chỉ / nội dung — chỉ digest người nhận. `attempts` = số lượt gọi đã xếp (gồm lượt
// hoãn vì thiếu bộ xử lý miền) — ref biên nhận gọi `<dispatch_ref>#<attempts>` nên mỗi lượt là một biên nhận gọi riêng.
import type { TenantDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import type { TenantTx } from '../../kernel/actions/action-context';

export type DeliveryRow = NonNullable<Awaited<ReturnType<TenantDb['tenantMailDelivery']['findUnique']>>>;
export type DeliveryState = DeliveryRow['state'];
type Db = Pick<TenantTx, 'tenantMailDelivery'>;

export interface NewDelivery {
  dispatchRef: string;
  connectionId: string;
  subjectKind: 'campaign_recipient' | 'test_send';
  campaignId: string;
  recipientId?: string;
  testInvocationId?: string;
  senderId: string;
  senderRev: number;
  recipientDigest: string;
}

/** Tạo (hoặc trả lại) biên nhận — cùng dispatch_ref → cùng dòng (phát lại dispatch không tạo lượt gửi thứ hai). */
export async function createDelivery(db: Db, d: NewDelivery, now: Date): Promise<{ row: DeliveryRow; created: boolean }> {
  const ins = await db.tenantMailDelivery.createMany({
    data: [{ id: uuidv7(now.getTime()), dispatchRef: d.dispatchRef, connectionId: d.connectionId, subjectKind: d.subjectKind, campaignId: d.campaignId, recipientId: d.recipientId ?? null, testInvocationId: d.testInvocationId ?? null, senderId: d.senderId, senderRev: d.senderRev, configRev: d.senderRev, recipientDigest: d.recipientDigest, createdAt: now, updatedAt: now }],
    skipDuplicates: true,
  });
  return { row: await db.tenantMailDelivery.findUniqueOrThrow({ where: { dispatchRef: d.dispatchRef } }), created: ins.count === 1 };
}

/** CAS chuyển trạng thái — trả false khi dòng không còn ở trạng thái nguồn. */
export async function moveDelivery(db: Db, id: string, from: DeliveryState, data: Parameters<Db['tenantMailDelivery']['updateMany']>[0]['data'], now: Date): Promise<boolean> {
  const r = await db.tenantMailDelivery.updateMany({ where: { id, state: from }, data: { ...data, updatedAt: now } as never });
  return r.count === 1;
}

export const callRefOf = (d: Pick<DeliveryRow, 'dispatchRef' | 'attempts'>) => `${d.dispatchRef}#${d.attempts}`;
export const dispatchRefOfCall = (ref: string) => ref.replace(/#\d+$/, '');
