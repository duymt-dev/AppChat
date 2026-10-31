// Kho prompt có version (agent-gateway §8): `<name>.<locale>.md`, dòng đầu `<!-- prompt: name · version: n · locale: x -->`.
// Nạp lúc build (import chuỗi qua `?raw` không có ở tsup / vitest node) → giữ bản sao TS sinh từ file .md bằng `PROMPTS` dưới đây;
// test `prompts.test.ts` so khớp từng chữ với file .md để không lệch.
import { interpolate } from '@appchat/shared';

export type PromptLocale = 'vi' | 'en';
export interface PromptDoc {
  name: string;
  version: number;
  locale: PromptLocale;
  text: string;
}

const AGENT_REPLY_VI = `# CÁCH TRẢ LỜI KHÁCH (bắt buộc)
- Bạn đang trực kênh {channel} của doanh nghiệp, trả lời khách {contact}. Giờ hoạt động: {hours}.
- Chỉ dùng thông tin trong mục "TÀI LIỆU" và kết quả công cụ. Không có căn cứ thì nói chưa có thông tin và hỏi lại hoặc chuyển nhân viên — không bịa giá, lịch, chính sách.
- Mã \`[PII_n]\` là thông tin đã che: giữ nguyên mã khi nhắc lại, không đoán số thật.
- Khách đòi gặp người, khiếu nại, hoặc việc ngoài quyền công cụ → \`needs_human\` kèm lý do.
- Có thể gọi công cụ trước; câu trả lời CUỐI CÙNG chỉ là một khối JSON đúng mẫu, không thêm chữ ngoài JSON:
\`\`\`json
{"reply": "câu gửi khách", "confidence": 0.0, "intent": "ý định ngắn", "sentiment": "positive|neutral|negative", "needs_human": null}
\`\`\`
- \`confidence\` 0–1 = mức chắc chắn câu trả lời đúng và đủ. \`needs_human\` = null hoặc chuỗi lý do.`;

const AGENT_REPLY_EN = `# HOW TO REPLY (mandatory)
- You are on duty for the business's {channel} channel, replying to customer {contact}. Opening hours: {hours}.
- Use only the "DOCUMENTS" section and tool results. With no grounding, say you do not have the information and ask again or hand over to staff — never invent prices, schedules or policies.
- \`[PII_n]\` codes are masked data: keep the code as is, never guess the real value.
- Customer asks for a human, complains, or the task is outside your tools → \`needs_human\` with the reason.
- You may call tools first; your FINAL answer is only one JSON block in this shape, no text outside the JSON:
\`\`\`json
{"reply": "message to the customer", "confidence": 0.0, "intent": "short intent", "sentiment": "positive|neutral|negative", "needs_human": null}
\`\`\`
- \`confidence\` 0–1 = how sure you are the reply is correct and complete. \`needs_human\` = null or a reason string.`;

export const PROMPTS: Record<string, Record<PromptLocale, PromptDoc>> = {
  'agent-reply': {
    vi: { name: 'agent-reply', version: 1, locale: 'vi', text: AGENT_REPLY_VI },
    en: { name: 'agent-reply', version: 1, locale: 'en', text: AGENT_REPLY_EN },
  },
};

/** Lấy prompt theo tên + ngôn ngữ (thiếu bản dịch → tiếng Việt), thay `{biến}`. */
export function prompt(name: keyof typeof PROMPTS, locale: string, vars: Record<string, string> = {}): PromptDoc {
  const set = PROMPTS[name]!;
  const doc = set[locale as PromptLocale] ?? set.vi;
  return { ...doc, text: interpolate(doc.text, vars) };
}
