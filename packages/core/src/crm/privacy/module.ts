// Đăng ký PrivacyAdapter CRM lúc boot (mirror composition/contact-lifecycle.module.ts từng domain) — module riêng, không gộp domain CRM.
import { Module, type OnModuleInit } from '@nestjs/common';
import { registerPrivacyAdapter } from '../../kernel/privacy/registry';
import { crmPrivacyAdapter } from './adapter';

@Module({})
export class CrmPrivacyModule implements OnModuleInit {
  onModuleInit(): void {
    registerPrivacyAdapter(crmPrivacyAdapter);
  }
}
