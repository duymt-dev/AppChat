// Một lượt job `doc-render` (TIP-028b §1, AC1 / AC2): đọc dòng `document_render` theo (id, thế hệ) — job cũ / đã xong → bỏ qua. Render
// NGOÀI transaction (LibreOffice chậm) → tệp id tất định theo (render, thế hệ) nên worker chết giữa chừng chạy lại vẫn ra MỘT tệp. Phát
// hành trong transaction có collector: khoá dòng, kiểm lại `pending_render` + thế hệ, domain gắn tệp + ghi tin, đánh `rendered` + outbox
// `document.rendered`. Lỗi: còn lượt (BullMQ attempts = 3) → ném để BullMQ thử lại (back-off); lượt cuối hoặc lỗi vĩnh viễn (AppError —
// chứng từ không còn hợp lệ) → `render_failed` + `document.render_failed` (mã lỗi đã làm sạch), có nút Thử lại.
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { inEventTransaction } from '../../kernel/outbox/transaction';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { renderKindOf, type RenderJobRow } from './kinds';

export const RENDER_ATTEMPTS = 3;

export interface RenderJob {
  ws: string;
  render_id: string;
  generation: number;
}

export type RenderRunResult = { status: 'rendered' | 'failed' | 'skipped'; out: unknown[] };

/** Mã lỗi đã làm sạch (không message / stack / PII) — hiện ở FE qua i18n. */
export function renderErrorCode(err: unknown): string {
  if (err instanceof AppError) {
    const first = Object.entries(err.fields ?? {})[0];
    return (first ? `${err.code}:${first[0]}` : err.code).slice(0, 80);
  }
  return 'RENDER_FAILED';
}

const payloadOf = (r: RenderJobRow) => ({ render_id: r.id, kind: r.kind, document_id: r.documentId, generation: r.generation });

async function lockRow(tx: TenantTx, id: string, generation: number) {
  await tx.$queryRaw`SELECT 1 FROM document_render WHERE id = ${id}::uuid FOR UPDATE`;
  const r = await tx.documentRender.findUnique({ where: { id } });
  return r && r.status === 'pending_render' && r.generation === generation ? r : null;
}

async function fail(db: TenantDb, ws: string, j: RenderJob, code: string, now: Date): Promise<boolean> {
  return inEventTransaction(db, ws, async (tx) => {
    const r = await lockRow(tx, j.render_id, j.generation);
    if (!r) return false;
    await tx.documentRender.update({ where: { id: r.id }, data: { status: 'render_failed', error: code, updatedAt: now } });
    await writeOutbox(tx, ws, [{ topic: 'document.render_failed', payload: { ...payloadOf({ ...r, request: {} }), error: code } }], now);
    return true;
  });
}

/** `attempt` = lượt hiện tại (1-based) của BullMQ. Ném lại lỗi khi còn lượt để BullMQ thử lại theo back-off. */
export async function runRender(db: TenantDb, j: RenderJob, attempt: number, now: () => Date): Promise<RenderRunResult> {
  const row = await db.documentRender.findUnique({ where: { id: j.render_id } });
  if (!row || row.status !== 'pending_render' || row.generation !== j.generation) return { status: 'skipped', out: [] };
  const kind = renderKindOf(row.kind);
  const r: RenderJobRow = { id: row.id, kind: row.kind, documentId: row.documentId, generation: row.generation, request: (row.request ?? {}) as Record<string, unknown> };
  await db.documentRender.update({ where: { id: row.id }, data: { attempts: { increment: 1 }, updatedAt: now() } });
  try {
    if (!kind) throw new AppError('NOT_IMPLEMENTED', 501, { kind: 'unregistered' });
    const file = await kind.render(db, j.ws, r);
    const out = await inEventTransaction(db, j.ws, async (tx) => {
      const locked = await lockRow(tx, r.id, r.generation);
      if (!locked) return null;
      const at = now();
      const o = await kind.publish(tx, j.ws, r, file, at);
      await tx.documentRender.update({ where: { id: r.id }, data: { status: 'rendered', fileId: file.fileId, error: null, updatedAt: at } });
      await writeOutbox(tx, j.ws, [{ topic: 'document.rendered', payload: payloadOf(r) }, ...o.events], at);
      return o.out ?? [];
    });
    return out ? { status: 'rendered', out } : { status: 'skipped', out: [] };
  } catch (err) {
    // AppError = chứng từ / cấu hình không còn hợp lệ (thử lại không đổi kết quả); lỗi khác (LibreOffice, Storage, DB) → thử lại.
    const permanent = err instanceof AppError && err.httpStatus < 500;
    if (!permanent && attempt < RENDER_ATTEMPTS) throw err;
    await fail(db, j.ws, j, renderErrorCode(err), now());
    return { status: 'failed', out: [] };
  }
}
