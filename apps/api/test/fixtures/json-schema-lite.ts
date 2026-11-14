// Validator JSON Schema 2020-12 tối giản cho test (TIP-003d AC1): đủ đúng các keyword mà schema chính thức OpenAPI 3.1
// (`openapi-3.1.schema.json`, spec.openapis.org/oas/3.1/schema/2022-10-07) dùng — không thêm thư viện (CLAUDE.md §4.9). Không phải
// validator tổng quát: `$dynamicRef` chỉ có một anchor `meta` (schema object của OAS, cho phép mọi giá trị khi không bật dialect), format
// chỉ kiểm `uri` / `uri-reference` / `email` ở mức hình dạng. Lỗi trả đường dẫn instance + keyword để test in rõ.
type S = Record<string, unknown> | boolean;
type Err = { path: string; keyword: string };

const TYPES: Record<string, (v: unknown) => boolean> = {
  object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  array: Array.isArray,
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number',
  integer: (v) => Number.isInteger(v),
  boolean: (v) => typeof v === 'boolean',
  null: (v) => v === null,
};
const FORMATS: Record<string, (v: string) => boolean> = {
  uri: (v) => /^[a-z][a-z0-9+.-]*:/i.test(v),
  'uri-reference': (v) => !/\s/.test(v),
  email: (v) => /^[^@\s]+@[^@\s]+$/.test(v),
};
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function validator(root: Record<string, unknown>) {
  const resolve = (ref: string): S => {
    if (ref === '#meta' || ref.endsWith('/meta')) return true; // $dynamicRef: schema object (không bật dialect) → mọi giá trị
    const path = ref.replace(/^#/, '').split('/').filter(Boolean).map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    let cur: unknown = root;
    for (const p of path) cur = (cur as Record<string, unknown>)[p];
    if (cur === undefined) throw new Error(`unresolved $ref ${ref}`);
    return cur as S;
  };

  /** Trả lỗi + tập property đã được đánh giá (cho unevaluatedProperties). */
  function check(s: S, v: unknown, path: string, errs: Err[]): Set<string> {
    const seen = new Set<string>();
    if (s === true) return seen;
    if (s === false) return void errs.push({ path, keyword: 'false' }), seen;
    const fail = (keyword: string) => errs.push({ path, keyword });
    const sub = (x: S, val: unknown, p: string) => {
      const e: Err[] = [];
      const ev = check(x, val, p, e);
      return { ok: e.length === 0, e, ev };
    };
    const absorb = (r: { ok: boolean; ev: Set<string> }) => r.ok && r.ev.forEach((k) => seen.add(k));

    for (const k of ['$ref', '$dynamicRef'] as const) {
      if (typeof s[k] === 'string') {
        const r = sub(resolve(s[k] as string), v, path);
        errs.push(...r.e);
        r.ev.forEach((x) => seen.add(x));
      }
    }
    if (s.type !== undefined && ![s.type].flat().some((t) => TYPES[t as string]!(v))) fail('type');
    if (s.const !== undefined && !eq(s.const, v)) fail('const');
    if (Array.isArray(s.enum) && !s.enum.some((x) => eq(x, v))) fail('enum');
    if (typeof v === 'string') {
      if (typeof s.pattern === 'string' && !new RegExp(s.pattern, 'u').test(v)) fail('pattern');
      if (typeof s.format === 'string' && FORMATS[s.format] && !FORMATS[s.format]!(v)) fail('format');
    }
    if (Array.isArray(v)) {
      if (typeof s.minItems === 'number' && v.length < s.minItems) fail('minItems');
      if (s.items !== undefined) v.forEach((x, i) => errs.push(...sub(s.items as S, x, `${path}/${i}`).e));
    }
    if (TYPES.object!(v)) {
      const o = v as Record<string, unknown>;
      const keys = Object.keys(o);
      if (typeof s.minProperties === 'number' && keys.length < s.minProperties) fail('minProperties');
      if (typeof s.maxProperties === 'number' && keys.length > s.maxProperties) fail('maxProperties');
      for (const r of (s.required as string[] | undefined) ?? []) if (!(r in o)) fail(`required:${r}`);
      const props = (s.properties ?? {}) as Record<string, S>;
      const pats = Object.entries((s.patternProperties ?? {}) as Record<string, S>).map(([p, x]) => [new RegExp(p, 'u'), x] as const);
      for (const k of keys) {
        let hit = false;
        if (k in props) {
          hit = true;
          errs.push(...sub(props[k]!, o[k], `${path}/${k}`).e);
        }
        for (const [re, x] of pats) {
          if (re.test(k)) {
            hit = true;
            errs.push(...sub(x, o[k], `${path}/${k}`).e);
          }
        }
        if (hit) seen.add(k);
        else if (s.additionalProperties !== undefined) {
          errs.push(...sub(s.additionalProperties as S, o[k], `${path}/${k}`).e);
          seen.add(k);
        }
        if (s.propertyNames !== undefined) errs.push(...sub(s.propertyNames as S, k, `${path}/${k}`).e);
      }
      for (const [k, x] of Object.entries((s.dependentSchemas ?? {}) as Record<string, S>)) {
        if (!(k in o)) continue;
        const r = sub(x, v, path);
        errs.push(...r.e);
        absorb(r);
      }
    }
    for (const x of (s.allOf as S[] | undefined) ?? []) {
      const r = sub(x, v, path);
      errs.push(...r.e);
      absorb(r);
    }
    if (Array.isArray(s.anyOf)) {
      const rs = (s.anyOf as S[]).map((x) => sub(x, v, path));
      if (!rs.some((r) => r.ok)) fail('anyOf');
      rs.forEach(absorb);
    }
    if (Array.isArray(s.oneOf)) {
      const rs = (s.oneOf as S[]).map((x) => sub(x, v, path));
      if (rs.filter((r) => r.ok).length !== 1) fail('oneOf');
      rs.forEach(absorb);
    }
    if (s.not !== undefined && sub(s.not as S, v, path).ok) fail('not');
    if (s.if !== undefined) {
      const c = sub(s.if as S, v, path);
      absorb(c);
      const branch = (c.ok ? s.then : s.else) as S | undefined;
      if (branch !== undefined) {
        const r = sub(branch, v, path);
        errs.push(...r.e);
        absorb(r);
      }
    }
    if (s.unevaluatedProperties !== undefined && TYPES.object!(v)) {
      for (const k of Object.keys(v as object)) {
        if (seen.has(k)) continue;
        errs.push(...sub(s.unevaluatedProperties as S, (v as Record<string, unknown>)[k], `${path}/${k}`).e);
        seen.add(k);
      }
    }
    return seen;
  }

  return (v: unknown): Err[] => {
    const errs: Err[] = [];
    check(root, v, '', errs);
    return errs;
  };
}
