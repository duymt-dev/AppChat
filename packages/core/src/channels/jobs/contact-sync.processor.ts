// Chạy đồng bộ danh bạ trên worker giữ phiên (TIP-014b D3). Job `contacts` đi chung hàng đợi thao tác `chop-<tài khoản>` (concurrency 1).
// Consumer outbox `channel.contacts_requested` đẩy job; worker giành lần chạy theo thế hệ phiên, lấy từng trang (≤ 200) qua
// `operations.friends` — mỗi trang lưu bền xong mới xin trang sau — dừng khi trang thiếu (complete) hoặc chạm trần trang (partial). Mỗi
// trang kiểm lại thế hệ: chủ phiên cũ dừng (partial). Không tạo khách, không gửi gì cho ai. Lỗi → failed (không nuốt).
import type { ChannelAdapter } from '@appchat/channels';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { AppLogger } from '../../kernel/logger/logger';
import { CONTACT_SYNC_LIMITS, claimContactSync, finishContactSync, storeContactPage } from '../operations/contact-sync';
import { assertGeneration } from '../operations/session-generation';
import type { ContactSyncJob } from '../operations/types';

export interface ContactSyncDeps {
  tenants: TenantDbResolver;
  log: AppLogger;
  now: () => Date;
  limits?: Partial<typeof CONTACT_SYNC_LIMITS>;
}

export async function runContactSync(d: ContactSyncDeps, accountId: string, adapter: ChannelAdapter, j: ContactSyncJob, generation?: number): Promise<string> {
  const db = await d.tenants.get(TenantContexts.fromRoute(j.ws, 'channel'));
  const run = await claimContactSync(db, j.sync_id, accountId, generation, d.now());
  if (!run) return 'skipped';
  if (!adapter.operations?.friends) {
    await finishContactSync(db, run.id, { error: 'contacts_unsupported' }, d.now());
    return 'failed';
  }
  const lim = { ...CONTACT_SYNC_LIMITS, ...d.limits };
  let seq = 0;
  try {
    for (let page = 1; page <= lim.maxPages; page++) {
      try {
        await db.$transaction((tx) => assertGeneration(tx, accountId, generation));
      } catch {
        await finishContactSync(db, run.id, { status: 'partial' }, d.now());
        return 'partial';
      }
      const rows = await adapter.operations!.friends!(accountId, page, lim.pageSize);
      if (rows.length) await storeContactPage(db, run.id, rows, seq);
      seq += rows.length;
      if (rows.length < lim.pageSize) {
        await finishContactSync(db, run.id, { status: 'complete' }, d.now());
        return 'complete';
      }
    }
    await finishContactSync(db, run.id, { status: 'partial' }, d.now());
    return 'partial';
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'contacts_failed';
    d.log.warn({ account: accountId, sync: run.id, err: msg }, 'channel contact sync failed');
    await finishContactSync(db, run.id, { error: msg }, d.now());
    return 'failed';
  }
}

/** Consumer outbox `channel.contacts_requested`: đẩy job vào hàng đợi thao tác của đúng tài khoản. */
export function contactSyncRequestConsumer(q: { enqueueContacts(accountId: string, j: ContactSyncJob): Promise<void> }): EventConsumer {
  return {
    name: 'channels.contacts_request',
    topics: ['channel.contacts_requested'],
    async handle(e, db) {
      const id = String(e.payload.sync_id ?? '');
      const run = await db.channelContactSync.findUnique({ where: { id }, select: { id: true, channelAccountId: true, status: true } });
      if (!run || run.status !== 'queued') return;
      await q.enqueueContacts(run.channelAccountId, { ws: e.workspaceId, sync_id: run.id });
    },
  };
}
