// Cache bản dịch theo người (TIP-025b §F.2, §H): khoá actor + epoch quyền + hội thoại + băm nội dung + đích + phiên bản prompt.
// `claim` giữ chỗ bằng INSERT … ON CONFLICT DO NOTHING: lượt trùng (mount lặp / kết nối lại) thấy `pending` thì chờ cùng lượt (không
// gọi model lần hai, không trừ credit hai lần); giữ chỗ quá hạn (tiến trình chết) thì lượt sau nhận lại. Lỗi model → xoá chỗ giữ để
// thử lại thủ công, không bao giờ trả bản dịch cũ / bịa. Không lưu nguyên văn nguồn — chỉ băm.
import { createHash } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import { TRANSLATION_PROMPT_VERSION, TRANSLATION_TTL_MS } from '@appchat/shared';
import { uuidv7 } from '../../kernel/ids';

export const CLAIM_STALE_MS = 60_000;
const WAIT_MS = 20_000;
const POLL_MS = 250;

export interface CacheKey {
  actorId: string;
  conversationId: string;
  source: string;
  target: string;
  authzEpoch: number;
}

export const sourceHash = (s: string) => createHash('sha256').update(s.normalize('NFC')).digest('hex');

const where = (k: CacheKey) => ({
  actorId: k.actorId,
  conversationId: k.conversationId,
  sourceHash: sourceHash(k.source),
  target: k.target,
  promptVersion: TRANSLATION_PROMPT_VERSION,
  authzEpoch: k.authzEpoch,
});

export type Claim = { kind: 'hit'; text: string } | { kind: 'owner'; id: string };

/** Tra cache / giữ chỗ. Trả `hit` (đã có, còn hạn) hoặc `owner` (lượt này gọi model). Lượt khác đang chạy → chờ tới khi xong. */
export async function claimTranslation(db: TenantDb, now: () => Date, k: CacheKey, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<Claim> {
  const w = where(k);
  const started = now().getTime();
  for (;;) {
    const at = now();
    const id = uuidv7(at.getTime());
    const ins = await db.$executeRaw`
      INSERT INTO translation_cache (id, actor_id, conversation_id, source_hash, target, prompt_version, authz_epoch, status, claimed_at, expires_at)
      VALUES (${id}::uuid, ${w.actorId}::uuid, ${w.conversationId}::uuid, ${w.sourceHash}, ${w.target}, ${w.promptVersion}, ${w.authzEpoch}, 'pending', ${at}, ${new Date(at.getTime() + TRANSLATION_TTL_MS)})
      ON CONFLICT (actor_id, conversation_id, source_hash, target, prompt_version, authz_epoch) DO NOTHING`;
    if (ins === 1) return { kind: 'owner', id };
    const row = await db.translationCache.findUnique({ where: { actorId_conversationId_sourceHash_target_promptVersion_authzEpoch: w } });
    if (!row) continue; // bị dọn giữa chừng → giữ chỗ lại
    if (row.expiresAt <= at) {
      await db.translationCache.deleteMany({ where: { id: row.id, expiresAt: row.expiresAt } });
      continue;
    }
    if (row.status === 'done' && row.text !== null) return { kind: 'hit', text: row.text };
    // Giữ chỗ quá hạn (tiến trình chết) → nhận lại có điều kiện (một lượt thắng).
    if (at.getTime() - row.claimedAt.getTime() > CLAIM_STALE_MS) {
      const took = await db.translationCache.updateMany({ where: { id: row.id, status: 'pending', claimedAt: row.claimedAt }, data: { claimedAt: at } });
      if (took.count === 1) return { kind: 'owner', id: row.id };
      continue;
    }
    if (at.getTime() - started > WAIT_MS) return { kind: 'owner', id: row.id };
    await sleep(POLL_MS);
  }
}

export async function finishTranslation(db: TenantDb, id: string, text: string, runId: string): Promise<void> {
  await db.translationCache.updateMany({ where: { id }, data: { status: 'done', text, runId } });
}

/** Lỗi / hết credit: bỏ chỗ giữ — thử lại thủ công gọi model lại, không trả kết quả cũ. */
export async function releaseTranslation(db: TenantDb, id: string): Promise<void> {
  await db.translationCache.deleteMany({ where: { id, status: 'pending' } });
}

/** Dọn hết hạn theo lô id (index expires_at) — job ROLE=jobs. */
export async function purgeTranslations(db: TenantDb, now: Date, batch = 500): Promise<number> {
  let total = 0;
  for (;;) {
    const ids = await db.translationCache.findMany({ where: { expiresAt: { lt: now } }, select: { id: true }, take: batch });
    if (!ids.length) return total;
    total += (await db.translationCache.deleteMany({ where: { id: { in: ids.map((r) => r.id) } } })).count;
    if (ids.length < batch) return total;
  }
}
