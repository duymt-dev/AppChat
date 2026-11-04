// Rate limit trên Redis (ops §3.2): `RateLimiter` cửa sổ cố định (OTP / widget / ký — INCR + PEXPIRE lần đầu) và `SlidingRateLimiter`
// cửa sổ trượt cho giới hạn chung theo user / IP (TIP-045b). Vượt → RATE_LIMITED 429 kèm retry_after (giây). Khoá không chứa PII thô: chỗ gọi băm email / IP.
import { AppError } from '@appchat/shared';

export interface CounterStore {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
  pttl(key: string): Promise<number>;
}

export interface RateRule {
  /** Nhóm luật, vd. `otp:email`. */
  name: string;
  limit: number;
  windowMs: number;
}

export class RateLimiter {
  constructor(private readonly store: CounterStore) {}

  /** Tăng bộ đếm; vượt `limit` → ném RATE_LIMITED (fields.retry_after = giây còn lại). */
  async hit(rule: RateRule, subject: string): Promise<void> {
    const key = `rl:${rule.name}:${subject}`;
    const n = await this.store.incr(key);
    if (n === 1) await this.store.pexpire(key, rule.windowMs);
    if (n > rule.limit) {
      const ttl = await this.store.pttl(key);
      const retry = Math.max(1, Math.ceil((ttl > 0 ? ttl : rule.windowMs) / 1000));
      throw new AppError('RATE_LIMITED', 429, { retry_after: String(retry) });
    }
  }
}

/** Redis tối thiểu cho cửa sổ trượt (một lệnh Lua nguyên tử — ioredis `eval`). */
export interface SlidingStore {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
}

// Cửa sổ trượt trên sorted set: xoá mốc cũ hơn cửa sổ → đếm → còn chỗ thì ghi mốc hiện tại (thành viên duy nhất) → hết hạn khoá =
// cửa sổ. Vượt: trả về số ms tới khi mốc cũ nhất rời cửa sổ. Một lệnh EVAL = nguyên tử giữa các instance API.
const SLIDING_LUA = `
local key, now, win, limit, member = KEYS[1], tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - win)
local n = redis.call('ZCARD', key)
if n >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  return { 0, math.max(1, (tonumber(oldest[2]) + win) - now) }
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, win)
return { 1, 0 }`;

/**
 * Giới hạn cửa sổ trượt chung (TIP-045b annex B, ops §3.2): đọc 600 / phút / user, action 120 / phút / user, trang công khai 30 / phút / IP.
 * Vượt → RATE_LIMITED 429 + retry_after (giây). Redis lỗi → ném lỗi (người gọi quyết định fail 503 cho đường được bảo vệ, không tắt giới hạn).
 */
export class SlidingRateLimiter {
  private seq = 0;

  constructor(
    private readonly store: SlidingStore,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async hit(rule: RateRule, subject: string): Promise<void> {
    const at = this.now();
    const member = `${at}-${process.pid}-${(this.seq = (this.seq + 1) % 1_000_000)}`;
    const r = (await this.store.eval(SLIDING_LUA, 1, `rl2:${rule.name}:${subject}`, at, rule.windowMs, rule.limit, member)) as [number, number];
    if (Number(r[0]) !== 1) throw new AppError('RATE_LIMITED', 429, { retry_after: String(Math.max(1, Math.ceil(Number(r[1]) / 1000))) });
  }
}

/** Ngưỡng chung (annex B) — OTP / widget / ký giữ luật riêng chặt hơn. */
export const API_RATE_RULES = {
  read: { name: 'api:read', limit: 600, windowMs: 60_000 },
  action: { name: 'api:action', limit: 120, windowMs: 60_000 },
  public: { name: 'api:public', limit: 30, windowMs: 60_000 },
} as const satisfies Record<string, RateRule>;
