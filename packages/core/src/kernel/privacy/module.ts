import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from './registry';
import { kernelPrivacyAdapter } from './adapter';

@Module({})
export class KernelPrivacyAdapterModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(kernelPrivacyAdapter);
  }
}
