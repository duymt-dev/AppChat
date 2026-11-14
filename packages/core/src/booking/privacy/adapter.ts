import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { bookingInventory } from './inventory';

export const bookingPrivacyAdapter: PrivacyAdapter = {
  domain: 'booking',
  inventory: bookingInventory,
  erase: eraseNotImplemented,
};
