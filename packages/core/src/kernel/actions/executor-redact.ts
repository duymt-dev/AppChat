// Che PII cho action_log + chuẩn hoá JSON (ops §1.4, §4) — dùng chung executor và pha tenant của thao tác xuyên DB (TIP-045b).
import { REDACT_CENSOR, REDACT_KEYS } from '@appchat/shared';

const SECRET = new Set<string>(REDACT_KEYS);

/** Che PII trong input trước khi ghi action_log (ops §1.4, §4). */
export function redactDeep(v: unknown, depth = 0): unknown {
  if (depth > 6 || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => redactDeep(x, depth + 1));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.has(k) ? REDACT_CENSOR : redactDeep(x, depth + 1)]));
}

export const toLogJson = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))) as object));
