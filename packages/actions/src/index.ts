import type { ActionDef } from './define';
import * as identity from './identity';
import * as onboarding from './onboarding';
import * as dashboard from './dashboard';
import * as inbox from './inbox';
import * as crm from './crm';
import * as ai from './ai';
import * as catalog from './catalog';
import * as quotes from './quotes';
import * as contracts from './contracts';
import * as orders from './orders';
import * as invoices from './invoices';
import * as booking from './booking';

export * from './define';
export * from './identity';
export * from './onboarding';
export * from './dashboard';
export * from './inbox';
export * from './crm';
export * from './ai';
export * from './catalog';
export * from './quotes';
export * from './contracts';
export * from './orders';
export * from './invoices';
export * from './booking';

/** Registry dùng chung web / core / ai. Domain mới: thêm file `<domain>.ts` rồi spread vào đây. */
// Mỗi file domain chỉ export ActionDef — schema dùng chung đặt trong file riêng, không export từ file domain.
export const registry: readonly ActionDef[] = [
  ...Object.values(identity),
  ...Object.values(onboarding),
  ...Object.values(dashboard),
  ...Object.values(inbox),
  ...Object.values(crm),
  ...Object.values(ai),
  ...Object.values(catalog),
  ...Object.values(quotes),
  ...Object.values(contracts),
  ...Object.values(orders),
  ...Object.values(invoices),
  ...Object.values(booking),
] as ActionDef[];

export const getAction = (id: string): ActionDef | undefined => registry.find((a) => a.id === id);
