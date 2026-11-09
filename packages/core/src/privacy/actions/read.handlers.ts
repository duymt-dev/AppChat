// contact.privacy_preview / contact.privacy_status (TIP-015c §1.2) — read-only, không ghi gì, không preview riêng (risk=read không
// qua cổng xem trước).
import { Injectable } from '@nestjs/common';
import type { ActionInput, contactPrivacyPreview, contactPrivacyStatus } from '@appchat/actions';
import type { PrivacyOperationStatus, PrivacyPreview } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { privacyPreview } from '../services/preview';
import { privacyOperationStatus } from '../services/report';

@Injectable()
@ActionHandler('contact.privacy_preview')
export class ContactPrivacyPreviewHandler implements Handler<ActionInput<typeof contactPrivacyPreview>, PrivacyPreview> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof contactPrivacyPreview>, tx: TenantTx): Promise<HandlerOutcome<PrivacyPreview>> {
    return { result: await privacyPreview(tx, i.contact_id) };
  }
}

@Injectable()
@ActionHandler('contact.privacy_status')
export class ContactPrivacyStatusHandler implements Handler<ActionInput<typeof contactPrivacyStatus>, PrivacyOperationStatus> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof contactPrivacyStatus>, tx: TenantTx): Promise<HandlerOutcome<PrivacyOperationStatus>> {
    return { result: await privacyOperationStatus(tx, i.operation_id) };
  }
}
