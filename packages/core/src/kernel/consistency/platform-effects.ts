// Hiệu ứng ngoài của thao tác nền tảng (TIP-045b annex A1): ghi `platform_effect` CÙNG commit nền tảng (payload mã hoá AES-256-GCM, có
// hạn), gửi SAU commit bằng người gửi đăng ký theo `kind` (domain cài — kernel không biết thư / kênh). Gửi lỗi → thử lại có backoff, quá
// lượt / hết hạn → `dead` (payload xoá). Gửi xong xoá payload (token mời chỉ tồn tại dạng mã hoá tới khi gửi). Không ghi payload vào log.
import type { PlatformDb } from '@appchat/db';
import type { PlatformTx } from '../actions/action-context';
import { decryptSecret, encryptSecret } from '../crypto';
import { uuidv7 } from '../ids';

export type EffectSender = (payload: Record<string, unknown>, meta: { workspaceId: string; operationId: string }) => Promise<void>;

const senders = new Map<string, EffectSender>();

/** Domain đăng ký người gửi cho một loại hiệu ứng (vd. `identity.invite_mail`). */
export function registerEffectSender(kind: string, fn: EffectSender): () => void {
  senders.set(kind, fn);
  return () => void (senders.get(kind) === fn && senders.delete(kind));
}

export const EFFECT_MAX_ATTEMPTS = 8;
const backoffMs = (attempt: number) => Math.min(60 * 60_000, 15_000 * 2 ** Math.max(0, attempt - 1));

/** Ghi hiệu ứng trong transaction nền tảng — unique(operation, kind): chạy lại pha nền tảng không nhân đôi. */
export async function recordEffects(
  ptx: PlatformTx,
  ws: string,
  operationId: string,
  effects: readonly { kind: string; payload: Record<string, unknown>; ttlMs: number }[],
  key: Buffer | undefined,
  now: Date,
): Promise<void> {
  if (!effects.length) return;
  if (!key) throw new Error('platform_effect cần APP_ENC_KEY');
  for (const e of effects) {
    await ptx.platformEffect.upsert({
      where: { operationId_kind: { operationId, kind: e.kind } },
      create: {
        id: uuidv7(now.getTime()),
        operationId,
        workspaceId: ws,
        kind: e.kind,
        payloadEnc: new Uint8Array(encryptSecret(JSON.stringify(e.payload), key)),
        nextAttemptAt: now,
        expiresAt: new Date(now.getTime() + e.ttlMs),
        createdAt: now,
      },
      update: {},
    });
  }
}

export interface EffectDeps {
  platform: PlatformDb;
  key: Buffer | undefined;
  now: () => Date;
  onError?: (kind: string, err: unknown) => void;
}

/** Gửi hiệu ứng còn chờ của một thao tác (ngay sau commit) — lỗi không làm hỏng kết quả, scheduler gửi lại. */
export async function dispatchEffects(d: EffectDeps, operationId: string): Promise<number> {
  const rows = await d.platform.platformEffect.findMany({ where: { operationId, status: 'pending' }, select: { id: true } });
  let sent = 0;
  for (const r of rows) if (await sendOne(d, r.id)) sent++;
  return sent;
}

/** Quét hiệu ứng đến hạn (index `platform_effect_pending_idx`). */
export async function sweepEffects(d: EffectDeps, limit = 50): Promise<number> {
  const rows = await d.platform.platformEffect.findMany({
    where: { status: 'pending', nextAttemptAt: { lte: d.now() } },
    orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
    take: limit,
    select: { id: true },
  });
  let sent = 0;
  for (const r of rows) if (await sendOne(d, r.id)) sent++;
  return sent;
}

async function sendOne(d: EffectDeps, id: string): Promise<boolean> {
  const now = d.now();
  // Nhận lượt gửi: đẩy mốc thử lại về sau trước khi gửi — tiến trình khác không gửi trùng trong cửa sổ này.
  const claim = await d.platform.platformEffect.updateMany({
    where: { id, status: 'pending', nextAttemptAt: { lte: now } },
    data: { nextAttemptAt: new Date(now.getTime() + 5 * 60_000), attempts: { increment: 1 } },
  });
  if (claim.count !== 1) return false;
  const e = await d.platform.platformEffect.findUniqueOrThrow({ where: { id } });
  const dead = async (reason: string) => {
    await d.platform.platformEffect.update({ where: { id }, data: { status: 'dead', payloadEnc: null, lastError: reason } });
    return false;
  };
  if (e.expiresAt <= now) return dead('expired');
  const send = senders.get(e.kind);
  if (!send || !e.payloadEnc || !d.key) {
    await d.platform.platformEffect.update({ where: { id }, data: { nextAttemptAt: new Date(now.getTime() + backoffMs(e.attempts)), lastError: send ? 'no_key' : 'no_sender' } });
    return false;
  }
  try {
    const payload = JSON.parse(decryptSecret(e.payloadEnc, d.key)) as Record<string, unknown>;
    await send(payload, { workspaceId: e.workspaceId, operationId: e.operationId });
  } catch (err) {
    d.onError?.(e.kind, err);
    if (e.attempts >= EFFECT_MAX_ATTEMPTS) return dead('max_attempts');
    // Chỉ tên lỗi (không message — có thể chứa địa chỉ / token).
    await d.platform.platformEffect.update({ where: { id }, data: { nextAttemptAt: new Date(now.getTime() + backoffMs(e.attempts)), lastError: (err as Error)?.name?.slice(0, 80) ?? 'error' } });
    return false;
  }
  await d.platform.platformEffect.update({ where: { id }, data: { status: 'sent', sentAt: now, payloadEnc: null, lastError: null } });
  return true;
}
