// API công khai của domain authz cho apps/api + domain khác (scopeFilter) — một dòng re-export ở src/index.ts (facade).
// Quyền theo trường (TIP-045b annex C) — serializer / export / AI / realtime dùng chung.
export { assertQueryFields, assertWritableSystem, fieldView, projectActionOutput, stripRealtimeFields, FIELDS_CHANGED_EVENT, liveDefs, projectCustom, projectRow, viewOf, hiddenSystemFields, SYSTEM_FIELD_BINDINGS, type FieldView } from './fields';
export { AuthzResolver, AUTHZ_CACHE_TTL_SEC, parseScope, type AuthzCache, type MembershipInput } from './services/authz-resolver';
export { RolesService, type RoleView } from './services/roles.service';
// TIP-042: vai trò tuỳ biến / nhóm — revision tenant, gán vai trò, chuyển uỷ quyền P0.
export { bumpTenantAuthzRevision, readTenantAuthzRevision } from './services/authz-revision';
export { assertAssignable, assignableRole, assertNoEscalation } from './services/role-assignment';
export { liveRole } from './services/role-lifecycle';
export { convertLegacyDelegations, LEGACY_DELEGATIONS_JOB } from './services/legacy-delegations';
export { scopeFilter, inScope, assertInScope, type ScopeFields } from './scope';
// TIP-042c: policy bản ghi read / write (DC-299 team theo team_id, watcher chỉ đọc).
export * from './data-access';
export { SYSTEM_ROLES_SEED } from './seed';
