// Lắp lớp bảo vệ HTTP chung (TIP-045b annex B) theo thứ tự: header bảo mật (helmet) → CORS (origin app chính xác, preflight) →
// giới hạn tốc độ chung (Redis cửa sổ trượt). Dùng chung main (bootstrap.ts) và harness test để hai nơi cùng một chuỗi. Không có Redis
// (test đơn vị không dựng Redis) → bỏ bước giới hạn, header + CORS vẫn áp.
import type { INestApplication } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AccessTokens, CLOCK, ENV_SOURCE, LOGGER, REDIS, SlidingRateLimiter, type AppLogger, type Clock } from '@appchat/core';
import { apiRateLimit, trustedProxies, type ApiRateRules } from './api-rate-limit.guard';
import { allowedOrigins, corsMiddleware, securityHeaders } from './cors-policy';

/** `rules` chỉ để harness test nới ngưỡng cho các bộ test nghiệp vụ (mỗi file một user, gọi dồn); production luôn dùng API_RATE_RULES. */
export function applySecurity(app: INestApplication, src?: Record<string, string | undefined>, rules?: ApiRateRules): ReadonlySet<string> {
  const env = src ?? app.get<Record<string, string | undefined>>(ENV_SOURCE, { strict: false }) ?? process.env;
  const origins = allowedOrigins(env);
  app.getHttpAdapter().getInstance().disable?.('x-powered-by');
  app.use(securityHeaders(origins, env.NODE_ENV === 'production'));
  app.use(corsMiddleware(origins));
  const redis = app.get<Redis | undefined>(REDIS, { strict: false });
  const tokens = app.get(AccessTokens, { strict: false }) as AccessTokens | undefined;
  if (redis && tokens) {
    const clock = app.get<Clock>(CLOCK, { strict: false });
    // Cửa sổ giới hạn theo giờ thật; hạn token theo đồng hồ của app (test dùng đồng hồ giả).
    app.use(apiRateLimit({ limiter: new SlidingRateLimiter(redis), tokens, now: () => clock.now().getTime(), trusted: trustedProxies(env), log: app.get<AppLogger>(LOGGER), ...(rules ? { rules } : {}) }));
  }
  return origins;
}
