// API công khai của domain authz cho apps/api + domain khác (scopeFilter) — một dòng re-export ở src/index.ts (facade).
export { AuthzResolver, AUTHZ_CACHE_TTL_SEC, parseScope, type AuthzCache, type MembershipInput } from './services/authz-resolver';
export { RolesService } from './services/roles.service';
export { scopeFilter, inScope, assertInScope, type ScopeFields } from './scope';
export { SYSTEM_ROLES_SEED } from './seed';
