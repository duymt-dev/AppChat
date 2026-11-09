// Domain `privacy` — "Quên khách" (TIP-015c §1): contact.forget / contact.privacy_preview / contact.privacy_status (pha 1 — fence +
// state machine). Handler chỉ dùng CLOCK + domain CRM (lockFamily/dependencies — port kernel-only, không import module CRM aggregate).
import { Module } from '@nestjs/common';
import { ContactForgetHandler } from './actions/forget.handler';
import { ContactPrivacyPreviewHandler, ContactPrivacyStatusHandler } from './actions/read.handlers';

@Module({
  providers: [ContactForgetHandler, ContactPrivacyPreviewHandler, ContactPrivacyStatusHandler],
  exports: [ContactForgetHandler, ContactPrivacyPreviewHandler, ContactPrivacyStatusHandler],
})
export class PrivacyModule {}
