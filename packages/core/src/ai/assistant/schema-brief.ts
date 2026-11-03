// Khuôn input lồng nhau cho model (TIP-023b R1.1): object → ô con, array → khuôn phần tử, enum → giá trị, `?` = tuỳ chọn.
// Số có khoảng ghi `integer(1..20)`. `{ field: 'string' }` phẳng làm model mù ô con (`patch.phone`, `items[].product_id`) — 48 action có ô object / array.
// Giới hạn độ sâu 3 và 40 ô (cắt bớt, ghi `…`) để giữ prompt gọn; dùng cho `find_actions` và lỗi VALIDATION_FAILED của `call_action`.
import type { JsonSchema } from '@appchat/ai';

export const BRIEF_MAX_DEPTH = 3;
export const BRIEF_MAX_FIELDS = 40;

export type Brief = string | Brief[] | { [field: string]: Brief };

type Node = JsonSchema & {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  anyOf?: Node[];
  oneOf?: Node[];
  properties?: Record<string, Node>;
  required?: string[];
  items?: Node;
  additionalProperties?: Node | boolean;
  minimum?: number;
  maximum?: number;
};

/** Bỏ nhánh `null` của anyOf (zod `.nullable()`) → kiểu thật + cờ có nhận null. */
function unwrap(n: Node): { node: Node; nullable: boolean } {
  const alts = n.anyOf ?? n.oneOf;
  if (!alts) return { node: n, nullable: false };
  const real = alts.filter((a) => a.type !== 'null');
  return { node: real.length === 1 ? real[0]! : n, nullable: real.length < alts.length };
}

function typeName(n: Node): string {
  if (n.enum) return n.enum.map(String).join('|');
  if (n.const !== undefined) return String(n.const);
  if (Array.isArray(n.type)) return n.type.join('|');
  // Số có khoảng → `integer(1..20)`: model thấy trần TRƯỚC khi gọi (vd `limit` của *.search), khỏi một vòng VALIDATION_FAILED.
  if ((n.type === 'integer' || n.type === 'number') && (n.minimum !== undefined || n.maximum !== undefined)) return `${n.type}(${n.minimum ?? ''}..${n.maximum ?? ''})`;
  if (n.type) return n.type;
  const alts = n.anyOf ?? n.oneOf;
  return alts?.map((a) => typeName(a)).filter(Boolean).join('|') || 'any';
}

/** Khuôn một ô; `budget.left` đếm số ô còn được in (cắt khi hết). */
function briefOf(raw: Node, depth: number, budget: { left: number }): Brief {
  const { node: n, nullable } = unwrap(raw);
  const tag = (s: string) => (nullable ? `${s}|null` : s);
  if (n.type === 'object' && n.properties) {
    if (depth >= BRIEF_MAX_DEPTH) return tag('object');
    const req = new Set(n.required ?? []);
    const out: Record<string, Brief> = {};
    for (const [k, v] of Object.entries(n.properties)) {
      if (budget.left <= 0) {
        out['…'] = 'more';
        break;
      }
      budget.left -= 1;
      const child = briefOf(v, depth + 1, budget);
      out[req.has(k) ? k : `${k}?`] = child;
    }
    return out;
  }
  if (n.type === 'array' && n.items) {
    if (depth >= BRIEF_MAX_DEPTH) return tag('array');
    return [briefOf(n.items, depth + 1, budget)];
  }
  if (n.type === 'object' && n.additionalProperties && typeof n.additionalProperties === 'object') return tag(`record<${typeName(n.additionalProperties)}>`);
  return tag(typeName(n));
}

/** Khuôn input của action: object gốc → `{ field | field?: khuôn }`. */
export function schemaBrief(schema: JsonSchema): Record<string, Brief> {
  const b = briefOf(schema as Node, 0, { left: BRIEF_MAX_FIELDS });
  return typeof b === 'object' && !Array.isArray(b) ? b : {};
}

/** Ví dụ tối thiểu từ khuôn (chỉ ô bắt buộc) — gắn khi mô tả action không có ví dụ. */
export function exampleOf(brief: Brief): unknown {
  if (Array.isArray(brief)) return brief.length ? [exampleOf(brief[0]!)] : [];
  if (typeof brief === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(brief)) if (!k.endsWith('?') && k !== '…') out[k] = exampleOf(v);
    return out;
  }
  const first = brief.split('|')[0]!;
  if (first === 'string') return '…';
  if (first.startsWith('number') || first.startsWith('integer')) return 1;
  if (first === 'boolean') return true;
  if (first.startsWith('record<')) return {};
  if (first === 'object') return {};
  if (first === 'array') return [];
  return first;
}
