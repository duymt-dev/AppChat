import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { contractsInventory } from './inventory';

export const contractsPrivacyAdapter: PrivacyAdapter = {
  domain: 'contracts',
  inventory: contractsInventory,
  erase: eraseNotImplemented,
};
