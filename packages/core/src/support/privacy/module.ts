import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { supportPrivacyAdapter } from './adapter';

@Module({})
export class SupportPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(supportPrivacyAdapter);
  }
}
