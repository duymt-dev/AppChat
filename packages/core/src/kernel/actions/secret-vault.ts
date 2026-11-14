// Vault ngắn hạn cho ô bí mật giữa xem trước và xác nhận (TIP-023c hợp đồng 3 + "Fenced recovery"): form GenUI gửi bí mật thẳng
// executor; khi action cần preview, giá trị bí mật KHÔNG đi vào confirm_token / canonical / run — nó nằm ở đây, mã hoá AES-256-GCM
// bằng APP_ENC_KEY, gắn workspace + người + action + intent, TTL bằng confirm_token. Trình duyệt chỉ giữ `vault` handle.
// Tiêu thụ một lần = ACK SAU khi action đã có receipt: `claim` giải mã + đặt lease (crash trước commit → claim lại được tới hết
// TTL); `ack` xoá sau commit. Đã ack mà gửi lại → idempotency trả receipt (không cần giải mã lại). Hết hạn → RE_ENTRY_REQUIRED.
import { randomBytes } from 'node:crypto';
import { AppError } from '@appchat/shared';
import { decryptSecret, encryptSecret } from '../crypto';
import type { KeyValueStore } from '../redis';
import { CONFIRM_TTL_MS } from './confirm-token';

const key = (h: string) => `genui:vault:${h}`;
const HANDLE = /^[A-Za-z0-9_-]{20,64}$/;
export const VAULT_LEASE_MS = 30_000;

export interface VaultBinding {
  workspaceId: string;
  userId: string;
  actionId: string;
  /** Intent GenUI của form gửi bí mật. */
  intent: string;
}

interface Stored extends VaultBinding {
  blob: string;
  leaseUntil?: number;
}

type Kv = Pick<KeyValueStore, 'set' | 'getdel'> & { get(key: string): Promise<string | null> };

export class SecretVault {
  constructor(
    private readonly kv: Kv,
    private readonly encKey: Buffer,
    private readonly now: () => number = Date.now,
  ) {}

  /** Lưu các ô bí mật (đường dẫn → giá trị) → handle. */
  async put(b: VaultBinding, secrets: Record<string, string>): Promise<string> {
    const handle = randomBytes(18).toString('base64url');
    const s: Stored = { ...b, blob: encryptSecret(JSON.stringify(secrets), this.encKey).toString('base64') };
    await this.kv.set(key(handle), JSON.stringify(s), 'PX', CONFIRM_TTL_MS);
    return handle;
  }

  /**
   * Lấy bí mật cho lần chạy: đúng binding mới giải mã; đặt lease ngắn (một worker giữ). Không xoá — `ack` sau commit mới xoá.
   * Hết hạn / sai binding → RE_ENTRY_REQUIRED (nhập lại form; intent cũ không còn giá trị).
   */
  async claim(handle: string, b: VaultBinding): Promise<Record<string, string>> {
    const reenter = () => new AppError('CONFLICT', 409, { secret: 're_entry_required' }, 'RE_ENTRY_REQUIRED');
    if (!HANDLE.test(handle)) throw reenter();
    const raw = await this.kv.get(key(handle));
    if (!raw) throw reenter();
    const s = JSON.parse(raw) as Stored;
    if (s.workspaceId !== b.workspaceId || s.userId !== b.userId || s.actionId !== b.actionId || s.intent !== b.intent) throw reenter();
    const t = this.now();
    if (s.leaseUntil && s.leaseUntil > t) throw new AppError('CONFLICT', 409, { secret: 'in_progress' });
    await this.kv.set(key(handle), JSON.stringify({ ...s, leaseUntil: t + VAULT_LEASE_MS }), 'PX', CONFIRM_TTL_MS);
    return JSON.parse(decryptSecret(Buffer.from(s.blob, 'base64'), this.encKey)) as Record<string, string>;
  }

  /** Thả lease khi transaction rollback (cho phép claim lại tới hết TTL). */
  async release(handle: string): Promise<void> {
    const raw = await this.kv.get(key(handle));
    if (!raw) return;
    const s = JSON.parse(raw) as Stored;
    delete s.leaseUntil;
    await this.kv.set(key(handle), JSON.stringify(s), 'PX', CONFIRM_TTL_MS);
  }

  /** Sau khi action commit (có receipt) → xoá hẳn. */
  async ack(handle: string): Promise<void> {
    await this.kv.getdel(key(handle));
  }
}

/** Ghép bí mật vào input theo đường dẫn chấm (`fields.password`). */
export function mergeSecrets(input: Record<string, unknown>, secrets: Record<string, string>): Record<string, unknown> {
  const out = structuredClone(input);
  for (const [p, v] of Object.entries(secrets)) {
    const parts = p.split('.');
    const last = parts.pop()!;
    let cur: Record<string, unknown> = out;
    for (const k of parts) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') throw new AppError('VALIDATION_FAILED', 422, { secret: 'path' });
      const next = cur[k];
      cur = (next && typeof next === 'object' && !Array.isArray(next) ? next : (cur[k] = {})) as Record<string, unknown>;
    }
    cur[last] = v;
  }
  return out;
}
