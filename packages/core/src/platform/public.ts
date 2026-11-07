// Cửa công khai của domain `platform` cho domain khác (ai / billing đọc thế hệ cấu hình) — chỉ re-export thứ không kéo handler (tránh vòng).
export { AI_CONFIG_SCOPE, RevisionWatch, bumpRevision, readRevision, routeScope } from './services/config-revision';
export { WorkspaceAccess, WorkspaceSuspendedError } from './services/workspace-access';
