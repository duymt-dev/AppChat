// API công khai của domain authz cho apps/api + domain khác (scopeFilter) — một dòng re-export ở src/index.ts (facade).
// Quyền theo trường (TIP-045b annex C) — serializer / export / AI / realtime dùng chung.
export { assertQueryFields, assertWritableSystem, fieldView, projectActionOutput, stripRealtimeFields, FIELDS_CHANGED_EVENT, liveDefs, projectCustom, projectRow, viewOf, hiddenSystemFields, SYSTEM_FIELD_BINDINGS, type FieldView } from './fields';
export { AuthzResolver, AUTHZ_CACHE_TTL_SEC, parseScope, type AuthzCache, type MembershipInput } from './services/authz-resolver';
export { RolesService } from './services/roles.service';
export { scopeFilter, inScope, assertInScope, type ScopeFields } from './scope';
export { SYSTEM_ROLES_SEED } from './seed';
