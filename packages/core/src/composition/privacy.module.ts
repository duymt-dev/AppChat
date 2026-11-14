// Ghép 13 PrivacyAdapter "Quên khách" (TIP-015c §2.2, mirror composition/contact-lifecycle.module.ts): đăng ký đúng một lần lúc boot —
// không nạp module domain gộp hay processor hàng đợi. API AppModule và WorkerModule (mọi ROLE) import module này; thiếu adapter nào
// sau khởi tạo → lỗi boot (fail closed).
import { Module, type OnModuleInit } from '@nestjs/common';
import { PRIVACY_DOMAINS } from '../kernel/privacy/types';
import { registerPrivacyAdapter, registeredPrivacyDomains } from '../kernel/privacy/registry';
import { crmPrivacyAdapter } from '../crm/privacy/adapter';
import { inboxPrivacyAdapter } from '../inbox/privacy/adapter';
import { channelsPrivacyAdapter } from '../channels/privacy/adapter';
import { aiPrivacyAdapter } from '../ai/privacy/adapter';
import { salesPrivacyAdapter } from '../sales/privacy/adapter';
import { contractsPrivacyAdapter } from '../contracts/privacy/adapter';
import { bookingPrivacyAdapter } from '../booking/privacy/adapter';
import { supportPrivacyAdapter } from '../support/privacy/adapter';
import { loyaltyPrivacyAdapter } from '../loyalty/privacy/adapter';
import { marketingPrivacyAdapter } from '../marketing/privacy/adapter';
import { integrationsPrivacyAdapter } from '../integrations/privacy/adapter';
import { dataTransferPrivacyAdapter } from '../data-transfer/privacy/adapter';
import { kernelPrivacyAdapter } from '../kernel/privacy/adapter';

export const PRIVACY_ADAPTERS = [
  crmPrivacyAdapter,
  inboxPrivacyAdapter,
  channelsPrivacyAdapter,
  aiPrivacyAdapter,
  salesPrivacyAdapter,
  contractsPrivacyAdapter,
  bookingPrivacyAdapter,
  supportPrivacyAdapter,
  loyaltyPrivacyAdapter,
  marketingPrivacyAdapter,
  integrationsPrivacyAdapter,
  dataTransferPrivacyAdapter,
  kernelPrivacyAdapter,
];

/** Đăng ký 13 adapter (idempotent — cùng singleton) rồi khẳng định đủ. */
export function registerPrivacyAdapters(): void {
  for (const a of PRIVACY_ADAPTERS) registerPrivacyAdapter(a);
  const have = registeredPrivacyDomains();
  const missing = PRIVACY_DOMAINS.filter((d) => !have.includes(d));
  if (missing.length) throw new Error(`Thiếu PrivacyAdapter: ${missing.join(', ')}`);
}

@Module({})
export class PrivacyAdaptersModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapters();
  }
}
