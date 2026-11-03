// Env của domain ai (ops §2.1 — validate lúc boot). `AI_ENGINE`: `sdk` (router theo `llm_provider` / `model_route`) | `mock`
// (model giả theo kịch bản — Q-001 chưa có key; test / dev / E2E, cấm production). Seed provider (tuỳ chọn, không commit key):
// `LLM_SEED_PROVIDER_KEY` + `LLM_SEED_KIND` + `LLM_SEED_BASE_URL` + `LLM_SEED_API_KEY` + `LLM_SEED_MODEL` (+ đơn giá) → boot ghi
// provider + route ba mức + model_price nếu provider đó chưa có (đổi sau qua Quản trị nền tảng — TIP-040).
import { z } from 'zod';

export const aiEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    AI_ENGINE: z.enum(['sdk', 'mock']).default('sdk'),
    /** Lượt Trợ lý: `queue` — API claim + outbox, ROLE=ai chạy (TIP-023c); `inline` — chạy ngay trong API (test integration không có worker). */
    ASSISTANT_DISPATCH: z.enum(['queue', 'inline']).default('queue'),
    LLM_SEED_PROVIDER_KEY: z.string().regex(/^[a-z0-9_-]{2,40}$/).optional(),
    LLM_SEED_KIND: z.enum(['anthropic', 'openai', 'google', 'deepseek', 'openai_compatible']).default('openai_compatible'),
    LLM_SEED_BASE_URL: z.string().url().optional(),
    LLM_SEED_API_KEY: z.string().min(1).optional(),
    LLM_SEED_MODEL: z.string().min(1).optional(),
    LLM_SEED_CREDITS_PER_1K_IN: z.coerce.number().min(0).default(1),
    LLM_SEED_CREDITS_PER_1K_OUT: z.coerce.number().min(0).default(3),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV === 'production' && e.AI_ENGINE === 'mock') ctx.addIssue({ code: 'custom', path: ['AI_ENGINE'], message: 'mock cấm ở production' });
    if (e.LLM_SEED_PROVIDER_KEY && (!e.LLM_SEED_API_KEY || !e.LLM_SEED_MODEL)) ctx.addIssue({ code: 'custom', path: ['LLM_SEED_API_KEY'], message: 'seed cần key + model' });
    if (e.LLM_SEED_KIND === 'openai_compatible' && e.LLM_SEED_PROVIDER_KEY && !e.LLM_SEED_BASE_URL) ctx.addIssue({ code: 'custom', path: ['LLM_SEED_BASE_URL'], message: 'openai_compatible cần base url' });
  });

export type AiEnv = z.infer<typeof aiEnv>;
/** Token DI của env ai (AiModule cấp). */
export const AI_ENV = Symbol('AI_ENV');

/** Sai cấu hình → dừng boot, chỉ nêu tên biến (không in giá trị). */
export function readAiEnv(source: Record<string, string | undefined>): AiEnv {
  const r = aiEnv.safeParse(source);
  if (!r.success) throw new Error(`Biến môi trường không hợp lệ: ${[...new Set(r.error.issues.map((i) => String(i.path[0])))].join(', ')}`);
  return r.data;
}
