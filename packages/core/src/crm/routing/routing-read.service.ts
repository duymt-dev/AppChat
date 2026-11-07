// Đọc cấu hình chia lead (TIP-042b): `GET /v1/settings/lead-routing` — rules (mặc định + ghi đè) + ứng viên cho form: thành viên active,
// nhóm, tài khoản kênh (kèm `assign_mode` cũ chỉ để hiện nhãn "kiểu cũ"). Quyền `crm.reassign` kiểm ở controller. Không trả credentials.
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { LeadRoutingDto } from '@appchat/shared';
import type { CrmMembers } from '../services/members.service';
import { listRules, ruleSnap } from './routing.repo';

export class LeadRoutingReadService {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly members: Pick<CrmMembers, 'list'>,
  ) {}

  async get(workspaceId: string, userId: string): Promise<LeadRoutingDto> {
    const db = await this.tenants.get(TenantContexts.fromMembership(workspaceId, userId));
    const [rules, users, teams, accounts] = await Promise.all([
      listRules(db),
      this.members.list(workspaceId),
      db.team.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, name: true } }),
      db.channelAccount.findMany({ where: { status: { not: 'disconnected' } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, name: true, type: true, settings: true } }),
    ]);
    return {
      rules: rules.map((r) => {
        const { id, channel_account_id, enabled, enabled_at, mode, user_ids, team_id, fixed_user_id, version } = ruleSnap(r);
        return { id, channel_account_id, enabled, enabled_at, mode, user_ids, team_id, fixed_user_id, version };
      }),
      candidates: {
        users: users.map((u) => ({ id: u.id, name: u.name })),
        teams,
        accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, legacy_assign_mode: legacyMode(a.settings) })),
      },
    };
  }
}

const legacyMode = (s: unknown): string | null => {
  const v = (s as { assign_mode?: unknown } | null)?.assign_mode;
  return typeof v === 'string' ? v : null;
};
