// Lệnh quản lý nhóm trên worker giữ phiên (TIP-025b §A.3–5) — job `group` chung hàng đợi thao tác `chop-<tài khoản>` (concurrency 1).
// Giành lệnh (queued → dispatch_reserved + attempted_at, commit + fence thế hệ phiên) → gọi kênh → ghi kết quả + ảnh chụp nhóm + outbox
// cùng transaction. Lỗi nhà cung cấp rõ / không phiên → failed; mạng / hết giờ → unknown (không gọi lại); job chạy lại khi đã đặt chỗ →
// unknown. Thêm thành viên báo TỪNG người (một phần lỗi → partial). Không log URL link tham gia.
import { ChannelNotRunningError, ChannelOperationError, type ChannelAdapter } from '@appchat/channels';
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { assertGeneration } from '../operations/session-generation';
import { OPERATION_TIMEOUT_MS } from '../operations/types';
import { encryptSecret } from '../../kernel/crypto';
import { inEventTransaction } from '../../kernel/outbox/transaction';

export interface GroupCommandJob {
  ws: string;
  command_id: string;
}

export interface GroupCommandDeps {
  tenants: TenantDbResolver;
  kv: KeyValueStore;
  log: AppLogger;
  now: () => Date;
  timeoutMs?: number;
  /** APP_ENC_KEY — mã hoá link tham gia trong kết quả lệnh `link` (TIP-025b §A.6); thiếu → lệnh link thất bại an toàn. */
  key?: Buffer;
}

type Member = { id: string; status: 'confirmed' | 'failed' | 'unknown'; error?: string };
type Outcome = { status: 'confirmed' | 'failed' | 'unknown' | 'partial'; error?: string; members?: Member[]; snapshot?: Record<string, unknown>; result?: Record<string, unknown> };
type Cmd = NonNullable<Awaited<ReturnType<TenantDb['groupCommand']['findUnique']>>>;

const within = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('operation_timeout')), ms))]);
const sure = (err: unknown) => err instanceof ChannelOperationError || err instanceof ChannelNotRunningError;
const msgOf = (err: unknown) => (err instanceof Error ? err.message : 'group_command_failed').slice(0, 200);

async function finish(d: GroupCommandDeps, db: TenantDb, ws: string, cmd: Cmd, o: Outcome) {
  const now = d.now();
  await inEventTransaction(db, ws, async (tx) => {
    const n = await tx.groupCommand.updateMany({ where: { id: cmd.id, status: { in: ['queued', 'dispatch_reserved'] } }, data: { status: o.status, error: o.error ?? null, result: (o.result ?? (o.members ? { members: o.members } : {})) as object, finishedAt: now } });
    if (!n.count) return;
    if (o.snapshot) await tx.conversationGroupState.upsert({ where: { conversationId: cmd.conversationId }, create: { conversationId: cmd.conversationId, ...o.snapshot, updatedAt: now }, update: o.snapshot });
    const c = await tx.conversation.findUnique({ where: { id: cmd.conversationId }, select: { id: true, contactId: true, assigneeUserId: true, channelAccountId: true } });
    if (c) await writeOutbox(tx, ws, [{ topic: 'conversation.updated', payload: { conversation_id: c.id, channel_account_id: c.channelAccountId, contact_id: c.contactId, assignee_user_id: c.assigneeUserId, contact_owner_user_id: null, change: 'group' } }], now);
  });
  await markDirty(d.kv, ws);
}

