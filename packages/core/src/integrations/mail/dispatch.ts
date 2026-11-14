// Op `mail.send` (TIP-012c §2.4, §3): cầu adapter giữa biên nhận giao thư và TenantMailProvider — KHÔNG phải engine chiến dịch thứ hai.
// Chạy trong runner biên nhận gọi chung (ROLE=jobs, ngoài transaction; kết nối đổi khoá → cancelled trước khi gọi). Một lượt:
//   biên nhận đang `reserved` (sập sau đặt chỗ ở lượt trước) → unknown, KHÔNG gửi lại · miền kiểm lại + dựng thư từ bản đã duyệt (domain
//   prepare: phạm vi / huỷ nhận / phiên bản người gửi hiện tại) · CAS queued → reserved · gửi · ghi kết quả trung thực.
// Thử lại có giới hạn (3 lượt, lùi theo lượt / Retry-After) CHỈ khi provider chứng minh chưa nhận (failed_before_accept retryable);
// unknown / lỗi sau khi gọi → unknown (không thử mù, không lùi Brevo → SMTP). Thiếu bộ xử lý miền → hoãn (không bao giờ "accepted").
// Miền (marketing) đăng ký lúc khởi động — integrations không import marketing (cùng mẫu registerCallOp / bank ingress sink).
import { ProviderError, isTenantMail, type SendOutcome, type TenantMailMessage } from '@appchat/integrations';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { backoffAt, upsertCall, type CallRow } from '../operations/call-receipt';
import type { CallOpSpec } from '../operations/call-runner';
import { callRefOf, dispatchRefOfCall, moveDelivery, type DeliveryRow } from './receipts';
import { reconcileDelivery } from './results';

export const MAIL_SEND_OP = 'mail.send';
export const MAIL_MAX_ATTEMPTS = 3;
const DEFER_S = 60;

export type MailPrepared = { ok: true; message: TenantMailMessage } | { ok: false; reason: string; already?: boolean };

/** Bộ xử lý miền của lượt gửi (marketing đăng ký ở ROLE=jobs). */
export interface MailDomain {
  /** `requestedBy` = người / hệ thống đã xếp lượt (gửi thử: người bấm — địa chỉ lấy lại lúc gửi, không lưu trong hàng đợi). */
  prepare(a: { db: TenantDb; ws: string; delivery: DeliveryRow; requestedBy: string; now: Date }): Promise<MailPrepared>;
  /** Nhả đặt chỗ miền trước khi thử lại (provider chứng minh chưa nhận). */
  release(a: { db: TenantDb; ws: string; delivery: DeliveryRow; now: Date }): Promise<void>;
  /** Kết quả cuối của lượt gửi (idempotent theo dispatch_ref + kết quả). */
  result(a: { ws: string; delivery: DeliveryRow; outcome: SendOutcome; now: Date }): Promise<void>;
}

let domain: MailDomain | null = null;
export const registerMailDomain = (d: MailDomain) => void (domain = d);
export const unregisterMailDomain = () => void (domain = null);
export const mailDomainRegistered = () => !!domain;

type QueueTx = Pick<TenantTx, 'tenantMailDelivery' | 'integrationCallLog'>;

/** Xếp một lượt gọi cho biên nhận (tăng attempts → ref mới) — trong transaction của người gọi; quét 60 giây nhặt nếu không có producer. */
export async function queueMailSend(tx: QueueTx, d: Pick<DeliveryRow, 'id' | 'connectionId'>, a: { configRev: number; requestedBy: string; at: Date }, now: Date): Promise<CallRow> {
  const next = await tx.tenantMailDelivery.update({ where: { id: d.id }, data: { attempts: { increment: 1 }, nextAttemptAt: a.at, updatedAt: now } });
  const { row } = await upsertCall(tx, { connectionId: d.connectionId, op: MAIL_SEND_OP, refId: callRefOf(next), refType: 'mail_delivery', configRev: a.configRev, safety: 'mutation', requestedBy: a.requestedBy }, now);
  if (a.at.getTime() > now.getTime()) return tx.integrationCallLog.update({ where: { id: row.id }, data: { nextAttemptAt: a.at } });
  return row;
}

const unknownOf = (reason: string) => ({ state: 'unknown' as const, reason });
type Out = Record<string, string>;

