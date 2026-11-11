import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { aiInventory } from './inventory';
import { eraseAiArtifact } from './cleanup';

export const aiPrivacyAdapter: PrivacyAdapter = {
  domain: 'ai',
  inventory: aiInventory,
  erase: eraseAiArtifact,
};
