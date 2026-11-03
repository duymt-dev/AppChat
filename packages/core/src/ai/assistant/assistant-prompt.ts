// System prompt của Trợ lý (Blueprint §5.2): prompt `assistant` có version (packages/ai/src/prompts) + vai trò / quyền người dùng,
// chế độ, màn đang mở + bản ghi đang xem (`context` từ FE), agent đang chạy, quy tắc xác nhận / hoàn tác. Ngôn ngữ theo `user.locale`.
// Dựng lại được từ `ai_run.input` (chạy tiếp sau xác nhận / duyệt ở process khác).
import { prompt } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { serverMessages, type AuthzContext } from '@appchat/shared';
import type { AssistantMode } from './catalog';

export interface AssistantContext {
  route?: string;
  entity?: string;
  id?: string;
  selection?: string[];
  /** Khung đang hiện câu trả lời (TIP-023c, D55): `drawer` (khung hẹp theo màn) → cây gọn; mặc định `assistant`. */
  surface?: 'drawer' | 'assistant';
}

/** Lưu ở `ai_run.input` của run `assistant` — đủ dựng lại system prompt + tool khi chạy tiếp. */
export interface AssistantRunInput {
  text: string;
  mode: AssistantMode;
  session_id: string;
  locale: string;
  user_name: string;
  role: string;
  context?: AssistantContext;
  attachments?: { id: string; name: string }[];
}

const AGENTS_IN_PROMPT = 12;

export function contextLine(c: AssistantContext | undefined, attachments: AssistantRunInput['attachments'], fallback: string): string {
  const lines: string[] = [];
  if (c?.route) lines.push(`- route: ${c.route.slice(0, 200)}`);
  if (c?.entity && c.id) lines.push(`- ${c.entity.slice(0, 40)}: ${c.id.slice(0, 80)}`);
  if (c?.selection?.length) lines.push(`- selection: ${c.selection.slice(0, 20).join(', ')}`);
  if (attachments?.length) lines.push(`- attachments: ${attachments.map((a) => a.name).join(', ')}`);
  return lines.length ? lines.join('\n') : fallback;
}

export function permissionLine(authz: AuthzContext, ownerText: string): string {
  if (authz.isOwner) return ownerText;
  return [...authz.permissions].sort().join(', ') || '—';
}

export async function agentsLine(db: Pick<TenantDb, 'aiAgent'>, none: string): Promise<string> {
  const rows = await db.aiAgent.findMany({
    where: { status: 'active', deletedAt: null, publishedVersion: { gt: 0 } },
    orderBy: { updatedAt: 'desc' },
    take: AGENTS_IN_PROMPT,
    select: { id: true, name: true, role: true },
  });
  return rows.length ? rows.map((a) => `- ${a.name} (role: ${a.role}, id: ${a.id})`).join('\n') : none;
}

/** Màn đang mở = đoạn đầu của route (`/customers/123` → `customers`). */
export function screenOf(route: string | undefined): string {
  return route?.split(/[/?#]/).find(Boolean)?.slice(0, 40) ?? 'assistant';
}

export async function assistantSystem(db: Pick<TenantDb, 'aiAgent'>, input: AssistantRunInput, authz: AuthzContext): Promise<string> {
  const m = serverMessages(input.locale).ai.assistant;
  const base = prompt('assistant', input.locale, {
    user: input.user_name,
    role: input.role,
    mode: input.mode,
    mode_rules: m.mode[input.mode],
    permissions: permissionLine(authz, m.owner),
    context: contextLine(input.context, input.attachments, m.noContext),
    agents: await agentsLine(db, m.noAgents),
  }).text;
  const ui = prompt('genui', input.locale, { surface: input.context?.surface ?? 'assistant', screen: screenOf(input.context?.route) }).text;
  return `${base}

${ui}`;
}
