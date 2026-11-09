import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { contractsPrivacyAdapter } from './adapter';

@Module({})
export class ContractsPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(contractsPrivacyAdapter);
  }
}
