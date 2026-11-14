// Soạn cấu hình agent từ mô tả (§5.3b) + tối ưu prompt: khuôn bản soạn, đọc JSON model trả, và bản tất định (mẫu theo từ khoá) cho các
// lý do fallback đã khai (TIP-021b §3.2). Tool của bản soạn — model hay tất định — luôn ⊆ tập ứng viên discovery đã lọc quyền hiện hành
// (TIP-021b §1.5); không còn danh sách tool tĩnh nào vượt qua discovery. Prompt hệ thống + JSON Schema ở `drafting/generation.ts`.
import { channelRegistry, type ChannelManifest } from '@appchat/channels';
import { can, foldText, isPermissionKey, type AuthzContext } from '@appchat/shared';
import { z } from 'zod';
import { blankConfig, grantableAction, type AgentConfig } from './agent.store';
import { AGENT_INTENTS, OPTIMIZE_SUFFIX, PROMPT_TEMPLATES } from './catalog';

const CONNECTABLE = channelRegistry.manifests().filter((m) => channelRegistry.isConnectable(m.type));

export const ROLES = ['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops', 'custom'] as const;
export const DRAFT_LANGUAGES = ['vi', 'en', 'bilingual', 'auto'] as const;
export const DRAFT_TIERS = ['standard', 'advanced', 'max'] as const;
export const DRAFT_CHANNELS = CONNECTABLE.map((m) => m.type) as [string, ...string[]];

export const OPTIMIZE_SYSTEM = [
  'Bạn tối ưu system prompt cho AI Agent chăm sóc khách hàng.',
  'Giữ nguyên ý người viết, bổ sung: vai trò & phong cách, nhiệm vụ, giới hạn (không bịa giá / chính sách), định dạng trả lời ngắn gọn.',
  'Chỉ trả về prompt đã viết lại, không giải thích.',
].join('\n');

/** Khuôn bản soạn (core kiểm lại sau engine — hai lớp, §2.3). Không key lạ; mặc định / governance / kb_scope không do model đặt. */
export const draftSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    emoji: z.string().max(8).optional(),
    role: z.enum(ROLES).optional(),
    role_label: z.string().max(80).optional(),
    language: z.enum(DRAFT_LANGUAGES).optional(),
    prompt: z.string().max(8000).optional(),
    intents: z.array(z.number().int().min(0).max(AGENT_INTENTS.length - 1)).max(AGENT_INTENTS.length).optional(),
    model_tier: z.enum(DRAFT_TIERS).optional(),
    tools: z.array(z.string()).max(24).optional(),
    channels: z.array(z.enum(DRAFT_CHANNELS)).max(DRAFT_CHANNELS.length).optional(),
    threshold: z.number().int().min(50).max(95).optional(),
  })
  .strict();

/** Tool người ra lệnh được cấp: `agentGrantable` ∩ quyền của họ (§5.3b) — kiểm lại lúc xuất bản / Builder thủ công. */
export const allowedTools = (tools: readonly string[], authz: AuthzContext) =>
  [...new Set(tools)].filter((id) => {
    const p = grantableAction(id)?.permission;
    return !!p && (!isPermissionKey(p) || can(authz, p));
  });

/**
 * JSON đã kiểm schema của engine (chế độ structured) → cấu hình đầy đủ. Tool ngoài tập ứng viên = sai khuôn (null), không âm thầm bỏ.
 * Mặc định / governance / phạm vi kiến thức lấy từ `blankConfig`, không từ model.
 */
export function parseDraft(text: string, candidates: ReadonlySet<string>): AgentConfig | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const r = draftSchema.safeParse(raw);
  if (!r.success) return null;
  const d = r.data;
  const tools = [...new Set(d.tools ?? [])];
  if (tools.some((id) => !candidates.has(id))) return null;
  return {
    ...blankConfig(d.name),
    ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)),
    intents: [...new Set(d.intents ?? [])],
    channels: [...new Set(d.channels ?? [])],
    tools,
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

// Từ khoá (không dấu) → vai trò mặc định; thứ tự = ưu tiên. `tools` chỉ là ưu tiên chọn TRONG tập ứng viên, không phải quyền.
const RULES: Rule[] = [
  { re: /dat lich|lich hen|booking|spa|clinic|nha khoa|salon/, role: 'booking', emoji: '📅', intents: [1, 5], tools: ['appointment.find_slots', 'appointment.create', 'appointment.reschedule', 'conversation.handoff'], template: 2 },
  { re: /cskh|cham soc|ho tro|khieu nai|bao hanh|ticket/, role: 'cs', emoji: '🎧', intents: [2, 3, 4], tools: ['ticket.create', 'ticket.search', 'conversation.handoff', 'conversation.tag'], template: 0 },
  { re: /marketing|chien dich|khuyen mai|noi dung/, role: 'marketing', emoji: '✨', intents: [0, 1], tools: ['campaign.suggest', 'segment.preview', 'contact.tag'], template: 1 },
  { re: /cong no|ke toan|thanh toan|hoa don/, role: 'accounting', emoji: '💡', intents: [6], tools: ['invoice.create', 'conversation.handoff'], template: 0 },
  { re: /ban hang|tu van|bao gia|chot don|sales/, role: 'sales', emoji: '🛍️', intents: [0, 1], tools: ['contact.update', 'contact.set_stage', 'quote.create', 'conversation.handoff'], template: 1 },
];
function channelRegex(m: ChannelManifest): RegExp {
  const words = new Set<string>([
    ...foldText(m.display.name)
      .split(/\s+/)
      .filter((w) => w.length >= 3),
    ...foldText(m.type)
      .split('_')
      .filter((w) => w.length >= 3),
  ]);
  if (m.group === 'web' || m.connect.kind === 'embed') {
    words.add('web');
    words.add('website');
    words.add('widget');
  }
  if (m.group === 'email') {
    words.add('email');
    words.add('mail');
  }
  return new RegExp([...words].join('|'));
}

const CHANNEL_MATCHERS: [RegExp, string][] = CONNECTABLE.map((m) => [channelRegex(m), m.type]);
const DEFAULT_DRAFT_CHANNELS = CONNECTABLE.filter((m) => m.group === 'chat' || m.group === 'web').map((m) => m.type);

function pickTools(preferred: readonly string[], candidates: readonly string[]): string[] {
  const set = new Set(candidates);
  const hit = preferred.filter((id) => set.has(id));
  return hit.length ? hit : candidates.slice(0, 4);
}

/** Bản soạn tất định (không model / không hỗ trợ schema / khuôn sai đã tính usage): tool = ưu tiên của vai trò ∩ ứng viên, không có thì
 *  tối đa 4 ứng viên đầu (đã xếp hạng theo mô tả). Ứng viên rỗng → tools rỗng. */
export function draftFromText(description: string, candidates: readonly string[]): AgentConfig {
  const f = foldText(description);
  const rule = RULES.find((r) => r.re.test(f));
  const channels = CHANNEL_MATCHERS.filter(([re]) => re.test(f)).map(([, c]) => c);
  const name = description.trim().split(/[.,;\n]/)[0]!.slice(0, 60).trim();
  return {
    ...blankConfig(name || 'Agent'),
    role: rule?.role ?? 'custom',
    emoji: rule?.emoji ?? '🤖',
    persona: description.trim().slice(0, 500),
    prompt: PROMPT_TEMPLATES[rule?.template ?? 0]!.text,
    intents: rule?.intents ?? [2],
    tools: pickTools(rule?.tools ?? [], candidates),
    channels: channels.length ? channels : [...DEFAULT_DRAFT_CHANNELS],
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
