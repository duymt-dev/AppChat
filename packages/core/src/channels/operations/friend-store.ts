// Bạn bè kênh (TIP-014b E — DC nới DC-247): lệnh bền của nhân viên + sự kiện kênh + tra SĐT. Luật:
// - Chỉ nhân viên bấm trên UI (`ctx.source = 'ui'`), không AI / agent / Trợ lý, không hàng loạt (một người mỗi lệnh).
// - Gửi lời mời chỉ tới định danh ĐÃ BIẾT (đã nhắn với tài khoản / thành viên nhóm / kết quả tra còn hạn); trần 20 / ngày / tài khoản
//   (cấu hình `friend_daily_cap`). Nhận / từ chối chỉ khi có lời mời tới.
// - Tra SĐT: một số mỗi lần, trần 30 / ngày / tài khoản, kết quả tạm 24 giờ, không tự lưu khách; dòng tra là nhật ký.
// - Lệnh: queued → dispatch_reserved (commit trước khi gọi kênh) → confirmed | failed | unknown; job chạy lại thấy dispatch_reserved →
//   unknown (không gọi lại). Chỉ ACK nhà cung cấp mới đổi `state`.
import { AppError, normalizePhone } from '@appchat/shared';
import type { FriendEvent } from '@appchat/channels';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { OutboxEventInput } from '../../kernel/outbox/outbox';

export const FRIEND_LIMITS = { sendPerDay: 20, lookupsPerDay: 30, lookupTtlMs: 24 * 3_600_000 } as const;
const DAY = 86_400_000;

export type FriendOp = 'accept' | 'reject' | 'send' | 'undo';
/** `state` sau ACK của từng lệnh. */
const AFTER: Record<FriendOp, string> = { accept: 'friend', reject: 'none', send: 'outgoing', undo: 'none' };

/** Chỉ UI do người bấm — AI / agent / Trợ lý / task / API không được (DC nới DC-247). */
export function humanOnly(source: string): void {
  if (source !== 'ui') throw new AppError('FORBIDDEN', 403, { source: 'human_only' });
}

/** Định danh đã biết với tài khoản: đã nhắn (participant / hội thoại 1-1 / identity) hoặc kết quả tra còn hạn của chính tài khoản. */
export async function knownIdentity(tx: TenantTx, accountId: string, externalId: string, now: Date): Promise<boolean> {
  const [conv, part, ident, look] = await Promise.all([
    tx.conversation.findFirst({ where: { channelAccountId: accountId, externalThreadId: externalId, kind: 'direct' }, select: { id: true } }),
    tx.$queryRaw<{ x: number }[]>`SELECT 1 AS x FROM conversation_participant p JOIN conversation c ON c.id = p.conversation_id WHERE c.channel_account_id = ${accountId}::uuid AND p.external_id = ${externalId} LIMIT 1`,
    tx.contactIdentity.findUnique({ where: { channelAccountId_externalId: { channelAccountId: accountId, externalId } }, select: { id: true } }),
    tx.channelUserLookup.findFirst({ where: { channelAccountId: accountId, externalId, status: 'found', expiresAt: { gt: now } }, select: { id: true } }),
  ]);
  return !!(conv || part.length || ident || look);
}

/** Trong transaction action: ghi lệnh bền cho một người (một lệnh mở mỗi người) + event yêu cầu. */
export async function requestFriendOp(
  tx: TenantTx,
  i: { accountId: string; externalId: string; op: FriendOp; actorId: string; message?: string; dailyCap: number; now: Date },
): Promise<OutboxEventInput> {
  const cur = await tx.channelFriend.findUnique({ where: { channelAccountId_externalId: { channelAccountId: i.accountId, externalId: i.externalId } } });
  if (cur?.opStatus === 'queued' || cur?.opStatus === 'dispatch_reserved') throw new AppError('CONFLICT', 409, { external_id: 'operation_pending' });
  const state = cur?.state ?? 'none';
  if ((i.op === 'accept' || i.op === 'reject') && state !== 'incoming') throw new AppError('CONFLICT', 409, { external_id: 'no_incoming_request' });
  if (i.op === 'undo' && state !== 'outgoing') throw new AppError('CONFLICT', 409, { external_id: 'no_outgoing_request' });
  if (i.op === 'send') {
    if (state === 'friend' || state === 'outgoing') throw new AppError('CONFLICT', 409, { external_id: state === 'friend' ? 'already_friend' : 'already_requested' });
    if (!(await knownIdentity(tx, i.accountId, i.externalId, i.now))) throw new AppError('VALIDATION_FAILED', 422, { external_id: 'unknown_identity' });
    // Khoá theo tài khoản: hai lệnh gửi song song không vượt trần.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`friend-send:${i.accountId}`}, 0))`;
    const sent = await tx.channelFriendSendLog.count({ where: { channelAccountId: i.accountId, createdAt: { gt: new Date(i.now.getTime() - DAY) } } });
    if (sent >= i.dailyCap) throw new AppError('RATE_LIMITED', 429, { channel_account_id: 'friend_daily_cap' });
    await tx.channelFriendSendLog.create({ data: { id: uuidv7(i.now.getTime()), channelAccountId: i.accountId, externalId: i.externalId, actorId: i.actorId, createdAt: i.now } });
  }
  const data = { op: i.op, opStatus: 'queued', opActorId: i.actorId, opMessage: i.message ?? null, opError: null, opRequestedAt: i.now, opFinishedAt: null, opGeneration: null, updatedAt: i.now };
  await tx.channelFriend.upsert({
    where: { channelAccountId_externalId: { channelAccountId: i.accountId, externalId: i.externalId } },
    create: { channelAccountId: i.accountId, externalId: i.externalId, state, ...data },
    update: data,
  });
  return { topic: 'channel.friend_requested', payload: { channel_account_id: i.accountId, external_id: i.externalId, op: i.op } };
}

