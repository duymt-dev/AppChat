// Biên nhận lần thử ký (TIP-030c §2.2–2.6): mỗi request một dòng `contract_signing_attempt` (khoá = request_ref theo miền token / người dùng)
// — digest input HMAC (OTP + ảnh chữ ký, không lưu thô), thế hệ OTP + băm mã đã kiểm, version / hash tài liệu lúc kiểm. Claim render theo
// thế hệ (lease 90 s — quá timeout render 60 s): tiến trình cũ hết lease không ghi đè được kết quả của lượt mới. Không có OTP / chữ ký thô.
import { createHash, createHmac, randomUUID } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';

export const RENDER_LEASE_MS = 90_000;

/** Digest input ngữ nghĩa (HMAC theo khoá ứng dụng, miền riêng) — cùng request khác OTP / chữ ký → khác digest → 409. */
export const attemptDigest = (key: Buffer, otp: string, png: string) =>
  createHmac('sha256', key).update(`appchat:sign-attempt:v1|${otp}|${createHash('sha256').update(png).digest('hex')}`).digest('hex');

export const signatureDigest = (png: string) => createHash('sha256').update(png).digest('hex');

/** PNG chữ ký thật (magic bytes) và có giới hạn (≤ 300 KB). */
export function pngBytes(dataUrl: string): Buffer {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]{20,400000})$/.exec(dataUrl);
  const b = m ? Buffer.from(m[1]!, 'base64') : null;
  if (!b || b.length > 300_000 || b.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new AppError('VALIDATION_FAILED', 422, { signature_png: 'invalid' });
  return b;
}

export type AttemptPhase = 'rejected' | 'verified' | 'rendering' | 'staged' | 'finalized' | 'stale' | 'expired';

export interface Claim {
  generation: number;
  token: string;
}

/**
 * Claim lượt render: verified → rendering (thế hệ +1), hoặc rendering đã hết lease (tiến trình cũ chết) → lượt mới. Lượt khác đang giữ lease
 * → 409 in_progress (client gửi lại cùng request). Trả null khi lần thử đã ở pha khác (staged / finalized / stale…) — người gọi đọc pha.
 */
export async function claimRender(db: Pick<TenantDb, '$queryRaw'>, attemptId: string, now: Date): Promise<Claim | null> {
  const token = randomUUID();
  const [r] = await db.$queryRaw<{ gen: number }[]>`
    UPDATE contract_signing_attempt SET phase = 'rendering', render_generation = render_generation + 1, render_token = ${token}, lease_until = ${new Date(now.getTime() + RENDER_LEASE_MS)}, updated_at = ${now}
     WHERE id = ${attemptId}::uuid AND expires_at > ${now} AND (phase = 'verified' OR (phase = 'rendering' AND lease_until < ${now}))
    RETURNING render_generation AS gen`;
  if (r) return { generation: r.gen, token };
  const [cur] = await db.$queryRaw<{ phase: AttemptPhase; lease_until: Date | null }[]>`SELECT phase::text AS phase, lease_until FROM contract_signing_attempt WHERE id = ${attemptId}::uuid`;
  if (cur?.phase === 'rendering' && cur.lease_until && cur.lease_until >= now) throw new AppError('CONFLICT', 409, { attempt: 'in_progress' });
  return null;
}

export async function attemptPhase(db: Pick<TenantDb, '$queryRaw'>, attemptId: string): Promise<AttemptPhase | null> {
  const [r] = await db.$queryRaw<{ phase: AttemptPhase }[]>`SELECT phase::text AS phase FROM contract_signing_attempt WHERE id = ${attemptId}::uuid`;
  return r?.phase ?? null;
}
