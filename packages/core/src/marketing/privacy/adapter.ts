import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { marketingInventory } from './inventory';

export const marketingPrivacyAdapter: PrivacyAdapter = {
  domain: 'marketing',
  inventory: marketingInventory,
  erase: eraseNotImplemented,
};
