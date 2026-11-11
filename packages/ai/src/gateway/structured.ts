// Chế độ sinh theo schema (TIP-021b §2.2): một lời gọi KHÔNG tool qua `Output.object` của AI SDK v7 đã ghim — cùng biên nhận / huỷ /
// hết giờ / fallback của engine (019b), chỉ khác phần yêu cầu khuôn trả về. Engine kiểm lại JSON theo schema server sở hữu (tập con
// JSON Schema đóng: object / array / string / number / integer / boolean / enum, required, additionalProperties=false, giới hạn độ dài)
// — không tự sửa, không gọi lần hai. Sai khuôn sau khi đã có usage → `STRUCTURED_MALFORMED` (usage vẫn được ghi trước đó).
import { jsonSchema, Output } from 'ai';
import type { JsonSchema, ResponseSchema, RunRequest } from './types';

export class StructuredError extends Error {
  constructor(
    readonly code: 'STRUCTURED_MIXED_MODE' | 'STRUCTURED_MALFORMED',
    message: string,
  ) {
    super(message);
    this.name = 'StructuredError';
  }
}

/** Trộn tool với chế độ schema bị từ chối TRƯỚC khi nhận chỗ / gọi provider. */
export function assertStructuredRequest(req: Pick<RunRequest, 'tools' | 'responseSchema'>): void {
  if (req.responseSchema && req.tools.length) throw new StructuredError('STRUCTURED_MIXED_MODE', 'Chế độ schema không nhận tool');
}

/** Tuỳ chọn `output` cho `streamText` — validate của SDK luôn đạt; engine tự kiểm sau khi đã ghi usage (không để SDK ném giữa chừng). */
export const structuredOutput = (rs: ResponseSchema) =>
  Output.object({ schema: jsonSchema(rs.schema as never, { validate: (value) => ({ success: true, value }) }), name: rs.name });

type Node = JsonSchema & {
  type?: string;
  properties?: Record<string, Node>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Node;
  enum?: unknown[];
  maxLength?: number;
  minLength?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
};

/** Lỗi đầu tiên theo đường dẫn (`$.tools[2]: enum`) — null = hợp lệ. Chỉ tập con đóng; từ khoá lạ trong schema bị coi là sai cấu hình. */
export function schemaError(schema: JsonSchema, value: unknown, path = '$'): string | null {
  const s = schema as Node;
  if (s.enum && !s.enum.some((e) => e === value)) return `${path}: enum`;
  switch (s.type) {
    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return `${path}: object`;
      const o = value as Record<string, unknown>;
      const props = s.properties ?? {};
      for (const k of s.required ?? []) if (!(k in o)) return `${path}.${k}: required`;
      for (const [k, v] of Object.entries(o)) {
        const p = props[k];
        if (!p) {
          if (s.additionalProperties === false) return `${path}.${k}: unknown_key`;
          continue;
        }
        const e = schemaError(p, v, `${path}.${k}`);
        if (e) return e;
      }
      return null;
    }
    case 'array': {
      if (!Array.isArray(value)) return `${path}: array`;
      if (s.maxItems !== undefined && value.length > s.maxItems) return `${path}: max_items`;
      for (let i = 0; i < value.length; i++) {
        const e = s.items ? schemaError(s.items, value[i], `${path}[${i}]`) : null;
        if (e) return e;
      }
      return null;
    }
    case 'string':
      if (typeof value !== 'string') return `${path}: string`;
      if (s.maxLength !== undefined && value.length > s.maxLength) return `${path}: max_length`;
      if (s.minLength !== undefined && value.length < s.minLength) return `${path}: min_length`;
      return null;
    case 'integer':
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value) || (s.type === 'integer' && !Number.isInteger(value))) return `${path}: ${s.type}`;
      if (s.minimum !== undefined && value < s.minimum) return `${path}: minimum`;
      if (s.maximum !== undefined && value > s.maximum) return `${path}: maximum`;
      return null;
    case 'boolean':
      return typeof value === 'boolean' ? null : `${path}: boolean`;
    case undefined:
      return s.enum ? null : `${path}: schema_type_missing`;
    default:
      return `${path}: schema_type_unsupported`;
  }
}

/** Chữ model → JSON chuẩn đã kiểm (chuỗi `JSON.stringify` tất định theo thứ tự key model trả). Ném `STRUCTURED_MALFORMED`. */
export function parseStructured(rs: ResponseSchema, text: string): string {
  let value: unknown;
  try {
    value = JSON.parse(text.trim());
  } catch {
    throw new StructuredError('STRUCTURED_MALFORMED', 'not_json');
  }
  const err = schemaError(rs.schema, value);
  if (err) throw new StructuredError('STRUCTURED_MALFORMED', err.slice(0, 120));
  return JSON.stringify(value);
}
