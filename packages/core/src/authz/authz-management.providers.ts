// Handler quản trị vai trò tuỳ biến + nhóm (TIP-042) — nạp vào AuthzModule; ActionHandlerRegistry gom theo decorator lúc boot.
import { ROLE_HANDLERS } from './actions/role.handlers';
import { TEAM_HANDLERS } from './actions/team.handlers';

export const AUTHZ_MANAGEMENT_HANDLERS = [...ROLE_HANDLERS, ...TEAM_HANDLERS];
