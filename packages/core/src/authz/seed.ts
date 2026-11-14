// Seed 5 vai trò hệ thống (Blueprint §3.5) vào bảng `role` của DB tenant mới — idempotent theo `key`.
// Định nghĩa permission / scope lấy từ code (`ROLE_DEFS`); bảng giữ bản sao để trang Vai trò & phân quyền + TIP-042 nhân bản.
import { ROLE_DEFS, ROLE_NAMES, SYSTEM_ROLES } from '@appchat/shared';
import { uuidv7 } from '../kernel/ids';
import { registerTenantSeed, type TenantSeed } from '../kernel/tenant-seeds';

export const SYSTEM_ROLES_SEED: TenantSeed = {
  name: 'authz.system_roles',
  order: 10,
  async run(tx, { now }) {
    for (const key of SYSTEM_ROLES) {
      const def = ROLE_DEFS[key];
      const data = { name: ROLE_NAMES[key], isSystem: true, permissions: [...def.permissions], dataScope: def.scope };
      await tx.role.upsert({ where: { key }, create: { id: uuidv7(now.getTime()), key, ...data }, update: data });
    }
  },
};

registerTenantSeed(SYSTEM_ROLES_SEED);
