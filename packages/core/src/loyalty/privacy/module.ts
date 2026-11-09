import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { loyaltyPrivacyAdapter } from './adapter';

@Module({})
export class LoyaltyPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(loyaltyPrivacyAdapter);
  }
}
