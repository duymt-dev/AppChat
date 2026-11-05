// Chiếu output action theo quyền trường (TIP-045b annex C): mọi kết quả action (UI, Trợ lý, agent trực kênh, API) đi qua đây sau khi
// parse schema — key tuỳ biến bị ẩn trong mọi object `custom` bị bỏ, trường hệ thống bị ẩn của entity (vd. `cost` của product.*) bị bỏ
// + `hidden_fields`. Không có `custom` / trường ẩn trong output → không đọc DB. Cùng FieldPolicy với REST (policy.ts) — một luật.
import { CUSTOM_FIELD_ENTITIES, type AuthzContext, type CustomFieldEntity } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { hiddenSystemFields } from './entity-bindings';
import { fieldView } from './policy';
import { projectCustom } from './projection';
import type { FieldView } from './types';

const MAX_DEPTH = 8;

/** Entity của action theo tiền tố id (`contact.get` → contact); không thuộc entity có trường tuỳ biến → null. */
export function entityOfAction(actionId: string): CustomFieldEntity | null {
  const e = actionId.split('.')[0]!;
  return (CUSTOM_FIELD_ENTITIES as readonly string[]).includes(e) ? (e as CustomFieldEntity) : null;
}

function needs(v: unknown, hidden: ReadonlySet<string>, depth = 0): boolean {
  if (depth > MAX_DEPTH || v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return v.some((x) => needs(x, hidden, depth + 1));
  return Object.entries(v).some(([k, x]) => k === 'custom' || hidden.has(k) || needs(x, hidden, depth + 1));
}

function walk(v: unknown, fv: FieldView, system: boolean, depth = 0): unknown {
  if (depth > MAX_DEPTH || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => walk(x, fv, system, depth + 1));
  const out: Record<string, unknown> = {};
  const hidden: string[] = [];
  for (const [k, x] of Object.entries(v)) {
    if (k === 'custom' && x && typeof x === 'object' && !Array.isArray(x)) out[k] = projectCustom(fv, x);
    else if (system && fv.hiddenSystem.has(k)) hidden.push(k);
    else out[k] = walk(x, fv, system, depth + 1);
  }
  if (hidden.length) out.hidden_fields = [...new Set([...((out.hidden_fields as string[] | undefined) ?? []), ...hidden])];
  return out;
}

/** Output đã chiếu theo người gọi. Trường hệ thống chỉ bỏ ở action của chính entity đó (tránh trùng tên khoá ở domain khác). */
export async function projectActionOutput<O>(tx: Pick<TenantTx, 'customFieldDef'>, actionId: string, a: AuthzContext, output: O): Promise<O> {
  const entity = entityOfAction(actionId);
  const hidden = entity ? hiddenSystemFields(entity, a) : new Set<string>();
  if (!needs(output, hidden)) return output;
  // `custom` lồng của entity khác (vd. contact trong quote.get) chiếu theo entity của action — định nghĩa theo entity riêng: dùng contact
  // khi action không thuộc entity nào (an toàn: tập rỗng nếu key không phải trường contact → bị bỏ).
  const fv = await fieldView(tx, entity ?? 'contact', a);
  return walk(output, fv, entity !== null) as O;
}
