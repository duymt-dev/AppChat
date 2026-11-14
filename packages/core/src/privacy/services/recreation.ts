// Chặn tự tái tạo (TIP-015c §4, pha 3): tombstone mọi định danh của họ khách ngay lúc accept (operation.ts) — identity-tokens.ts đã
// có hạ tầng HMAC/keyring từ pha 1, chưa ai gọi. `contact.allow_recreation` cấp permit một lần có chủ đích (người xin rõ ràng muốn
// tạo hồ sơ mới từ cùng SĐT/email/provider) — KHÔNG phục hồi dữ liệu cũ, chỉ mở lại khả năng tạo khách mới từ định danh đó.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { digestOf, ensureKeyring, tokenState, type IdentityNamespace, type TokenState } from '../../kernel/privacy/identity-tokens';

type IdentityRow = { phoneNorm: string | null; email: string | null };
type ProviderRow = { channelAccountId: string; externalId: string };

/** Mọi giá trị định danh của họ khách tại lúc accept (TIP-015c §4.1) — phone/email chuẩn hoá sẵn có trên Contact, provider lấy từ
 * ContactIdentity (mọi kênh đã gắn, không chỉ kênh gửi tin gần nhất). */
async function identityValuesOf(tx: TenantTx, familyIds: readonly string[]): Promise<{ namespace: IdentityNamespace; value: string }[]> {
  const contacts = await tx.contact.findMany({ where: { id: { in: [...familyIds] } }, select: { phoneNorm: true, email: true } }) as IdentityRow[];
  const identities = await tx.contactIdentity.findMany({ where: { contactId: { in: [...familyIds] } }, select: { channelAccountId: true, externalId: true } }) as ProviderRow[];
  const out: { namespace: IdentityNamespace; value: string }[] = [];
  for (const c of contacts) {
    if (c.phoneNorm) out.push({ namespace: 'phone', value: c.phoneNorm });
    if (c.email) out.push({ namespace: 'email', value: c.email });
  }
  for (const i of identities) out.push({ namespace: 'provider_user', value: `${i.channelAccountId}:${i.externalId}` });
  return out;
}

const needEncKey = (k: Buffer | null) => {
  if (!k) throw new AppError('WORKSPACE_UNAVAILABLE', 503, undefined, 'APP_ENC_KEY chưa cấu hình — không tombstone được định danh');
  return k;
};

/** Tombstone mọi định danh của họ (TIP-015c §4.1, §2.1.4) — gọi TRONG transaction accept, trước commit. Thiếu APP_ENC_KEY → 503 fail
 * closed (ngăn accept hoàn tất mà không chặn tái tạo được — không "quên nửa vời"). Khoá đến từ ENC_KEY tiêm ở handler (DI). Khởi tạo
 * keyring tại lần cần đầu tiên (idempotent — `ensureKeyring` không tạo thêm nếu workspace đã có active) thay vì chờ một bước boot
 * riêng: domain `privacy` không có job khởi tạo nào chạy trước contact.forget đầu tiên của mỗi workspace. */
export async function tombstoneIdentities(tx: TenantTx, familyIds: readonly string[], now: Date, encKey?: Buffer | null): Promise<void> {
  const key = needEncKey(encKey ?? null);
  const kr = await ensureKeyring(tx, key, now);
  const values = await identityValuesOf(tx, familyIds);
  for (const v of values) {
    const digest = digestOf(kr.key, v.namespace, v.value);
    await tx.$executeRaw`
      INSERT INTO "privacy_identity_token" ("id", "namespace", "key_version", "digest", "generation", "fresh_contact_id", "created_at", "updated_at")
      VALUES (${uuidv7(now.getTime())}::uuid, ${v.namespace}, ${kr.version}, ${digest}, 0, NULL, ${now}, ${now})
      ON CONFLICT ("namespace", "key_version", "digest") DO UPDATE SET "fresh_contact_id" = NULL, "generation" = "privacy_identity_token"."generation" + 1, "updated_at" = ${now}`;
  }
}

export interface RecreationIdentifier {
  kind: 'phone' | 'email' | 'provider';
  value: string;
}

const NS_OF: Record<RecreationIdentifier['kind'], IdentityNamespace> = { phone: 'phone', email: 'email', provider: 'provider_user' };

/** Toàn bộ định danh khai xin đều đang tombstoned (chưa xin cái nào chưa từng bị quên) — có một cái `fresh_permitted`/`none` thì từ
 * chối tạo permit cho TẬP NÀY (không cấp "nửa tombstoned nửa chưa" — người xin khai lại đúng tập đã quên). */
export async function allTombstoned(tx: TenantTx, encKey: Buffer | null | undefined, identifiers: readonly RecreationIdentifier[]): Promise<boolean> {
  const key = needEncKey(encKey ?? null);
  for (const id of identifiers) {
    const st: TokenState = await tokenState(tx, key, NS_OF[id.kind], id.value);
    if (st.kind !== 'tombstoned') return false;
  }
  return true;
}

/** Cấp permit: tăng generation + gắn `fresh_contact_id` khi contact.create tiêu thụ (permit-consumption.ts, pha sau) — ở đây chỉ ghi
 * hàng chờ permit (privacy_recreation_permit), KHÔNG tự mở token ngay (mở lúc contact.create thật sự consume, tránh permit issue
 * xong không ai dùng mà token đã mở). */
export async function issueRecreationPermit(tx: TenantTx, a: { actorUserId: string; identifiers: readonly RecreationIdentifier[]; intentHash: string; now: Date }): Promise<{ id: string; expiresAt: Date }> {
  const id = uuidv7(a.now.getTime());
  const expiresAt = new Date(a.now.getTime() + 10 * 60_000);
  await tx.$executeRaw`
    INSERT INTO "privacy_recreation_permit" ("id", "actor_user_id", "identifiers", "intent_hash", "expires_at", "created_at")
    VALUES (${id}::uuid, ${a.actorUserId}::uuid, ${JSON.stringify(a.identifiers)}::jsonb, ${a.intentHash}, ${expiresAt}, ${a.now})`;
  return { id, expiresAt };
}
