// Danh mục action cho Trợ lý (Blueprint §5.2 `find_actions`): action trong quyền người dùng, lọc theo chế độ (Chat chỉ `read`),
// tìm không dấu theo từ khoá trên id / module / mô tả (en) / tên đối tượng + module (vi) — bản đầu không dùng embedding (DC-129).
// Trả id + mô tả + input schema rút gọn (chỉ tên trường, kiểu, bắt buộc) để model gọi `call_action` đúng.
import { registry, type ActionDef } from '@appchat/actions';
import type { JsonSchema } from '@appchat/ai';
import { can, foldText, serverMessages, type AuthzContext, type PermissionKey } from '@appchat/shared';
import { inputSchemaOf } from '../runs/tools';

export type AssistantMode = 'chat' | 'cowork';
export const FIND_LIMIT = 8;

/** Action Trợ lý không bao giờ gọi: quản trị nền tảng, chuyển workspace, quyết định duyệt thay người, xác nhận chuyển khoản gói. */
const HIDDEN = /^(admin\.|workspace\.switch$|approval\.|billing\.)/;

export const entityOf = (actionId: string) => actionId.split('.')[0]!;

/** Người dùng gọi được (quyền + Owner); `self` luôn được, `platform_admin` không qua Trợ lý. */
export function allowedFor(a: ActionDef, authz: AuthzContext): boolean {
  if (HIDDEN.test(a.id) || a.permission === 'platform_admin') return false;
  return a.permission === 'self' || can(authz, a.permission as PermissionKey);
}

export const modeAllows = (a: Pick<ActionDef, 'risk'>, mode: AssistantMode) => mode === 'cowork' || a.risk === 'read';

/**
 * Chữ tìm kiếm (không dấu) theo 3 tầng, khớp tầng trước thì không xét tầng sau: tên (id + tên đối tượng vi / en) → module
 * (key + tên module vi / en) → mô tả (en, viết cho LLM).
 */
function tiersOf(a: ActionDef): [string, string, string] {
  const name = [a.id.replaceAll('.', ' ').replaceAll('_', ' ')];
  const mod: string[] = [a.module];
  for (const l of ['vi', 'en']) {
    const m = serverMessages(l).ai.assistant;
    name.push((m.entity as Record<string, string>)[entityOf(a.id)] ?? '');
    mod.push((m.module as Record<string, string>)[a.module] ?? '');
  }
  return [foldText(name.join(' ')), foldText(mod.join(' ')), foldText(a.description)];
}

const INDEX = new Map(registry.map((a) => [a.id, tiersOf(a)]));

/** Input schema rút gọn: `{ field: 'type' | 'type?' }` (enum → giá trị), đủ để model điền input. */
export function briefSchema(def: ActionDef): Record<string, string> {
  const s = inputSchemaOf(def) as JsonSchema & { properties?: Record<string, JsonSchema>; required?: string[] };
  const req = new Set(s.required ?? []);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(s.properties ?? {})) {
    const p = v as { type?: string | string[]; enum?: unknown[]; anyOf?: { type?: string }[] };
    const t = p.enum ? p.enum.map(String).join('|') : Array.isArray(p.type) ? p.type.join('|') : (p.type ?? p.anyOf?.map((x) => x.type).filter(Boolean).join('|') ?? 'any');
    out[k] = req.has(k) ? t : `${t}?`;
  }
  return out;
}

export interface FoundAction {
  id: string;
  module: string;
  risk: string;
  description: string;
  input: Record<string, string>;
}

/**
 * `find_actions(query, module?)`: mọi từ khoá (không dấu) phải có trong chữ tìm kiếm. Trả nhóm khớp ở tầng sớm nhất: tên đối tượng
 * ("bao gia" → quote.*), rồi module ("ban hang" → sales), rồi mô tả.
 */
export function findActions(authz: AuthzContext, mode: AssistantMode, query: string, module?: string, limit = FIND_LIMIT): FoundAction[] {
  const words = foldText(query).split(/[^a-z0-9_]+/).filter((w) => w.length > 1);
  const tiers: ActionDef[][] = [[], [], []];
  for (const a of registry) {
    if (module && a.module !== module) continue;
    if (!allowedFor(a, authz) || !modeAllows(a, mode)) continue;
    const [name, mod, desc] = INDEX.get(a.id)!;
    const has = (text: string) => words.every((w) => text.includes(w));
    if (has(name)) tiers[0]!.push(a);
    else if (has(`${name} ${mod}`)) tiers[1]!.push(a);
    else if (has(`${name} ${mod} ${desc}`)) tiers[2]!.push(a);
  }
  const hit = tiers.find((t) => t.length) ?? [];
  return hit.slice(0, limit).map((a) => ({ id: a.id, module: a.module, risk: a.risk, description: a.description, input: briefSchema(a) }));
}
