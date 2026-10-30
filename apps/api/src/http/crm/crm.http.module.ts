// Controller HTTP của domain `crm` (TIP-015): /v1/contacts*, /v1/contact-access-requests, /v1/members, /v1/crm/ai,
// /v1/settings/{fields,profile-layouts}. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như identity / billing.
import { Module, type DynamicModule } from '@nestjs/common';
import { CrmModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { ContactsController } from './contacts.controller';
import { CrmSettingsController } from './crm-settings.controller';

@Module({ imports: [CrmModule] })
export class CrmHttpModule {
  static register(): DynamicModule {
    return { module: CrmHttpModule, imports: [CrmModule, ActorModule], controllers: [ContactsController, CrmSettingsController] };
  }
}
