import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { supportInventory } from './inventory';

export const supportPrivacyAdapter: PrivacyAdapter = {
  domain: 'support',
  inventory: supportInventory,
  erase: eraseNotImplemented,
};
