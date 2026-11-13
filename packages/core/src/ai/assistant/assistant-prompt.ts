// System prompt của Trợ lý (Blueprint §5.2): prompt `assistant` có version (packages/ai/src/prompts) + vai trò / quyền người dùng,
// chế độ, màn đang mở + bản ghi đang xem (`context` từ FE), agent đang chạy, quy tắc xác nhận / hoàn tác. Ngôn ngữ theo `user.locale`.
// Dựng lại được từ `ai_run.input` (chạy tiếp sau xác nhận / duyệt ở process khác).
import { prompt } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { interpolate, serverMessages, type AuthzContext } from '@appchat/shared';
import type { AssistantMode } from './catalog';
import { RECORD_ENTITY_DEFS } from './record-intent/registry';

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
  /** Tệp đã qua guard server (genui/attachments.ts) — chỉ metadata, không nội dung / URL. */
  attachments?: { id: string; name: string; mime?: string; size?: number; handlers?: string[]; hints?: string[] }[];
  /** TIP-023d §5.1: agent đã chọn — id + bản đã xuất bản + mức AI hiệu lực, ghim lúc nhận lượt (server ghi; mọi đường chạy tiếp đọc lại). */
  selected_agent?: { id: string; version: number; tier: string };
  /** TIP-006c: tab đã gửi lượt (định tuyến `ui.command` realtime) — không vào prompt, không phải quyền. */
  tab_id?: string;
}

const AGENTS_IN_PROMPT = 12;

/** Bản ghi có action đọc chuẩn (TIP-023g) → chỉ tên action + khoá id để model đọc theo quyền người gọi (ai:live: model trả lời "chưa tra
 *  được" thay vì đọc). Không kèm dữ liệu bản ghi. */
function recordReadHint(entity: string, id: string): string {
  const def = (RECORD_ENTITY_DEFS as Record<string, { getter: string | null; idKey: string } | undefined>)[entity];
  return def?.getter ? ` (đọc bằng ${def.getter} {"${def.idKey}":"${id.slice(0, 80)}"})` : '';
}

export function contextLine(c: AssistantContext | undefined, attachments: AssistantRunInput['attachments'], fallback: string): string {
  const lines: string[] = [];
  if (c?.route) lines.push(`- route: ${c.route.slice(0, 200)}`);
  if (c?.entity && c.id) lines.push(`- ${c.entity.slice(0, 40)}: ${c.id.slice(0, 80)}${recordReadHint(c.entity, c.id)}`);
  if (c?.selection?.length) lines.push(`- selection: ${c.selection.slice(0, 20).join(', ')}`);
  // `file_id` để model truyền vào action đọc / nhập tệp (transfer.plan, contract.inspect_file…) — id đã qua guard, không URL / nội dung.
  // Tên tệp là dữ liệu người dùng (TIP-023f §2.6): bỏ ký tự điều khiển / ngoặc vuông để không giả được cú pháp ngữ cảnh.
  if (attachments?.length) lines.push(`- attachments: ${attachments.map((a) => `${a.name.slice(0, 120).replace(/[\u0000-\u001f[\]]/g, ' ')}${a.mime ? ` (${a.mime})` : ''} [file_id: ${a.id}]${a.handlers?.length ? ` → ${a.handlers.join('/')}${a.hints?.length ? ` (${a.hints.join('; ')})` : ''}` : ''}`).join(', ')}`);
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
  const sel = input.selected_agent ? await db.aiAgent.findUnique({ where: { id: input.selected_agent.id }, select: { name: true } }) : null;
  const pick = sel ? `

${interpolate(m.selectedAgent, { name: sel.name, id: input.selected_agent!.id })}` : '';
  const ui = prompt('genui', input.locale, { surface: input.context?.surface ?? 'assistant', screen: screenOf(input.context?.route) }).text;
  return `${base}${pick}

${ui}`;
}
