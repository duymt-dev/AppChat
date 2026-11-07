// Controller HTTP của domain `booking` (TIP-033): lịch hẹn /v1/calendar* + cài đặt /v1/settings/booking. Chỉ gắn khi env đủ DB + Redis +
// JWT_SECRET (`register`) — như sales.
import { Module, type DynamicModule } from '@nestjs/common';
import { BookingModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { CalendarController } from './calendar.controller';

@Module({ imports: [BookingModule] })
export class BookingHttpModule {
  static register(): DynamicModule {
    return { module: BookingHttpModule, imports: [BookingModule, ActorModule], controllers: [CalendarController] };
  }
}
