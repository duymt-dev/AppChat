// Chế độ truy cập bản ghi (TIP-042c, rbac-permissions §5, D32): ĐỌC (list / get / realtime / preview đọc) và GHI (action đổi dữ liệu,
// preview / undo của action ghi). Scope ghi = scope ghi của vai trò nhưng không bao giờ rộng hơn scope đọc (ghi luôn phải thấy trước).
// Owner workspace (resolver — không theo tên vai trò) luôn `all`. Module thiếu trong context (ngữ cảnh hệ thống rỗng) → `none`.
import type { AuthzContext, DataScope, ScopeModule } from '@appchat/shared';

export type AccessMode = 'read' | 'write';

const RANK: Record<DataScope, number> = { none: 0, own: 1, team: 2, all: 3 };

export function levelOf(authz: AuthzContext, module: ScopeModule, mode: AccessMode): DataScope {
  if (authz.isOwner) return 'all';
  const read = authz.scope?.[module] ?? 'none';
  if (mode === 'read') return read;
  const write = authz.writeScope?.[module] ?? read;
  return RANK[write] < RANK[read] ? write : read;
}
