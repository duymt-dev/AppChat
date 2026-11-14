// Hiệu ứng `kb.system_publish` (TIP-003c §4.6) — finalizer chung cho ready / failed / learn=false (thân transaction cũ của ingest.ts).
// Khoá nguồn, đọc lại: đã xoá / đã sang lần nạp khác / không còn `processing` → no_effect (ứng viên cũ không đè đoạn mới).
// TIP-020e: vector ghi vào KHE ĐANG PHỤC VỤ (khoá `kb_setting` sau khoá nguồn — thứ tự toàn cục nguồn → setting; publish chỉ mục chỉ khoá
// setting → generation, không khoá nguồn) kèm space + generation của khe. Space ứng viên ≠ space khe (chỉ mục vừa đổi khe trong lúc nạp)
// → nguồn `failed` có lý do, KHÔNG ghi vector lệch không gian. Kho chưa có space → gắn space của lần nạp đầu.
import type { SystemOutput } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import type { OutboxEventInput } from '../../../kernel/outbox/outbox';
import type { KbCandidate } from './candidates';
import type { KbPublishOp } from './sources';
import { sameSpace, slotCols } from '../reindex/space';

type Effect = { out: SystemOutput; events: OutboxEventInput[] };
const none = (id: string, reason: string): Effect => ({ out: { disposition: 'no_effect', operation_id: id, reason_code: reason }, events: [] });
const vecLit = (v: number[]) => `[${v.map((x) => x.toFixed(6)).join(',')}]`;
const matches = (op: KbPublishOp, c: KbCandidate) => (op === 'publish_ready' ? c.kind === 'ready' : op === 'publish_failed' ? c.kind === 'failed' : c.kind === 'unlearned');

export async function publishSource(tx: TenantTx, id: string, op: KbPublishOp, seq: number, c: KbCandidate | null, now: Date): Promise<Effect> {
  if (!c || !matches(op, c)) return none(id, 'candidate_missing');
  await tx.$queryRaw`SELECT 1 FROM kb_source WHERE id = ${id}::uuid FOR UPDATE`;
  const s = await tx.kbSource.findUnique({ where: { id }, select: { deletedAt: true, ingestSeq: true, status: true, createdBy: true } });
  if (!s || s.deletedAt) return none(id, 'deleted');
  if (s.ingestSeq !== seq || s.status !== 'processing') return none(id, 'superseded');
  if (c.kind === 'failed') {
    const error = c.error.slice(0, 300);
    await tx.kbSource.update({ where: { id }, data: { status: 'failed', error, refreshedAt: now } });
    return { out: { disposition: 'applied', operation_id: id, reason_code: 'failed' }, events: [{ topic: 'kb.source_failed', payload: { source_id: id, error, created_by: s.createdBy } }] };
  }
  const set = c.kind === 'ready' ? (await tx.$queryRaw<{ slot: string; gen: string | null; space: string | null }[]>`SELECT active_slot AS slot, active_generation_id::text AS gen, active_space AS space FROM kb_setting WHERE id = 1 FOR UPDATE`)[0] : undefined;
  if (c.kind === 'ready' && set?.space && !sameSpace(set.space, c.space)) {
    const error = 'Model embedding của kho vừa đổi trong lúc nạp — bấm Học lại';
    await tx.kbSource.update({ where: { id }, data: { status: 'failed', error, refreshedAt: now } });
    return { out: { disposition: 'applied', operation_id: id, reason_code: 'failed' }, events: [{ topic: 'kb.source_failed', payload: { source_id: id, error, created_by: s.createdBy } }] };
  }
  if (c.kind === 'ready' && set && !set.space) await tx.kbSetting.update({ where: { id: 1 }, data: { activeSpace: c.space, version: { increment: 1 } } });
  await tx.kbChunk.deleteMany({ where: { sourceId: id } });
  if (c.kind === 'unlearned') {
    await tx.kbSource.update({ where: { id }, data: { status: 'ready', chunkCount: 0, refreshedAt: now } });
    return { out: { disposition: 'applied', operation_id: id }, events: [] };
  }
  const slot = slotCols(set?.slot === 'b' ? 'b' : 'a');
  const space = set?.space ?? c.space;
  for (let i = 0; i < c.chunks.length; i++) {
    const k = c.chunks[i]!;
    await tx.$executeRaw`INSERT INTO kb_chunk (id, source_id, ord, content, ${slot.vecW}, ${slot.spaceW}, ${slot.genW}, embed_model, token_count, meta)
      VALUES (${uuidv7()}::uuid, ${id}::uuid, ${i}, ${k.content}, ${vecLit(k.vector)}::vector, ${space}, ${set?.gen ?? null}::uuid, ${c.model}, ${k.tokens}, ${JSON.stringify(k.meta)}::jsonb)`;
  }
  await tx.kbSource.update({ where: { id }, data: { status: 'ready', chunkCount: c.chunks.length, error: null, refreshedAt: now } });
  return { out: { disposition: 'applied', operation_id: id }, events: [{ topic: 'kb.source_ready', payload: { source_id: id, chunk_count: c.chunks.length } }] };
}
