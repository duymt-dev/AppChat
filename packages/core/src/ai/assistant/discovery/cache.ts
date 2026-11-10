// Cache câu hỏi discovery (TIP-023e §3.1-3.4): RIÊNG theo gốc run + người + workspace, khoá = HMAC khoá theo workspace (không băm trần câu
// hỏi cá nhân) trên corpus/space/thuật toán/module/dấu vân tay tập action được phép/câu hỏi đã chuẩn hoá. Chỉ lưu danh sách id ứng viên
// vector — không schema, không quyền, không câu hỏi thô, không vector. Hit vẫn qua lọc quyền hiện hành ở service (không phải lối tắt
// quyền). TTL 5 phút, ≤ 128 mục / gốc (bỏ mục cũ nhất). Redis lỗi → trả null / bỏ ghi: đường không cache vẫn đúng, không giả hit.
import { createHash, createHmac } from 'node:crypto';
import type { Redis } from 'ioredis';

export const CACHE_TTL_MS = 5 * 60_000;
export const CACHE_MAX_PER_ROOT = 128;
export const CACHE_ALGO = 'rrf60-v1';
const MAX_IDS = 64;

export type CacheRedis = Pick<Redis, 'get' | 'set' | 'zadd' | 'zcard' | 'zrange' | 'zremrangebyrank' | 'del' | 'pexpire'>;

export interface CacheScope {
  ws: string;
  rootRunId: string;
  userId: string;
  corpusHash: string;
  spaceKey: string;
  module?: string;
  /** Id action được phép HIỆN HÀNH (sau authz/mode/implemented/module) — đổi tập → khoá mới, không lọc lại top-K cũ bị cắt. */
  allowedIds: readonly string[];
  query: string;
}

/** Dấu vân tay tập được phép (thứ tự không đổi kết quả). */
export const admissibleFingerprint = (ids: readonly string[]) => createHash('sha256').update([...ids].sort().join('\n')).digest('hex').slice(0, 32);

/** Dựng cache khi có Redis (đủ lệnh sorted-set) + khoá chủ; thiếu → null (đường không cache). */
export function discoveryCacheOf(redis: unknown, master: string | null | undefined): DiscoveryCache | null {
  const r = redis as Partial<CacheRedis> | null;
  if (!r || !master || typeof r.zadd !== 'function' || typeof r.zrange !== 'function') return null;
  return new DiscoveryCache(r as CacheRedis, Buffer.from(master, 'utf8'));
}

export class DiscoveryCache {
  constructor(
    private readonly redis: CacheRedis,
    /** Khoá chủ máy chủ — dẫn xuất khoá riêng mỗi workspace (nhãn `discovery-cache`). */
    private readonly master: Buffer,
    private readonly now: () => number = () => Date.now(),
  ) {}

  private wsKey(ws: string): Buffer {
    return createHmac('sha256', this.master).update(`discovery-cache|${ws}`).digest();
  }

  private rootIndex(s: CacheScope): string {
    return `adc:idx:${s.ws}:${s.rootRunId}`;
  }

  key(s: CacheScope): string {
    const mac = createHmac('sha256', this.wsKey(s.ws))
      .update([s.rootRunId, s.userId, s.corpusHash, s.spaceKey, CACHE_ALGO, s.module ?? '', admissibleFingerprint(s.allowedIds), s.query].join('\u0000'))
      .digest('hex');
    return `adc:${s.ws}:${mac}`;
  }

  async get(s: CacheScope): Promise<string[] | null> {
    try {
      const raw = await this.redis.get(this.key(s));
      if (!raw) return null;
      const ids = JSON.parse(raw) as unknown;
      return Array.isArray(ids) && ids.every((x) => typeof x === 'string') ? (ids as string[]) : null;
    } catch {
      return null;
    }
  }

  async set(s: CacheScope, vectorIds: readonly string[]): Promise<void> {
    try {
      const k = this.key(s);
      const idx = this.rootIndex(s);
      await this.redis.set(k, JSON.stringify(vectorIds.slice(0, MAX_IDS)), 'PX', CACHE_TTL_MS);
      await this.redis.zadd(idx, this.now(), k);
      await this.redis.pexpire(idx, CACHE_TTL_MS);
      const n = await this.redis.zcard(idx);
      if (n > CACHE_MAX_PER_ROOT) {
        const old = await this.redis.zrange(idx, 0, n - CACHE_MAX_PER_ROOT - 1);
        if (old.length) await this.redis.del(...old);
        await this.redis.zremrangebyrank(idx, 0, n - CACHE_MAX_PER_ROOT - 1);
      }
    } catch {
      // Cache chỉ là tối ưu — lỗi ghi không đổi kết quả lượt.
    }
  }
}
