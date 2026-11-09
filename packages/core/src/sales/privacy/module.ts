import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { salesPrivacyAdapter } from './adapter';

@Module({})
export class SalesPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(salesPrivacyAdapter);
  }
}
