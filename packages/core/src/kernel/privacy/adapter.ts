import type { PrivacyAdapter } from './types';
import { eraseNotImplemented } from './sql';
import { kernelInventory } from './inventory';

export const kernelPrivacyAdapter: PrivacyAdapter = {
  domain: 'kernel',
  inventory: kernelInventory,
  erase: eraseNotImplemented,
};
