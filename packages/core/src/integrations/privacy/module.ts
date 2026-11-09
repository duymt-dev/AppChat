import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { integrationsPrivacyAdapter } from './adapter';

@Module({})
export class IntegrationsPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(integrationsPrivacyAdapter);
  }
}