export const mailSendOp: CallOpSpec = {
  safety: 'mutation',
  async run(a): Promise<Out> {
    const now = a.now();
    const ref = a.call.refId ?? '';
    const d = await a.db.tenantMailDelivery.findUnique({ where: { dispatchRef: dispatchRefOfCall(ref) } });
    // Biên nhận gọi cũ (đã có lượt mới) / kết nối khác → bỏ, không gửi.
    if (!d || d.connectionId !== a.conn.id || callRefOf(d) !== ref) return { state: 'stale' };
    const dom = domain;
    const again = (at: Date, t: Date) => a.db.$transaction((tx) => queueMailSend(tx, d, { configRev: a.call.configRev ?? d.configRev, requestedBy: a.call.requestedBy ?? 'system', at }, t));
    if (d.state === 'reserved') {
      // Sập sau khi đặt chỗ ở lượt trước: có thể đã gửi → unknown, không gửi lần hai.
      const out = unknownOf('interrupted_after_reserve');
      if (await moveDelivery(a.db, d.id, 'reserved', { state: 'unknown', reason: out.reason, nextAttemptAt: null }, now)) await dom?.result({ ws: a.workspaceId, delivery: d, outcome: out, now });
      return { state: 'unknown' };
    }
    if (d.state !== 'queued') return { state: d.state };
    if (!dom) {
      // Chưa có bộ xử lý miền ở tiến trình này: hoãn có giới hạn, chưa chạm provider; hết lượt → thất bại chắc chắn chưa gửi.
      if (d.attempts < MAIL_MAX_ATTEMPTS) {
        await again(new Date(now.getTime() + DEFER_S * 1000), now);
        return { state: 'deferred' };
      }
      await moveDelivery(a.db, d.id, 'queued', { state: 'failed_before_accept', reason: 'domain_unavailable', nextAttemptAt: null }, now);
      return { state: 'failed_before_accept' };
    }
    const prep = await dom.prepare({ db: a.db, ws: a.workspaceId, delivery: d, requestedBy: a.call.requestedBy ?? '', now });
    if (!prep.ok) {
      const out = prep.already ? unknownOf('interrupted_after_attempt') : { state: 'failed_before_accept' as const, retryable: false, reason: prep.reason };
      if ((await moveDelivery(a.db, d.id, 'queued', { state: out.state, reason: out.reason, nextAttemptAt: null }, now)) && prep.already) await dom.result({ ws: a.workspaceId, delivery: d, outcome: out, now });
      return { state: out.state };
    }
    if (!isTenantMail(a.adapter)) throw new ProviderError('unsupported', 'adapter');
    if (!a.mail) throw new ProviderError('provider_unavailable', 'mail');
    if (!(await moveDelivery(a.db, d.id, 'queued', { state: 'reserved', reason: null }, now))) return { state: 'stale' };
    let out: SendOutcome;
    try {
      out = await a.adapter.send(a.conn, a.mail, prep.message);
    } catch {
      out = unknownOf('send_error');
    }
    const t = a.now();
    if (out.state === 'failed_before_accept' && out.retryable && d.attempts < MAIL_MAX_ATTEMPTS) {
      // Provider chứng minh chưa nhận → nhả đặt chỗ, xếp lượt sau (chưa ghi kết quả cuối).
      if (await moveDelivery(a.db, d.id, 'reserved', { state: 'queued', reason: out.reason }, t)) {
        await dom.release({ db: a.db, ws: a.workspaceId, delivery: d, now: t });
        await again(backoffAt(t, d.attempts, out.retryAfterS), t);
      }
      return { state: 'retry', reason: out.reason };
    }
    const data = out.state === 'accepted' ? { state: out.state, providerMessageRef: out.providerMessageRef, acceptedAt: t, reason: null, nextAttemptAt: null } : { state: out.state, reason: out.reason, nextAttemptAt: null };
    if (await moveDelivery(a.db, d.id, 'reserved', data, t)) {
      await dom.result({ ws: a.workspaceId, delivery: d, outcome: out, now: t });
      // Callback đến trước phản hồi provider → sự kiện `unresolved` cùng mã thư được ghép + áp ngay.
      if (out.state === 'accepted') await a.db.$transaction((tx) => reconcileDelivery(tx, a.workspaceId, d.id, t));
    }
    return { state: out.state };
  },
};
