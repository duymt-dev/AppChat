// Yêu cầu render trong transaction của action phát hành (TIP-028b §1): upsert một dòng `document_render` mỗi chứng từ → `pending_render`
// thế hệ mới + outbox `document.render_requested` (consumer ROLE=jobs đẩy queue `doc-render`, jobId = render:thế hệ). Thử lại (nút ở FE)
// chỉ từ `render_failed` → tăng thế hệ, giữ tham số phát hành đã chụp. Đọc trạng thái cho DTO chứng từ.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';

export interface RenderState {
  status: 'pending_render' | 'rendered' | 'render_failed';
  error: string | null;
}

type Ev = { topic: string; payload: Record<string, unknown> };

const requested = (r: { id: string; kind: string; documentId: string; generation: number }): Ev => ({
  topic: 'document.render_requested',
  payload: { render_id: r.id, kind: r.kind, document_id: r.documentId, generation: r.generation },
});

/** Phát hành mới (hoặc phát hành lại cùng chứng từ): thế hệ + 1, trạng thái chờ, tham số mới. Trả event để action ghi cùng transaction. */
export async function requestRender(tx: TenantTx, o: { kind: string; documentId: string; request: Record<string, unknown>; now: Date }): Promise<{ renderId: string; events: Ev[] }> {
  const key = { kind_documentId: { kind: o.kind, documentId: o.documentId } };
  const prev = await tx.documentRender.findUnique({ where: key });
  const row = prev
    ? await tx.documentRender.update({ where: { id: prev.id }, data: { generation: { increment: 1 }, status: 'pending_render', attempts: 0, error: null, fileId: null, request: o.request as object, updatedAt: o.now } })
    : await tx.documentRender.create({ data: { id: uuidv7(o.now.getTime()), kind: o.kind, documentId: o.documentId, request: o.request as object, createdAt: o.now, updatedAt: o.now } });
  return { renderId: row.id, events: [requested(row)] };
}

/** Thử lại sau `render_failed` (khoá dòng). Đang chờ / đã xong → INVALID_STATE. */
export async function retryRender(tx: TenantTx, kind: string, documentId: string, now: Date): Promise<{ generation: number; events: Ev[] }> {
  const prev = await tx.documentRender.findUnique({ where: { kind_documentId: { kind, documentId } } });
  if (!prev) throw new AppError('INVALID_STATE', 409, { render: 'none' });
  await tx.$queryRaw`SELECT 1 FROM document_render WHERE id = ${prev.id}::uuid FOR UPDATE`;
  const cur = await tx.documentRender.findUniqueOrThrow({ where: { id: prev.id } });
  if (cur.status !== 'render_failed') throw new AppError('INVALID_STATE', 409, { render: cur.status });
  const row = await tx.documentRender.update({ where: { id: cur.id }, data: { generation: { increment: 1 }, status: 'pending_render', attempts: 0, error: null, updatedAt: now } });
  return { generation: row.generation, events: [requested(row)] };
}

/** Trạng thái render theo chứng từ (một truy vấn theo unique (kind, document_id)). */
export async function renderStates(tx: Pick<TenantTx, 'documentRender'>, kind: string, ids: string[]): Promise<Map<string, RenderState>> {
  if (!ids.length) return new Map();
  const rows = await tx.documentRender.findMany({ where: { kind, documentId: { in: ids } }, select: { documentId: true, status: true, error: true } });
  return new Map(rows.map((r) => [r.documentId, { status: r.status, error: r.error }]));
}
