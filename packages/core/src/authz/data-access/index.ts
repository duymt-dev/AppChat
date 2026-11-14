// Policy truy cập bản ghi dùng chung (TIP-042c) — domain chỉ gọi qua đây.
export { levelOf, type AccessMode } from './access-mode';
export { grantAllows, grantOf, grantsFor, grantSql, type ContactGrant } from './contact-grants';
export { POLICIES, allows, decide, guardRecord, type ModulePolicy, type RecordRef } from './record-policy';
export { docColumns, recordScopeSql, type ScopeColumns } from './scope-sql';
export { snapshotTeam, soleTeamOf } from './team-snapshot';
