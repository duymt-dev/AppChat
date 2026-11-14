// Op `bank.pull` (TIP-012b §4.3) — đọc an toàn (GET), thử lại được: kéo giao dịch từ provider theo con trỏ bền `bank_pull_state`, mỗi
// trang: lô biên nhận chuẩn tắc (cùng khoá với webhook → hội tụ, trùng chỉ tăng deliveries) + con trỏ mới ghi CÙNG transaction; crash
// giữa chừng chạy lại đúng trang. Tối đa 100 trang / 10.000 giao dịch mỗi lượt — còn nữa thì đặt lịch tiếp ngay (không cắt im lặng).
// Giao dịch trước mốc kích hoạt (`checkpoint_at`) không nhận tự động (lịch sử trùng feed cũ / webhook — §3.2). Chỉ lượt kéo HOÀN TẤT
// mới cập nhật `last_sync_at`; kéo xác thực thành công là bằng chứng khoá đọc (probe verified cho phiên bản khoá đó).
// Ghi biên nhận là việc của domain sales (`stage` tiêm từ SalesJobsModule) — integrations không import sales.
import { ProviderError, accountOrEmpty, type BankFeedProvider, type BankPullCursor, type BankTransaction } from '@appchat/integrations';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { CallOpSpec, OpRunArgs } from './call-runner';

export const BANK_PULL_OP = 'bank.pull';
export const MAX_PAGES = 100;
export const MAX_TXS = 10_000;
/** Kéo tự động: không dày hơn 60 giây (§4.3) — mặc định 5 phút. */
export const AUTO_PULL_EVERY_MS = 5 * 60_000;

export interface StageFeed {
  provider: string;
  feedId: string;
  feedAccount: string;
}

/** Ghi lô biên nhận trong transaction của người gọi → số mới / trùng / bỏ qua (sales/payments/bank/receipt.ts → acceptReceiptsIn). */
export type StageReceipts = (tx: TenantTx, ws: string, feed: StageFeed, txs: BankTransaction[], now: Date) => Promise<{ accepted: number; duplicate: number; ignored: number }>;

/** Feed tự động đang bật của kết nối (đã gắn tài khoản) — không có → kéo không được (unsupported, không "đồng bộ giả"). */
export async function activeFeed(db: Pick<TenantTx, 'tenantBankFeed'>, connectionId: string) {
  const feed = await db.tenantBankFeed.findUnique({ where: { connectionId } });
  return feed && feed.status === 'active' && accountOrEmpty(feed.accountNo) ? feed : null;
}

export function bankPullOp(stage: StageReceipts): CallOpSpec {
  return {
    safety: 'read',
    async run({ db, workspaceId, conn, connectorKey, adapter, http, now }: OpRunArgs) {
      const bank = adapter as BankFeedProvider | null;
      if (!bank?.pull) throw new ProviderError('unsupported', 'pull');
      const feed = await activeFeed(db, conn.id);
      if (!feed) throw new ProviderError('unsupported', 'feed');
      const row = await db.integrationConnection.findUniqueOrThrow({ where: { id: conn.id }, select: { credentialRev: true } });
      let state = await db.bankPullState.findUnique({ where: { connectionId: conn.id } });
      if (!state || state.credentialRev !== row.credentialRev || state.feedId !== feed.id) {
        // Lần đầu / đổi khoá / feed mới → mốc kích hoạt = bây giờ, con trỏ trống (không kéo lùi lịch sử).
        const t = now();
        state = await db.bankPullState.upsert({
          where: { connectionId: conn.id },
          create: { connectionId: conn.id, feedId: feed.id, cursor: undefined, checkpointAt: t, credentialRev: row.credentialRev, nextPullAt: t },
          update: { feedId: feed.id, cursor: { set: null } as never, checkpointAt: t, credentialRev: row.credentialRev },
        });
      }
      const sf: StageFeed = { provider: connectorKey, feedId: feed.id, feedAccount: accountOrEmpty(feed.accountNo) };
      const total = { pages: 0, fetched: 0, accepted: 0, duplicate: 0, ignored: 0, before_checkpoint: 0 };
      let cursor = (state.cursor ?? null) as BankPullCursor | null;
      let more = true;
      while (more && total.pages < MAX_PAGES && total.fetched < MAX_TXS) {
        const page = await bank.pull(conn, http, cursor, state.checkpointAt);
        const fresh = page.transactions.filter((t) => new Date(t.occurred_at) >= startOfDay(state.checkpointAt));
        total.before_checkpoint += page.transactions.length - fresh.length;
        const rev = row.credentialRev;
        const t = now();
        const r = await db.$transaction(async (tx) => {
          // Rào phiên bản khoá: kết nối bị đổi khoá / ngắt giữa chừng → không ghi trang này.
          const fence = await tx.bankPullState.updateMany({ where: { connectionId: conn.id, credentialRev: rev }, data: { cursor: page.cursor, updatedAt: t } });
          if (fence.count !== 1) throw new ProviderError('unsupported', 'superseded');
          return stage(tx, workspaceId, sf, fresh, t);
        });
        total.pages++;
        total.fetched += page.transactions.length;
        total.accepted += r.accepted;
        total.duplicate += r.duplicate;
        total.ignored += r.ignored;
        cursor = page.cursor;
        more = page.has_more;
      }
      const t = now();
      const done = !more;
      await db.bankPullState.update({ where: { connectionId: conn.id }, data: { nextPullAt: done ? new Date(t.getTime() + AUTO_PULL_EVERY_MS) : t, lastPulledAt: done ? t : undefined } });
      await db.integrationConnection.updateMany({
        where: { id: conn.id, credentialRev: row.credentialRev },
        data: { ...(done ? { lastSyncAt: t } : {}), lastError: null, lastProbeAt: t, lastProbeStatus: 'verified', lastProbeReason: null, probedRev: row.credentialRev },
      });
      if (total.accepted || total.ignored) await db.tenantBankFeed.update({ where: { id: feed.id }, data: { lastTxAt: t } });
      return { ...total, complete: done };
    },
  };
}

/** Casso lọc theo ngày → giao dịch cùng ngày kích hoạt nhưng trước giờ kích hoạt vẫn hợp lệ: so theo đầu ngày (giờ VN) của mốc. */
function startOfDay(d: Date): Date {
  const vn = new Date(d.getTime() + 7 * 3600_000);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - 7 * 3600_000);
}
