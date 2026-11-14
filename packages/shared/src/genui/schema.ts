// Cây giao diện do Trợ lý ghép (standards/ai/generative-ui.md — D55, DC-227). Danh mục khối ĐÓNG, mọi object `strict` (ô lạ →
// lỗi, không HTML / JS / CSS / URL / màu / px). Số liệu (stat / table / list dữ liệu / progress / chart) chỉ là `$ref` tới output bước
// của run; model chỉ viết chữ, nhãn, bố cục. Nút: `ui` (UiCommand) hoặc `action` (đi qua executor + xác nhận — server phát intent).
// Form gắn `action_id`; ô `secret` do server đánh dấu theo ActionDef / manifest connector — cây của model không được điền giá trị.
import { z } from 'zod';
import { GENUI_LIMITS as L } from './limits';
import { refSchema, type GenUiRef } from './refs';

export const uiCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('navigate'), route: z.string().startsWith('/').max(300) }),
  z.object({ type: z.literal('open'), entity: z.string().max(40), id: z.string().max(80), view: z.enum(['drawer', 'page']).optional() }),
  z.object({ type: z.literal('prefill'), form: z.string().max(60), values: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal('filter'), table: z.string().max(60), filter: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal('highlight'), target: z.string().max(120) }),
]);

export const TONES = ['default', 'brand', 'success', 'warning', 'danger', 'info'] as const;
export const FORMATS = ['text', 'number', 'money', 'percent', 'date', 'datetime'] as const;
export const CHART_KINDS = ['column', 'line', 'funnel'] as const;

const tone = z.enum(TONES);
const format = z.enum(FORMATS);
const label = z.string().trim().min(1).max(L.label);
const key = z.string().regex(/^[a-z_][a-z0-9_]{0,63}$/);
const actionId = z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/).max(80);
const openSpec = z.object({ entity: z.string().max(40), id_key: key }).strict();
const recordId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export type Tone = (typeof TONES)[number];
export type ValueFormat = (typeof FORMATS)[number];
export type UiCommand = z.infer<typeof uiCommandSchema>;

export type ButtonOn = { kind: 'ui'; command: UiCommand } | { kind: 'action'; action_id: string; input: Record<string, unknown> };
export interface StatBlock {
  type: 'stat';
  label: string;
  value: GenUiRef;
  format?: ValueFormat;
  compare?: GenUiRef;
  tone?: Tone;
}
export interface ButtonBlock {
  type: 'button';
  label: string;
  tone?: Tone;
  on: ButtonOn;
}
/**
 * Thẻ gợi ý tạo đơn từ lịch hẹn (TIP-033c §2.2): chỉ id lịch (+ hội thoại tuỳ chọn) — KHÔNG giá, quyền, điều kiện, URL; giá / thuế / tổng
 * và nút tạo do server chiếu theo quyền hiện hành của người xem lúc hiển thị (bộ đọc booking), tạo đơn qua action chuẩn có xem trước.
 */
export interface AppointmentOrderBlock {
  type: 'appointment_order';
  appointment_id: string;
  conversation_id?: string;
}
export interface FormField {
  name: string;
  label?: string;
  value?: unknown;
  secret?: boolean;
}
export type UiBlock =
  | { type: 'stack'; children: UiBlock[] }
  | { type: 'row'; children: UiBlock[] }
  | { type: 'section'; title: string; children: UiBlock[] }
  | { type: 'text'; text: string; tone?: Tone }
  | StatBlock
  | { type: 'stat_group'; stats: StatBlock[] }
  | { type: 'table'; columns: { key: string; label: string; format?: ValueFormat }[]; rows: GenUiRef; open?: { entity: string; id_key: string } }
  | { type: 'list'; title_key?: string; subtitle_key?: string; items: GenUiRef | string[]; open?: { entity: string; id_key: string } }
  | { type: 'progress'; label: string; value: GenUiRef; max?: GenUiRef; tone?: Tone }
  | { type: 'badge'; text: string; tone?: Tone }
  | { type: 'chart'; kind: (typeof CHART_KINDS)[number]; title?: string; data: GenUiRef; x: string; y: string; format?: ValueFormat }
  | ButtonBlock
  | { type: 'button_group'; buttons: ButtonBlock[] }
  | { type: 'form'; action_id: string; title?: string; fields: FormField[]; submit_label?: string }
  | { type: 'qr'; login: GenUiRef; title?: string }
  | AppointmentOrderBlock;
export type UiBlockType = UiBlock['type'];
export interface UiTree {
  version: 1;
  root: UiBlock;
}

const statSchema = z.object({ type: z.literal('stat'), label, value: refSchema, format: format.optional(), compare: refSchema.optional(), tone: tone.optional() }).strict();
const buttonSchema = z
  .object({
    type: z.literal('button'),
    label,
    tone: tone.optional(),
    on: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('ui'), command: uiCommandSchema }).strict(),
      z.object({ kind: z.literal('action'), action_id: actionId, input: z.record(z.string(), z.unknown()) }).strict(),
    ]),
  })
  .strict();
const fieldSchema = z
  .object({
    name: z
      .string()
      .regex(/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/)
      .max(120),
    label: label.optional(),
    value: z.unknown().optional(),
    secret: z.boolean().optional(),
  })
  .strict();

