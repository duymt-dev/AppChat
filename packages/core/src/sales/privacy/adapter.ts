import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { salesInventory } from './inventory';

export const salesPrivacyAdapter: PrivacyAdapter = {
  domain: 'sales',
  inventory: salesInventory,
  erase: eraseNotImplemented,
};
