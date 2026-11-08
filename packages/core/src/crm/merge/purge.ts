// Dọn biên nhận gộp khách hết hạn (TIP-015e §4.3): biên nhận `merged` quá `expires_at` → xoá payload riêng tư (dòng con liên kết gốc +
// trường đã lấp + phiên bản / dấu ACL), giữ dòng biên nhận tối thiểu không PII (`state='expired'`, id, primary / source, thời điểm) cho
// action log tham chiếu. Lô id trước 100, khoá SKIP LOCKED + kiểm lại hạn / trạng thái dưới khoá — hoàn tác đang giữ khoá dòng thì lô này
// bỏ qua (lần quét sau). KHÔNG đụng dữ liệu kinh doanh (khách / ghi chú / đơn / sổ điểm).
import type { TenantDb } from '@appchat/db';

const BATCH = 100;

export async function purgeMergeReceiptPayloads(db: TenantDb, now: Date): Promise<number> {
  let total = 0;
  for (;;) {
    const n = await db.$transaction(async (tx) => {
      const ids = (
        await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM contact_merge_receipt WHERE state = 'merged' AND expires_at < ${now} ORDER BY expires_at, id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED`
      ).map((x) => x.id);
      if (!ids.length) return 0;
      await tx.contactMergeReceiptItem.deleteMany({ where: { receiptId: { in: ids } } });
      const r = await tx.contactMergeReceipt.updateMany({
        where: { id: { in: ids }, state: 'merged', expiresAt: { lt: now } },
        data: { state: 'expired', fill: {}, sourceVersionsAfter: {}, aclFingerprint: '' },
      });
      return r.count;
    });
    total += n;
    if (n < BATCH) return total;
  }
}
