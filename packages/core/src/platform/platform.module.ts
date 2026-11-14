// Domain `platform` — quản trị nền tảng (TIP-040): handler action `admin.*` (ngữ cảnh nền tảng — DC-368), đọc cấu hình cho màn /admin.
// Dùng BillingModule (InvoiceFulfiller cho đối soát); billing / ai đọc thế hệ cấu hình qua `platform/public` (file thuần, không module).
import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { PLATFORM_HANDLERS, PLATFORM_PROVIDERS } from './platform.providers';

@Module({ imports: [BillingModule], providers: [...PLATFORM_PROVIDERS, ...PLATFORM_HANDLERS], exports: [...PLATFORM_PROVIDERS] })
export class PlatformModule {}
