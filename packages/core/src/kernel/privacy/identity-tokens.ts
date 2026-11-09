// Token định danh một chiều (TIP-015c §4.1): HMAC(namespace, key) với khoá riêng workspace, versioned — không phải raw identity. Chặn
// tự tái tạo từ cùng Zalo/email/SĐT sau khi đã "quên" (DC-260). Khoá lấy từ `privacy_keyring` (wrap bằng APP_ENC_KEY); thiếu khoá → lỗi
// kín (fail closed cho inbound/import/create — không bao giờ coi "chưa có khoá" là "chưa từng gặp").
import { createHmac, randomBytes } from 'node:crypto';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../actions/action-context';
import { decryptSecret, encryptSecret } from '../crypto';

export type IdentityNamespace = 'zalo_channel_account' | 'provider_user' | 'phone' | 'email';

/** Băm giá trị đã chuẩn hoá (chữ thường/trim theo chuẩn hiện có của domain gọi) thành digest hex — không đảo ngược được không có khoá. */
export function digestOf(key: Buffer, namespace: IdentityNamespace, value: string): string {
  return createHmac('sha256', key).update(`${namespace}:${value}`).digest('hex');
}

export interface Keyring {
  version: number;
  key: Buffer;
}

/** Khoá hiện hành (active, version lớn nhất) — giải mã bằng APP_ENC_KEY. Không có → null (gọi nơi dùng tự fail closed). */
export async function activeKeyring(tx: Pick<TenantTx, '$queryRaw'>, encKey: Buffer): Promise<Keyring | null> {
  const [row] = await tx.$queryRaw<{ version: number; wrapped_key: string }[]>`
    SELECT "version", "wrapped_key" FROM "privacy_keyring" WHERE "active" = true ORDER BY "version" DESC LIMIT 1`;
  if (!row) return null;
  return { version: row.version, key: Buffer.from(decryptSecret(Buffer.from(row.wrapped_key, 'base64'), encKey), 'utf8') };
}

/** Khởi tạo khoá đầu tiên (idempotent — không tạo thêm nếu đã có active). Gọi lúc boot / lần đầu cần token. */
export async function ensureKeyring(tx: Pick<TenantTx, '$queryRaw' | '$executeRaw'>, encKey: Buffer, now: Date): Promise<Keyring> {
  const existing = await activeKeyring(tx, encKey);
  if (existing) return existing;
  const raw = randomBytes(32);
  const wrapped = encryptSecret(raw.toString('base64'), encKey).toString('base64');
  const id = randomBytes(16).toString('hex');
  await tx.$executeRaw`INSERT INTO "privacy_keyring" ("id", "version", "wrapped_key", "active", "read_only", "created_at")
    VALUES (${id}::uuid, 1, ${wrapped}, true, false, ${now})`;
  return { version: 1, key: raw };
}

const needKey = (k: Keyring | null): Keyring => {
  if (!k) throw new AppError('WORKSPACE_UNAVAILABLE', 503, { privacy_keyring: 'missing' });
  return k;
};

/** Ghi / đọc trạng thái token (tombstone mặc định — generation=0, freshContactId=null chặn tái tạo). Upsert theo (namespace, key_version, digest). */
export async function tombstoneToken(tx: Pick<TenantTx, '$queryRaw' | '$executeRaw'>, encKey: Buffer, namespace: IdentityNamespace, value: string, now: Date): Promise<void> {
  const kr = needKey(await activeKeyring(tx, encKey));
  const digest = digestOf(kr.key, namespace, value);
  const id = randomBytes(16).toString('hex');
  await tx.$executeRaw`
    INSERT INTO "privacy_identity_token" ("id", "namespace", "key_version", "digest", "generation", "fresh_contact_id", "created_at", "updated_at")
    VALUES (${id}::uuid, ${namespace}, ${kr.version}, ${digest}, 0, NULL, ${now}, ${now})
    ON CONFLICT ("namespace", "key_version", "digest") DO NOTHING`;
}

export type TokenState = { kind: 'none' } | { kind: 'tombstoned'; generation: number } | { kind: 'fresh_permitted'; generation: number; freshContactId: string };

/** Tra token hiện hành — null (chưa từng ghi) khác hẳn tombstoned (đã quên). Domain gọi nơi này TRƯỚC khi fallback theo SĐT/email thô. */
export async function tokenState(tx: Pick<TenantTx, '$queryRaw'>, encKey: Buffer, namespace: IdentityNamespace, value: string): Promise<TokenState> {
  const kr = await activeKeyring(tx, encKey);
  if (!kr) return { kind: 'none' };
  const digest = digestOf(kr.key, namespace, value);
  const [row] = await tx.$queryRaw<{ generation: number; fresh_contact_id: string | null }[]>`
    SELECT "generation", "fresh_contact_id" FROM "privacy_identity_token" WHERE "namespace" = ${namespace} AND "key_version" = ${kr.version} AND "digest" = ${digest}`;
  if (!row) return { kind: 'none' };
  return row.fresh_contact_id ? { kind: 'fresh_permitted', generation: row.generation, freshContactId: row.fresh_contact_id } : { kind: 'tombstoned', generation: row.generation };
}
