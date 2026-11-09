import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { dataTransferPrivacyAdapter } from './adapter';

@Module({})
export class DataTransferPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(dataTransferPrivacyAdapter);
  }
}
