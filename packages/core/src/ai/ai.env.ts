// Env của domain ai (ops §2.1 — validate lúc boot). `AI_ENGINE`: `sdk` (router theo `llm_provider` / `model_route`) | `mock`
// (model giả theo kịch bản — Q-001 chưa có key; test / dev / E2E, cấm production). Seed provider (tuỳ chọn, không commit key):
// `LLM_SEED_PROVIDER_KEY` + `LLM_SEED_KIND` + `LLM_SEED_BASE_URL` + `LLM_SEED_API_KEY` + `LLM_SEED_MODEL` (+ đơn giá) → boot ghi
// provider + route ba mức + model_price nếu provider đó chưa có (đổi sau qua Quản trị nền tảng — TIP-040).
// Embed riêng (TIP-020e, DC-305): `EMBED_SEED_PROVIDER_KEY` + `EMBED_SEED_KIND` + `EMBED_SEED_BASE_URL` (chỉ openai_compatible) +
// `EMBED_SEED_API_KEY` + `EMBED_SEED_MODEL` (1536 chiều) + `EMBED_SEED_CREDITS_PER_1K` → provider + route `embed` + đơn giá khi chưa có.
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
    EMBED_SEED_PROVIDER_KEY: z.string().regex(/^[a-z0-9_-]{2,40}$/).optional(),
    EMBED_SEED_KIND: z.enum(['openai', 'openai_compatible']).default('openai'),
    EMBED_SEED_BASE_URL: z.string().url().optional(),
    EMBED_SEED_API_KEY: z.string().min(1).optional(),
    EMBED_SEED_MODEL: z.string().min(1).default('text-embedding-3-small'),
    EMBED_SEED_CREDITS_PER_1K: z.coerce.number().min(0).default(0.1),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV === 'production' && e.AI_ENGINE === 'mock') ctx.addIssue({ code: 'custom', path: ['AI_ENGINE'], message: 'mock cấm ở production' });
    if (e.LLM_SEED_PROVIDER_KEY && (!e.LLM_SEED_API_KEY || !e.LLM_SEED_MODEL)) ctx.addIssue({ code: 'custom', path: ['LLM_SEED_API_KEY'], message: 'seed cần key + model' });
    if (e.LLM_SEED_KIND === 'openai_compatible' && e.LLM_SEED_PROVIDER_KEY && !e.LLM_SEED_BASE_URL) ctx.addIssue({ code: 'custom', path: ['LLM_SEED_BASE_URL'], message: 'openai_compatible cần base url' });
    if (e.EMBED_SEED_PROVIDER_KEY && !e.EMBED_SEED_API_KEY) ctx.addIssue({ code: 'custom', path: ['EMBED_SEED_API_KEY'], message: 'seed embed cần key' });
    if (e.EMBED_SEED_KIND === 'openai_compatible' && e.EMBED_SEED_PROVIDER_KEY && !e.EMBED_SEED_BASE_URL) ctx.addIssue({ code: 'custom', path: ['EMBED_SEED_BASE_URL'], message: 'openai_compatible cần base url' });
  });

export type AiEnv = z.infer<typeof aiEnv>;
/** Token DI của env ai (AiModule cấp). */
export const AI_ENV = Symbol('AI_ENV');

/** Sai cấu hình → dừng boot, chỉ nêu tên biến (không in giá trị). */
export function readAiEnv(source: Record<string, string | undefined>): AiEnv {
  // Biến khai trống trong .env (mẫu `.env.example`) = chưa cấu hình — không để chuỗi rỗng đè giá trị mặc định / làm hỏng regex.
  const r = aiEnv.safeParse(Object.fromEntries(Object.entries(source).filter(([k, v]) => !(/^(LLM|EMBED)_SEED_/.test(k) && v === ''))));
  if (!r.success) throw new Error(`Biến môi trường không hợp lệ: ${[...new Set(r.error.issues.map((i) => String(i.path[0])))].join(', ')}`);
  return r.data;
}
