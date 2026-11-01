// Múi giờ + ngôn ngữ của workspace cho lịch hẹn (giờ tường của lịch, nhắc hẹn). Thiếu DB nền tảng (test đơn vị) → mặc định VN.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';

@Injectable()
export class BookingPlace {
  constructor(@Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb) {}

  async of(ws: string): Promise<{ timeZone: string; locale: string }> {
    const w = this.platform ? await this.platform.workspace.findUnique({ where: { id: ws }, select: { timezone: true, locale: true } }) : null;
    return { timeZone: w?.timezone ?? 'Asia/Ho_Chi_Minh', locale: w?.locale ?? 'vi' };
  }
}
