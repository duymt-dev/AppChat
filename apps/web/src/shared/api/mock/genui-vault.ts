// Mock phía server cho GenUI (TIP-023c): intent → nguồn assistant → risk ≠ read luôn qua xem trước; ô bí mật theo `ActionDef.secret.paths`
// cất "vault" trong bộ nhớ ở 202 (hash xác nhận tính trên input đã bỏ bí mật), lần xác nhận ghép lại từ vault — dùng một lần.
import type { ActionDef } from '@appchat/actions';

const vaults = new Map<string, Record<string, string>>();
let seq = 0;

const get = (o: unknown, path: string): unknown => path.split('.').reduce<unknown>((x, k) => (x && typeof x === 'object' ? (x as Record<string, unknown>)[k] : undefined), o);

function set(o: Record<string, unknown>, path: string, v: unknown) {
  const keys = path.split('.');
  let cur = o;
  for (const k of keys.slice(0, -1)) cur = (cur[k] ??= {}) as Record<string, unknown>;
  cur[keys.at(-1)!] = v;
}

/** Nguồn assistant (có intent) bắt xem trước mọi action không phải đọc. */
/** Action xem trước bắt buộc cho mọi nguồn như server (policy MANDATORY_PREVIEW_ACTIONS) — TIP-033c: tạo đơn từ lịch hẹn; TIP-020e: tạo
 *  lại chỉ mục kho tri thức (trừ Credit — luôn xem ước tính). */
const MANDATORY_PREVIEW = new Set(['order.create_from_appointment', 'kb.reindex']);
export const genUiNeedsPreview = (def: ActionDef, intent?: string) => MANDATORY_PREVIEW.has(def.id) || (!!intent && def.risk !== 'read');

/** Tách bí mật khỏi input: `plain` để hash / gắn token, `secrets` cất vault. */
export function splitSecrets(def: ActionDef, input: unknown): { plain: unknown; secrets: Record<string, string> } {
  const secrets: Record<string, string> = {};
  const plain = structuredClone(input) as Record<string, unknown>;
  for (const p of def.secret?.paths ?? []) {
    const v = get(input, p);
    if (typeof v !== 'string' || !v) continue;
    secrets[p] = v;
    const keys = p.split('.');
    const parent = get(plain, keys.slice(0, -1).join('.')) ?? (keys.length === 1 ? plain : undefined);
    if (parent && typeof parent === 'object') delete (parent as Record<string, unknown>)[keys.at(-1)!];
  }
  return { plain, secrets };
}

export function putVault(secrets: Record<string, string>): string | undefined {
  if (!Object.keys(secrets).length) return undefined;
  const h = `sv_${Date.now().toString(36)}_${(seq++).toString(36)}`;
  vaults.set(h, secrets);
  return h;
}

/** Ghép bí mật từ vault (dùng một lần); không có → null (server trả RE_ENTRY_REQUIRED). */
export function claimVault(handle: string, plain: unknown): Record<string, unknown> | null {
  const s = vaults.get(handle);
  if (!s) return null;
  vaults.delete(handle);
  const out = structuredClone(plain ?? {}) as Record<string, unknown>;
  for (const [p, v] of Object.entries(s)) set(out, p, v);
  return out;
}
