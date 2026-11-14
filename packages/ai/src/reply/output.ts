// Output có cấu trúc của agent trực kênh (agent-gateway §7, Blueprint §5.3 bước 4): `{ reply?, confidence 0–1, intent, sentiment,
// needs_human? }`. Model có thể bọc trong ```json hoặc kèm chữ — lấy khối JSON cuối cùng. Model thật hay trả chữ thường (bỏ khung JSON):
// coi cả đoạn là câu trả lời với độ tin cậy `PLAIN_CONFIDENCE` (dưới mọi ngưỡng agent → không tự gửi, thành nháp / gợi ý cho người).
// TIP-020d: `citations` tuỳ chọn ≤ 12 `{ref, claim_start?, claim_end?, quote?}` — `ref` là bí danh tài liệu server cấp (`S1`…), vị trí là
// điểm mã Unicode trên chuỗi `reply` THÔ (trước trim / khôi phục PII) hoặc `quote` = đoạn nguyên văn của `reply` (server tự tính vị trí
// chính xác). `raw_reply` giữ chuỗi thô cho bước ánh xạ; chữ thường (không JSON) không có trích dẫn.
import { z } from 'zod';
import { parseSalesPlan, type SalesPlan } from './sales-plan';

export const MAX_ANSWER_CITATIONS = 12;

/** Một trích dẫn model chọn — chưa được tin: server kiểm bí danh / vị trí / nguồn hiện hành trước khi công bố. */
export const answerCitationSchema = z
  .object({
    ref: z.string().trim().max(12),
    claim_start: z.number().int().min(0).optional(),
    claim_end: z.number().int().min(0).optional(),
    quote: z.string().max(1000).optional(),
  })
  .strict();
export type AnswerCitation = z.infer<typeof answerCitationSchema>;

export const agentReplySchema = z.object({
  reply: z.string().max(4000).nullish(),
  confidence: z.coerce.number().min(0).max(1).catch(0),
  intent: z.string().max(80).catch(''),
  sentiment: z.enum(['positive', 'neutral', 'negative']).catch('neutral'),
  needs_human: z.string().max(300).nullish().catch(null),
  /** Sai khuôn → `invalid` (không âm thầm bỏ — ứng viên mang trích dẫn hỏng không được công bố là có căn cứ). */
  citations: z.array(z.unknown()).max(MAX_ANSWER_CITATIONS * 2).optional().catch(['__invalid__']),
  /** TIP-022c: kế hoạch bán hàng có kiểu — server kiểm + dựng câu tồn / giá (sales-plan.ts). */
  sales_plan: z.unknown().optional(),
});
export type AgentReply = Omit<z.infer<typeof agentReplySchema>, 'citations' | 'sales_plan'> & {
  /** TIP-022c: null = không có kế hoạch bán hàng; `invalid` = có nhưng sai khuôn (chặn tự gửi). */
  sales_plan: SalesPlan | 'invalid' | null;
  /** null = model không trích dẫn; `invalid` = có khối trích dẫn nhưng sai khuôn / quá số lượng. */
  citations: AnswerCitation[] | 'invalid' | null;
  /** Chuỗi `reply` thô của model (chưa trim / chưa khôi phục PII) — gốc toạ độ của trích dẫn. */
  raw_reply: string | null;
};

const UNREADABLE: AgentReply = { reply: null, confidence: 0, intent: '', sentiment: 'neutral', needs_human: null, citations: null, raw_reply: null, sales_plan: null };

function citationsOf(v: unknown[] | undefined): AgentReply['citations'] {
  if (v === undefined || v.length === 0) return null;
  if (v.length > MAX_ANSWER_CITATIONS) return 'invalid';
  const r = z.array(answerCitationSchema).safeParse(v);
  return r.success ? r.data : 'invalid';
}
/** Độ tin cậy khi model trả chữ thường — thấp hơn ngưỡng nhỏ nhất (50%) để không bao giờ tự gửi. */
export const PLAIN_CONFIDENCE = 0.4;

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

/** Chữ thường (không có khung JSON) → câu trả lời độ tin cậy thấp; JSON hỏng / rỗng → `ok=false`. */
function plain(text: string): (AgentReply & { ok: boolean }) | null {
  const t = text.trim();
  if (!t || /[{}]|```/.test(t)) return null;
  return { ...UNREADABLE, reply: t.slice(0, 4000), raw_reply: null, confidence: PLAIN_CONFIDENCE, ok: true };
}

/** Đọc output; `confidence` > 1 hiểu là phần trăm (model hay trả 85). `ok=false` khi không có câu trả lời đọc được. */
export function parseAgentReply(text: string): AgentReply & { ok: boolean } {
  const raw = lastJsonObject(text);
  if (!raw) return plain(text) ?? { ...UNREADABLE, ok: false };
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
  if (!r.success) return { ...UNREADABLE, ok: false };
  const { citations, sales_plan, ...rest } = r.data;
  return { ...rest, reply: rest.reply?.trim() || null, raw_reply: rest.reply ?? null, citations: citationsOf(citations), sales_plan: parseSalesPlan(sales_plan), ok: true };
}