/** Gọi kênh theo loại lệnh — trả kết quả + ảnh chụp nhóm cần ghi (chỉ trường đã xác nhận). */
async function dispatch(adapter: ChannelAdapter, accountId: string, groupId: string, cmd: Cmd, ms: number, now: Date, key?: Buffer): Promise<Outcome> {
  const ops = adapter.operations;
  const want = cmd.desired as { member_ids?: string[]; name?: string; invite_link_enabled?: boolean; muted?: boolean };
  if (cmd.kind === 'refresh') {
    if (!ops?.groupInfo) throw new ChannelOperationError('unsupported');
    const g = await within(ops.groupInfo(accountId, groupId), ms);
    const link = ops.groupLink ? await within(ops.groupLink(accountId, groupId), ms).catch(() => null) : null;
    return { status: 'confirmed', snapshot: { providerName: g.name.slice(0, 200), providerTotal: g.totalMembers, complete: g.complete, accountRole: g.accountRole ?? null, providerVersion: g.version ?? null, linkEnabled: link ? link.enabled : null, fetchedAt: now } };
  }
  if (cmd.kind === 'link') {
    // Chỉ ĐỌC link hiện có (không bật); URL mã hoá trong kết quả, không vào log / ảnh chụp / sự kiện.
    if (!ops?.groupLink || !key) throw new ChannelOperationError('unsupported');
    const l = await within(ops.groupLink(accountId, groupId), ms);
    return { status: 'confirmed', snapshot: { linkEnabled: l.enabled, fetchedAt: now }, result: { enabled: l.enabled, ...(l.enabled && l.url ? { url_enc: Buffer.from(encryptSecret(l.url, key)).toString('base64') } : {}) } };
  }
  if (cmd.kind === 'add_members') {
    if (!ops?.addGroupMembers) throw new ChannelOperationError('unsupported');
    const r = await within(ops.addGroupMembers(accountId, groupId, want.member_ids ?? []), ms);
    const members: Member[] = [...r.added.map((id) => ({ id, status: 'confirmed' as const })), ...r.failed.map((f) => ({ id: f.id, status: 'failed' as const, error: f.error.slice(0, 80) }))];
    const status = !r.failed.length ? 'confirmed' : r.added.length ? 'partial' : 'failed';
    return { status, members };
  }
  if (cmd.kind === 'update') {
    if (!ops?.updateGroupSettings || !ops.groupInfo) throw new ChannelOperationError('unsupported');
    // Phiên bản nhóm phía kênh đổi từ lúc xem trước → không ghi đè (người dùng làm mới rồi xem trước lại).
    const cur = await within(ops.groupInfo(accountId, groupId), ms);
    if (cmd.expectedVersion && cur.version && cur.version !== cmd.expectedVersion) return { status: 'failed', error: 'stale_snapshot', snapshot: { providerVersion: cur.version, providerName: cur.name.slice(0, 200), fetchedAt: now } };
    const r = await within(ops.updateGroupSettings(accountId, groupId, { ...(want.name !== undefined ? { name: want.name } : {}), ...(want.invite_link_enabled !== undefined ? { inviteLinkEnabled: want.invite_link_enabled } : {}) }), ms);
    const after = await within(ops.groupInfo(accountId, groupId), ms).catch(() => null);
    return { status: 'confirmed', snapshot: { ...(want.name !== undefined ? { providerName: want.name } : {}), ...(r.linkEnabled !== null ? { linkEnabled: r.linkEnabled } : {}), ...(after?.version ? { providerVersion: after.version } : {}), fetchedAt: now } };
  }
  if (!ops?.setGroupMute) throw new ChannelOperationError('unsupported');
  await within(ops.setGroupMute(accountId, groupId, !!want.muted), ms);
  return { status: 'confirmed', snapshot: { muted: !!want.muted } };
}

export async function runGroupCommand(d: GroupCommandDeps, accountId: string, adapter: ChannelAdapter, j: GroupCommandJob, generation?: number): Promise<string> {
  const db = await d.tenants.get(TenantContexts.fromRoute(j.ws, 'channel'));
  const cmd = await db.groupCommand.findUnique({ where: { id: j.command_id } });
  if (!cmd || cmd.channelAccountId !== accountId) return 'missing';
  if (cmd.status === 'dispatch_reserved') {
    await finish(d, db, j.ws, cmd, { status: 'unknown', error: 'interrupted_after_attempt' });
    return 'unknown';
  }
  if (cmd.status !== 'queued') return cmd.status;
  const conv = await db.conversation.findUnique({ where: { id: cmd.conversationId }, select: { externalThreadId: true, kind: true } });
  if (!conv || conv.kind !== 'group') {
    await finish(d, db, j.ws, cmd, { status: 'failed', error: 'not_group' });
    return 'failed';
  }
  // Phiên phải có trước khi đặt chỗ — chưa có thì job thử lại (chưa gọi kênh).
  if (!(adapter as { isRunning?: (id: string) => boolean }).isRunning?.(accountId)) throw new ChannelNotRunningError(accountId);
  const claimed = await db.$transaction(async (tx) => {
    await assertGeneration(tx, accountId, generation);
    return tx.groupCommand.updateMany({ where: { id: cmd.id, status: 'queued' }, data: { status: 'dispatch_reserved', attemptedAt: d.now() } });
  });
  if (!claimed.count) return 'raced';
  let o: Outcome;
  try {
    o = await dispatch(adapter, accountId, conv.externalThreadId, cmd, d.timeoutMs ?? OPERATION_TIMEOUT_MS, d.now(), d.key);
  } catch (err) {
    o = { status: sure(err) ? 'failed' : 'unknown', error: msgOf(err) };
    d.log.warn({ account: accountId, command: cmd.id, kind: cmd.kind, err: o.error }, 'group command not confirmed');
  }
  await finish(d, db, j.ws, cmd, o);
  return o.status;
}

/** Consumer outbox `channel.group_command_requested`: đẩy lệnh vào hàng đợi của đúng tài khoản. */
export function groupCommandConsumer(q: { enqueueGroup(accountId: string, j: GroupCommandJob): Promise<void> }): EventConsumer {
  return {
    name: 'channels.group_command',
    topics: ['channel.group_command_requested'],
    async handle(e, db) {
      const id = String(e.payload.command_id ?? '');
      const cmd = await db.groupCommand.findUnique({ where: { id }, select: { id: true, channelAccountId: true, status: true } });
      if (!cmd || cmd.status !== 'queued') return;
      await q.enqueueGroup(cmd.channelAccountId, { ws: e.workspaceId, command_id: cmd.id });
    },
  };
}
