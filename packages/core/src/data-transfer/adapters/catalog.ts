// Adapter nhập sản phẩm (TIP-038b P2, DC-374): KHÔNG bộ kiểm thứ hai — phân loại bằng chính `validateRow` / `markDuplicates` của
// `product.import` (032b) trên dữ liệu đã ánh xạ; ghi = MỘT lệnh `product.import` trên chính tệp + ánh xạ của kế hoạch (cùng bộ kiểm, cùng
// biên nhận `product_import_row`), rồi chép kết quả từng dòng sang `transfer_row`. SKU đã có → cập nhật sản phẩm đó (luật 032b — preview
// đếm riêng `sku_warning: updates_existing`); không đụng tồn kho (stock chỉ qua `stock.adjust`). Việc nhập sản phẩm > 500 dòng chạy nền
// của chính 032b — runner chờ lần nhập kết thúc (huỷ hợp tác qua `shouldStop`), không ghi song song.
import { setTimeout as sleep } from 'node:timers/promises';
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { isProductRowError, markProductDuplicates, validateProductRow } from '../../catalog/public';
import type { CheckedRow } from '../services/validation';
import type { Classifier, RowCheck, WholeCommit } from './types';

const POLL_MS = 2_000;
const MAX_WAIT_MS = 30 * 60_000;

export const classifyProducts: Classifier = async (tx, _who, rows) => {
  const checked = markProductDuplicates(
    rows.map((r) => validateProductRow({ rowNo: r.rowNo, cells: r.data })),
  );
  const skus = checked.flatMap((c) => (!isProductRowError(c) && c.sku ? [c.sku.toLowerCase()] : []));
  const existing = skus.length
    ? new Set(
        (
          await tx.$queryRaw<
            { code: string }[]
          >`SELECT lower(code) AS code FROM product WHERE lower(code) = ANY(${skus}::text[])`
        ).map((p) => p.code),
      )
    : new Set<string>();
  return checked.map((c, i): RowCheck => {
    const r = rows[i] as CheckedRow;
    if (isProductRowError(c)) {
      const [field, code] = c.error.split(':');
      r.errors[field!] = code ?? 'invalid';
      return 'invalid';
    }
    if (c.sku && existing.has(c.sku.toLowerCase())) r.errors.sku_warning = 'updates_existing';
    return 'valid';
  });
};

async function waitImport(db: TenantDb, id: string, shouldStop: () => Promise<boolean>) {
  const until = Date.now() + MAX_WAIT_MS;
  for (;;) {
    const s = (await db.productImport.findUnique({ where: { id }, select: { status: true } }))?.status;
    if (!s || ['completed', 'cancelled', 'failed'].includes(s)) return s ?? 'failed';
    if ((await shouldStop()) || Date.now() > until) return 'running';
    await sleep(POLL_MS);
  }
}

export const commitProducts: WholeCommit = async ({ db, plan, ctx, executor, shouldStop, now }) => {
  const out = await executor.execute<{ import_id: string }>(ctx, 'product.import', {
    file_id: plan.fileId,
    mapping: plan.mapping,
  });
  const data = out.data as { result?: { import_id: string }; status?: string; job_id?: string };
  const importId =
    out.status === 200 ? data.result!.import_id : data.status === 'job_accepted' ? data.job_id! : null;
  if (!importId) throw new AppError('CONFLICT', 409, { status: String(data.status ?? out.status) });
  const st = await waitImport(db, importId, shouldStop);
  const receipts = await db.productImportRow.findMany({
    where: { importId },
    select: { rowNo: true, status: true, productId: true, error: true },
  });
  const byNo = new Map(receipts.map((r) => [r.rowNo, r]));
  const pending = await db.transferRow.findMany({
    where: { planId: plan.id, status: 'pending' },
    select: { id: true, rowNo: true },
  });
  const t = now();
  await db.$transaction(async (tx) => {
    for (const r of pending) {
      const rc = byNo.get(r.rowNo);
      if (!rc) continue;
      await tx.transferRow.updateMany({
        where: { id: r.id, status: 'pending' },
        data:
          rc.status === 'failed'
            ? { status: 'failed', error: rc.error ?? 'error', resultId: rc.productId, updatedAt: t }
            : { status: 'applied', resultId: rc.productId, resultCode: rc.status, updatedAt: t },
      });
    }
  });
  if (st === 'running') throw new AppError('CONFLICT', 409, { product_import: 'still_running' });
};
