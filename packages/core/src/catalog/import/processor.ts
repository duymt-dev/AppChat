// Chạy một lần nhập sản phẩm (TIP-032b): dùng cho cả đường đồng bộ (≤ 500 dòng — trong `execute`) lẫn việc nền (> 500 dòng — consumer
// `catalog.product-import` đọc event `product.import_requested`). Việc nền kiểm lại quyền người gọi NGAY TRƯỚC khi ghi (thành viên còn
// hoạt động + `catalog.manage`), đọc lại tệp theo id + hash đã ghi (tệp đổi → failed), mỗi dòng một transaction có biên nhận; kiểm
// `cancelling` theo lô — huỷ dừng dòng chưa ghi, không hoàn tác dòng đã ghi. Kết thúc: đếm lại từ biên nhận (không đếm theo số dòng
// đã đọc) → completed / cancelled / failed + `product.changed` cho từng sản phẩm đã ghi (RAG nạp lại).
import type { TenantDb } from '@appchat/db';
import { createHash } from 'node:crypto';
import type { TenantTx } from '../../kernel/actions/action-context';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { parseImport, type Mapping } from './parse';
import { writeRow } from './receipt';
import { markDuplicates, validateRow } from './validate';
import { inEventTransaction } from '../../kernel/outbox/transaction';

const BATCH = 50;
type ImportFile = { name: string; mime: string; body: Buffer };

export interface ImportRunDeps {
  readFile: (fileId: string) => Promise<ImportFile | null>;
  /** Người gọi còn được ghi catalog (thành viên hoạt động + quyền) — việc nền kiểm lại trước khi chạy. */
  canWrite: (actorId: string | null) => Promise<boolean>;
  now: () => Date;
}

/** Đếm lại từ biên nhận (nguồn sự thật cho tiến độ / kết quả). */
export async function tally(db: Pick<TenantDb, 'productImportRow'> | TenantTx, importId: string) {
  const g = await db.productImportRow.groupBy({ by: ['status'], where: { importId }, _count: { _all: true } });
  const n = (s: string) => g.find((x) => x.status === s)?._count._all ?? 0;
  return { created: n('created'), updated: n('updated'), failed: n('failed'), done: g.reduce((a, x) => a + x._count._all, 0) };
}

/** Dòng hợp lệ / lỗi của tệp (giữ thứ tự) — dùng chung preview, đồng bộ và nền. */
export async function prepareRows(file: ImportFile, mapping: Mapping) {
  return markDuplicates((await parseImport(file, mapping)).map(validateRow));
}

/** Chạy các dòng chưa có biên nhận; trả trạng thái cuối. */
export async function runImport(db: TenantDb, ws: string, importId: string, d: ImportRunDeps): Promise<'completed' | 'cancelled' | 'failed' | 'skipped'> {
  const imp = await db.productImport.findUnique({ where: { id: importId } });
  if (!imp || !['queued', 'running', 'cancelling'].includes(imp.status)) return 'skipped';
  const finish = async (status: 'completed' | 'cancelled' | 'failed', error: string | null = null) => {
    await inEventTransaction(db, ws, async (tx) => {
      const t = await tally(tx, importId);
      await tx.productImport.update({ where: { id: importId }, data: { status, error, created: t.created, updated: t.updated, failed: t.failed, finishedAt: d.now(), nextAttemptAt: null } });
      // RAG nạp lại đúng các sản phẩm lần nhập đã ghi (một event mỗi sản phẩm — cùng schema `product.changed`).
      const touched = await tx.productImportRow.findMany({ where: { importId, status: { in: ['created', 'updated'] }, productId: { not: null } }, select: { productId: true, status: true } });
      if (touched.length) await writeOutbox(tx, ws, touched.map((r) => ({ topic: 'product.changed', payload: { product_id: r.productId!, change: r.status === 'created' ? 'created' : 'updated' } })), d.now());
    });
    return status;
  };
  if (imp.status === 'cancelling') return finish('cancelled');
  if (!(await d.canWrite(imp.actorId))) return finish('failed', 'forbidden');
  const file = await d.readFile(imp.fileId);
  if (!file || createHash('sha256').update(file.body).digest('hex') !== imp.fileSha256) return finish('failed', 'file_changed');
  const claimed = await db.productImport.updateMany({ where: { id: importId, status: 'queued' }, data: { status: 'running', updatedAt: d.now() } });
  if (!claimed.count && imp.status !== 'running') return 'skipped';
  const rows = await prepareRows(file, imp.mapping as Mapping);
  await db.productImport.update({ where: { id: importId }, data: { total: rows.length } });
  const done = new Set((await db.productImportRow.findMany({ where: { importId }, select: { rowNo: true } })).map((r) => r.rowNo));
  const todo = rows.filter((r) => !done.has(r.rowNo));
  for (let i = 0; i < todo.length; i += BATCH) {
    const cur = await db.productImport.findUnique({ where: { id: importId }, select: { status: true } });
    if (cur?.status === 'cancelling') return finish('cancelled');
    for (const r of todo.slice(i, i + BATCH)) await db.$transaction((tx) => writeRow(tx, importId, r, imp.actorId, d.now()));
    const t = await tally(db, importId);
    await db.productImport.update({ where: { id: importId }, data: { created: t.created, updated: t.updated, failed: t.failed, updatedAt: d.now() } });
  }
  return finish('completed');
}
