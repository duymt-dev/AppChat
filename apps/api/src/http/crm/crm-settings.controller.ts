// Cài đặt crm (TIP-015): `GET /v1/settings/fields?entity=` (Trường dữ liệu — cũng là modal "Trường mở rộng" ở Khách hàng,
// D56) và `GET /v1/settings/profile-layouts` (Hồ sơ 360° — mọi thành viên đọc để biết bố cục vai trò mình; sửa cần settings.manage).
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CrmReadService } from '@appchat/core';
import { AppError, CUSTOM_FIELD_ENTITIES, type CustomFieldEntity } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('settings')
export class CrmSettingsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(CrmReadService) private readonly read: CrmReadService,
  ) {}

  @Get('fields')
  async fields(@Req() req: IncomingMessage, @Query('entity') entity?: string) {
    const a = await this.actors.resolve(req);
    const e = (entity || 'contact') as CustomFieldEntity;
    if (!CUSTOM_FIELD_ENTITIES.includes(e)) throw new AppError('VALIDATION_FAILED', 422, { entity: 'invalid' });
    return { data: await this.read.fields(a, e) };
  }

  @Get('profile-layouts')
  async layouts(@Req() req: IncomingMessage) {
    return { data: await this.read.layouts(await this.actors.resolve(req)) };
  }
}
