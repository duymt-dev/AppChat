// Lỗi 402 CREDIT_EXHAUSTED từ action (useAction) → thông báo ví (BillingNoticeHost kiểm lại số dư trước khi hiện). Tách file để useAction
// không kéo cả host (Modal / router) vào bundle của mọi màn.
import { apiMode } from '../api/transport';
import { sessionAuth } from '../api/http-transport';
import { useBillingNotices } from './billing-notices';

export function creditExhausted(): void {
  const workspace = apiMode() === 'mock' ? 'mock' : sessionAuth().workspace_id;
  useBillingNotices.getState().push({ kind: 'exhausted', key: `local:${Date.now()}`, workspace });
}
