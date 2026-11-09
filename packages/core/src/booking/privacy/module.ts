import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { bookingPrivacyAdapter } from './adapter';

@Module({})
export class BookingPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(bookingPrivacyAdapter);
  }
}
