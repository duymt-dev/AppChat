import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { aiInventory } from './inventory';

export const aiPrivacyAdapter: PrivacyAdapter = {
  domain: 'ai',
  inventory: aiInventory,
  erase: eraseNotImplemented,
};
