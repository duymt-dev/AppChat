// Seed support của DB tenant mới (Blueprint §2.0 — `tenant.provision` seed chính sách SLA mặc định, REQ-H03). Idempotent; workspace tạo
// trước TIP-034 tự bù khi đọc / tạo ticket (`defaultPolicy`).
import { registerTenantSeed, type TenantSeed } from '../kernel/tenant-seeds';
import { defaultPolicy } from './services/sla-clock';

export const SUPPORT_SEED: TenantSeed = {
  name: 'support.sla-default',
  order: 40,
  async run(tx, { now }) {
    await defaultPolicy(tx, now);
  },
};

registerTenantSeed(SUPPORT_SEED);
