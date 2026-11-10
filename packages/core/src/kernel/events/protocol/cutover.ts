// Chuyển workspace sang v2 (TIP-003b §5.5–5.7): (1) `fence` — pha v1 → fenced; UPDATE chờ mọi transaction producer đang giữ FOR SHARE
// (flush cuối) commit, sau đó producer mới gặp rào → EVENT_PROTOCOL_FENCED (chỉ chặn ghi có event của workspace này, không mất event).
// (2) `evaluateLegacy` — event v1 còn pending / failed là stream chưa giải quyết → chặn bật; không bịa thứ tự lịch sử, không tự đánh dấu
// xong. (3) `activate` — chỉ khi fenced + legacy sạch + readiness đạt: lưu registry bất biến, tăng epoch, pha v2, checkpoint (đếm / id —
// không nội dung khách). Rollback sau khi đã có ghi v2: KHÔNG quay về v1 (binary cũ sẽ ACK sai) — chỉ sửa / tiến tới bằng binary tương thích.
import type { TenantDb } from '@appchat/db';
import type { Readiness } from './readiness';
import { persistRegistryVersion } from './start';
import type { RegistryTable } from './types';

const SAMPLE = 20;

export interface LegacyLedger {
  pending: number;
  failed: number;
  /** Đã giao hàng đợi nhưng không có bằng chứng mọi consumer đã chạy — ghi để xem xét, không tự coi là xong. */
  publishedUnverified: number;
  sampleIds: string[];
}

export type CutoverResult = { ok: true; epoch: number; registryVersion: number } | { ok: false; reason: string; ledger?: LegacyLedger };

type Db = Pick<TenantDb, '$transaction' | '$queryRaw' | '$executeRaw'>;

export async function fenceWorkspace(db: Db): Promise<'fenced' | 'already' | 'v2'> {
  const [r] = await db.$queryRaw<{ phase: string }[]>`
    UPDATE event_protocol_state SET phase = CASE WHEN phase = 'v1' THEN 'fenced' ELSE phase END, updated_at = now() WHERE id = 1 RETURNING phase`;
  return r?.phase === 'v2' ? 'v2' : r?.phase === 'fenced' ? 'fenced' : 'already';
}

/** Gỡ rào trước khi bật (chưa có ghi v2 nào) — an toàn. Đã v2 → từ chối. */
export async function unfenceWorkspace(db: Db): Promise<boolean> {
  const n = await db.$executeRaw`UPDATE event_protocol_state SET phase = 'v1', updated_at = now() WHERE id = 1 AND phase = 'fenced'`;
  return n === 1;
}

export async function evaluateLegacy(db: Pick<TenantDb, '$queryRaw'>): Promise<LegacyLedger> {
  const [c] = await db.$queryRaw<{ pending: bigint; failed: bigint; published: bigint }[]>`
    SELECT count(*) FILTER (WHERE status = 'pending') AS pending, count(*) FILTER (WHERE status = 'failed') AS failed,
           count(*) FILTER (WHERE status = 'published' AND NOT EXISTS (SELECT 1 FROM event_consumption ec WHERE ec.event_id = o.id)) AS published
      FROM outbox_event o WHERE protocol_version IS NULL`;
  const ids = await db.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM outbox_event WHERE protocol_version IS NULL AND status IN ('pending', 'failed') ORDER BY created_at, id LIMIT ${SAMPLE}`;
  return { pending: Number(c?.pending ?? 0), failed: Number(c?.failed ?? 0), publishedUnverified: Number(c?.published ?? 0), sampleIds: ids.map((r) => r.id) };
}

export async function activateV2(db: Db, table: RegistryTable, readiness: Readiness | null): Promise<CutoverResult> {
  if (!readiness?.ready) return { ok: false, reason: 'not_ready' };
  return db.$transaction(async (tx) => {
    const [st] = await tx.$queryRaw<{ phase: string; epoch: number; registry_version: number | null }[]>`SELECT phase, epoch, registry_version FROM event_protocol_state WHERE id = 1 FOR UPDATE`;
    if (st?.phase === 'v2') return { ok: true as const, epoch: st.epoch, registryVersion: st.registry_version! };
    if (st?.phase !== 'fenced') return { ok: false as const, reason: 'not_fenced' };
    const ledger = await evaluateLegacy(tx);
    if (ledger.pending || ledger.failed) return { ok: false as const, reason: 'legacy_unresolved', ledger };
    const version = await persistRegistryVersion(tx, table);
    const epoch = st.epoch + 1;
    const checkpoint = { at: new Date().toISOString(), digest: readiness.digest, registry_version: version, published_unverified: ledger.publishedUnverified };
    await tx.$executeRaw`
      UPDATE event_protocol_state SET phase = 'v2', epoch = ${epoch}, registry_version = ${version}, legacy_checkpoint = ${JSON.stringify(checkpoint)}::jsonb, updated_at = now() WHERE id = 1`;
    return { ok: true as const, epoch, registryVersion: version };
  });
}
