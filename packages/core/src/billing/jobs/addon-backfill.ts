// Backfill addon đã trả trước TIP-039 (DC-242): hoá đơn addon `paid` — kể cả đã có `fulfilled_at` (TIP-010 chỉ ghi nhận đã trả, chưa cấp
// hạn mức) — không có ảnh chụp kỳ / số lượng / hạn → KHÔNG tự đoán: giữ đối soát (`hold_reason = legacy_addon` + `reconcile_finding`)
// để vận hành xem và hoàn tiền / cấp tay. Hoá đơn đã có entitlement (`subscription_addon.invoice_id`) bỏ qua. Mặc định dry-run: chỉ đếm.
// Keyset theo id, lô bounded (index `billing_invoice_paid_addon_idx`).
import type { PlatformDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';

export interface AddonBackfillResult {
  scanned: number;
  entitled: number;
  /** Có ảnh chụp addon nhưng chưa ghi nhận — để scheduler fulfil (không đụng). */
  snapshot: number;
  held: number;
  dryRun: boolean;
}

export async function backfillLegacyAddons(
  d: { platform: PlatformDb; now: () => Date },
  opts: { dryRun?: boolean; limit?: number } = {},
): Promise<AddonBackfillResult> {
  const dryRun = opts.dryRun ?? true;
  const limit = opts.limit ?? 500;
  const out: AddonBackfillResult = { scanned: 0, entitled: 0, snapshot: 0, held: 0, dryRun };
  let after: string | null = null;
  for (;;) {
    const rows: {
      id: string;
      workspaceId: string;
      code: string;
      item: string;
      snapshot: unknown;
      paidAt: Date | null;
    }[] = await d.platform.billingInvoice.findMany({
      where: { kind: 'addon', status: 'paid', holdReason: null, ...(after ? { id: { gt: after } } : {}) },
      orderBy: { id: 'asc' },
      take: limit,
      select: { id: true, workspaceId: true, code: true, item: true, snapshot: true, paidAt: true },
    });
    if (!rows.length) break;
    after = rows[rows.length - 1]!.id;
    const have = new Set(
      (
        await d.platform.subscriptionAddon.findMany({
          where: { invoiceId: { in: rows.map((r) => r.id) } },
          select: { invoiceId: true },
        })
      ).map((a) => a.invoiceId),
    );
    for (const r of rows) {
      out.scanned++;
      if (have.has(r.id)) {
        out.entitled++;
        continue;
      }
      if ((r.snapshot as { mode?: string } | null)?.mode === 'addon') {
        out.snapshot++;
        continue;
      }
      out.held++;
      if (dryRun) continue;
      const now = d.now();
      await d.platform.$transaction(async (t) => {
        const r2 = await t.billingInvoice.updateMany({
          where: { id: r.id, holdReason: null },
          data: { holdReason: 'legacy_addon' },
        });
        if (r2.count !== 1) return;
        await t.reconcileFinding.createMany({
          data: [
            {
              id: uuidv7(now.getTime()),
              workspaceId: r.workspaceId,
              check: 'billing_invoice_hold',
              reference: r.id,
              cutoff: r.paidAt ?? now,
              severity: 'pending',
              detail: { reason: 'legacy_addon', kind: 'addon', code: r.code, item: r.item },
              createdAt: now,
            },
          ],
          skipDuplicates: true,
        });
      });
    }
    if (rows.length < limit) break;
  }
  return out;
}
