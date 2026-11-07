// Mã hiển thị → id cho Trợ lý / agent (facade): người dùng và model nói theo mã (KH-1016, BG-1003, DH-…), action nhận id (uuid). Logic
// ở reference-resolver.ts — theo đường dẫn ô của schema (`items[].product_id`), trong scope người gọi; ngoài scope / không thấy → giữ mã.
import { registry } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { REF_ENTITIES, resolveReferences, type Resolved } from './reference-resolver';

const DEFS = new Map(registry.map((a) => [a.id, a]));

/** Thực thể đổi được mã → id (test phủ Trợ lý — TIP-023b R1.3). */
export const CODE_REF_ENTITIES = REF_ENTITIES;

export async function resolveCodes(db: TenantDb, actionId: string, input: unknown, authz: AuthzContext | null = null): Promise<Resolved> {
  const def = DEFS.get(actionId);
  return def ? resolveReferences(db, def, input, authz) : { input, resolved: [] };
}