export const uiBlockSchema: z.ZodType<UiBlock> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('stack'), children: z.array(uiBlockSchema).min(1).max(L.blocks) }).strict(),
    z.object({ type: z.literal('row'), children: z.array(uiBlockSchema).min(1).max(L.blocks) }).strict(),
    z.object({ type: z.literal('section'), title: label, children: z.array(uiBlockSchema).min(1).max(L.blocks) }).strict(),
    z.object({ type: z.literal('text'), text: z.string().trim().min(1).max(L.text), tone: tone.optional() }).strict(),
    statSchema,
    z.object({ type: z.literal('stat_group'), stats: z.array(statSchema).min(1).max(L.statGroup) }).strict(),
    z
      .object({
        type: z.literal('table'),
        columns: z.array(z.object({ key, label, format: format.optional() }).strict()).min(1).max(L.tableColumns),
        rows: refSchema,
        open: openSpec.optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal('list'),
        title_key: key.optional(),
        subtitle_key: key.optional(),
        items: z.union([refSchema, z.array(z.string().trim().min(1).max(L.label * 2)).min(1).max(L.listItems)]),
        open: openSpec.optional(),
      })
      .strict(),
    z.object({ type: z.literal('progress'), label, value: refSchema, max: refSchema.optional(), tone: tone.optional() }).strict(),
    z.object({ type: z.literal('badge'), text: label, tone: tone.optional() }).strict(),
    z.object({ type: z.literal('chart'), kind: z.enum(CHART_KINDS), title: label.optional(), data: refSchema, x: key, y: key, format: format.optional() }).strict(),
    buttonSchema,
    z.object({ type: z.literal('button_group'), buttons: z.array(buttonSchema).min(1).max(L.buttonGroup) }).strict(),
    z.object({ type: z.literal('form'), action_id: actionId, title: label.optional(), fields: z.array(fieldSchema).min(1).max(L.formFields), submit_label: label.optional() }).strict(),
    z.object({ type: z.literal('qr'), login: refSchema, title: label.optional() }).strict(),
    z.object({ type: z.literal('appointment_order'), appointment_id: recordId, conversation_id: recordId.optional() }).strict(),
  ]),
) as z.ZodType<UiBlock>;

export const CONTAINER_TYPES = new Set<UiBlockType>(['stack', 'row', 'section']);

/** Con trực tiếp (bố cục → khối con; stat_group → stat; button_group → button). */
export function childrenOf(b: UiBlock): UiBlock[] {
  if (b.type === 'stack' || b.type === 'row' || b.type === 'section') return b.children;
  if (b.type === 'stat_group') return b.stats;
  if (b.type === 'button_group') return b.buttons;
  return [];
}

/** Duyệt cây theo thứ tự trước; `path` = chỉ số con từ gốc ("" = gốc, "0.2") — định danh node cho intent / refs. */
export function walkTree(root: UiBlock, visit: (b: UiBlock, path: string, depth: number) => void, path = '', depth = 1): void {
  visit(root, path, depth);
  childrenOf(root).forEach((c, i) => walkTree(c, visit, path ? `${path}.${i}` : String(i), depth + 1));
}

export function nodeAt(root: UiBlock, path: string): UiBlock | undefined {
  if (path === '') return root;
  let cur: UiBlock | undefined = root;
  for (const s of path.split('.')) {
    if (!/^\d{1,2}$/.test(s) || !cur) return undefined;
    cur = childrenOf(cur)[Number(s)];
  }
  return cur;
}

export const uiTreeSchema: z.ZodType<UiTree> = z
  .object({ version: z.literal(1), root: uiBlockSchema })
  .strict()
  .superRefine((t, ctx) => {
    let blocks = 0;
    let depth = 0;
    walkTree(t.root, (_b, _p, d) => {
      blocks++;
      depth = Math.max(depth, d);
    });
    if (depth > L.depth) ctx.addIssue({ code: 'custom', message: `depth_exceeded:${depth}>${L.depth}`, path: ['root'] });
    if (blocks > L.blocks) ctx.addIssue({ code: 'custom', message: `blocks_exceeded:${blocks}>${L.blocks}`, path: ['root'] });
  }) as z.ZodType<UiTree>;

export type TreeCheck = { ok: true; tree: UiTree } | { ok: false; issues: string[] };

/** Kiểm cây (model trả về) — lỗi dạng "đường.dẫn: thông điệp" ngắn để đưa lại model sửa một lần (§1). */
export function checkTree(input: unknown): TreeCheck {
  const r = uiTreeSchema.safeParse(input);
  if (r.success) return { ok: true, tree: r.data };
  return { ok: false, issues: r.error.issues.slice(0, 12).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`) };
}

/** Mọi `$ref` trong cây (server lọc output bước theo quyền người xem trước khi phát `refs`). */
export function refsOf(root: UiBlock): string[] {
  const out = new Set<string>();
  const add = (r?: GenUiRef | string[]) => {
    if (r && !Array.isArray(r)) out.add(r.$ref);
  };
  walkTree(root, (b) => {
    if (b.type === 'stat') {
      add(b.value);
      add(b.compare);
    } else if (b.type === 'table') add(b.rows);
    else if (b.type === 'list') add(b.items);
    else if (b.type === 'progress') {
      add(b.value);
      add(b.max);
    } else if (b.type === 'chart') add(b.data);
    else if (b.type === 'qr') add(b.login);
  });
  return [...out];
}

/** Phần `ui` của tin Trợ lý: cây + run + dữ liệu ref đã lọc theo người xem + intent đã ký cho từng node action (path → handle). */
export const genUiPartSchema = z.object({
  type: z.literal('ui'),
  tree: uiTreeSchema,
  run_id: z.string(),
  refs: z.record(z.string(), z.unknown()),
  intents: z.record(z.string(), z.string()).optional(),
});
export type GenUiPart = z.infer<typeof genUiPartSchema>;
