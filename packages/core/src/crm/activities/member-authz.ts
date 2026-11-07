// Quyền hiện tại của một thành viên khác (TIP-026b §1.2): người được giao việc phải còn active + còn quyền sửa khách THEO QUYỀN CỦA HỌ.
// Không có AuthzResolver (test đơn vị / thiếu DB) → null (không đủ điều kiện — không đoán Owner).
import type { PlatformDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { AuthzResolver } from '../../authz/services/authz-resolver';

export class MemberAuthz {
  constructor(
    private readonly platform: Pick<PlatformDb, 'membership'> | null,
    private readonly authz: AuthzResolver | null,
  ) {}

  async of(ws: string, userId: string): Promise<AuthzContext | null> {
    if (!this.platform || !this.authz) return null;
    const m = await this.platform.membership.findFirst({ where: { workspaceId: ws, userId, status: 'active' }, select: { roleKey: true, delegations: true } });
    return m ? this.authz.resolve(ws, userId, m) : null;
  }
}
