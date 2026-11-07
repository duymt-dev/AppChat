// Soạn cấu hình agent từ mô tả (§5.3b) + tối ưu prompt: prompt hệ thống, đọc JSON model trả, và bản tất định khi model trả không
// đúng định dạng (model giả Q-001 / model lỗi) — suy vai trò / kênh / ý định theo từ khoá, prompt theo mẫu. Tool gợi ý luôn lọc
// theo `agentGrantable` ∩ quyền người ra lệnh.
import { can, foldText, isPermissionKey, type AuthzContext } from '@appchat/shared';
import { z } from 'zod';
import { blankConfig, grantableAction, type AgentConfig } from './agent.store';
import { AGENT_INTENTS, OPTIMIZE_SUFFIX, PROMPT_TEMPLATES } from './catalog';

const ROLES = ['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops', 'custom'] as const;

export const DRAFT_SYSTEM = [
  'Bạn soạn cấu hình AI Agent cho doanh nghiệp dịch vụ nhỏ từ mô tả của người dùng.',
  'Chỉ trả về MỘT khối JSON hợp lệ, không giải thích, theo khung:',
  '{"name":string,"emoji":string,"role":"sales|cs|booking|marketing|accounting|ops|custom","role_label":string,"language":"vi|en|bilingual|auto",',
  '"prompt":string,"intents":number[],"model_tier":"standard|advanced|max","tools":string[],"channels":string[],"threshold":number(50-95)}',
  `Danh sách ý định (index): ${AGENT_INTENTS.map((x, i) => `${i}=${x}`).join(', ')}.`,
  'Kênh: zalo_personal, webchat, email. tools là id action (vd. appointment.create, ticket.create, conversation.assign).',
].join('\n');

export const OPTIMIZE_SYSTEM = [
  'Bạn tối ưu system prompt cho AI Agent chăm sóc khách hàng.',
  'Giữ nguyên ý người viết, bổ sung: vai trò & phong cách, nhiệm vụ, giới hạn (không bịa giá / chính sách), định dạng trả lời ngắn gọn.',
  'Chỉ trả về prompt đã viết lại, không giải thích.',
].join('\n');

const draftSchema = z.object({
  name: z.string().trim().min(1).max(80),
  emoji: z.string().max(8).optional(),
  role: z.enum(ROLES).optional(),
  role_label: z.string().max(80).optional(),
  language: z.enum(['vi', 'en', 'bilingual', 'auto']).optional(),
  prompt: z.string().max(8000).optional(),
  intents: z.array(z.number().int().min(0).max(AGENT_INTENTS.length - 1)).optional(),
  model_tier: z.enum(['standard', 'advanced', 'max']).optional(),
  tools: z.array(z.string()).optional(),
  channels: z.array(z.enum(['zalo_personal', 'webchat', 'email'])).optional(),
  threshold: z.number().int().min(50).max(95).optional(),
});

/** Tool người ra lệnh được cấp: `agentGrantable` ∩ quyền của họ (§5.3b). */
export const allowedTools = (tools: readonly string[], authz: AuthzContext) =>
  [...new Set(tools)].filter((id) => {
    const p = grantableAction(id)?.permission;
    return !!p && (!isPermissionKey(p) || can(authz, p));
  });

/** JSON đầu tiên trong câu trả lời của model (có thể nằm trong ```json …```). */
function firstJson(text: string): unknown {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try {
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    return null;
  }
}

export function parseDraft(text: string, authz: AuthzContext): AgentConfig | null {
  const r = draftSchema.safeParse(firstJson(text));
  if (!r.success) return null;
  const d = r.data;
  const base = blankConfig(d.name);
  return {
    ...base,
    ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)),
    tools: allowedTools(d.tools ?? [], authz),
  } as AgentConfig;
}

interface Rule {
  re: RegExp;
  role: AgentConfig['role'];
  emoji: string;
  intents: number[];
  tools: string[];
  template: number;
}

// Từ khoá (không dấu) → vai trò mặc định; thứ tự = ưu tiên.
const RULES: Rule[] = [
  { re: /dat lich|lich hen|booking|spa|clinic|nha khoa|salon/, role: 'booking', emoji: '📅', intents: [1, 5], tools: ['appointment.find_slots', 'appointment.create', 'appointment.reschedule', 'conversation.handoff'], template: 2 },
  { re: /cskh|cham soc|ho tro|khieu nai|bao hanh|ticket/, role: 'cs', emoji: '🎧', intents: [2, 3, 4], tools: ['ticket.create', 'ticket.search', 'conversation.handoff', 'conversation.tag'], template: 0 },
  { re: /marketing|chien dich|khuyen mai|noi dung/, role: 'marketing', emoji: '✨', intents: [0, 1], tools: ['campaign.suggest', 'segment.preview', 'contact.tag'], template: 1 },
  { re: /cong no|ke toan|thanh toan|hoa don/, role: 'accounting', emoji: '💡', intents: [6], tools: ['invoice.create', 'conversation.handoff'], template: 0 },
  { re: /ban hang|tu van|bao gia|chot don|sales/, role: 'sales', emoji: '🛍️', intents: [0, 1], tools: ['contact.update', 'contact.set_stage', 'quote.create', 'conversation.handoff'], template: 1 },
];
const CHANNELS: [RegExp, string][] = [
  [/zalo/, 'zalo_personal'],
  [/web|website|widget/, 'webchat'],
  [/email|mail/, 'email'],
];

/** Bản soạn tất định từ mô tả (model trả không đúng định dạng). */
export function draftFromText(description: string, authz: AuthzContext): AgentConfig {
  const f = foldText(description);
  const rule = RULES.find((r) => r.re.test(f));
  const channels = CHANNELS.filter(([re]) => re.test(f)).map(([, c]) => c);
  const name = description.trim().split(/[.,;\n]/)[0]!.slice(0, 60).trim();
  return {
    ...blankConfig(name || 'Agent'),
    role: rule?.role ?? 'custom',
    emoji: rule?.emoji ?? '🤖',
    persona: description.trim().slice(0, 500),
    prompt: PROMPT_TEMPLATES[rule?.template ?? 0]!.text,
    intents: rule?.intents ?? [2],
    tools: allowedTools(rule?.tools ?? ['conversation.handoff'], authz),
    channels: channels.length ? channels : ['zalo_personal', 'webchat'],
    model_tier: 'advanced',
    threshold: 75,
  };
}

/**
 * Kết quả "Tối ưu prompt": bản model viết lại (đủ dài, khác bản gốc) hoặc bản gốc + khối định dạng (một lần). Câu nhắc lại của
 * model giả (`AI_ENGINE=mock` — "Đã nhận: …", Q-001) không phải bản viết lại.
 */
export function optimizeLocal(prompt: string, model: string): string {
  const m = model.trim();
  if (m.length >= Math.max(40, prompt.trim().length / 2) && m !== prompt.trim() && !m.startsWith('Đã nhận:')) return m.slice(0, 8000);
  const head = OPTIMIZE_SUFFIX.trim().split('\n')[0]!;
  return prompt.includes(head) ? prompt : (prompt + OPTIMIZE_SUFFIX).slice(0, 8000);
}
