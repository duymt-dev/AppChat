// Factory dữ liệu test (TIP-045b annex E): bản ghi cô lập, actor / scope / đồng hồ tường minh, không dùng DB demo dùng chung. Nền tảng
// qua `identityFactory` (cleanup đúng id đã tạo); tenant qua các factory domain trên DB tenant riêng của lượt test (provision + drop).
import type { TenantDb } from '../../src';
import { aiFactory } from './ai';
import type { FactoryClock } from './clock';
import { commerceFactory } from './commerce';
import { crmFactory } from './crm';
import { inboxFactory } from './inbox';

export * from './clock';
export { identityFactory, type IdentityFixtures } from './identity';
export { aiFactory, commerceFactory, crmFactory, inboxFactory };

/** Mọi factory tenant trên một DB tenant + đồng hồ. */
export const tenantFactories = (db: TenantDb, clock: FactoryClock) => ({
  crm: crmFactory(db, clock),
  commerce: commerceFactory(db, clock),
  inbox: inboxFactory(db, clock),
  ai: aiFactory(db, clock),
});
