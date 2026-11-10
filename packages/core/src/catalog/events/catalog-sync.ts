// Consumer `catalog-sync` (ROLE=jobs, rag §2): `product.changed` → nguồn RAG `kb_source(origin=catalog, kind=product, product_id)`
// với nội dung = tên + loại + danh mục + thông số + thành phần + thuộc tính + mô tả — KHÔNG có giá / tồn / khuyến mãi (agent tra
// bằng product.search / stock.get). Nội dung không đổi → bỏ qua (không tốn credit embed). Sản phẩm lưu trữ / đã xoá → xoá mềm
// nguồn + xoá đoạn; khôi phục → nạp lại. Idempotent theo trạng thái đích (một nguồn mỗi sản phẩm).
import { interpolate, serverMessages } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import { attrsOf } from '../services/product-view';

export interface CatalogSyncDeps {
  /** Đẩy job `kb-ingest` (KbIngestQueue của ai). */
  push(ws: string, sources: { id: string; seq: number }[]): Promise<void>;
  /** Locale workspace (chữ của tài liệu). */
  localeOf(ws: string): Promise<string>;
  now(): Date;
}

type Db = Pick<TenantDb, 'product' | 'productComponent' | 'productCategory' | 'kbSource' | 'kbChunk'>;

/** Văn bản nguồn RAG của sản phẩm — không chứa giá / tồn (test kiểm). */
export async function productDocument(db: Db, productId: string, locale: string): Promise<{ name: string; body: string } | null> {
  const p = await db.product.findUnique({ where: { id: productId } });
  if (!p || p.deletedAt) return null;
  const m = serverMessages(locale).catalog;
  const [cat, parts] = await Promise.all([
    p.categoryId ? db.productCategory.findUnique({ where: { id: p.categoryId }, select: { name: true } }) : null,
    db.productComponent.findMany({ where: { productId }, select: { qty: true, child: { select: { name: true } } } }),
  ]);
  const r = m.rag;
  const lines = [interpolate(r.title, { name: p.name, code: p.code }), interpolate(r.type, { type: m.type[p.type] })];
  if (cat) lines.push(interpolate(r.category, { category: cat.name }));
  lines.push(interpolate(r.unit, { unit: p.unit }));
  if (p.durationMin) lines.push(interpolate(r.duration, { n: p.durationMin }));
  if (p.sessions) lines.push(interpolate(r.sessions, { n: p.sessions }));
  if (p.validDays) lines.push(interpolate(r.valid, { n: p.validDays }));
  if (p.rentalUnit) lines.push(interpolate(r.rental, { unit: m.rental[p.rentalUnit as keyof typeof m.rental] ?? p.rentalUnit }));
  if (parts.length) lines.push(interpolate(r.parts, { list: parts.map((c) => `${c.qty} × ${c.child.name}`).join(', ') }));
  for (const a of attrsOf(p.attrs)) lines.push(interpolate(r.attrs, { name: a.name, values: a.values.join(', ') }));
  if (p.description.trim()) lines.push(interpolate(r.desc, { text: p.description.trim() }));
  lines.push(r.note);
  return { name: p.name, body: lines.join('\n') };
}

export async function syncProduct(db: Db, ws: string, productId: string, d: CatalogSyncDeps): Promise<'created' | 'updated' | 'unchanged' | 'removed' | 'none'> {
  const now = d.now();
  const doc = await productDocument(db, productId, await d.localeOf(ws));
  const src = await db.kbSource.findFirst({ where: { productId, origin: 'catalog' }, orderBy: { createdAt: 'asc' } });
  if (!doc) {
    if (!src || src.deletedAt) return 'none';
    await db.kbChunk.deleteMany({ where: { sourceId: src.id } });
    await db.kbSource.update({ where: { id: src.id }, data: { deletedAt: now, chunkCount: 0 } });
    return 'removed';
  }
  const size = BigInt(Buffer.byteLength(doc.body, 'utf8'));
  if (!src) {
    const id = uuidv7(now.getTime());
    await db.kbSource.create({ data: { id, origin: 'catalog', kind: 'product', name: doc.name, productId, body: doc.body, sizeBytes: size, createdAt: now, refreshedAt: now } });
    await d.push(ws, [{ id, seq: 1 }]);
    return 'created';
  }
  // So nội dung văn bản (cột sha256 dành cho tệp tải lên — unique).
  if (!src.deletedAt && src.body === doc.body && src.name === doc.name && src.status !== 'failed') return 'unchanged';
  const s = await db.kbSource.update({
    where: { id: src.id },
    data: { name: doc.name, body: doc.body, sizeBytes: size, deletedAt: null, status: 'pending', error: null, refreshedAt: now, ingestSeq: { increment: 1 } },
    select: { id: true, ingestSeq: true },
  });
  await d.push(ws, [{ id: s.id, seq: s.ingestSeq }]);
  return 'updated';
}
