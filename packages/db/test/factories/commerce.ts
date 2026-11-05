// Factory commerce trong DB tenant (TIP-045b annex E): sản phẩm (giá VND bigint) và đơn tối thiểu gắn khách.
import type { TenantDb } from '../../src';
import { newId, tag, type FactoryClock } from './clock';

export function commerceFactory(db: TenantDb, clock: FactoryClock) {
  return {
    async product(p: { name?: string; price?: bigint } = {}) {
      const id = newId();
      await db.product.create({ data: { id, code: `SP-F${tag()}`, name: p.name ?? 'Dịch vụ fixture', type: 'service', price: p.price ?? 100_000n, unit: 'lần', createdAt: clock.now(), updatedAt: clock.now() } });
      return { id };
    },
    async order(contactId: string) {
      const id = newId();
      await db.order.create({ data: { id, code: `DH-F${tag()}`, contactId, createdAt: clock.now(), updatedAt: clock.now() } });
      return { id };
    },
  };
}
