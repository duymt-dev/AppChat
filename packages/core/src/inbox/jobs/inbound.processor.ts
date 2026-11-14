// Worker ROLE=channels của Inbox: processor queue `channel-inbound` (tin đã chuẩn hoá từ ChannelSessions) → InboundPipeline;
// sink kết quả gửi (`registerSendResultSink('inbox')`) → ghi `message` / `outbox_message`; quét lại `outbox_message` còn pending
// (API mất Redis lúc đẩy job / job bị xoá) mỗi 30 giây. Mọi ghi kèm outbox event + đánh dấu workspace bẩn cho relay.
import { Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { NormalizedInbound } from '@appchat/channels';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import { CHANNEL_INBOUND_QUEUE, type ChannelSendQueue, type SendResult } from '../../channels/public';
import { applySendResult } from '../services/outbound';
import { scanRoutes } from '../../channels/jobs/lease';
import { DuplicateInbound, type InboundPipeline } from '../services/pipeline';
import { inEventTransaction } from '../../kernel/outbox/transaction';

export interface InboxJobDeps {
  redis: Redis;
  platform: Pick<PlatformDb, 'tenantChannelRoute'>;
  tenants: TenantDbResolver;
  pipeline: InboundPipeline;
  send: ChannelSendQueue;
  /** Đẩy job `agent-reply` (TIP-022) sau commit tin khách; vắng (test không có AI) → bỏ qua. */
  agentReply?: (job: { ws: string; conversation_id: string; message_id: string }) => Promise<void>;
  /** Đẩy job đồng bộ ảnh đại diện của tài khoản (TIP-014b D) sau commit; vắng → bỏ qua (dòng vẫn chờ ở DB, lần sau gom). */
  avatars?: (accountId: string, ws: string) => Promise<void>;
  log: AppLogger;
  now: () => Date;
}

export const OUTBOX_SWEEP_MS = 30_000;
/** Outbox pending quá thời gian này mà chưa gửi → đẩy lại (job id = id outbox nên không gửi trùng nếu job vẫn còn). */
export const OUTBOX_STALE_MS = 60_000;

export interface InboundJob {
  ws: string;
  message: NormalizedInbound;
}

const db = (d: InboxJobDeps, ws: string) => d.tenants.get(TenantContexts.fromRoute(ws, 'channel'));

export function startInboundWorker(d: InboxJobDeps): Worker<InboundJob> {
  const w = new Worker<InboundJob>(
    CHANNEL_INBOUND_QUEUE,
    async (job) => {
      const { ws, message } = job.data;
      const now = d.now();
      try {
        const r = await d.pipeline.handle(await db(d, ws), ws, message, now);
        if (r.events.length) await markDirty(d.redis, ws);
        if (r.agentReply && r.messageId && r.conversationId) {
          await d.agentReply?.({ ws, conversation_id: r.conversationId, message_id: r.messageId }).catch((err: unknown) => d.log.warn({ err, ws }, 'agent-reply enqueue failed'));
        }
        if (r.avatarQueued) await d.avatars?.(message.channelAccountId, ws).catch((err: unknown) => d.log.warn({ err, ws }, 'avatar enqueue failed'));
        return r.messageId;
      } catch (err) {
        if (err instanceof DuplicateInbound) return null;
        throw err;
      }
    },
    { connection: d.redis.duplicate(), concurrency: 4 },
  );
  w.on('error', (err) => d.log.warn({ err }, 'inbox inbound worker error'));
  return w;
}

/** Kết quả gửi từ worker kênh (cùng process ROLE=channels). Event ghi cùng transaction với trạng thái tin. */
export function sendResultSink(d: InboxJobDeps) {
  return async (r: SendResult): Promise<void> => {
    const t = await db(d, r.ws);
    const now = d.now();
    const wrote = await inEventTransaction(t, r.ws, async (tx) => {
      const events = await applySendResult(tx, r, now);
      if (events?.length) await writeOutbox(tx, r.ws, events, now);
      return !!events?.length;
    });
    if (wrote) await markDirty(d.redis, r.ws);
  };
}

/** Quét outbox gửi còn pending của các workspace có tài khoản kênh đang hoạt động. */
export async function sweepOutbox(d: InboxJobDeps): Promise<number> {
  const cutoff = new Date(d.now().getTime() - OUTBOX_STALE_MS);
  let n = 0;
  const seen = new Set<string>();
  await scanRoutes(d.platform, null, async ({ workspaceId: ws }) => {
    if (seen.has(ws)) return;
    seen.add(ws);
    try {
      const t = await db(d, ws);
      const rows = await t.outboxMessage.findMany({ where: { status: { in: ['pending', 'deferred_cap'] }, nextAttemptAt: { lte: cutoff } }, take: 100, orderBy: { nextAttemptAt: 'asc' } });
      for (const o of rows) {
        await d.send.enqueue({ ws, account_id: o.channelAccountId, ref_id: o.id, message: o.payload as never });
        await t.outboxMessage.update({ where: { id: o.id }, data: { status: 'sending', nextAttemptAt: d.now() } });
        n++;
      }
    } catch (err) {
      d.log.warn({ err, ws }, 'inbox outbox sweep failed');
    }
  });
  return n;
}
