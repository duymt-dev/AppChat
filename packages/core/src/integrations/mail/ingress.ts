// Ingress callback mail của DN (TIP-012c §4.1–§4.2, §4.5): route chung `/hooks/integrations/:connector/:connectionId` → webhook.service
// nhánh port `mail` gọi vào đây TRƯỚC mọi tác dụng nghiệp vụ. Xác thực trên byte gốc ở adapter (token hiện tại của kết nối đang chạy,
// hoặc token đã giữ riêng còn hạn sau ngắt kết nối / đổi khoá); sai → null (người gọi trả 401 / 404 đồng nhất). Sự kiện hợp lệ lưu
// `tenant_mail_event` chỉ thêm, chống lặp theo (kết nối, khoá provider) — chưa ghép được biên nhận vẫn lưu `unresolved` (có giới hạn),
// không suy người nhận / lượt gửi gần nhất. Ghép = kết nối + tài khoản provider + mã thư + digest người nhận. Áp kết quả ở results.ts
// (cùng transaction với việc tiêu thụ sự kiện → hai callback / hai đối soát chỉ một tác dụng).
import type { TenantDb } from '@appchat/db';
import type { ConnectionCtx, MailEvent, TenantMailProvider, WebhookRequest } from '@appchat/integrations';
import { uuidv7 } from '../../kernel/ids';
import { applyEvent } from './results';

export const UNRESOLVED_CAP = 10_000;

export interface MailIngressAck {
  accepted: number;
  duplicate: number;
  unresolved: number;
}

/** Xác thực bằng token hiện tại (kết nối đang chạy) rồi lần lượt token đã giữ — trả sự kiện của token đầu tiên khớp. */
export function authenticate(adapter: TenantMailProvider, ctx: ConnectionCtx | null, retained: string[], connId: string, req: WebhookRequest): MailEvent[] | null {
  if (!adapter.parseEvents) return null;
  if (ctx) {
    const evs = adapter.parseEvents(ctx, req);
    if (evs) return evs;
  }
  for (const token of retained) {
    const evs = adapter.parseEvents({ id: connId, mode: 'live', config: {}, secrets: { webhook_token: token } }, req);
    if (evs) return evs;
  }
  return null;
}

/** Lưu + ghép + áp từng sự kiện (mỗi sự kiện một transaction ngắn). */
export async function ingestMailEvents(db: TenantDb, ws: string, connId: string, accountRef: string, events: MailEvent[], now: Date): Promise<MailIngressAck> {
  const ack: MailIngressAck = { accepted: 0, duplicate: 0, unresolved: 0 };
  for (const e of events) {
    const r = await db.$transaction(async (tx) => {
      const d = await tx.tenantMailDelivery.findFirst({
        where: { connectionId: connId, providerAccountRef: accountRef, providerMessageRef: e.providerMessageRef, recipientDigest: e.recipientDigest },
        select: { id: true },
      });
      if (!d) {
        const open = await tx.tenantMailEvent.count({ where: { connectionId: connId, state: 'unresolved' } });
        if (open >= UNRESOLVED_CAP) return 'ignored' as const;
      }
      const id = uuidv7(now.getTime());
      const ins = await tx.tenantMailEvent.createMany({
        data: [{ id, connectionId: connId, externalEventKey: e.key.slice(0, 300), deliveryId: d?.id ?? null, type: e.type, providerMessageRef: e.providerMessageRef, recipientDigest: e.recipientDigest, occurredAt: new Date(e.occurredAt), state: 'unresolved', receivedAt: now }],
        skipDuplicates: true,
      });
      if (!ins.count) return 'duplicate' as const;
      await tx.integrationConnection.updateMany({ where: { id: connId }, data: { lastEventAt: now } });
      if (!d) return 'unresolved' as const;
      await applyEvent(tx, ws, id, now);
      return 'accepted' as const;
    });
    if (r === 'accepted') ack.accepted++;
    else if (r === 'duplicate') ack.duplicate++;
    else if (r === 'unresolved') ack.unresolved++;
  }
  return ack;
}
