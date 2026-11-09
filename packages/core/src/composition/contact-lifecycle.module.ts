// Ghép port phụ thuộc vòng đời khách (TIP-015f §2.1): đăng ký đúng một lần 7 port CHỈ-ĐỌC (Bán hàng, Hợp đồng, Hộp thư, Lịch hẹn, Ticket,
// Khách thân thiết, Marketing) lúc boot — không nạp module domain gộp hay processor hàng đợi (ROLE=jobs không khởi động worker Hộp thư /
// Marketing). API AppModule và WorkerModule (mọi ROLE) import module này; thiếu port nào sau khởi tạo → lỗi boot (fail closed).
import { Module, type OnModuleInit } from '@nestjs/common';
import { LIFECYCLE_DOMAINS } from '../kernel/contact-lifecycle/ports';
import { registerLifecyclePort, registeredLifecycleDomains } from '../kernel/contact-lifecycle/registry';
import { salesLifecyclePort } from '../sales/contact-lifecycle/dependencies';
import { contractsLifecyclePort } from '../contracts/services/contact-lifecycle';
import { inboxLifecyclePort } from '../inbox/services/contact-lifecycle';
import { bookingLifecyclePort } from '../booking/services/contact-lifecycle';
import { supportLifecyclePort } from '../support/services/contact-lifecycle';
import { loyaltyLifecyclePort } from '../loyalty/services/contact-lifecycle';
import { marketingLifecyclePort } from '../marketing/services/contact-lifecycle';

export const CONTACT_LIFECYCLE_PORTS = [salesLifecyclePort, contractsLifecyclePort, inboxLifecyclePort, bookingLifecyclePort, supportLifecyclePort, loyaltyLifecyclePort, marketingLifecyclePort];

/** Đăng ký 7 port (idempotent — cùng singleton) rồi khẳng định đủ. */
export function registerContactLifecyclePorts(): void {
  for (const p of CONTACT_LIFECYCLE_PORTS) registerLifecyclePort(p);
  const have = registeredLifecycleDomains();
  const missing = LIFECYCLE_DOMAINS.filter((d) => !have.includes(d));
  if (missing.length) throw new Error(`Thiếu ContactLifecyclePort: ${missing.join(', ')}`);
}

@Module({})
export class ContactLifecycleModule implements OnModuleInit {
  onModuleInit(): void {
    registerContactLifecyclePorts();
  }
}
