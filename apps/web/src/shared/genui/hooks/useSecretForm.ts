// State của form GenUI (standard §5, TIP-023c hợp đồng 3): ô thường điền sẵn từ cây (đã validate theo schema action — sai thì bỏ trống +
// cảnh báo); ô bí mật chỉ nằm trong state cục bộ của component (không store tin nhắn / không model), xoá khi gửi xong / unmount.
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { getAction } from '@appchat/actions';
import type { FormField } from '@appchat/shared';

export type FieldKind = { kind: 'text' | 'number' | 'boolean' | 'textarea' } | { kind: 'enum'; options: string[] };

interface JsonNode {
  type?: string | string[];
  enum?: unknown[];
  maxLength?: number;
  properties?: Record<string, JsonNode>;
  anyOf?: JsonNode[];
}

/** Khuôn của ô theo đường dẫn trong input schema của action (JSON schema của zod). */
export function kindAt(actionId: string, name: string): FieldKind {
  const def = getAction(actionId);
  if (!def) return { kind: 'text' };
  let node: JsonNode | undefined = z.toJSONSchema(def.input, { io: 'input', unrepresentable: 'any' }) as JsonNode;
  for (const k of name.split('.')) node = node?.properties?.[k] ?? node?.anyOf?.find((n) => n.properties?.[k])?.properties?.[k];
  const n = node?.anyOf?.find((x) => x.type !== 'null') ?? node;
  if (n?.enum?.every((x) => typeof x === 'string')) return { kind: 'enum', options: n.enum as string[] };
  const t = Array.isArray(n?.type) ? n.type.find((x) => x !== 'null') : n?.type;
  if (t === 'number' || t === 'integer') return { kind: 'number' };
  if (t === 'boolean') return { kind: 'boolean' };
  return { kind: (n?.maxLength ?? 0) > 300 ? 'textarea' : 'text' };
}

/** Ô bí mật: cờ server đánh trên cây hoặc `ActionDef.secret.paths`. */
export const isSecret = (actionId: string, f: FormField) => !!f.secret || !!getAction(actionId)?.secret?.paths?.includes(f.name);

export function setPath(o: Record<string, unknown>, path: string, v: unknown) {
  const keys = path.split('.');
  let cur = o;
  for (const k of keys.slice(0, -1)) cur = (cur[k] && typeof cur[k] === 'object' ? cur[k] : (cur[k] = {})) as Record<string, unknown>;
  cur[keys.at(-1)!] = v;
}

/** Giá trị điền sẵn hợp lệ: ghép mọi ô thường vào input, ô nào schema báo sai thì bỏ (kèm danh sách cảnh báo). Ô bí mật không bao giờ điền. */
export function validPrefill(actionId: string, fields: FormField[]): { values: Record<string, unknown>; invalid: string[] } {
  const values: Record<string, unknown> = {};
  for (const f of fields) if (!isSecret(actionId, f) && f.value !== undefined && f.value !== null) values[f.name] = f.value;
  const def = getAction(actionId);
  if (!def) return { values, invalid: [] };
  const input: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) setPath(input, k, v);
  const r = def.input.safeParse(input);
  if (r.success) return { values, invalid: [] };
  const bad = Object.keys(values).filter((k) => r.error.issues.some((i) => i.path.join('.') === k || i.path.join('.').startsWith(`${k}.`)));
  for (const k of bad) delete values[k];
  return { values, invalid: bad };
}

export function useSecretForm(actionId: string, fields: FormField[]) {
  const initial = useMemo(() => validPrefill(actionId, fields), [actionId, fields]);
  const [values, setValues] = useState<Record<string, unknown>>(initial.values);
  // Bí mật trong ref (không re-render toàn cây, không vào devtools store) — xoá khi unmount.
  const secrets = useRef<Record<string, string>>({});
  const [secretTick, setSecretTick] = useState(0);
  useEffect(() => () => void (secrets.current = {}), []);

  const secretNames = useMemo(() => fields.filter((f) => isSecret(actionId, f)).map((f) => f.name), [actionId, fields]);

  return {
    values,
    invalid: initial.invalid,
    secretNames,
    secretTick,
    set: (name: string, v: unknown) => setValues((s) => ({ ...s, [name]: v })),
    setSecret: (name: string, v: string) => {
      secrets.current[name] = v;
      setSecretTick((n) => n + 1);
    },
    secretValue: (name: string) => secrets.current[name] ?? '',
    /** Input gửi action (ô thường + bí mật) — chỉ dùng ngay lúc gửi, không lưu. */
    build: () => {
      const input: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) if (v !== '' && v !== undefined) setPath(input, k, v);
      for (const [k, v] of Object.entries(secrets.current)) if (v) setPath(input, k, v);
      return input;
    },
    clearSecrets: () => {
      secrets.current = {};
      setSecretTick((n) => n + 1);
    },
  };
}
