import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { supportErase } from './cleanup';
import { supportInventory } from './inventory';

export const supportPrivacyAdapter: PrivacyAdapter = {
  domain: 'support',
  inventory: supportInventory,
  erase: supportErase,
};
