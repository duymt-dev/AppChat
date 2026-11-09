import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { dataTransferInventory } from './inventory';

export const dataTransferPrivacyAdapter: PrivacyAdapter = {
  domain: 'data-transfer',
  inventory: dataTransferInventory,
  erase: eraseNotImplemented,
};
