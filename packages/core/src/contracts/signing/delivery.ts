// Gửi OTP "Duyệt & ký" của Owner bền (TIP-030c §4.2–4.4): ý định `contract_signing_delivery` (người ký + thế hệ OTP + mục đích, duy nhất)
// ghi CÙNG transaction phát mã; mã chỉ ở dạng mã hoá AES-GCM trong dòng ý định, xoá khi accepted / hết hạn / bị thay. Gửi: claim CAS
// (`dispatching` + hạn claim, ghi TRƯỚC khi gọi provider) → kiểm lại người nhận HIỆN TẠI (thành viên active, còn `contract.sign`, email,
// đúng thế hệ + còn hạn) → MailProvider nền tảng một lần → accepted (CAS theo claim). Provider từ chối rõ (≥ 400) → thử lại ≤ 5 (5 s × 2^n)
// khi mã còn hạn; timeout / lỗi khác / chết sau gọi → `unknown`, KHÔNG gửi lại. Mã mới → ý định cũ chưa gửi thành suppressed.
import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import { can, interpolate, serverMessages, type AuthzContext } from '@appchat/shared';
import type { MailProvider } from '@appchat/integrations';
import { MailSendError } from '@appchat/integrations';
import type { TenantTx } from '../../kernel/actions/action-context';
import { decryptSecret, encryptSecret } from '../../kernel/crypto';
import { uuidv7 } from '../../kernel/ids';

export const OWNER_OTP = 'owner_otp';
export const SIGN_MAIL_MAX_ATTEMPTS = 5;
export const SIGN_MAIL_BACKOFF_MS = 5_000;
export const SIGN_MAIL_CLAIM_MS = 120_000;

export type DeliveryStatus = 'queued' | 'accepted' | 'unknown' | 'suppressed';

/** Ghi ý định gửi (trong transaction phát mã); thế hệ cũ chưa gửi của người ký → suppressed + xoá mã mã hoá. */
export async function addOwnerOtpIntent(tx: Pick<TenantTx, '$executeRaw'>, key: Buffer, i: { signerId: string; generation: number; recipientUserId: string; requestRef: string; code: string; expiresAt: Date; now: Date }): Promise<string> {
  await tx.$executeRaw`
    UPDATE contract_signing_delivery SET phase = 'suppressed', safe_code = 'superseded', encrypted_secret = NULL, updated_at = ${i.now}
     WHERE signer_id = ${i.signerId}::uuid AND purpose = ${OWNER_OTP} AND otp_generation < ${i.generation} AND phase = 'pending'`;
  const id = uuidv7(i.now.getTime());
  await tx.$executeRaw`
    INSERT INTO contract_signing_delivery (id, request_ref, signer_id, otp_generation, purpose, recipient_user_id, next_due, expires_at, encrypted_secret, created_at, updated_at)
    VALUES (${id}::uuid, ${i.requestRef}, ${i.signerId}::uuid, ${i.generation}, ${OWNER_OTP}, ${i.recipientUserId}::uuid, ${i.now}, ${i.expiresAt}, ${encryptSecret(i.code, key)}, ${i.now}, ${i.now})`;
  return id;
}

export interface SignMailDeps {
  mail: MailProvider | null;
  key: Buffer;
  /** Người nhận hiện tại: email + quyền (thành viên active) — null = không còn được nhận. */
  recipient(ws: string, userId: string): Promise<{ email: string; authz: AuthzContext } | null>;
  place(ws: string): Promise<{ locale: string }>;
  now: () => Date;
}

type Row = { id: string; gen: number; token: string; signer_id: string; otp_generation: number; recipient: string; attempts: number; expires_at: Date; secret: Uint8Array | null };

const settle = (db: Pick<TenantDb, '$executeRaw'>, id: string, token: string, phase: string, extra: { code?: string; retryAt?: Date }, now: Date) =>
  extra.retryAt
    ? db.$executeRaw`UPDATE contract_signing_delivery SET phase = 'pending', claim_token = NULL, claim_until = NULL, next_due = ${extra.retryAt}, safe_code = ${extra.code ?? null}, updated_at = ${now} WHERE id = ${id}::uuid AND claim_token = ${token}`
    : db.$executeRaw`UPDATE contract_signing_delivery SET phase = ${phase}::signing_delivery_phase, claim_token = NULL, claim_until = NULL, encrypted_secret = NULL, safe_code = ${extra.code ?? null}, updated_at = ${now} WHERE id = ${id}::uuid AND claim_token = ${token}`;

