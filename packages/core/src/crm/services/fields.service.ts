// Trường dữ liệu (D56, Cài đặt › Trường dữ liệu + modal "Trường mở rộng" ở Khách hàng): một nguồn `custom_field_def`.
// Trường hệ thống (`sys`) seed từ SYSTEM_FIELDS (tự bù khi đọc nếu thiếu — workspace tạo trước TIP-015). Options lưu mảng,
// trả "/"-ngăn cách như FE / action.
import { AppError, CUSTOM_FIELD_ENTITIES, CUSTOM_FIELD_PLACES, NEW_FIELD_PLACES, SYSTEM_FIELDS, foldText, keyFromLabel, type CustomFieldDef, type CustomFieldEntity, type CustomFieldPlace } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';

type Db = Pick<TenantTx, 'customFieldDef'>;

const SEP = /\s*\/\s*/;
const toOptions = (s: string | undefined) => (s ?? '').split(SEP).map((x) => x.trim()).filter(Boolean);

interface DefRow {
  key: string;
  label: string;
  type: string;
  options: unknown;
  required: boolean;
  ai: boolean;
  sys: boolean;
  roles: string[];
  condition: string;
  visibleIn: unknown;
}

export function toDef(r: DefRow): CustomFieldDef {
  const vis = (r.visibleIn ?? {}) as Partial<Record<CustomFieldPlace, boolean>>;
  return {
    key: r.key,
    label: r.label,
    type: r.type,
    options: Array.isArray(r.options) ? (r.options as string[]).join('/') : '',
    required: r.required,
    ai: r.ai,
    sys: r.sys,
    visible_in: Object.fromEntries(CUSTOM_FIELD_PLACES.map((p) => [p, !!vis[p]])) as Record<CustomFieldPlace, boolean>,
    roles: r.roles,
    condition: r.condition,
  };
}

/** Seed trường hệ thống của mọi entity (idempotent theo (entity, key)). */
export async function seedSystemFields(tx: Db, now: Date): Promise<void> {
  for (const entity of CUSTOM_FIELD_ENTITIES) {
    for (const [i, f] of SYSTEM_FIELDS[entity].entries()) {
      const data = { label: f.label, type: f.type, options: toOptions(f.options), required: f.required, sys: true, condition: f.condition, sort: i, visibleIn: f.visible_in };
      await tx.customFieldDef.upsert({
        where: { entity_key: { entity, key: f.key } },
        create: { id: uuidv7(now.getTime()), entity, key: f.key, ...data },
        update: {},
      });
    }
  }
}

const SELECT = { key: true, label: true, type: true, options: true, required: true, ai: true, sys: true, roles: true, condition: true, visibleIn: true } as const;

/** Định nghĩa còn hiệu lực của entity (hệ thống trước, theo `sort`). */
export async function fieldDefs(db: Db, entity: CustomFieldEntity): Promise<CustomFieldDef[]> {
  const rows = await db.customFieldDef.findMany({ where: { entity, deletedAt: null }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], select: SELECT });
  return rows.map(toDef);
}

/** Đọc cho màn Cài đặt: bù seed hệ thống nếu workspace chưa có (tạo trước TIP-015). */
export async function fieldsData(db: Db, entity: CustomFieldEntity, now: Date) {
  if (!(await db.customFieldDef.count({ where: { sys: true } }))) await seedSystemFields(db, now);
  const counts = Object.fromEntries(
    (await db.customFieldDef.groupBy({ by: ['entity'], where: { deletedAt: null }, _count: { _all: true } })).map((g) => [g.entity, g._count._all]),
  );
  return { data: await fieldDefs(db, entity), counts: Object.fromEntries(CUSTOM_FIELD_ENTITIES.map((e) => [e, counts[e] ?? 0])) };
}

export interface DefineInput {
  entity: CustomFieldEntity;
  label: string;
  type: string;
  options?: string;
  group?: string;
  required?: boolean;
  ai?: boolean;
  visible_in?: Partial<Record<CustomFieldPlace, boolean>>;
  roles?: string[];
  condition?: string;
}

/** Thêm trường tuỳ biến: nhãn trùng (không dấu) → 409 `{ label: 'duplicate' }`; khoá từ nhãn, trùng thì thêm hậu tố. */
export async function defineField(db: Db, i: DefineInput, now: Date): Promise<string> {
  const all = await db.customFieldDef.findMany({ where: { entity: i.entity }, select: { key: true, label: true, deletedAt: true, sort: true } });
  if (all.some((f) => !f.deletedAt && foldText(f.label) === foldText(i.label))) throw new AppError('CONFLICT', 409, { label: 'duplicate' });
  const base = keyFromLabel(i.label);
  const taken = new Set(all.map((f) => f.key));
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base.slice(0, 36)}_${n}`;
  await db.customFieldDef.create({
    data: {
      id: uuidv7(now.getTime()),
      entity: i.entity,
      key,
      label: i.label.trim(),
      type: i.type,
      options: toOptions(i.options),
      group: i.group ?? null,
      required: !!i.required,
      ai: !!i.ai,
      roles: i.roles ?? [],
      condition: i.condition ?? '',
      sort: Math.max(-1, ...all.map((f) => f.sort)) + 1,
      visibleIn: { ...NEW_FIELD_PLACES, ...i.visible_in },
    },
  });
  return key;
}
