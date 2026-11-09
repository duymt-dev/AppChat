import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { inboxPrivacyAdapter } from './adapter';

@Module({})
export class InboxPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(inboxPrivacyAdapter);
  }
}
