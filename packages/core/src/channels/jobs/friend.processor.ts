// Lệnh bạn bè + tra SĐT trên worker giữ phiên (TIP-014b E). Job `friend` / `lookup` đi chung hàng đợi thao tác `chop-<tài khoản>`
// (concurrency 1 — một lệnh kênh tại một thời điểm). Bạn bè: giành lệnh (dispatch_reserved, commit + fence thế hệ phiên) → gọi kênh → ACK:
// confirmed; lỗi nhà cung cấp rõ / không phiên → failed; mạng / hết giờ → unknown (không gọi lại). Tra SĐT: found / not_found / failed,
// kết quả tạm 24 giờ (không lưu khách). Consumer outbox đẩy job theo `channel.friend_requested` / `channel.lookup_requested`.
import { ChannelNotRunningError, ChannelOperationError, type ChannelAdapter } from '@appchat/channels';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { claimFriendOp, finishFriendOp, type FriendOp } from '../operations/friend-store';
import { assertGeneration } from '../operations/session-generation';
import { OPERATION_TIMEOUT_MS, type FriendJob, type LookupJob } from '../operations/types';

export interface FriendDeps {
  tenants: TenantDbResolver;
  kv: KeyValueStore;
  log: AppLogger;
  now: () => Date;
  timeoutMs?: number;
}

const within = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('operation_timeout')), ms))]);
const sure = (err: unknown) => err instanceof ChannelOperationError || err instanceof ChannelNotRunningError;

export async function runFriendOp(d: FriendDeps, accountId: string, adapter: ChannelAdapter, j: FriendJob, generation?: number): Promise<string> {
  const db = await d.tenants.get(TenantContexts.fromRoute(j.ws, 'channel'));
  const friends = adapter.friends;
  // Phiên phải có trước khi đặt chỗ — chưa có thì job thử lại (chưa gọi kênh).
  if (!(adapter as { isRunning?: (id: string) => boolean }).isRunning?.(accountId)) throw new ChannelNotRunningError(accountId);
  const claimed = await db.$transaction(async (tx) => {
    await assertGeneration(tx, accountId, generation);
    return claimFriendOp(tx as never, accountId, j.external_id, generation, d.now());
  });
  if (!claimed) return 'skipped';
  const op = claimed.f.op as FriendOp;
  if (claimed.interrupted) {
    await finishFriendOp(db, accountId, j.external_id, op, 'unknown', d.now(), 'interrupted_after_attempt');
    return 'unknown';
  }
  let status: 'confirmed' | 'failed' | 'unknown' = 'confirmed';
  let error: string | undefined;
  try {
    if (!friends) throw new ChannelOperationError('unsupported');
    const call = op === 'accept' ? friends.accept(accountId, j.external_id) : op === 'reject' ? friends.reject(accountId, j.external_id) : op === 'send' ? friends.send(accountId, j.external_id, claimed.f.opMessage ?? '') : friends.undo(accountId, j.external_id);
    await within(call, d.timeoutMs ?? OPERATION_TIMEOUT_MS);
  } catch (err) {
    status = sure(err) ? 'failed' : 'unknown';
    error = (err instanceof Error ? err.message : 'friend_failed').slice(0, 200);
    d.log.warn({ account: accountId, op, err: error }, 'channel friend operation not confirmed');
  }
  await finishFriendOp(db, accountId, j.external_id, op, status, d.now(), error);
  await markDirty(d.kv, j.ws);
  return status;
}

export async function runLookup(d: FriendDeps, accountId: string, adapter: ChannelAdapter, j: LookupJob): Promise<string> {
  const db = await d.tenants.get(TenantContexts.fromRoute(j.ws, 'channel'));
  const row = await db.channelUserLookup.findUnique({ where: { id: j.lookup_id } });
  if (!row || row.channelAccountId !== accountId) return 'missing';
  const n = await db.channelUserLookup.updateMany({ where: { id: row.id, status: 'queued' }, data: { status: 'running' } });
  if (!n.count) {
    // Sập giữa chừng (đang running): tra là đọc — ghi failed, người dùng tra lại (lượt đã tính).
    if (row.status === 'running') await db.channelUserLookup.updateMany({ where: { id: row.id, status: 'running' }, data: { status: 'failed', error: 'interrupted', finishedAt: d.now() } });
    return 'skipped';
  }
  try {
    if (!adapter.friends) throw new ChannelOperationError('unsupported');
    const u = await within(adapter.friends.findUser(accountId, row.phone), d.timeoutMs ?? OPERATION_TIMEOUT_MS);
    await db.channelUserLookup.update({
      where: { id: row.id },
      data: u ? { status: 'found', externalId: u.id, displayName: u.displayName.slice(0, 200), finishedAt: d.now() } : { status: 'not_found', finishedAt: d.now() },
    });
    return u ? 'found' : 'not_found';
  } catch (err) {
    const msg = (err instanceof Error ? err.message : 'lookup_failed').slice(0, 200);
    await db.channelUserLookup.update({ where: { id: row.id }, data: { status: 'failed', error: msg, finishedAt: d.now() } });
    return 'failed';
  }
}

/** Consumer outbox: đẩy lệnh bạn bè / tra SĐT vào hàng đợi của đúng tài khoản. */
export function friendRequestConsumer(q: { enqueueFriend(accountId: string, j: FriendJob): Promise<void>; enqueueLookup(accountId: string, j: LookupJob): Promise<void> }): EventConsumer {
  return {
    name: 'channels.friend_request',
    topics: ['channel.friend_requested', 'channel.lookup_requested'],
    async handle(e, db) {
      const acc = String(e.payload.channel_account_id ?? '');
      if (e.topic === 'channel.lookup_requested') {
        const id = String(e.payload.lookup_id ?? '');
        const row = await db.channelUserLookup.findUnique({ where: { id }, select: { status: true, channelAccountId: true } });
        if (row?.status === 'queued' && row.channelAccountId === acc) await q.enqueueLookup(acc, { ws: e.workspaceId, lookup_id: id });
        return;
      }
      const ext = String(e.payload.external_id ?? '');
      const f = await db.channelFriend.findUnique({ where: { channelAccountId_externalId: { channelAccountId: acc, externalId: ext } }, select: { opStatus: true } });
      if (f?.opStatus === 'queued') await q.enqueueFriend(acc, { ws: e.workspaceId, external_id: ext });
    },
  };
}
