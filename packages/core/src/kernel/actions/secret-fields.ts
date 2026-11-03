// Ô bí mật của input action (DC-227, TIP-023c G1.4): nguồn DUY NHẤT là metadata server — `ActionDef.secret` (đường dẫn cố định) +
// `ConnectorManifest.auth.fields[].secret` (ô dưới `fields` theo provider). Model không phân loại được ô nào là bí mật.
// Dùng ở: executor (che action_log.input), Trợ lý (chặn model gửi giá trị bí mật, bỏ khỏi canonical / thẻ / bước run), form GenUI.
import type { ActionDef } from '@appchat/actions';
import { connectorRegistry } from '@appchat/integrations';
import { REDACT_CENSOR } from '@appchat/shared';

const get = (o: unknown, k: string): unknown => (o && typeof o === 'object' && !Array.isArray(o) && Object.prototype.hasOwnProperty.call(o, k) ? (o as Record<string, unknown>)[k] : undefined);

/** Đường dẫn chấm của mọi ô bí mật trong `input` của action (đã biết provider nếu có). */
export function secretPaths(def: Pick<ActionDef, 'secret'>, input: unknown): string[] {
  const s = def.secret;
  if (!s) return [];
  const out = [...(s.paths ?? [])];
  if (s.connector) {
    const provider = get(input, s.connector.provider);
    const m = typeof provider === 'string' ? connectorRegistry.get(provider)?.manifest : undefined;
    for (const f of m?.auth.fields ?? []) if (f.secret) out.push(`${s.connector.fields}.${f.key}`);
  }
  return out;
}

/** Ô bí mật theo provider khi chưa có input (form GenUI dựng trước khi người dùng gõ). */
export function connectorSecretKeys(provider: string): string[] {
  return (connectorRegistry.get(provider)?.manifest.auth.fields ?? []).filter((f) => f.secret).map((f) => f.key);
}

function mapPath(v: unknown, parts: string[], fn: (leaf: unknown) => unknown): unknown {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  const [head, ...rest] = parts as [string, ...string[]];
  if (!Object.prototype.hasOwnProperty.call(v, head)) return v;
  const cur = (v as Record<string, unknown>)[head];
  return { ...(v as Record<string, unknown>), [head]: rest.length ? mapPath(cur, rest, fn) : fn(cur) };
}

/** Thay giá trị ô bí mật bằng `***` (log / bước run / trace). Ô vắng giữ nguyên vắng. */
export function maskSecrets(def: Pick<ActionDef, 'secret'>, input: unknown): unknown {
  return secretPaths(def, input).reduce((acc, p) => mapPath(acc, p.split('.'), () => REDACT_CENSOR), input);
}

/** Bỏ hẳn ô bí mật (thẻ xác nhận / canonical input lưu ở run — không giữ bản che). */
export function stripSecrets(def: Pick<ActionDef, 'secret'>, input: unknown): unknown {
  return secretPaths(def, input).reduce((acc, p) => {
    const parts = p.split('.');
    const last = parts.pop()!;
    const drop = (o: unknown) => {
      if (!o || typeof o !== 'object' || Array.isArray(o) || !Object.prototype.hasOwnProperty.call(o, last)) return o;
      const rest = { ...(o as Record<string, unknown>) };
      delete rest[last];
      return rest;
    };
    return parts.length ? mapPath(acc, parts, drop) : drop(acc);
  }, input);
}

/** Model gửi giá trị cho ô bí mật (không phải chuỗi rỗng) → danh sách ô vi phạm. */
export function secretValuesPresent(def: Pick<ActionDef, 'secret'>, input: unknown): string[] {
  return secretPaths(def, input).filter((p) => {
    const v = p.split('.').reduce<unknown>((o, k) => get(o, k), input);
    return v !== undefined && v !== null && v !== '';
  });
}

/**
 * Input bước tool trước khi ghi `ai_run_step` (TIP-023c hợp đồng 3): `call_action` (`{action_id, input}`) hoặc tool action trực tiếp
 * → che ô bí mật theo ActionDef; meta-tool khác giữ nguyên. Model gõ mật khẩu vào lời gọi bị chặn (SECRET_FIELD) nhưng bước vẫn được
 * ghi — giá trị không được nằm lại trong DB.
 */
export function maskToolInput(actionId: string | null, input: unknown, lookup: (id: string) => Pick<ActionDef, 'secret'> | undefined): unknown {
  if (!actionId || !input || typeof input !== 'object') return input;
  if (actionId === 'call_action') {
    const o = input as { action_id?: unknown; input?: unknown };
    const def = typeof o.action_id === 'string' ? lookup(o.action_id) : undefined;
    return def ? { ...o, input: maskSecrets(def, o.input) } : input;
  }
  const def = lookup(actionId);
  return def ? maskSecrets(def, input) : input;
}
