// Biên nhận ngân hàng chuẩn tắc (TIP-012b P2, DC-383): khoá (provider, tài khoản đã chuẩn hoá, mã giao dịch) — độc lập feed / kết nối /
// khoá bí mật, nên kết nối lại không nhận đôi. Ghi biên nhận + outbox `bank_receipt.accepted` CÙNG transaction (rồi mới ACK provider);
// gửi lại cùng giao dịch → chỉ tăng `deliveries`, không sự kiện mới. Không khớp / ghi nhận ở đây — việc đó của `bank_feed.ingest`.
import type { BankTransaction } from '@appchat/integrations';
import type { TenantDb } from '@appchat/db';
import { uuidv7 } from '../../../kernel/ids';
import { writeOutbox } from '../../../kernel/outbox/outbox';

export const RECEIPT_TOPIC = 'bank_receipt.accepted';

export interface AcceptInput {
  provider: string;
  feedId: string;
  /** Tài khoản của feed (đã chuẩn hoá) — giao dịch khác tài khoản vẫn lưu làm bằng chứng nhưng `ignored`. */
  feedAccount: string;
  tx: BankTransaction;
}

export type AcceptOutcome = 'accepted' | 'duplicate' | 'ignored';

/** Lý do biên nhận không bao giờ thành khoản thu (giữ làm bằng chứng). */
function ignoreReason(feedAccount: string, t: BankTransaction): string | null {
  if (t.direction !== 'in') return 'outgoing';
  if (BigInt(t.amount) <= 0n) return 'zero';
  if (!feedAccount || t.account_number !== feedAccount) return 'account_mismatch';
  return null;
}

/** Nhận một lô giao dịch đã xác thực + chuẩn hoá: mỗi giao dịch một biên nhận; trả số mới / trùng / bỏ qua. Một transaction cho cả lô. */
export async function acceptReceipts(db: TenantDb, ws: string, items: AcceptInput[], now: Date) {
  const out = { accepted: 0, duplicate: 0, ignored: 0 };
  if (!items.length) return out;
  await db.$transaction(async (tx) => {
    const events: { topic: string; payload: Record<string, unknown> }[] = [];
    for (const it of items) {
      const t = it.tx;
      const reason = ignoreReason(it.feedAccount, t);
      const id = uuidv7(now.getTime());
      const ins = await tx.bankReceipt.createMany({
        data: [
          {
            id,
            provider: it.provider,
            accountNo: t.account_number,
            externalId: t.external_id,
            feedId: it.feedId,
            amount: BigInt(t.amount),
            direction: t.direction,
            content: t.content.slice(0, 500),
            occurredAt: new Date(t.occurred_at),
            status: reason ? 'ignored' : 'accepted',
            reason,
            ...(reason ? { processedAt: now } : {}),
            createdAt: now,
          },
        ],
        skipDuplicates: true,
      });
      if (ins.count === 0) {
        await tx.bankReceipt.update({ where: { provider_accountNo_externalId: { provider: it.provider, accountNo: t.account_number, externalId: t.external_id } }, data: { deliveries: { increment: 1 } } });
        out.duplicate++;
        continue;
      }
      if (reason) {
        out.ignored++;
        continue;
      }
      out.accepted++;
      // Payload chỉ mang id biên nhận — không số tiền / nội dung / tài khoản (outbox.md: tham chiếu, không dữ liệu nhạy cảm).
      events.push({ topic: RECEIPT_TOPIC, payload: { receipt_id: id } });
    }
    if (events.length) await writeOutbox(tx, ws, events, now);
  });
  return out;
}
