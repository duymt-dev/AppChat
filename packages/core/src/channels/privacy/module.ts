import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { channelsPrivacyAdapter } from './adapter';

@Module({})
export class ChannelsPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(channelsPrivacyAdapter);
  }
}
