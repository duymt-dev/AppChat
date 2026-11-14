// Seed loyalty của DB tenant mới (Blueprint §2.0 — `tenant.provision`, registry DC-026): một dòng `loyalty_config` mặc định (COMMERCE §7).
// Idempotent; tenant tạo trước TIP-036 được bù ở migration `20261102003600_loyalty` và khi đọc (`readConfig`).
import { registerTenantSeed, type TenantSeed } from '../kernel/tenant-seeds';
import { ensureConfig } from './services/config.service';

export const LOYALTY_SEED: TenantSeed = {
  name: 'loyalty.config',
  order: 30,
  run: (tx) => ensureConfig(tx),
};

registerTenantSeed(LOYALTY_SEED);
