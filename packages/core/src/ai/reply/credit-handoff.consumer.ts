// Consumer `ai.credit-handoff` (TIP-039 pha 2, DEF-009-4, AC05) — `credits.exhausted` (outbox tenant, bền qua relay) → hội thoại AI tự
// động trả lời (`ai_mode=auto`, đang mở, AI đang rảnh / chạy) chuyển sang người với lý do "hết Credit". Kiểm lại số dư ví HIỆN TẠI trước
// mỗi lô: event đến trễ sau khi đã nạp (ví > 0) → không chuyển gì. Không đụng hội thoại người đang xử lý (`handoff` / chờ duyệt / AI tắt /
// copilot), không xoá lịch sử / cấu hình agent. `credits.restored` KHÔNG tự giành lại hội thoại đã chuyển — người bấm bật AI lại.
// Lô bounded theo keyset id; mỗi hội thoại một transaction (`handoff` nguyên tử: trạng thái + tóm tắt + outbox `ai.handoff`), chạy lại
// an toàn (hội thoại đã `handoff` không còn khớp điều kiện).
import type { TenantDb } from '@appchat/db';
import type { EventConsumer } from '../../kernel/events/consumer';
import { handoff, reasonText, type HandoffDeps } from './turn-handoff';

export const CREDIT_HANDOFF_CONSUMER = 'ai.credit-handoff';
export const CREDIT_HANDOFF_BATCH = 200;

export interface CreditHandoffDeps extends HandoffDeps {
  /** Số dư ví hiện tại (plan + topup) — DB nền tảng. */
  balance: (ws: string) => Promise<number>;
}

/** Chuyển hội thoại auto đang chạy AI sang người. Trả số hội thoại đã chuyển; dừng ngay khi ví > 0. */
export async function handoffForCredit(
  d: CreditHandoffDeps,
  db: TenantDb,
  ws: string,
  batch = CREDIT_HANDOFF_BATCH,
  /** Nguồn bền của lần cạn (id sự kiện `credits.exhausted`) — lần cạn sau là biên nhận mới. */
  eventRef = 'credits.exhausted',
): Promise<number> {
  let n = 0;
  let after: string | null = null;
  for (;;) {
    if ((await d.balance(ws)) > 0) return n;
    const rows: Awaited<ReturnType<TenantDb['conversation']['findMany']>> = await db.conversation.findMany({
      where: {
        aiMode: 'auto',
        aiState: { in: ['idle', 'running'] },
        status: { not: 'closed' },
        archivedAt: null,
        ...(after ? { id: { gt: after } } : {}),
      },
      orderBy: { id: 'asc' },
      take: batch,
    });
    if (!rows.length) return n;
    after = rows[rows.length - 1]!.id;
    for (const c of rows) {
      // TIP-003c: chỉ hội thoại auto đang rảnh / chạy, kiểm dưới khoá theo ai_epoch hiện tại (người tiếp quản / đổi chế độ giữa
      // chừng → no_effect, không ghi đè trạng thái người). Một biên nhận / (hội thoại, epoch) — event trùng không chuyển đôi.
      const done = await handoff(d, db, ws, c, { agent: null, runId: null, reason: 'credit', text: reasonText('credit'), draft: null, onlyAutoActive: true, eventRef });
      if (!done) continue;
      n++;
    }
    if (rows.length < batch) return n;
  }
}

export const creditHandoffConsumer = (d: CreditHandoffDeps): EventConsumer => ({
  name: CREDIT_HANDOFF_CONSUMER,
  topics: ['credits.exhausted'],
  async handle(e, db) {
    await handoffForCredit(d, db, e.workspaceId, CREDIT_HANDOFF_BATCH, `credits.exhausted:${e.id}`);
  },
});
