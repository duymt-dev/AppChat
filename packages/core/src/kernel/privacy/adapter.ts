import { AppError } from '@appchat/shared';
import type { PrivacyAdapter } from './types';
import { eraseOutboxEvent } from './cleanup';
import { kernelInventory } from './inventory';

export const kernelPrivacyAdapter: PrivacyAdapter = {
  domain: 'kernel',
  inventory: kernelInventory,
  // TIP-003b: event v2 của stream khách. Kind khác của kernel chưa có erase (legacy-scanner pha sau) — không âm thầm no-op.
  erase: async (tx, a) => {
    if (a.kind !== 'outbox_event') throw new AppError('NOT_IMPLEMENTED', 501, undefined, `privacy erase kernel/${a.kind} chưa cài`);
    await eraseOutboxEvent(tx, a.recordId);
  },
};
