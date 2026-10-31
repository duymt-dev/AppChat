// Output có cấu trúc của agent trực kênh (agent-gateway §7, Blueprint §5.3 bước 4): `{ reply?, confidence 0–1, intent, sentiment,
// needs_human? }`. Model có thể bọc trong ```json hoặc kèm chữ — lấy khối JSON cuối cùng; không đọc được → độ tin cậy 0 (handoff).
import { z } from 'zod';

export const agentReplySchema = z.object({
  reply: z.string().max(4000).nullish(),
  confidence: z.coerce.number().min(0).max(1).catch(0),
  intent: z.string().max(80).catch(''),
  sentiment: z.enum(['positive', 'neutral', 'negative']).catch('neutral'),
  needs_human: z.string().max(300).nullish().catch(null),
});
export type AgentReply = z.infer<typeof agentReplySchema>;

const UNREADABLE: AgentReply = { reply: null, confidence: 0, intent: '', sentiment: 'neutral', needs_human: null };

function lastJsonObject(text: string): string | null {
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]!.trim());
  if (fenced.length) return fenced[fenced.length - 1]!;
  const end = text.lastIndexOf('}');
  if (end < 0) return null;
  // Lùi tìm `{` cân ngoặc với `}` cuối.
  let depth = 0;
  for (let i = end; i >= 0; i--) {
    if (text[i] === '}') depth++;
    else if (text[i] === '{' && --depth === 0) return text.slice(i, end + 1);
  }
  return null;
}

/** Đọc output; `confidence` > 1 hiểu là phần trăm (model hay trả 85). `ok=false` khi không có JSON hợp lệ. */
export function parseAgentReply(text: string): AgentReply & { ok: boolean } {
  const raw = lastJsonObject(text);
  if (!raw) return { ...UNREADABLE, ok: false };
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ...UNREADABLE, ok: false };
  }
  if (obj && typeof obj === 'object' && typeof (obj as { confidence?: unknown }).confidence === 'number' && (obj as { confidence: number }).confidence > 1) {
    (obj as { confidence: number }).confidence /= 100;
  }
  const r = agentReplySchema.safeParse(obj);
  return r.success ? { ...r.data, reply: r.data.reply?.trim() || null, ok: true } : { ...UNREADABLE, ok: false };
}
