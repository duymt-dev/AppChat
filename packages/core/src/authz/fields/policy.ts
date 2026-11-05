// FieldPolicy (TIP-045b annex C): quyền đọc TRƯỜNG = vai trò hiện tại (Owner theo owner_user_id; agent trực kênh `agent` — chỉ trường AI
// không giới hạn vai trò) ∩ định nghĩa còn hiệu lực + trường hệ thống theo quyền hành động (entity-bindings). Một nơi duy nhất cho REST,
// export, AI context / tool, preview, realtime — không lặp logic vai trò ở domain.
import { fieldRoleOf, fieldsForRole, type AuthzContext, type CustomFieldDef, type CustomFieldEntity } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { liveDefs } from './definitions';
import { hiddenSystemFields } from './entity-bindings';
import type { FieldView } from './types';

export function viewOf(entity: CustomFieldEntity, a: AuthzContext, defs: Awaited<ReturnType<typeof liveDefs>>): FieldView {
  const role = fieldRoleOf(a);
  const full = defs.defs as CustomFieldDef[];
  const custom = new Set(fieldsForRole(full, role).map((f) => f.key));
  return { entity, role, custom, known: new Set(full.filter((f) => !f.sys).map((f) => f.key)), hiddenSystem: hiddenSystemFields(entity, a), version: defs.version };
}

/** Quyền trường của người xem cho entity — đọc định nghĩa trong cùng transaction đọc. */
export async function fieldView(db: Pick<TenantTx, 'customFieldDef'>, entity: CustomFieldEntity, a: AuthzContext): Promise<FieldView> {
  return viewOf(entity, a, await liveDefs(db, entity));
}