/** Gửi một ý định: claim → kiểm hiện tại → provider một lần → trạng thái cuối. Trả trạng thái cho UI (queued = người khác đang / sẽ gửi). */
export async function deliverOwnerOtp(d: SignMailDeps, db: TenantDb, ws: string, deliveryId: string, contract: { code: string }): Promise<DeliveryStatus> {
  const now = d.now();
  const token = randomUUID();
  const [r] = await db.$queryRaw<Row[]>`
    UPDATE contract_signing_delivery SET phase = 'dispatching', claim_token = ${token}, claim_generation = claim_generation + 1, claim_until = ${new Date(now.getTime() + SIGN_MAIL_CLAIM_MS)}, attempts = attempts + 1, updated_at = ${now}
     WHERE id = ${deliveryId}::uuid AND phase = 'pending' AND next_due <= ${now}
    RETURNING id::text AS id, claim_generation AS gen, claim_token AS token, signer_id::text AS signer_id, otp_generation, recipient_user_id::text AS recipient, attempts, expires_at, encrypted_secret AS secret`;
  if (!r) return 'queued';
  const s = await db.contractSigner.findUnique({ where: { id: r.signer_id }, select: { otpGeneration: true, otpExpiresAt: true, userId: true } });
  // Mã đã bị thay / hết hạn / người ký đổi → không gửi mã cũ.
  if (!s || s.otpGeneration !== r.otp_generation || !s.otpExpiresAt || s.otpExpiresAt < now || r.expires_at < now || s.userId !== r.recipient || !r.secret) {
    await settle(db, r.id, r.token, 'suppressed', { code: 'superseded' }, now);
    return 'suppressed';
  }
  const who = await d.recipient(ws, r.recipient);
  if (!who || !can(who.authz, 'contract.sign')) {
    await settle(db, r.id, r.token, 'suppressed', { code: who ? 'no_permission' : 'not_member' }, now);
    return 'suppressed';
  }
  if (!d.mail) {
    await settle(db, r.id, r.token, 'failed', { code: 'no_provider' }, now);
    return 'suppressed';
  }
  const otp = decryptSecret(r.secret, d.key);
  const m = serverMessages((await d.place(ws)).locale).sales.contract;
  const body = interpolate(m.ownerOtpBody, { code: contract.code, otp });
  try {
    await d.mail.send({ to: who.email, tag: 'contract_otp', subject: interpolate(m.ownerOtpSubject, { code: contract.code, otp }), html: `<p>${body}</p>`, text: body });
  } catch (err) {
    // Từ chối rõ trước khi nhận (4xx / 5xx có mã) → thử lại có giới hạn khi mã còn hạn; mọi lỗi khác có thể đã tới provider → unknown.
    if (err instanceof MailSendError && err.status >= 400 && r.attempts < SIGN_MAIL_MAX_ATTEMPTS) {
      const retryAt = new Date(now.getTime() + SIGN_MAIL_BACKOFF_MS * 2 ** (r.attempts - 1));
      if (retryAt < r.expires_at) {
        await settle(db, r.id, r.token, 'pending', { code: `provider_${err.status}`, retryAt }, now);
        return 'queued';
      }
    }
    await settle(db, r.id, r.token, err instanceof MailSendError ? 'failed' : 'unknown', { code: err instanceof MailSendError ? `provider_${err.status}` : 'send_uncertain' }, now);
    return err instanceof MailSendError ? 'suppressed' : 'unknown';
  }
  await settle(db, r.id, r.token, 'accepted', {}, now);
  return 'accepted';
}

/** Quét: claim quá hạn (có thể đã tới provider) → unknown; ý định pending tới hạn → gửi; hết hạn → xoá mã mã hoá. Trang ≤ 200. */
export async function recoverOwnerOtp(d: SignMailDeps, db: TenantDb, ws: string): Promise<{ sent: number; unknown: number }> {
  const now = d.now();
  const unknown = await db.$executeRaw`
    UPDATE contract_signing_delivery SET phase = 'unknown', safe_code = 'claim_expired', claim_token = NULL, claim_until = NULL, encrypted_secret = NULL, updated_at = ${now}
     WHERE id IN (SELECT id FROM contract_signing_delivery WHERE phase = 'dispatching' AND claim_until < ${now} ORDER BY next_due, id LIMIT 200)`;
  await db.$executeRaw`
    UPDATE contract_signing_delivery SET phase = 'suppressed', safe_code = 'expired', encrypted_secret = NULL, updated_at = ${now}
     WHERE id IN (SELECT id FROM contract_signing_delivery WHERE phase = 'pending' AND expires_at < ${now} ORDER BY next_due, id LIMIT 200)`;
  const due = await db.$queryRaw<{ id: string; code: string }[]>`
    SELECT d.id::text AS id, c.code FROM (SELECT id, signer_id FROM contract_signing_delivery WHERE phase = 'pending' AND next_due <= ${now} ORDER BY next_due, id LIMIT 200) d
      JOIN contract_signer s ON s.id = d.signer_id JOIN contract c ON c.id = s.contract_id`;
  let sent = 0;
  for (const x of due) if ((await deliverOwnerOtp(d, db, ws, x.id, { code: x.code })) === 'accepted') sent++;
  return { sent, unknown };
}
