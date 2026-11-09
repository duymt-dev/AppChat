// Domain `privacy` — "Quên khách" (TIP-015c §1): contact.forget / contact.privacy_preview / contact.privacy_status (pha 1 — fence +
// state machine); privacy.cleanup_step / privacy.review_resolve (pha 2 — vật chất hoá kiểm kê + driver xoá theo lô + review người).
// Handler chỉ dùng CLOCK + domain CRM (lockFamily/dependencies — port kernel-only, không import module CRM aggregate).
import { Module } from '@nestjs/common';
import { ContactForgetHandler } from './actions/forget.handler';
import { ContactPrivacyPreviewHandler, ContactPrivacyStatusHandler } from './actions/read.handlers';
import { PrivacyCleanupStepHandler } from './actions/cleanup-step.handler';
import { PrivacyReviewResolveHandler } from './actions/review.handler';

const HANDLERS = [ContactForgetHandler, ContactPrivacyPreviewHandler, ContactPrivacyStatusHandler, PrivacyCleanupStepHandler, PrivacyReviewResolveHandler];

@Module({ providers: HANDLERS, exports: HANDLERS })
export class PrivacyModule {}
