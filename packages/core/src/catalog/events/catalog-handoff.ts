// Bàn giao nguồn catalog → nạp kho tri thức bền (TIP-006b §4.1–4.2, AC5): nội dung nguồn + `ingest_seq` + trạng thái `pending` (ý định nạp
// của 020b / 043) commit trước khi đẩy job — đẩy lỗi sau commit → ý định còn pending, quét ROLE=ai đẩy lại ĐÚNG lần nạp đó (job id theo seq).
// Nội dung không đổi mà lần nạp cũ còn pending → vẫn đẩy lại (không mất nạp); đã ready → không nạp lại (không tốn credit). Công bố của lần
// nạp cũ sau khi có bản mới bị `kb.system_publish` từ chối theo seq (003c) — không trừ credit hai lần. Quét: ai/kb/ingest-recovery.ts.
import type { TenantDb } from '@appchat/db';
import type { DomainEvent, EventConsumer } from '../../kernel/events/consumer';
import type { HandoffContract } from '../../kernel/events/protocol/types';
import type { TenantTx } from '../../kernel/actions/action-context';
import { syncProduct, type CatalogSyncDeps } from './catalog-sync';

export const CATALOG_SYNC_CONSUMER = 'catalog-sync';

type Db = Pick<TenantDb, 'product' | 'productComponent' | 'productCategory' | 'kbSource' | 'kbChunk'>;

/** Ghi nguồn + ý định nạp (không đẩy) — trả lần nạp cần đẩy (null = không có gì). */
export async function acceptProduct(db: Db, ws: string, productId: string, d: Omit<CatalogSyncDeps, 'push'>): Promise<{ id: string; seq: number } | null> {
  let pending: { id: string; seq: number } | null = null;
  const r = await syncProduct(db, ws, productId, { ...d, push: async (_ws, s) => void (pending = s[0] ?? null) });
  if (pending) return pending;
  if (r !== 'unchanged') return null;
  // Không đổi: lần nạp cũ chưa xong (đẩy job từng lỗi) → đẩy lại đúng seq đó.
  const src = await db.kbSource.findFirst({ where: { productId, origin: 'catalog', deletedAt: null, status: 'pending' }, select: { id: true, ingestSeq: true } });
  return src ? { id: src.id, seq: src.ingestSeq } : null;
}

/** Hợp đồng v2 (handoff): nguồn + ý định nạp ghi CÙNG biên nhận; job đẩy do quét khôi phục (ý định bền, không mất khi chưa đẩy). */
export const catalogSyncContract = (d: Omit<CatalogSyncDeps, 'push'>): HandoffContract => ({
  name: CATALOG_SYNC_CONSUMER,
  mode: 'handoff',
  contractVersion: 1,
  topics: ['product.changed'],
  async accept(e, tx: TenantTx) {
    const id = e.payload.product_id;
    if (typeof id !== 'string') return { kind: 'no_effect', reason: 'no_product' };
    const p = await acceptProduct(tx as unknown as Db, e.workspaceId, id, d);
    return p ? { kind: 'handed_off', effectRef: `kb_source:${p.id}:${p.seq}` } : { kind: 'no_effect', reason: 'unchanged' };
  },
});

/** Consumer v1: ghi nguồn + ý định nạp (catalog-handoff) rồi đẩy; đẩy lỗi → ý định pending, quét ROLE=ai đẩy lại (TIP-006b AC5). */
export function catalogSyncConsumer(d: CatalogSyncDeps): EventConsumer {
  return {
    name: CATALOG_SYNC_CONSUMER,
    topics: ['product.changed'],
    async handle(e: DomainEvent, db: TenantDb) {
      const id = e.payload.product_id;
      if (typeof id !== 'string') return;
      const p = await acceptProduct(db, e.workspaceId, id, d);
      if (p) await d.push(e.workspaceId, [p]);
    },
  };
}
