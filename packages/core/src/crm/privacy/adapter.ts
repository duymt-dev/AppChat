// PrivacyAdapter — CRM (TIP-015c §2.2, §2.3 hàng 1) — domain thí điểm với erase thật; 12 domain khác pha 1 chỉ kiểm kê.
import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { crmErase } from './cleanup';
import { crmInventory } from './inventory';

export const crmPrivacyAdapter: PrivacyAdapter = {
  domain: 'crm',
  inventory: crmInventory,
  erase: crmErase,
};
