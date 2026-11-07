// Seed crm của DB tenant mới (Blueprint §2.0 — bước seed của `tenant.provision`): trường hệ thống 6 entity (D56) + 3 mẫu
// bố cục Hồ sơ 360° gán 5 vai trò (REQ-F12). Idempotent; đọc tự bù cho workspace tạo trước TIP-015.
import { registerTenantSeed, type TenantSeed } from '../kernel/tenant-seeds';
import { seedSystemFields } from './services/fields.service';
import { seedLayouts } from './services/layouts.service';

export const CRM_SEED: TenantSeed = {
  name: 'crm.defaults',
  order: 20,
  async run(tx, { now }) {
    await seedSystemFields(tx, now);
    await seedLayouts(tx);
  },
};

registerTenantSeed(CRM_SEED);
