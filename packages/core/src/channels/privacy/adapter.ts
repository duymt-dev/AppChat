import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { channelsInventory } from './inventory';

export const channelsPrivacyAdapter: PrivacyAdapter = {
  domain: 'channels',
  inventory: channelsInventory,
  erase: eraseNotImplemented,
};
