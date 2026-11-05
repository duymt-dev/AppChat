// Quyền theo trường trên mock (TIP-045b annex C) — cùng luật với server (packages/core/src/authz/fields): vai trò mock hiện tại thấy key
// tuỳ biến nào (`fieldsForRole`), giá vốn sản phẩm ẩn khi thiếu `catalog.cost_view` (bỏ khoá + `hidden_fields`, không '0'), lọc `cf.*`
// trên key không được thấy → 422 FIELD_FORBIDDEN trước khi lọc. Bọc kết quả GET của route thực thể; route khác giữ nguyên.
import { ApiRequestError, ROLE_DEFS, fieldsForRole, type CustomFieldDef } from '@appchat/shared';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { customDefs } from './custom-values';

type Row = Record<string, unknown>;

/** Tiền tố đường dẫn → thực thể có trường tuỳ biến. */
const ENTITY_OF: [RegExp, string][] = [
  [/^\/contacts(\/|$)/, 'contact'],
  [/^\/products(\/|$)/, 'product'],
  [/^\/quotes(\/|$)/, 'quote'],
  [/^\/orders(\/|$)/, 'order'],
  [/^\/tickets(\/|$)/, 'ticket'],
  [/^\/calendar(\/|$)/, 'appointment'],
];

/** Trường hệ thống ràng buộc quyền (giống SYSTEM_FIELD_BINDINGS phía server). */
const SYSTEM: Record<string, Record<string, string>> = { product: { cost: 'catalog.cost_view' } };

const entityOf = (path: string) => ENTITY_OF.find(([re]) => re.test(path))?.[1];

function view(db: MockDb, entity: string) {
  const owner = db.role === 'owner';
  const perms: readonly string[] = ROLE_DEFS[db.role].permissions;
  const visible = new Set(fieldsForRole(customDefs(db, entity) as CustomFieldDef[], db.role).map((f) => f.key));
  const hidden = owner ? [] : Object.entries(SYSTEM[entity] ?? {}).filter(([, p]) => !perms.includes(p)).map(([f]) => f);
  return { visible, hidden };
}

function project(v: ReturnType<typeof view>, x: unknown, depth = 0): unknown {
  if (depth > 4 || x === null || typeof x !== 'object') return x;
  if (Array.isArray(x)) return x.map((y) => project(v, y, depth + 1));
  const r = x as Row;
  // Chỉ chiếu object giống bản ghi (có id); bao `{ data, meta }` đi xuống.
  if (!('id' in r)) return Object.fromEntries(Object.entries(r).map(([k, y]) => [k, project(v, y, depth + 1)]));
  const out: Row = { ...r };
  if (out.custom && typeof out.custom === 'object') out.custom = Object.fromEntries(Object.entries(out.custom as Row).filter(([k]) => v.visible.has(k)));
  const gone = v.hidden.filter((f) => f in out);
  for (const f of gone) delete out[f];
  if (gone.length) out.hidden_fields = gone;
  return out;
}

/** Ném 422 khi lọc `cf.<key>` không được thấy (cùng mã cho key không tồn tại). */
export function assertMockQueryFields(db: MockDb, entity: string, params: Record<string, unknown>) {
  const v = view(db, entity);
  const bad = Object.keys(params).filter((k) => k.startsWith('cf.') && params[k] && !v.visible.has(k.slice(3)));
  if (bad.length) throw new ApiRequestError(422, { code: 'FIELD_FORBIDDEN', message: 'FIELD_FORBIDDEN', fields: Object.fromEntries(bad.map((k) => [k, 'forbidden'])) });
}

/** Bọc route GET theo đường dẫn: kiểm lọc rồi chiếu kết quả. */
export function withFieldPolicy(path: string, route: MockRoute): MockRoute {
  const entity = entityOf(path);
  if (!entity) return route;
  return (db, p) => {
    assertMockQueryFields(db, entity, p);
    return project(view(db, entity), route(db, p));
  };
}
