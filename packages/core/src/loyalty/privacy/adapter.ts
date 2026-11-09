import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { loyaltyInventory } from './inventory';

export const loyaltyPrivacyAdapter: PrivacyAdapter = {
  domain: 'loyalty',
  inventory: loyaltyInventory,
  erase: eraseNotImplemented,
};
