// Khuôn trường tuỳ biến theo workspace cho model (TIP-023b SPEC A.5, D56): ô `custom` của action (record mở) → ô con theo định nghĩa HIỆN
// HÀNH — chỉ trường `ai = true`, không `sys`, còn hiệu lực, vai trò người gọi được thấy / ghi; kiểu / lựa chọn / bắt buộc lấy từ định nghĩa.
// Nhãn trường là dữ liệu người dùng nhập → chỉ đưa key + kiểu + lựa chọn (không đưa nhãn như chỉ dẫn cho model). Không cache: đọc mỗi lần
// dựng khuôn (danh mục nhỏ, index (entity, sort)). Execute vẫn validate lại theo định nghĩa lúc chạy (validateCustomValues ở domain) —
// đổi bắt buộc / lựa chọn / quyền thấy sau preview → token cũ không chạy được input cũ (VALIDATION_FAILED / re-preview).
import type { ActionDef } from '@appchat/actions';
import { CUSTOM_FIELD_ENTITIES, fieldOptions, fieldsForRole, type CustomFieldDef, type CustomFieldEntity } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { fieldDefs } from '../../crm/services/fields.service';
import type { Brief } from './schema-brief';

type Db = Pick<TenantTx, 'customFieldDef'>;

/** Thực thể mang trường tuỳ biến của action (`contact.update` → contact); action không thuộc thực thể có trường → null. */
export function customEntityOf(def: Pick<ActionDef, 'id'>): CustomFieldEntity | null {
  const e = def.id.split('.')[0]!;
  return (CUSTOM_FIELD_ENTITIES as readonly string[]).includes(e) ? (e as CustomFieldEntity) : null;
}

/** Trường AI được dùng với vai trò này (khuôn = đúng tập execute chấp nhận, thu hẹp thêm theo `ai`). */
export const aiFields = (defs: CustomFieldDef[], role: string) => fieldsForRole(defs, role).filter((f) => f.ai);

function typeOf(f: CustomFieldDef): Brief {
  const opts = fieldOptions(f);
  if ((f.type === 'picklist' || f.type === 'tier') && opts.length) return opts.join('|');
  if (f.type === 'multi') return [opts.length ? opts.join('|') : 'string'];
  if (f.type === 'tags') return ['string'];
  if (f.type === 'number') return 'number';
  if (f.type === 'currency') return 'string(VND digits)';
  if (f.type === 'date') return 'string(YYYY-MM-DD)';
  return 'string';
}

/** Khuôn ô `custom`: `{ key | key?: kiểu }` (bắt buộc theo định nghĩa hiện hành). */
export function customBrief(defs: CustomFieldDef[], role: string): Record<string, Brief> {
  return Object.fromEntries(aiFields(defs, role).map((f) => [f.required ? f.key : `${f.key}?`, typeOf(f)]));
}

/** Tìm ô `custom` trong khuôn (gốc hoặc trong `patch`) và thay bằng khuôn theo workspace; không có trường AI → bỏ ô. */
function inject(brief: Record<string, Brief>, custom: Record<string, Brief>): Record<string, Brief> {
  const out: Record<string, Brief> = {};
  for (const [k, v] of Object.entries(brief)) {
    const name = k.replace(/\?$/, '');
    if (name === 'custom') {
      if (Object.keys(custom).length) out[k] = custom;
    } else if (name === 'patch' && v && typeof v === 'object' && !Array.isArray(v)) out[k] = inject(v, custom);
    else out[k] = v;
  }
  return out;
}

/** Khuôn input của action + trường tuỳ biến hiện hành của workspace theo vai trò người gọi. */
export async function withCustomSchema(db: Db, def: Pick<ActionDef, 'id'>, brief: Record<string, Brief>, role: string): Promise<Record<string, Brief>> {
  const entity = customEntityOf(def);
  if (!entity || !JSON.stringify(brief).includes('custom')) return brief;
  return inject(brief, customBrief(await fieldDefs(db, entity), role));
}

/** Giá trị `custom` (gốc hoặc `patch.custom`) của input. */
const customOf = (input: unknown): Record<string, unknown> | undefined => {
  const i = (input ?? {}) as { custom?: unknown; patch?: { custom?: unknown } };
  const c = i.custom ?? i.patch?.custom;
  return c && typeof c === 'object' && !Array.isArray(c) ? (c as Record<string, unknown>) : undefined;
};

/**
 * Trợ lý / agent chỉ ghi trường `ai = true` (D56): key ngoài tập đó → lỗi `custom.<key>: not_ai` trước executor. Kiểu / bắt buộc / quyền
 * vai trò do domain kiểm lại lúc execute theo định nghĩa hiện hành.
 */
export async function aiCustomErrors(db: Db, def: Pick<ActionDef, 'id'>, input: unknown, role: string): Promise<Record<string, string>> {
  const entity = customEntityOf(def);
  const values = customOf(input);
  if (!entity || !values) return {};
  const ok = new Set(aiFields(await fieldDefs(db, entity), role).map((f) => f.key));
  return Object.fromEntries(Object.keys(values).filter((k) => !ok.has(k)).map((k) => [`custom.${k}`, 'not_ai']));
}
