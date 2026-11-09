import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { marketingPrivacyAdapter } from './adapter';

@Module({})
export class MarketingPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(marketingPrivacyAdapter);
  }
}
