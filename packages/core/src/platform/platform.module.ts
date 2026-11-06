// Domain `platform` — quản trị nền tảng (TIP-040): handler action `admin.*` (ngữ cảnh nền tảng — DC-368), đọc cấu hình cho màn /admin.
// Không import module domain khác (billing / ai đọc thế hệ cấu hình qua `platform/public` — không vòng module).
import { Module } from '@nestjs/common';
import { PLATFORM_HANDLERS, PLATFORM_PROVIDERS } from './platform.providers';

@Module({ providers: [...PLATFORM_PROVIDERS, ...PLATFORM_HANDLERS], exports: [...PLATFORM_PROVIDERS] })
export class PlatformModule {}
