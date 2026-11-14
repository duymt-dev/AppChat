import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { integrationsInventory } from './inventory';

export const integrationsPrivacyAdapter: PrivacyAdapter = {
  domain: 'integrations',
  inventory: integrationsInventory,
  erase: eraseNotImplemented,
};
