import type { ActionDef } from './define';
import * as identity from './identity';
import * as onboarding from './onboarding';
import * as dashboard from './dashboard';
import * as inbox from './inbox';
import * as crm from './crm';
import * as ai from './ai';
import * as catalog from './catalog';
import * as catalogOperations from './catalog-operations';
import * as quotes from './quotes';
import * as contracts from './contracts';
import * as contractFiles from './contract-files';
import * as contractDraft from './contract-draft';
import * as contractAppendix from './contract-appendix';
import * as commerceSettings from './commerce-settings';
import * as commerceDelivery from './commerce-delivery';
import * as orders from './orders';
import * as invoices from './invoices';
import * as payments from './payments';
import * as booking from './booking';
import * as bookingConfig from './booking-config';
import * as bookingUpdate from './booking-update';
import * as conversationGroups from './conversation-groups';
import * as groupResults from './group-results';
import * as support from './support';
import * as marketing from './marketing';
import * as loyalty from './loyalty';
import * as settings from './settings';
import * as settingsApps from './settings-apps';
import * as settingsAi from './settings-ai';
import * as documents from './documents';
import * as platformAdmin from './platform-admin';
import * as salesReads from './reads/sales';
import * as contractReads from './reads/contracts';
import * as crmReads from './reads/crm';
import * as supportReads from './reads/support';
import * as bookingReads from './reads/booking';
import * as inboxReads from './reads/inbox';
import * as aiReads from './reads/ai';
import * as identityReads from './reads/identity';
import * as channelReads from './reads/channels';
import * as documentReads from './reads/documents';
import * as assistantUi from './assistant-ui';
import * as integrationProbe from './integration-probe';

export * from './define';
export * from './assistant-ui';
export * from './identity';
export * from './onboarding';
export * from './dashboard';
export * from './inbox';
export * from './crm';
export * from './ai';
export * from './catalog';
export * from './catalog-operations';
export * from './quotes';
export * from './contracts';
export * from './contract-files';
export * from './contract-draft';
export * from './contract-appendix';
export * from './commerce-settings';
export * from './commerce-delivery';
export * from './orders';
export * from './invoices';
export * from './payments';
export * from './booking';
export * from './booking-config';
export * from './booking-update';
export * from './conversation-groups';
export * from './group-results';
export * from './support';
export * from './marketing';
export * from './loyalty';
export * from './loyalty-reasons';
export * from './settings';
export * from './settings-apps';
export * from './settings-ai';
export * from './documents';
export * from './platform-admin';
export * from './reads/sales';
export * from './reads/contracts';
export * from './reads/crm';
export * from './reads/support';
export * from './reads/booking';
export * from './reads/inbox';
export * from './reads/ai';
export * from './reads/identity';
export * from './reads/channels';
export * from './reads/documents';
export * from './integration-probe';

/** Registry dùng chung web / core / ai. Domain mới: thêm file `<domain>.ts` rồi spread vào đây. */
// Mỗi file domain chỉ export ActionDef — schema dùng chung đặt trong file riêng, không export từ file domain.
export const registry: readonly ActionDef[] = [
  ...Object.values(identity),
  ...Object.values(onboarding),
  ...Object.values(dashboard),
  ...Object.values(inbox),
  ...Object.values(crm),
  ...Object.values(ai),
  ...Object.values(catalog),
  ...Object.values(catalogOperations),
  ...Object.values(quotes),
  ...Object.values(contracts),
  ...Object.values(contractFiles),
  ...Object.values(contractDraft),
  ...Object.values(contractAppendix),
  ...Object.values(commerceSettings),
  ...Object.values(commerceDelivery),
  ...Object.values(orders),
  ...Object.values(invoices),
  ...Object.values(payments),
  ...Object.values(booking),
  ...Object.values(bookingConfig),
  ...Object.values(bookingUpdate),
  ...Object.values(conversationGroups),
  ...Object.values(groupResults),
  ...Object.values(support),
  ...Object.values(marketing),
  ...Object.values(loyalty),
  ...Object.values(settings),
  ...Object.values(settingsApps),
  ...Object.values(settingsAi),
  ...Object.values(documents),
  ...Object.values(platformAdmin),
  // Action đọc bản ghi cho Trợ lý / agent (TIP-023b R2 · DC-224).
  ...Object.values(salesReads),
  ...Object.values(contractReads),
  ...Object.values(crmReads),
  ...Object.values(supportReads),
  ...Object.values(bookingReads),
  ...Object.values(inboxReads),
  ...Object.values(aiReads),
  ...Object.values(identityReads),
  ...Object.values(channelReads),
  ...Object.values(assistantUi),
  ...Object.values(documentReads),
  // TIP-023c G3 (DEF-012-1): metadata form + thăm dò connector, không đổi kết nối.
  ...Object.values(integrationProbe),
] as ActionDef[];

export const getAction = (id: string): ActionDef | undefined => registry.find((a) => a.id === id);
