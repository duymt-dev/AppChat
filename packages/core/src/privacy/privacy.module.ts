// Domain `privacy` — "Quên khách" (TIP-015c §1): contact.forget / contact.privacy_preview / contact.privacy_status (pha 1 — fence +
// state machine); privacy.cleanup_step / privacy.review_resolve (pha 2 — vật chất hoá kiểm kê + driver xoá theo lô + review người);
// contact.allow_recreation (pha 3 — permit mở lại tạo mới từ định danh đã tombstone) + journal nền tảng (reserve/acknowledge trong
// forget.handler.ts — PLATFORM_DB/ENC_KEY @Optional, không platform thì bỏ qua journal, chỉ fence tenant).
// Handler chỉ dùng CLOCK + domain CRM (lockFamily/dependencies — port kernel-only, không import module CRM aggregate).
import { Module, type OnModuleInit } from '@nestjs/common';
import { registerSystemVerifier } from '../kernel/actions/system';
import { verifyPrivacyCleanup } from './jobs/privacy.scheduler';
import { ContactForgetHandler } from './actions/forget.handler';
import { ContactPrivacyPreviewHandler, ContactPrivacyStatusHandler } from './actions/read.handlers';
import { PrivacyCleanupStepHandler } from './actions/cleanup-step.handler';
import { PrivacyReviewResolveHandler } from './actions/review.handler';
import { ContactAllowRecreationHandler } from './actions/recreation.handler';

const HANDLERS = [ContactForgetHandler, ContactPrivacyPreviewHandler, ContactPrivacyStatusHandler, PrivacyCleanupStepHandler, PrivacyReviewResolveHandler, ContactAllowRecreationHandler];

@Module({ providers: HANDLERS, exports: HANDLERS })
export class PrivacyModule implements OnModuleInit {
  /** TIP-003c: verifier nguồn cho action riêng `privacy.cleanup_step`. */
  onModuleInit(): void {
    // 015c: gọi lặp tiến từng bước, lease_epoch CAS là khoá chống lặp (domain).
    registerSystemVerifier('privacy.cleanup_step', verifyPrivacyCleanup, { receipt: 'domain' });
  }
}
