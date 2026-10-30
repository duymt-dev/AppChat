// Rate limit cửa sổ cố định trên Redis (ops §3.2): INCR + PEXPIRE lần đầu. Vượt → RATE_LIMITED 429 kèm retry_after (giây).
// Khoá không chứa PII thô: chỗ gọi băm email / IP trước khi truyền `subject`.
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
