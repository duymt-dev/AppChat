// Cấp seq theo aggregate lúc flush cuối transaction (TIP-003b §2.2): MỘT câu upsert cho mọi aggregate của transaction, hàng xếp theo
// (kind, id) để thứ tự khoá tất định (không chu trình A→B / B→A giữa hai transaction). Bộ đếm rollback cùng transaction — không Redis
// INCR, không sequence Postgres ngoài transaction, không suy từ thời gian / UUID. Producer KHÔNG đụng event_aggregate_head.
import type { TenantTx } from '../actions/action-context';

export interface AggregateDemand {
  kind: string;
  id: string;
  /** Số event của aggregate trong transaction (≥ 1). */
  count: number;
}

/** Trả seq ĐẦU tiên đã cấp cho từng aggregate (`kind|id` → bigint); các event của aggregate nhận first, first+1, … theo thứ tự ghi. */
export async function allocateSequences(tx: TenantTx, demands: readonly AggregateDemand[]): Promise<Map<string, bigint>> {
  const out = new Map<string, bigint>();
  if (!demands.length) return out;
  const sorted = [...demands].sort((a, b) => (a.kind === b.kind ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.kind < b.kind ? -1 : 1));
  const rows = await tx.$queryRaw<{ kind: string; id: string; next_seq: bigint }[]>`
    INSERT INTO event_aggregate_counter (kind, id, next_seq)
    SELECT t.kind, t.id, 1 + t.n
      FROM unnest(${sorted.map((d) => d.kind)}::text[], ${sorted.map((d) => d.id)}::uuid[], ${sorted.map((d) => d.count)}::bigint[]) WITH ORDINALITY AS t(kind, id, n, ord)
     ORDER BY t.ord
    ON CONFLICT (kind, id) DO UPDATE SET next_seq = event_aggregate_counter.next_seq + EXCLUDED.next_seq - 1
    RETURNING kind, id::text AS id, next_seq`;
  const want = new Map(sorted.map((d) => [`${d.kind}|${d.id}`, d.count]));
  for (const r of rows) {
    const k = `${r.kind}|${r.id}`;
    out.set(k, BigInt(r.next_seq) - BigInt(want.get(k)!));
  }
  if (out.size !== sorted.length) throw new Error('allocateSequences: thiếu aggregate trong RETURNING');
  return out;
}
