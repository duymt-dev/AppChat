// Lần lấy lịch sử bền (TIP-014b C): action `channel.sync_history` ghi `channel_history_run` (queued) + outbox `channel.history_requested`
// cùng commit — không còn lệnh pub/sub mất được. Lần mới thay lần còn `queued` của cùng tài khoản (superseded). Lô tin lịch sử đi qua
// pipeline với `origin = 'history'` (không event luồng trực tiếp) — mỗi lô một transaction + MỘT event `channel.history_ingested` (làm mới
// danh sách, không âm báo / thông báo / AI). Kết quả ghi trung thực: complete / provider_limit / partial / timeout / failed.
import type { HistoryReport, NormalizedInbound } from '@appchat/channels';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { writeOutbox, type OutboxEventInput } from '../../kernel/outbox/outbox';
import type { HistoryPipeline } from './types';
import { inEventTransaction } from '../../kernel/outbox/transaction';

export const HISTORY_DAYS = [7, 30, 90] as const;
/** Trần một lần lấy (bảo vệ bộ nhớ / hàng đợi / tài khoản Zalo): trang, tin, thời gian chờ một trang. */
export const HISTORY_LIMITS = { maxPages: 60, maxMessages: 3000, pageTimeoutMs: 20_000 } as const;
const OPEN = ['queued', 'running'];

export const historyStatusUrl = (accountId: string, runId: string) => `/v1/settings/channels/${accountId}/syncs/${runId}`;

/** Trong transaction action: thay lần còn queued, ghi lần mới + event yêu cầu. */
export async function requestHistory(tx: TenantTx, i: { accountId: string; actorId: string | null; days: number; now: Date }) {
  await tx.channelHistoryRun.updateMany({ where: { channelAccountId: i.accountId, status: 'queued' }, data: { status: 'superseded', finishedAt: i.now } });
  const id = uuidv7(i.now.getTime());
  await tx.channelHistoryRun.create({ data: { id, channelAccountId: i.accountId, actorId: i.actorId, days: i.days, cutoffAt: new Date(i.now.getTime() - i.days * 86_400_000), createdAt: i.now } });
  return { id, event: { topic: 'channel.history_requested', payload: { run_id: id, channel_account_id: i.accountId } } as OutboxEventInput };
}

/** Worker giữ phiên giành lần chạy (queued → running, ghi thế hệ). Lần đang `running` từ chủ cũ (sập) → partial, không chạy chồng. */
export async function claimHistory(db: TenantDb, runId: string, accountId: string, generation: number | undefined, now: Date) {
  const run = await db.channelHistoryRun.findUnique({ where: { id: runId } });
  if (!run || run.channelAccountId !== accountId) return null;
  if (run.status === 'running') {
    await db.channelHistoryRun.updateMany({ where: { id: run.id, status: 'running' }, data: { status: 'partial', error: 'interrupted', finishedAt: now } });
    return null;
  }
  const n = await db.channelHistoryRun.updateMany({ where: { id: run.id, status: 'queued' }, data: { status: 'running', generation: generation ?? null, startedAt: now } });
  return n.count ? run : null;
}

/** Lưu một lô tin lịch sử — một transaction, chống trùng từng tin; trả số tin mới + event làm mới gom theo hội thoại. */
export async function ingestHistoryBatch(db: TenantDb, ws: string, pipeline: HistoryPipeline, runId: string, batch: NormalizedInbound[], now: Date): Promise<number> {
  return inEventTransaction(db, ws, async (tx) => {
    const convs = new Set<string>();
    // TIP-042b: khách mới tạo từ lịch sử → xin chia lead (ghi outbox cùng lô; rule chỉ áp khi khách tạo sau lúc bật).
    const routing: { topic: string; payload: Record<string, unknown> }[] = [];
    let created = 0;
    for (const m of batch) {
      // Mỗi tin một savepoint: trùng (live / history cùng msgId) chỉ bỏ tin đó, không rollback cả lô.
      await tx.$executeRaw`SAVEPOINT hist_msg`;
      try {
        const r = await pipeline.run(tx, ws, m, now, 'history');
        await tx.$executeRaw`RELEASE SAVEPOINT hist_msg`;
        if (r.messageId && r.conversationId) {
          created++;
          convs.add(r.conversationId);
          routing.push(...(r.events ?? []).filter((e) => e.topic === 'lead.routing_requested'));
        }
      } catch (err) {
        // Tin trùng (pipeline ném DuplicateInbound) — nhận theo tên để không import inbox.
        if ((err as Error | null)?.name !== 'DuplicateInbound') throw err;
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT hist_msg`;
      }
    }
    await tx.channelHistoryRun.update({ where: { id: runId }, data: { imported: { increment: created } } });
    if (routing.length) await writeOutbox(tx, ws, routing, now);
    if (convs.size) {
      const account = batch[0]!.channelAccountId;
      await writeOutbox(tx, ws, [{ topic: 'channel.history_ingested', payload: { run_id: runId, channel_account_id: account, conversation_ids: [...convs].slice(0, 200) } }], now);
    }
    return created;
  });
}

/** Kết thúc lần chạy với báo cáo nhà cung cấp (hoặc lỗi). Chỉ lần còn `running` đổi được. */
export async function finishHistory(db: TenantDb, runId: string, r: HistoryReport | { error: string }, now: Date): Promise<void> {
  const data =
    'error' in r
      ? { status: 'failed', error: r.error.slice(0, 200) }
      : { status: r.status, received: r.received, inRange: r.inRange, pages: r.pages, earliestAt: r.earliestAt ? new Date(r.earliestAt) : null, latestAt: r.latestAt ? new Date(r.latestAt) : null };
  await db.channelHistoryRun.updateMany({ where: { id: runId, status: 'running' }, data: { ...data, finishedAt: now } });
}

export async function openHistoryRuns(db: Pick<TenantDb, 'channelHistoryRun'>, accountId: string) {
  return db.channelHistoryRun.findMany({ where: { channelAccountId: accountId, status: { in: OPEN } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5 });
}
