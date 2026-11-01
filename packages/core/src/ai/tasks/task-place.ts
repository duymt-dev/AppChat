// Múi giờ + ngôn ngữ + chủ sở hữu của workspace cho tác vụ (cron theo giờ tường, chữ mẫu / bản tin theo ngôn ngữ, bản tin gửi Owner).
// Thiếu DB nền tảng (test đơn vị) → mặc định VN.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';

export interface Place {
  timeZone: string;
  locale: string;
  ownerUserId: string | null;
}

@Injectable()
export class TaskPlace {
  constructor(@Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb) {}

  async of(ws: string): Promise<Place> {
    const w = this.platform ? await this.platform.workspace.findUnique({ where: { id: ws }, select: { timezone: true, locale: true, ownerUserId: true } }) : null;
    return { timeZone: w?.timezone ?? 'Asia/Ho_Chi_Minh', locale: w?.locale ?? 'vi', ownerUserId: w?.ownerUserId ?? null };
  }

  /** Tên hiển thị của người dùng (khung mục tiêu "thay mặt …"). */
  async userName(userId: string): Promise<string> {
    const u = this.platform ? await this.platform.user.findUnique({ where: { id: userId }, select: { name: true } }) : null;
    return u?.name ?? '';
  }
}