/** Worker giành lệnh (queued → dispatch_reserved, commit) trước khi gọi kênh. Đã reserved (sập giữa chừng) → `interrupted`. */
export async function claimFriendOp(db: TenantDb, accountId: string, externalId: string, generation: number | undefined, now: Date) {
  const key = { channelAccountId_externalId: { channelAccountId: accountId, externalId } };
  const f = await db.channelFriend.findUnique({ where: key });
  if (!f?.op) return null;
  if (f.opStatus === 'dispatch_reserved') return { f, interrupted: true as const };
  if (f.opStatus !== 'queued') return null;
  const n = await db.channelFriend.updateMany({ where: { channelAccountId: accountId, externalId, opStatus: 'queued' }, data: { opStatus: 'dispatch_reserved', opGeneration: generation ?? null, updatedAt: now } });
  return n.count ? { f, interrupted: false as const } : null;
}

/** Kết quả lệnh: chỉ confirmed đổi `state`. */
export async function finishFriendOp(db: TenantDb, accountId: string, externalId: string, op: FriendOp, status: 'confirmed' | 'failed' | 'unknown', now: Date, error?: string) {
  await db.channelFriend.updateMany({
    where: { channelAccountId: accountId, externalId, op, opStatus: 'dispatch_reserved' },
    data: { opStatus: status, opError: error?.slice(0, 200) ?? null, opFinishedAt: now, updatedAt: now, ...(status === 'confirmed' ? { state: AFTER[op], ...(op === 'accept' || op === 'reject' ? { incomingMessage: null } : {}) } : {}) },
  });
}

/** Sự kiện bạn bè từ kênh (idempotent theo trạng thái). Lời mời tới → incoming; huỷ / từ chối → none; thành bạn → friend. */
export async function applyFriendEvent(tx: TenantTx, e: FriendEvent, now: Date): Promise<OutboxEventInput[]> {
  const key = { channelAccountId_externalId: { channelAccountId: e.accountId, externalId: e.userId } };
  const at = Number.isNaN(Date.parse(e.at)) || Date.parse(e.at) <= 0 ? now : new Date(e.at);
  const state = e.type === 'added' ? 'friend' : e.type === 'request' ? (e.self ? 'outgoing' : 'incoming') : 'none';
  const extra = e.type === 'request' && !e.self ? { incomingMessage: e.message ?? null, incomingAt: at } : e.type === 'added' || e.type === 'removed' ? { incomingMessage: null } : {};
  await tx.channelFriend.upsert({ where: key, create: { channelAccountId: e.accountId, externalId: e.userId, state, updatedAt: now, ...extra }, update: { state, updatedAt: now, ...extra } });
  return e.type === 'request' && !e.self ? [{ topic: 'channel.friend_request_received', payload: { channel_account_id: e.accountId, external_id: e.userId } }] : [];
}

/** Trong transaction action: tra một SĐT — kiểm số + trần / ngày, ghi dòng nhật ký `queued` + event. */
export async function requestLookup(tx: TenantTx, i: { accountId: string; actorId: string; phone: string; now: Date }) {
  const phone = normalizePhone(i.phone);
  if (!phone || !/^0[35789][0-9]{8}$/.test(phone)) throw new AppError('VALIDATION_FAILED', 422, { phone: 'invalid' });
  const used = await tx.channelUserLookup.count({ where: { channelAccountId: i.accountId, createdAt: { gt: new Date(i.now.getTime() - DAY) } } });
  if (used >= FRIEND_LIMITS.lookupsPerDay) throw new AppError('RATE_LIMITED', 429, { channel_account_id: 'lookup_daily_cap' });
  const id = uuidv7(i.now.getTime());
  await tx.channelUserLookup.create({ data: { id, channelAccountId: i.accountId, actorId: i.actorId, phone, expiresAt: new Date(i.now.getTime() + FRIEND_LIMITS.lookupTtlMs), createdAt: i.now } });
  return { id, phone, event: { topic: 'channel.lookup_requested', payload: { lookup_id: id, channel_account_id: i.accountId } } as OutboxEventInput };
}

export const lookupStatusUrl = (accountId: string, id: string) => `/v1/settings/channels/${accountId}/lookups/${id}`;
export const friendStatusUrl = (accountId: string, externalId: string) => `/v1/settings/channels/${accountId}/friends/${externalId}`;
