// Factory CRM trong DB tenant (TIP-045b annex E): khách hàng với người phụ trách tường minh (test scope dựa vào owner).
import type { TenantDb } from '../../src';
import { newId, tag, type FactoryClock } from './clock';

export function crmFactory(db: TenantDb, clock: FactoryClock) {
  return {
    async contact(p: { name?: string; ownerUserId?: string | null; phone?: string } = {}) {
      const id = newId();
      await db.contact.create({
        data: { id, code: `KH-F${tag()}`, name: p.name ?? 'Khách fixture', ownerUserId: p.ownerUserId ?? null, phone: p.phone ?? null, createdAt: clock.now(), updatedAt: clock.now() },
      });
      return { id };
    },
  };
}
