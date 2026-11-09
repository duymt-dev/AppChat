// PrivacyAdapter — Hộp thư (TIP-015c §2.3 hàng 3-4). Pha 1: chỉ kiểm kê; erase trực tiếp + cách ly nhóm cài ở pha sau.
import type { PrivacyAdapter } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { inboxInventory } from './inventory';

export const inboxPrivacyAdapter: PrivacyAdapter = {
  domain: 'inbox',
  inventory: inboxInventory,
  erase: eraseNotImplemented,
};
