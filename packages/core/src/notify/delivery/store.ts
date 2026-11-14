// Kho ý định giao (TIP-006b §1.2–1.3, §3.4): ghi ý định mail / realtime trong transaction của thông báo; claim mail CAS (pending + tới hạn
// → dispatching có token + thế hệ + hạn claim) ngay trước khi gọi provider; ghi kết cục theo fence (người cũ mất claim không ghi đè kết cục).
import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { RealtimeEnvelope } from '../realtime/envelope';
import { MAIL_BACKOFF_MS, MAIL_CHANNEL, MAIL_CLAIM_MS, MAIL_MAX_ATTEMPTS } from './types';

export interface MailIntent {
  notificationId: string;
  /** null = Owner hiện tại (mục tiêu biểu tượng) — ràng lúc giao lần đầu. */
  userId: string | null;
  logicalTargetKey: string;
  sourceEventId: string;
  kind: string;
  intentIndex: number;
  policy: string | null;
}

/** Ý định mail (idempotent theo (thông báo, mục tiêu logic, kênh)) → id ý định (cũ nếu đã có). */
export async function addMailIntent(tx: Pick<TenantTx, '$queryRaw'>, i: MailIntent, now: Date): Promise<{ id: string; phase: string }> {
  const [r] = await tx.$queryRaw<{ id: string; phase: string }[]>`
    INSERT INTO notification_delivery (id, notification_id, user_id, logical_target_key, channel, source_event_id, kind, intent_index, policy_reference, next_attempt_at, created_at, updated_at)
    VALUES (${uuidv7(now.getTime())}::uuid, ${i.notificationId}::uuid, ${i.userId}::uuid, ${i.logicalTargetKey}, ${MAIL_CHANNEL}, ${i.sourceEventId}::uuid, ${i.kind}, ${i.intentIndex}, ${i.policy}, ${now}, ${now}, ${now})
    ON CONFLICT (notification_id, logical_target_key, channel) DO UPDATE SET updated_at = notification_delivery.updated_at
    RETURNING id::text AS id, phase::text AS phase`;
  return r!;
}

/** Ý định realtime (gói tin tối thiểu đã làm sạch). */
export async function addRealtimeIntent(tx: Pick<TenantTx, '$queryRaw'>, sourceEventId: string, env: RealtimeEnvelope, now: Date): Promise<string> {
  const id = uuidv7(now.getTime());
  await tx.$queryRaw`INSERT INTO realtime_delivery (id, source_event_id, envelope, next_attempt_at, created_at) VALUES (${id}::uuid, ${sourceEventId}::uuid, ${JSON.stringify(env)}::jsonb, ${now}, ${now}) RETURNING id`;
  return id;
}

export interface MailClaim {
  id: string;
  token: string;
  generation: number;
  attempt: number;
  notificationId: string;
  userId: string | null;
  kind: string;
  policy: string | null;
}

type Db = Pick<TenantDb, '$queryRaw' | '$executeRaw'>;

/** pending + tới hạn → dispatching (token + thế hệ + hạn claim). null = không còn gì để gửi (đã gửi / đang gửi / chưa tới hạn). */
export async function claimMail(db: Db, id: string, now: Date): Promise<MailClaim | null> {
  const token = randomUUID();
  const [r] = await db.$queryRaw<{ gen: number; attempt: number; nid: string; uid: string | null; kind: string; policy: string | null }[]>`
    UPDATE notification_delivery SET phase = 'dispatching', claim_token = ${token}::uuid, claim_generation = claim_generation + 1, attempt_no = attempt_no + 1,
           claim_until = ${new Date(now.getTime() + MAIL_CLAIM_MS)}, updated_at = ${now}
     WHERE id = ${id}::uuid AND phase = 'pending' AND next_attempt_at <= ${now}
    RETURNING claim_generation AS gen, attempt_no AS attempt, notification_id::text AS nid, user_id::text AS uid, kind, policy_reference AS policy`;
  return r ? { id, token, generation: r.gen, attempt: r.attempt, notificationId: r.nid, userId: r.uid, kind: r.kind, policy: r.policy } : null;
}

/** Ràng Owner hiện tại cho ý định biểu tượng — chỉ khi chưa gửi (đang claim của chính mình). */
export async function bindRecipient(db: Db, c: MailClaim, userId: string): Promise<boolean> {
  return (await db.$executeRaw`UPDATE notification_delivery SET user_id = ${userId}::uuid WHERE id = ${c.id}::uuid AND claim_token = ${c.token}::uuid AND phase = 'dispatching'`) === 1;
}

/** Kết cục theo fence: accepted / suppressed / unknown / failed; `retry` → về pending với back-off (≤ 5 lần, sau đó failed). */
export async function settleMail(db: Db, c: MailClaim, outcome: 'accepted' | 'suppressed' | 'unknown' | 'failed' | 'retry', code: string | null, now: Date): Promise<boolean> {
  if (outcome === 'retry') {
    if (c.attempt >= MAIL_MAX_ATTEMPTS) return settleMail(db, c, 'failed', code, now);
    const next = new Date(now.getTime() + MAIL_BACKOFF_MS * 2 ** (c.attempt - 1));
    return (await db.$executeRaw`
      UPDATE notification_delivery SET phase = 'pending', next_attempt_at = ${next}, claim_until = NULL, safe_code = ${code}, updated_at = ${now}
       WHERE id = ${c.id}::uuid AND claim_token = ${c.token}::uuid AND claim_generation = ${c.generation} AND phase = 'dispatching'`) === 1;
  }
  return (await db.$executeRaw`
    UPDATE notification_delivery SET phase = ${outcome}::notification_delivery_phase, claim_until = NULL, safe_code = ${code}, updated_at = ${now},
           accepted_at = CASE WHEN ${outcome} = 'accepted' THEN ${now}::timestamptz ELSE accepted_at END
     WHERE id = ${c.id}::uuid AND claim_token = ${c.token}::uuid AND claim_generation = ${c.generation} AND phase = 'dispatching'`) === 1;
}
