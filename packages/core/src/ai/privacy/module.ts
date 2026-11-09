import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { aiPrivacyAdapter } from './adapter';

@Module({})
export class AiPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(aiPrivacyAdapter);
  }
}
