// Controller HTTP của domain `privacy` (TIP-015c): GET /v1/contacts/:id/privacy-preview, GET /v1/privacy/operations/:id.
// Ghi (contact.forget) đi qua ActionExecutor chung (kernel.http.module.ts) — module này chỉ route đọc.
import { Module, type DynamicModule } from '@nestjs/common';
import { ActorModule } from '../kernel/actor.module';
import { PrivacyController } from './privacy.controller';

@Module({})
export class PrivacyHttpModule {
  static register(): DynamicModule {
    return { module: PrivacyHttpModule, imports: [ActorModule], controllers: [PrivacyController] };
  }
}
